(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.ElementBoundMultiplayer=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';

  const ERROR_MESSAGES=Object.freeze({
    AUTH_REQUIRED:'Sign in again to continue the match.',
    INVALID_AUTH_TOKEN:'Your session expired. Sign in again.',
    NOT_A_PLAYER:'You are not a player in this room.',
    ACTOR_MISMATCH:'Your player seat could not be verified.',
    NOT_YOUR_TURN:'It is not your turn yet.',
    REVISION_MISMATCH:'The match changed before that move arrived. The board has been refreshed.',
    ROOM_NOT_FOUND:'This multiplayer room no longer exists.',
    RESPONSE_WINDOW_REQUIRED:'Your opponent has a response available.',
    TARGET_WARDED:'That Manifestation is Warded until its owner\'s next turn.',
    NETWORK_ERROR:'The move could not reach the server. Check your connection and try again.',
    VIEW_UNAVAILABLE:'The live match view is unavailable.'
  });

  function messageFor(error){return ERROR_MESSAGES[error]||`Move rejected: ${String(error||'UNKNOWN_ERROR')}`}

  function withoutClientIdentity(move){
    const safe=JSON.parse(JSON.stringify(move||{}));
    delete safe.actor;
    delete safe.uid;
    delete safe.playerSlot;
    return safe;
  }

  // Self-healing (issue #88): a stalled listener is re-subscribed with backoff, and an accepted move whose
  // snapshot is late is fetched once from the server. The board still comes only from the viewer's own view doc.
  // Issue #111: a forced refresh re-applies the newest view even at the same revision, because the input layer may
  // have parked that revision instead of showing it (a stale board then failed every move with REVISION_MISMATCH).
  function createMultiplayerClient({roomId,uid,getIdToken,subscribeView,fetchImpl,onView,onMessage=()=>{},fetchView=null,onTiming=()=>{},healAfterMs=4000,setTimer=setTimeout,clearTimer=clearTimeout,clock=()=>Date.now()}){
    if(!roomId||!uid||typeof getIdToken!=='function'||typeof subscribeView!=='function'||typeof fetchImpl!=='function'){
      throw new TypeError('roomId, uid, getIdToken, subscribeView, fetchImpl, and onView are required');
    }
    if(typeof onView!=='function')throw new TypeError('onView is required');
    let unsubscribe=null,lastRev=-1,retryTimer=null,retryDelay=1000,healTimer=null,watch=null,stopped=true;

    function notify(kind,text,error=null){onMessage({kind,text,error})}
    function deliver(view,source,force=false){
      if(view?.status==='WAITING'){notify('waiting','Room created. Waiting for the invited player…');return}
      if(!view||!view.state){if(source==='listener')notify('error',messageFor('VIEW_UNAVAILABLE'),'VIEW_UNAVAILABLE');return}
      const rev=Number(view.state.rev)||0;
      if(rev<lastRev||(source==='fetch'&&rev===lastRev&&!force))return;
      lastRev=rev;retryDelay=1000;
      onView(view.state,{force});
      if(!view.state.pendingResponse)notify('connected','Live match connected.');
      if(watch&&rev>=watch.target){const done=watch;watch=null;if(healTimer!==null){clearTimer(healTimer);healTimer=null}onTiming({sendMs:done.sendMs,boardMs:clock()-done.t0,healed:source==='fetch'})}
    }
    function listen(){
      unsubscribe=subscribeView(roomId,uid,view=>deliver(view,'listener'),()=>{
        if(unsubscribe){try{unsubscribe()}catch(error){}unsubscribe=null}
        if(stopped)return;
        notify('pending','Connection lost — reconnecting…','RECONNECTING');
        retryTimer=setTimer(()=>{retryTimer=null;if(!stopped){listen();resync()}},retryDelay);
        retryDelay=Math.min(15000,retryDelay*2);
      });
    }
    function start(){
      if(unsubscribe)return unsubscribe;
      stopped=false;listen();
      return unsubscribe;
    }
    function stop(){stopped=true;if(retryTimer!==null){clearTimer(retryTimer);retryTimer=null}if(healTimer!==null){clearTimer(healTimer);healTimer=null}watch=null;if(unsubscribe){unsubscribe();unsubscribe=null}}
    async function resync(force=false){
      if(typeof fetchView!=='function'||stopped)return false;
      try{deliver(await fetchView(roomId,uid),'fetch',force===true);return true}catch(error){return false}
    }
    function heal(attempt){
      healTimer=setTimer(async()=>{healTimer=null;if(!watch||lastRev>=watch.target)return;await resync();if(watch&&lastRev<watch.target&&attempt<2)heal(attempt+1)},healAfterMs*attempt);
    }
    async function submit(move){
      const t0=clock();
      try{
        const token=await getIdToken();
        const response=await fetchImpl('/api/submit-move',{
          method:'POST',
          headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},
          body:JSON.stringify({roomId,move:withoutClientIdentity(move)})
        });
        let body={};
        try{body=await response.json()}catch(error){body={ok:false,error:'INVALID_SERVER_RESPONSE'}}
        if(!response.ok||!body.ok){
          const code=body.error||`HTTP_${response.status}`;
          if(code==='REVISION_MISMATCH')resync(true);
          const expiry=move.type==='RESOLVE_EXPIRED'||move.type==='TURN_EXPIRED';
          if(code!=='RESPONSE_NOT_EXPIRED'&&code!=='TURN_NOT_EXPIRED'&&code!=='NO_TURN_TIMER'&&!(expiry&&(code==='REVISION_MISMATCH'||code==='RESPONSE_PENDING')))notify('error',messageFor(code),code);
          return {ok:false,error:code,detail:body.detail||null};
        }
        const sendMs=clock()-t0,target=Number(body.rev);
        if(Number.isFinite(target)){
          if(lastRev>=target)onTiming({sendMs,boardMs:sendMs,healed:false});
          else{watch={target,t0,sendMs};if(healTimer!==null)clearTimer(healTimer);heal(1)}
        }
        // The live board often lands before this reply; only say "waiting" while it really is behind.
        if(body.autoResolved)notify('pending','Response window expired — the attack continued.');
        else if(!(Number.isFinite(target)&&lastRev>=target))notify('pending','Move accepted. Waiting for the live board…');
        return {ok:true,autoResolved:!!body.autoResolved,rev:Number.isFinite(target)?target:null};
      }catch(error){
        notify('error',messageFor('NETWORK_ERROR'),'NETWORK_ERROR');
        return {ok:false,error:'NETWORK_ERROR'};
      }
    }
    return Object.freeze({start,stop,submit,resync,isStarted:()=>!!unsubscribe,lastRev:()=>lastRev});
  }

  function createActionDispatcher({isMultiplayer,multiplayerClient,localReduce,onLocalState=()=>{}}){
    return async function dispatch(state,move){
      if(isMultiplayer())return multiplayerClient.submit(move);
      const result=localReduce(state,move);
      if(result.ok)onLocalState(result.state);
      return result;
    };
  }

  function createInputCoordinator({onView,onPending=()=>{},onPendingTimeout=()=>{},pendingTimeoutMs=10000,setTimer=setTimeout,clearTimer=clearTimeout}){
    if(typeof onView!=='function')throw new TypeError('onView is required');
    let interacting=false,queuedView=null,pending=null,pendingTimer=null;
    function cancelPendingTimer(){if(pendingTimer!==null){clearTimer(pendingTimer);pendingTimer=null}}
    function publish(value){if(!value)cancelPendingTimer();pending=value;onPending(value)}
    function apply(view){
      if(pending&&Number(view?.rev)>pending.baseRev)publish(null);
      onView(view);
    }
    function beginInteraction(){if(pending)return false;interacting=true;return true}
    function endInteraction(){interacting=false;if(queuedView){const view=queuedView;queuedView=null;apply(view)} }
    function receiveView(view,force=false){if(force){interacting=false;queuedView=null;apply(view);return true}if(interacting){queuedView=view;return false}apply(view);return true}
    function beginMove(meta,baseRev){
      if(pending)return false;
      publish({...meta,baseRev:Number(baseRev||0)});
      pendingTimer=setTimer(()=>{pendingTimer=null;if(!pending)return;publish(null);onPendingTimeout()},pendingTimeoutMs);
      return true;
    }
    function resolveMove(result){
      if(!result?.ok)publish(null);
      return result;
    }
    function reset(){interacting=false;queuedView=null;publish(null)}
    return Object.freeze({beginInteraction,endInteraction,receiveView,beginMove,resolveMove,reset,isLocked:()=>!!pending,isInteracting:()=>interacting,pending:()=>pending});
  }

  function bindInteractionSafety(input,documentObject,onVisibilityCancel=()=>{}){
    if(!input||typeof input.endInteraction!=='function'||!documentObject?.addEventListener)return()=>{};
    const end=()=>input.endInteraction();
    const hidden=()=>{if(documentObject.hidden){onVisibilityCancel();end()}};
    documentObject.addEventListener('pointerup',end);
    documentObject.addEventListener('pointercancel',end);
    documentObject.addEventListener('visibilitychange',hidden);
    return()=>{
      documentObject.removeEventListener('pointerup',end);
      documentObject.removeEventListener('pointercancel',end);
      documentObject.removeEventListener('visibilitychange',hidden);
    };
  }

  function orientPlayerView(state){
    const next=JSON.parse(JSON.stringify(state)),seat=Number(next.viewerSeat||0);delete next.viewerSeat;
    if(seat===1){
      next.p=[next.p[1],next.p[0]];next.active=1-next.active;
      if(Number.isInteger(next.startSeat))next.startSeat=1-next.startSeat;
      if(next.initiative&&Number.isInteger(next.initiative.starter))next.initiative.starter=1-next.initiative.starter;
      if(Array.isArray(next.events))next.events=next.events.map(item=>{const event={...item};for(const key of ['actor','seat','starter','tokenSeat'])if(event[key]===0||event[key]===1)event[key]=1-event[key];return event});
      if(next.pendingResponse)for(const key of ['attackerSeat','defenderSeat'])if(next.pendingResponse[key]===0||next.pendingResponse[key]===1)next.pendingResponse[key]=1-next.pendingResponse[key];
    }
    return next;
  }

  function viewerActiveSeat(state){const seat=Number(state?.viewerSeat||0);return seat===1?1-Number(state?.active):Number(state?.active)}
  function shouldForceWaitingView(currentOriented,incoming){return (!!currentOriented&&currentOriented.active!==0)||viewerActiveSeat(incoming)!==0}

  return Object.freeze({ERROR_MESSAGES,messageFor,withoutClientIdentity,createMultiplayerClient,createActionDispatcher,createInputCoordinator,bindInteractionSafety,orientPlayerView,viewerActiveSeat,shouldForceWaitingView});
});
