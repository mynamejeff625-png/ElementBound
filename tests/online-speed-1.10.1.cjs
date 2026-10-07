// Issue #88 · 3b Speed and connection: 10 s Response window, Auto-pass, slim views and replies,
// and the self-healing, timed multiplayer client.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const engine=require('../lib/gameEngine.js');
const matchFactory=require('../lib/matchFactory.js');
const {buildPlayerView,VIEW_EVENT_LIMIT}=require('../lib/playerView.js');
const {createSubmitMoveHandler}=require('../api/submit-move.js');
const {createCreateRoomHandler}=require('../api/create-room.js');
const {createJoinRoomHandler}=require('../api/join-room.js');
const {createMultiplayerClient}=require('../js/multiplayerClient.js');

let checks=0;const check=(value,message)=>{assert.ok(value,message);checks++};
function response(){return{statusCode:null,body:null,status(code){this.statusCode=code;return this},json(body){this.body=body;return this},setHeader(){}}}
async function invoke(handler,body,token='token'){const res=response();await handler({method:'POST',headers:{authorization:`Bearer ${token}`},body},res);return res}
function auth(){return{async verifyIdToken(token){if(!['token','token-b'].includes(token))throw Error('bad token');return{uid:token==='token-b'?'uid-b':'uid-a'}}}}
function mockDb(seed={}){
  const docs=new Map(Object.entries(seed).map(([path,data])=>[path,structuredClone(data)])),writes=[];
  function ref(path){return{path,collection(name){return{doc(id){return ref(`${path}/${name}/${id}`)}}}}}
  return{docs,writes,collection(name){return{doc(id){return ref(`${name}/${id}`)}}},async runTransaction(callback){const pending=[];const tx={async get(reference){return{exists:docs.has(reference.path),data:()=>structuredClone(docs.get(reference.path))}},create(reference,data){pending.push(['create',reference.path,data])},set(reference,data){pending.push(['set',reference.path,data])},update(reference,data){pending.push(['update',reference.path,data])}};const result=await callback(tx);for(const [kind,path,data] of pending){if(kind==='update')docs.set(path,{...docs.get(path),...structuredClone(data)});else docs.set(path,structuredClone(data));writes.push({kind,path,data:structuredClone(data)})}return result}};
}
function deepNoUndefined(value,path='root'){if(value===undefined)throw Error(`undefined at ${path}`);if(value&&typeof value==='object')for(const [k,v] of Object.entries(value))deepNoUndefined(v,`${path}.${k}`);return true}
function card(o={}){return{id:'card',el:'FIRE',n:'Unit',c:1,type:'MANIFESTATION',a:3,h:5,max:5,armor:0,ready:true,sick:false,guard:false,zone:'FIELD',marks:[],growth:0,momentum:0,quick:null,turnFlags:{},...o}}
function side(name,el,extra={}){return{name,el,vit:30,maxE:2,e:2,deck:[],hand:[],wake:[],slots:[null,null,null],marks:[],initiationToken:false,autoPass:false,responseEl:el,turnState:{resonance:{a:false,b:false,active:false},parents:[],resolved:[],moved:[]},...extra}}
function battle({token=true,autoPass=false,card:held=null}={}){const s={turn:2,active:0,startSeat:0,chain:0,rev:4,winner:null,p:[side('A','FIRE'),side('B','WATER',{initiationToken:token,autoPass})]};s.p[0].slots[0]=card({id:'att'});s.p[1].slots[0]=card({id:'target',el:'WATER'});if(held){s.p[1].hand=[held];s.p[1].e=2}return s}
const attack=rev=>({v:1,type:'ATTACK',actor:0,rev,payload:{attackerId:'att',targetId:'target',targetType:'MANIFESTATION'}});

(async()=>{
  // 10 s Response window.
  {
    const r=engine.validateAndApplyMove(battle(),attack(4),{now:5000});
    check(r.ok&&r.state.pendingResponse?.deadline===15000,'Response window is 10 s on the server clock');
  }
  // Auto-pass: the token alone never opens a window; an affordable Response card still does.
  {
    const quiet=engine.validateAndApplyMove(battle({autoPass:true}),attack(4),{now:0});
    check(quiet.ok&&!quiet.state.pendingResponse&&quiet.state.p[1].slots[0]?.h<5,'Auto-pass with only the Initiation Token resolves the attack without a window');
    check(!quiet.events.some(e=>e.type==='RESPONSE_OFFERED'),'no RESPONSE_OFFERED event is emitted when Auto-pass skips the window');
    const undertow=matchFactory.createResponseCard(()=>900,'WATER');
    if(undertow){
      const withCard=engine.validateAndApplyMove(battle({autoPass:true,token:false,card:{...undertow,id:'resp-w'}}),attack(4),{now:0});
      check(withCard.ok&&withCard.state.pendingResponse&&withCard.state.pendingResponse.legalOptions.some(o=>o.source==='CARD'),'Auto-pass still asks when an affordable Response card is held');
    }
    const off=engine.validateAndApplyMove(battle({autoPass:false}),attack(4),{now:0});
    check(off.ok&&!!off.state.pendingResponse,'without Auto-pass the token still opens a window');
  }
  // Match factory and room endpoints carry autoPass as a boolean only.
  {
    const s=matchFactory.createInitialState({players:[{name:'A',element:'FIRE',autoPass:true},{name:'B',element:'WATER'}],random:()=>0.3});
    check(s.p[0].autoPass===true&&s.p[1].autoPass===false&&deepNoUndefined(s),'createInitialState stores autoPass as a strict boolean');
    const db=mockDb(),create=createCreateRoomHandler({auth:auth(),db,generateCode:()=> 'SPD234'});
    await invoke(create,{element:'FIRE',autoPass:'yes'});
    check(db.docs.get('rooms/SPD234').deckSelections[0].autoPass===false,'create-room ignores a non-boolean autoPass');
    const db2=mockDb({'rooms/SPD234':{status:'WAITING',players:['uid-a',null],deckSelections:[{element:'FIRE',responseElement:'FIRE',autoPass:true},null],state:null,events:[],eventSeq:0}}),join=createJoinRoomHandler({auth:auth(),db:db2,random:()=>0.3});
    const res=await invoke(join,{roomId:'SPD234',element:'WATER',autoPass:true},'token-b');
    const room=db2.docs.get('rooms/SPD234');
    check(res.statusCode===200&&room.state.p[0].autoPass===true&&room.state.p[1].autoPass===true&&deepNoUndefined(room),'join-room starts the match with both players\' Auto-pass choices');
  }
  // Slim views: each view carries only the recent events; the room keeps 200.
  {
    const events=Array.from({length:200},(_,i)=>({seq:i+1,type:'NOTE',text:`e${i+1}`}));
    const view=buildPlayerView(battle(),1,events,123);
    check(VIEW_EVENT_LIMIT===40&&view.events.length===40&&view.events[0].seq===161&&view.events.at(-1).seq===200,'views keep only the last 40 events');
    const db=mockDb({'rooms/R1':{players:['uid-a','uid-b'],state:battle({token:false}),events,eventSeq:200}}),handler=createSubmitMoveHandler({auth:auth(),db,now:()=>7000});
    const res=await invoke(handler,{roomId:'R1',move:attack(4)});
    const room=db.docs.get('rooms/R1'),v=db.docs.get('rooms/R1/views/uid-b');
    check(res.statusCode===200&&res.body.ok&&res.body.rev===5&&res.body.serverNow===7000&&res.body.state===undefined,'submit-move replies with rev and serverNow only');
    check(room.events.length===200&&v.state.events.length===40&&v.state.events.at(-1).seq===room.eventSeq,'room keeps 200 events while each view carries the newest 40');
    check(deepNoUndefined(v)&&deepNoUndefined(db.docs.get('rooms/R1/views/uid-a')),'both slim views are Firestore-safe');
  }
  // Self-healing client: a late snapshot is fetched; a listener error re-subscribes; timing is reported.
  {
    const timers=[];let now=0,subs=0,listener=null,errorCb=null,fetched=0,timings=[],seen=[];
    const setTimer=(fn,ms)=>{timers.push({fn,at:now+ms});return timers.length};const clearTimer=()=>{};
    const run=async until=>{now=until;for(const t of timers.splice(0))if(t.at<=now)await t.fn();else timers.push(t)};
    const client=createMultiplayerClient({roomId:'R1',uid:'uid-a',getIdToken:async()=>'tok',
      subscribeView:(r,u,next,err)=>{subs++;listener=next;errorCb=err;return()=>{}},
      fetchImpl:async()=>({ok:true,json:async()=>({ok:true,rev:6,serverNow:1})}),
      fetchView:async()=>{fetched++;return{state:{rev:6}}},
      onView:state=>seen.push(state.rev),onTiming:t=>timings.push(t),setTimer,clearTimer,clock:()=>now});
    client.start();listener({state:{rev:5}});
    const result=await client.submit({type:'END_TURN',rev:5,payload:{}});
    check(result.ok&&result.rev===6,'submit returns the accepted revision');
    await run(4000);
    check(fetched===1&&seen.join(',')==='5,6'&&timings.length===1&&timings[0].healed===true,'a snapshot missing after 4 s is fetched once and timed as healed');
    listener({state:{rev:6}});
    check(seen.join(',')==='5,6,6','the listener can still deliver the same revision');
    errorCb(new Error('stream reset'));
    await run(5000);
    check(subs===2,'a listener error re-subscribes after a backoff');
    listener({state:{rev:4}});
    check(seen.at(-1)===6,'an older revision never replaces a newer board');
    client.stop();
  }
  // Client wiring.
  {
    const game=fs.readFileSync('js/game.js','utf8'),html=fs.readFileSync('index.html','utf8');
    check(/fetchView:ebMpFetchView\(db\)/.test(game)&&/onTiming:ebMpRecordTiming/.test(game)&&/visibilitychange',\(\)=>\{if\(!document\.hidden&&EB_MP\.enabled\)EB_MP\.client\?\.resync\(\)/.test(game),'game.js wires fetch-on-stall, timing and foreground resync');
    check(/autoPass:ebAutoPass\(\)\}/.test(game)&&/id="mpAutoPass"[^>]*role="switch"/.test(html),'Play with Friends sends the Auto-pass switch with Create and Join');
  }
  console.log(`Online speed 1.10.1: ${checks} checks passed`);
})().catch(error=>{console.error(error);process.exit(1)});
