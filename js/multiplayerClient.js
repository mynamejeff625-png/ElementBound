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

  function createMultiplayerClient({roomId,uid,getIdToken,subscribeView,fetchImpl,onView,onMessage=()=>{}}){
    if(!roomId||!uid||typeof getIdToken!=='function'||typeof subscribeView!=='function'||typeof fetchImpl!=='function'){
      throw new TypeError('roomId, uid, getIdToken, subscribeView, fetchImpl, and onView are required');
    }
    if(typeof onView!=='function')throw new TypeError('onView is required');
    let unsubscribe=null;

    function notify(kind,text,error=null){onMessage({kind,text,error})}
    function start(){
      if(unsubscribe)return unsubscribe;
      unsubscribe=subscribeView(roomId,uid,view=>{
        if(view?.status==='WAITING'){notify('waiting','Room created. Waiting for the invited player…');return}
        if(!view||!view.state){notify('error',messageFor('VIEW_UNAVAILABLE'),'VIEW_UNAVAILABLE');return}
        onView(view.state);
        notify('connected','Live match connected.');
      },()=>notify('error',messageFor('VIEW_UNAVAILABLE'),'VIEW_UNAVAILABLE'));
      return unsubscribe;
    }
    function stop(){if(unsubscribe){unsubscribe();unsubscribe=null}}
    async function submit(move){
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
          notify('error',messageFor(code),code);
          return {ok:false,error:code};
        }
        notify('pending','Move accepted. Waiting for the live board…');
        return {ok:true};
      }catch(error){
        notify('error',messageFor('NETWORK_ERROR'),'NETWORK_ERROR');
        return {ok:false,error:'NETWORK_ERROR'};
      }
    }
    return Object.freeze({start,stop,submit,isStarted:()=>!!unsubscribe});
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
