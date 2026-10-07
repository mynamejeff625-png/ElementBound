// Issue #88 · N6: the server-enforced 60 s online turn timer.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const engine=require('../lib/gameEngine.js');
const {createJoinRoomHandler}=require('../api/join-room.js');

let checks=0;const check=(value,message)=>{assert.ok(value,message);checks++};
function deepNoUndefined(value,path='root'){if(value===undefined)throw Error(`undefined at ${path}`);if(value&&typeof value==='object')for(const [k,v] of Object.entries(value))deepNoUndefined(v,`${path}.${k}`);return true}
function card(o={}){return{id:'card',el:'FIRE',n:'Unit',c:1,type:'MANIFESTATION',a:3,h:5,max:5,armor:0,ready:true,sick:false,guard:false,zone:'FIELD',marks:[],growth:0,momentum:0,quick:null,turnFlags:{},...o}}
function side(name,el,extra={}){return{name,el,vit:30,maxE:2,e:2,deck:[card({id:`${name}-d1`,zone:'DECK'}),card({id:`${name}-d2`,zone:'DECK'})],hand:[],wake:[],slots:[null,null,null],marks:[],initiationToken:false,autoPass:false,responseEl:el,turnState:{resonance:{a:false,b:false,active:false},parents:[],resolved:[],moved:[]},...extra}}
function state(extra={}){return{turn:2,active:0,startSeat:0,chain:0,rev:3,winner:null,turnDeadline:61000,p:[side('A','FIRE'),side('B','WATER')],...extra}}
const mv=(type,actor,rev,payload={})=>({v:1,type,actor,rev,payload});
function response(){return{statusCode:null,body:null,status(code){this.statusCode=code;return this},json(body){this.body=body;return this},setHeader(){}}}

(async()=>{
  check(engine.TURN_MS===60000&&engine.ACTIONS.includes('TURN_EXPIRED'),'the turn timer is 60 s and TURN_EXPIRED is a known action');
  // Before the deadline nothing happens; after it, either seat can report and the active turn ends.
  {
    const early=engine.validateAndApplyMove(state(),mv('TURN_EXPIRED',1,3),{now:60999});
    check(!early.ok&&early.error==='TURN_NOT_EXPIRED'&&early.detail.remainingMs===1,'TURN_EXPIRED is rejected before the deadline with the time left');
    const late=engine.validateAndApplyMove(state(),mv('TURN_EXPIRED',1,3),{now:61000});
    check(late.ok&&late.state.active===1&&late.state.turnDeadline===121000,'at the deadline the active turn ends and the next turn gets 60 s');
    check(late.events.map(e=>e.type).slice(0,3).join(',')==='TURN_TIMEOUT,TURN_END,TURN_START'&&late.events[0].actor===0,'events record the timeout before the normal turn change');
    check(late.state.p[1].hand.length===1&&deepNoUndefined(late.state),'the next player draws as usual and the state stays Firestore-safe');
    const own=engine.validateAndApplyMove(state(),mv('TURN_EXPIRED',0,3),{now:70000});
    check(own.ok&&own.state.active===1,'the active player may also report their own expired turn');
    const stale=engine.validateAndApplyMove(state(),mv('TURN_EXPIRED',1,2),{now:70000});
    check(!stale.ok&&stale.error==='REVISION_MISMATCH','a stale report is rejected by the revision check');
    const none=engine.validateAndApplyMove(state({turnDeadline:undefined}),mv('TURN_EXPIRED',1,3),{now:70000});
    check(!none.ok&&none.error==='NO_TURN_TIMER','matches without a timer ignore TURN_EXPIRED');
  }
  // END_TURN restarts the clock; a Response window pauses it and the remaining time resumes after.
  {
    const ended=engine.validateAndApplyMove(state(),mv('END_TURN',0,3),{now:20000});
    check(ended.ok&&ended.state.turnDeadline===80000,'ending a turn early starts the next turn at a full 60 s');
    const s=state();s.p[0].slots[0]=card({id:'att'});s.p[1].slots[0]=card({id:'target',el:'WATER'});s.p[1].initiationToken=true;
    const attacked=engine.validateAndApplyMove(s,mv('ATTACK',0,3,{attackerId:'att',targetId:'target',targetType:'MANIFESTATION'}),{now:31000});
    check(attacked.ok&&attacked.state.pendingResponse&&attacked.state.turnPausedMs===30000,'opening a Response window pauses the turn with its time left');
    const passed=engine.validateAndApplyMove(attacked.state,mv('PASS',1,4),{now:38000});
    check(passed.ok&&!passed.state.pendingResponse&&passed.state.turnDeadline===68000&&!('turnPausedMs' in passed.state)&&deepNoUndefined(passed.state),'the paused time resumes when the window closes');
    const during=engine.validateAndApplyMove(attacked.state,mv('TURN_EXPIRED',1,4),{now:32000});
    check(!during.ok&&during.error==='RESPONSE_PENDING','the turn cannot time out during a Response window');
  }
  // join-room starts the first turn's clock after the coin flip.
  {
    const docs=new Map([['rooms/TMR234',{status:'WAITING',players:['uid-a',null],deckSelections:[{element:'FIRE',responseElement:'FIRE',autoPass:false},null],state:null,events:[],eventSeq:0}]]);
    function ref(path){return{path,collection(name){return{doc(id){return ref(`${path}/${name}/${id}`)}}}}}
    const db={collection(name){return{doc(id){return ref(`${name}/${id}`)}}},async runTransaction(cb){const pending=[];const tx={async get(r){return{exists:docs.has(r.path),data:()=>structuredClone(docs.get(r.path))}},set(r,d){pending.push([r.path,d,false])},update(r,d){pending.push([r.path,d,true])}};const result=await cb(tx);for(const [path,d,merge] of pending)docs.set(path,merge?{...docs.get(path),...structuredClone(d)}:structuredClone(d));return result}};
    const handler=createJoinRoomHandler({auth:{async verifyIdToken(){return{uid:'uid-b'}}},db,random:()=>0.3,now:()=>1000}),res=response();
    await handler({method:'POST',headers:{authorization:'Bearer t'},body:{roomId:'TMR234',element:'WATER'}},res);
    const room=docs.get('rooms/TMR234'),view=docs.get('rooms/TMR234/views/uid-b');
    check(res.statusCode===200&&room.state.turnDeadline===1000+60000+5000&&view.state.turnDeadline===room.state.turnDeadline,'join-room starts the first turn clock (60 s after a 5 s coin flip), visible in the views');
  }
  // Client wiring.
  {
    const game=fs.readFileSync('js/game.js','utf8'),arena=fs.readFileSync('js/arena.js','utf8'),css=fs.readFileSync('css/arena.css','utf8'),client=fs.readFileSync('js/multiplayerClient.js','utf8');
    check(/ebMpSubmit\('TURN_EXPIRED'/.test(game)&&/ebMpHandleTurnTimer\(\)\}/.test(game),'the client reports an expired turn and re-arms the timer on every view');
    check(/function turnClock\(leftMs,paused=false\)/.test(arena)&&/secs<=10/.test(arena)&&/\.rift-clock\.is-urgent\{[^}]*animation:riftClockBlink/.test(css)&&/prefers-reduced-motion:reduce\)\{\.rift-clock\.is-urgent\{animation:none\}/.test(css),'the Rift clock turns red and blinks for the last 10 s (solid under reduced motion)');
    check(/code!=='TURN_NOT_EXPIRED'/.test(client),'early expiry reports stay silent');
  }
  console.log(`Turn timer 1.10.2: ${checks} checks passed`);
})().catch(error=>{console.error(error);process.exit(1)});
