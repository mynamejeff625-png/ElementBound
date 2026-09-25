const assert=require('node:assert/strict');
const fs=require('node:fs');
const {createMultiplayerClient,createActionDispatcher}=require('../js/multiplayerClient.js');

(async()=>{
  let checks=0;
  function check(value,message){assert.ok(value,message);checks++}

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
    const html=fs.readFileSync('index.html','utf8'),game=fs.readFileSync('js/game.js','utf8');
    check(html.indexOf('js/multiplayerClient.js')<html.indexOf('js/game.js'),'multiplayer transport must load before the game adapter');
    check(/collection\('views'\)\.doc\(uid\)\.onSnapshot/.test(game),'browser adapter must subscribe to the authenticated private view');
    check(/if\(EB_MP\.enabled\).*ebMpSubmit\('END_TURN'/.test(game),'end turn must route through the server only in multiplayer mode');
  }

  console.log(`Multiplayer client integration 0.9.3: ${checks} checks passed`);
})().catch(error=>{console.error(error);process.exitCode=1});
