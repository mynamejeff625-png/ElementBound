const assert=require('node:assert/strict');
const fs=require('node:fs');
const {createMultiplayerClient,createActionDispatcher,createInputCoordinator,bindInteractionSafety}=require('../js/multiplayerClient.js');

(async()=>{
  let checks=0;
  function check(value,message){assert.ok(value,message);checks++}

  {
    const applied=[],pending=[];
    const input=createInputCoordinator({onView:view=>applied.push(view),onPending:value=>pending.push(value)});
    check(input.beginInteraction(),'a drag can begin when no move is pending');
    check(input.receiveView({rev:2})===false&&applied.length===0,'incoming snapshots are deferred during a drag');
    input.endInteraction();
    check(applied.length===1&&applied[0].rev===2,'ending the drag applies the newest deferred snapshot');
    check(input.beginMove({kind:'MANIFESTATION',cardId:11,slotIndex:2},2),'a dropped card enters pending state');
    check(input.isLocked()&&input.pending().slotIndex===2,'pending placement locks further hand input and retains its target slot');
    check(!input.beginInteraction()&&!input.beginMove({kind:'TECHNIQUE',cardId:12},2),'a pending move blocks another drag or activation');
    input.resolveMove({ok:true});
    check(input.isLocked(),'HTTP acceptance stays pending until an authoritative snapshot arrives');
    input.receiveView({rev:3});
    check(!input.isLocked()&&pending.at(-1)===null,'a newer authoritative snapshot releases the pending lock');
    input.beginMove({kind:'TECHNIQUE',cardId:12},3);
    input.resolveMove({ok:false,error:'ILLEGAL_TARGET'});
    check(!input.isLocked()&&pending.at(-1)===null,'server rejection restores hand input immediately');
  }

  {
    const listeners={},applied=[];
    const fakeDocument={hidden:false,addEventListener(type,listener){(listeners[type]??=[]).push(listener)},removeEventListener(type,listener){listeners[type]=(listeners[type]||[]).filter(value=>value!==listener)},dispatch(type){for(const listener of listeners[type]||[])listener({type})}};
    const input=createInputCoordinator({onView:view=>applied.push(view)}),unbind=bindInteractionSafety(input,fakeDocument);
    input.beginInteraction();input.receiveView({rev:8});fakeDocument.dispatch('pointerup');
    check(!input.isInteracting()&&applied.at(-1).rev===8,'a document-level release outside ACTIVATE ends the interaction and flushes its queued snapshot');
    input.beginInteraction();input.receiveView({rev:9});fakeDocument.hidden=true;fakeDocument.dispatch('visibilitychange');
    check(!input.isInteracting()&&applied.at(-1).rev===9,'hiding the page ends drag or activation interactions and flushes queued snapshots');
    unbind();check((listeners.pointerup||[]).length===0&&(listeners.pointercancel||[]).length===0&&(listeners.visibilitychange||[]).length===0,'interaction safety listeners can be removed cleanly');
  }

  {
    let timeoutCallback=null,timeoutMessage=false;
    const input=createInputCoordinator({onView(){},onPendingTimeout(){timeoutMessage=true},setTimer(callback,delay){check(delay===10000,'accepted moves use the ten-second pending timeout');timeoutCallback=callback;return 1},clearTimer(){timeoutCallback=null}});
    input.beginMove({kind:'TECHNIQUE',cardId:15},4);input.resolveMove({ok:true});
    check(input.isLocked()&&typeof timeoutCallback==='function','an accepted move remains locked while awaiting its authoritative snapshot');
    timeoutCallback();
    check(!input.isLocked()&&timeoutMessage,'a missing authoritative snapshot clears the lock and reports the slow connection');
  }

  {
    let listener,rendered=null,message=null,request=null,unsubscribed=false;
    const client=createMultiplayerClient({
      roomId:'room-1',uid:'uid-a',getIdToken:async()=>'token-a',
      subscribeView(roomId,uid,next){check(roomId==='room-1'&&uid==='uid-a','listener must target the authenticated player view');listener=next;return()=>{unsubscribed=true}},
      fetchImpl:async(url,options)=>{request={url,options};return {ok:true,status:200,json:async()=>({ok:true})}},
      onView:state=>{rendered=state},onMessage:value=>{message=value}
    });
    client.start();
    const result=await client.submit({v:1,type:'END_TURN',actor:1,uid:'spoof',playerSlot:1,rev:3,payload:{}});
    check(result.ok&&request.url==='/api/submit-move','successful move must use the authoritative endpoint');
    check(request.options.headers.Authorization==='Bearer token-a','move request must carry the Firebase ID token');
    const submitted=JSON.parse(request.options.body);
    check(submitted.roomId==='room-1'&&!Object.hasOwn(submitted.move,'actor'),'client-controlled actor must be stripped');
    check(!Object.hasOwn(submitted.move,'uid')&&!Object.hasOwn(submitted.move,'playerSlot'),'client identity and seat fields must be stripped');
    check(rendered===null,'HTTP success must wait for the authoritative Firestore view');
    listener({state:{rev:4,active:1,p:[{name:'A'},{name:'B'}]}});
    check(rendered.rev===4&&rendered.active===1,'listener update must replace the rendered UI state');
    check(message.kind==='connected','live view must surface connected status');
    client.stop();check(unsubscribed,'stopping multiplayer must unsubscribe the live listener');
  }

  {
    const original={rev:7,active:0},messages=[];let rendered=original,listener;
    const client=createMultiplayerClient({
      roomId:'room-2',uid:'uid-a',getIdToken:async()=>'token-a',
      subscribeView(roomId,uid,next){listener=next;return()=>{}},
      fetchImpl:async()=>({ok:false,status:409,json:async()=>({ok:false,error:'REVISION_MISMATCH'})}),
      onView:state=>{rendered=state},onMessage:value=>messages.push(value)
    });
    client.start();
    const result=await client.submit({v:1,type:'END_TURN',rev:6,payload:{}});
    check(!result.ok&&result.error==='REVISION_MISMATCH','server rejection must be returned to the caller');
    check(rendered===original&&original.rev===7,'rejected move must not corrupt local UI state');
    check(messages.at(-1).text.includes('board has been refreshed'),'stale revision must surface a non-blocking explanation');
    check(typeof listener==='function','rejection must leave the live listener active');
  }

  {
    let multiplayerCalls=0,localCalls=0,localState=null;
    const dispatch=createActionDispatcher({
      isMultiplayer:()=>false,
      multiplayerClient:{submit(){multiplayerCalls++;return {ok:true}}},
      localReduce(state,move){localCalls++;return {ok:true,state:{...state,rev:state.rev+1,last:move.type}}},
      onLocalState:state=>{localState=state}
    });
    const result=await dispatch({rev:2},{type:'END_TURN'});
    check(result.ok&&localCalls===1&&multiplayerCalls===0,'single-player must keep using the local reducer only');
    check(localState.rev===3&&localState.last==='END_TURN','single-player local state update must remain intact');
  }

  {
    const html=fs.readFileSync('index.html','utf8'),game=fs.readFileSync('js/game.js','utf8'),css=fs.readFileSync('css/game.css','utf8');
    check(html.indexOf('js/multiplayerClient.js')<html.indexOf('js/game.js'),'multiplayer transport must load before the game adapter');
    check(/collection\('views'\)\.doc\(uid\)\.onSnapshot/.test(game),'browser adapter must subscribe to the authenticated private view');
    check(/if\(EB_MP\.enabled\).*ebMpSubmit\('END_TURN'/.test(game),'end turn must route through the server only in multiplayer mode');
    check(/if\(live\)play\(live,\+sl\.dataset\.slot\)/.test(game),'drag drop must route the live card through play()');
    check(/b\.addEventListener\('pointerup',activate/.test(game)&&/play\(live\)/.test(game),'Technique pointer-up must invoke activation directly instead of relying on a suppressed click');
    check(game.indexOf("c.type==='TECHNIQUE'&&techTarget===undefined")<game.indexOf("if(EB_MP.enabled){selectedCardId=null;ebMpPlay"),'Technique activation must open targeting before multiplayer submission');
    check(/if\(EB_MP\.enabled\).*ebMpPlay\(c,slotIndex,techTarget\);return/.test(game),'multiplayer play must submit through ebMpPlay');
    check(/selectedCardId=null;let p=me\(\);p\.e-=c\.c/.test(game),'single-player play must retain its original local mutation path');
    check(/mp-pending/.test(css)&&/Placing…/.test(css),'pending multiplayer cards must have visible placing and activation states');
    check(/bindInteractionSafety\(EB_MP\.input,document\)/.test(game),'multiplayer installs document-level interaction release safety');
    check(/Connection slow — board will refresh when the match updates\./.test(game),'pending timeout surfaces the slow-connection status message');
  }

  console.log(`Multiplayer client integration 0.9.3: ${checks} checks passed`);
})().catch(error=>{console.error(error);process.exitCode=1});
