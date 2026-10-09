// Issue #111 · 1.17.1: online Techniques froze the board ("The match changed before that move arrived") until the turn ended.
// - A board update that arrived during a press was parked, the client still counted it as received, and the refresh
//   after REVISION_MISMATCH was dropped as "same revision" — so every later move was sent against the stale board.
// - ACTIVATE could leave that press open forever, and its follow-up click landed on the new target panel.
// - The status line kept saying "waiting for the live board" after the board was already current.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const M=require('../js/multiplayerClient.js');

let checks=0;const check=(value,message)=>{assert.ok(value,message);checks++};
const tick=()=>new Promise(resolve=>setTimeout(resolve,0));

function harness({reply}){
  let board=null,listener=null,fetched=0;const messages=[],server={rev:1};
  const views=rev=>({state:{rev,active:0}});
  const input=M.createInputCoordinator({onView:view=>{board=view.rev},setTimer:()=>0,clearTimer(){}});
  const client=M.createMultiplayerClient({roomId:'R',uid:'u',getIdToken:async()=>'token',
    subscribeView:(roomId,uid,next)=>{listener=next;return()=>{}},
    fetchView:async()=>{fetched++;return views(server.rev)},
    fetchImpl:async()=>reply(server),onMessage:message=>messages.push(message),
    onView:(state,options={})=>input.receiveView(state,!!options.force),setTimer:()=>0,clearTimer(){}});
  client.start();
  return {client,input,messages,server,push:rev=>listener(views(rev)),board:()=>board,fetched:()=>fetched};
}

(async()=>{
// A parked board update is shown as soon as a move is rejected for being built on the old board.
{
  const h=harness({reply:async()=>({ok:false,status:409,json:async()=>({ok:false,error:'REVISION_MISMATCH'})})});
  h.push(1);check(h.board()===1,'the first view reaches the board');
  h.input.beginInteraction();h.server.rev=2;h.push(2);
  check(h.board()===1&&h.client.lastRev()===2,'a view that arrives during a press is parked (received, not shown)');
  const result=await h.client.submit({v:1,type:'PLAY_CARD',rev:h.board(),payload:{}});await tick();
  check(!result.ok&&result.error==='REVISION_MISMATCH','the stale move is still rejected by the server');
  check(h.board()===2,`after REVISION_MISMATCH the forced refresh shows the newest board even at the same revision (board ${h.board()})`);
  check(!h.input.isInteracting(),'the forced refresh also releases the parked press');
}
// A normal (unforced) refresh at the same revision is still ignored, so FX and logs do not replay.
{
  const h=harness({reply:async()=>({ok:true,status:200,json:async()=>({ok:true,rev:1})})});
  h.push(1);const before=h.board();
  await h.client.resync();await tick();
  check(h.fetched()===1&&h.board()===before,'an unforced fetch of the revision already on the board changes nothing');
  check(h.client.lastRev()===1,'no revision moves backwards');
}
// The status line says "waiting" only while the live board is behind the accepted move.
{
  const h=harness({reply:async server=>({ok:true,status:200,json:async()=>({ok:true,rev:server.rev})})});
  h.push(1);h.server.rev=2;h.push(2);h.messages.length=0; // the live board lands before the HTTP reply
  await h.client.submit({v:1,type:'PLAY_CARD',rev:1,payload:{}});
  check(!h.messages.some(m=>/Waiting for the live board/.test(m.text)),`no "waiting" once the board already shows the move (${JSON.stringify(h.messages)})`);
  h.server.rev=3;h.messages.length=0; // the reply lands first this time
  await h.client.submit({v:1,type:'PLAY_CARD',rev:2,payload:{}});
  check(h.messages.some(m=>/Waiting for the live board/.test(m.text)),'"waiting" while the board is still behind');
  h.push(3);check(h.messages.at(-1).kind==='connected','the live board replaces the waiting message');
}

// Browser adapter wiring (js/game.js).
const game=fs.readFileSync('js/game.js','utf8');
const activate=game.match(/let activate=ev=>\{[^]*?play\(live\)\};/)?.[0]||'';
check(/^let activate=ev=>\{ev\.preventDefault\(\);ev\.stopPropagation\(\);if\(EB_MP\.enabled\)EB_MP\.input\.endInteraction\(\);if\(b\.dataset\.firing/.test(activate),'ACTIVATE releases the press before any early return (it stops pointerup, so the document safety net never sees it)');
check(/setTimeout\(\(\)=>\{b\.dataset\.firing=''\},\d+\)/.test(activate),'a repeat tap is blocked only briefly, so ACTIVATE works again after a cancelled target panel');
check(/if\(ev\.type==='pointerup'\)ebSwallowNextClick\(\)/.test(activate),'a pointer-up activation swallows the follow-up click');
check(/function ebMpApplyView\(state,options=\{\}\)\{[^}]*let force=!!options\.force\|\|/.test(game),'a forced refresh bypasses the press queue');
check(/if\(result\.error==='REVISION_MISMATCH'\)EB_MP\.input\.endInteraction\(\)/.test(game),'a rejected stale move shows any parked board update at once');
check(/onPendingTimeout:\(\)=>\{ebMpStatus\(\{[^}]*\}\);EB_MP\.input\?\.endInteraction\(\);EB_MP\.client\?\.resync\(true\)\}/.test(game),'the slow-connection timeout forces a refresh');

// The click guard swallows exactly one click, and only shortly after the tap.
{
  const fn=game.match(/function ebSwallowNextClick\([^]*?\n/)[0];
  const listeners=new Set();let now=0;
  const document={addEventListener:(type,f)=>listeners.add(f),removeEventListener:(type,f)=>listeners.delete(f)};
  const swallow=new Function('document','performance','setTimeout',`${fn};return ebSwallowNextClick`)(document,{now:()=>now},()=>0);
  const click=()=>{const e={stopped:false,prevented:false,stopPropagation(){this.stopped=true},preventDefault(){this.prevented=true}};for(const f of [...listeners])f(e);return e};
  swallow();const first=click(),second=click();
  check(first.stopped&&first.prevented&&!second.stopped,'the first click after ACTIVATE is swallowed, the next one is not');
  swallow();now=10000;check(!click().stopped,'a click long after the tap is never swallowed');
}

console.log(`Online Technique freeze 1.17.1: ${checks} checks passed`);
})().catch(error=>{console.error(error);process.exitCode=1});
