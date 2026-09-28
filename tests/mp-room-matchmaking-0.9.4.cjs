const assert=require('node:assert/strict');
const engine=require('../lib/gameEngine.js');
const matchFactory=require('../lib/matchFactory.js');
const {createCreateRoomHandler}=require('../api/create-room.js');
const {createJoinRoomHandler}=require('../api/join-room.js');
const {createMatchmakingClient}=require('../js/matchmakingClient.js');

function response(){return{statusCode:null,body:null,status(code){this.statusCode=code;return this},json(body){this.body=body;return this},setHeader(){}}}
async function invoke(handler,body,uid='uid-a',headers={authorization:'Bearer token'}){const res=response();await handler({method:'POST',headers,body},res);return res}
function auth(expected='token'){return{async verifyIdToken(token){if(token!==expected)throw Error('bad token');return{uid:token==='token-b'?'uid-b':'uid-a'}}}}
function mockDb(seed={}){
  const docs=new Map(Object.entries(seed).map(([path,data])=>[path,structuredClone(data)])),writes=[];
  function ref(path){return{path,collection(name){return{doc(id){return ref(`${path}/${name}/${id}`)}}}}}
  return{docs,writes,collection(name){return{doc(id){return ref(`${name}/${id}`)}}},async runTransaction(callback){const pending=[];const tx={async get(reference){return{exists:docs.has(reference.path),data:()=>structuredClone(docs.get(reference.path))}},create(reference,data){pending.push(['create',reference.path,data])},set(reference,data){pending.push(['set',reference.path,data])},update(reference,data){pending.push(['update',reference.path,data])}};const result=await callback(tx);for(const [kind,path,data] of pending){if(kind==='update')docs.set(path,{...docs.get(path),...structuredClone(data)});else docs.set(path,structuredClone(data));writes.push({kind,path,data:structuredClone(data)})}return result}}
}

(async()=>{
 let checks=0;const check=(value,message)=>{assert.ok(value,message);checks++};
 {
  const db=mockDb(),handler=createCreateRoomHandler({auth:auth(),db,generateCode:()=> 'ABC234'}),res=await invoke(handler,{element:'FIRE'});
  check(res.statusCode===201&&res.body.roomId==='ABC234','creator receives a short room code');
  const room=db.docs.get('rooms/ABC234'),view=db.docs.get('rooms/ABC234/views/uid-a');
  check(room.status==='WAITING'&&room.players[0]==='uid-a'&&room.players[1]===null,'creator occupies seat zero in a waiting room');
  check(room.deckSelections[0].element==='FIRE'&&room.state===null,'creator deck selection is stored until the opponent chooses');
  check(view.status==='WAITING'&&view.seat===0&&view.state===null,'creator waiting view is created atomically');
 }
 {
  const createHandler=createCreateRoomHandler({auth:auth(),db:mockDb(),generateCode:()=> 'ABC234'}),joinHandler=createJoinRoomHandler({auth:auth(),db:mockDb()});
  const a=await invoke(createHandler,{element:'FIRE'},'uid-a',{}),b=await invoke(joinHandler,{roomId:'ABC234',element:'WATER'},'uid-a',{});
  check(a.statusCode===401&&a.body.error==='AUTH_REQUIRED','create requires authentication');
  check(b.statusCode===401&&b.body.error==='AUTH_REQUIRED','join requires authentication');
 }
 {
  const waiting={status:'WAITING',players:['uid-a',null],deckSelections:[{element:'FIRE',responseElement:'FIRE'},null],state:null};
  const db=mockDb({'rooms/ABC234':waiting}),handler=createJoinRoomHandler({auth:auth('token-b'),db,random:()=>0.25}),res=await invoke(handler,{roomId:'abc234',element:'WATER'},'uid-b',{authorization:'Bearer token-b'});
  check(res.statusCode===200&&res.body.status==='ACTIVE'&&res.body.seat===1,'second player activates the room');
  const room=db.docs.get('rooms/ABC234');
  check(room.players[1]==='uid-b'&&engine.validState(room.state),'join creates a valid authoritative game state');
  check(room.state.p[0].el==='FIRE'&&room.state.p[1].el==='WATER','both selected decks seed the match');
  check(room.state.p.every(side=>side.hand.length===4&&side.deck.length===17),'shared factory deals four-card opening hands');
  check(db.docs.get('rooms/ABC234/views/uid-a').state.viewerSeat===0&&db.docs.get('rooms/ABC234/views/uid-b').state.viewerSeat===1,'join writes both private views atomically');
 }
 {
  const handler=createJoinRoomHandler({auth:auth('token-b'),db:mockDb(),random:()=>0}),res=await invoke(handler,{roomId:'ABC234',element:'WATER'},'uid-b',{authorization:'Bearer token-b'});
  check(res.statusCode===404&&res.body.error==='ROOM_NOT_FOUND','join rejects nonexistent rooms');
 }
 {
  const full={status:'ACTIVE',players:['uid-a','uid-c'],deckSelections:[{element:'FIRE'},{element:'EARTH'}],state:{}};
  const handler=createJoinRoomHandler({auth:auth('token-b'),db:mockDb({'rooms/ABC234':full})}),res=await invoke(handler,{roomId:'ABC234',element:'WATER'},'uid-b',{authorization:'Bearer token-b'});
  check(res.statusCode===409&&res.body.error==='ROOM_FULL','third player cannot join a full room');
 }
 {
  const waiting={status:'WAITING',players:['uid-a',null],deckSelections:[{element:'FIRE'},null],state:null},db=mockDb({'rooms/ABC234':waiting});
  const handler=createJoinRoomHandler({auth:auth(),db}),res=await invoke(handler,{roomId:'ABC234',element:'FIRE'});
  check(res.statusCode===200&&res.body.code==='ALREADY_IN_ROOM'&&res.body.seat===0,'creator rejoin is idempotent');
  check(db.writes.length===0,'idempotent creator rejoin does not rewrite the room');
 }
 {
  const active={status:'ACTIVE',players:['uid-a','uid-b'],deckSelections:[{element:'FIRE'},{element:'WATER'}],state:{}},db=mockDb({'rooms/ABC234':active});
  const handler=createJoinRoomHandler({auth:auth('token-b'),db}),res=await invoke(handler,{roomId:'ABC234',element:'WATER'},'uid-b',{authorization:'Bearer token-b'});
  check(res.statusCode===200&&res.body.code==='ALREADY_IN_ROOM'&&res.body.seat===1,'joined player refresh is idempotent');
  check(db.writes.length===0,'idempotent seat-one join does not rewrite the room');
 }
 {
  let request;const client=createMatchmakingClient({getIdToken:async()=>'id-token',fetchImpl:async(path,options)=>{request={path,options};return{ok:true,status:200,json:async()=>({ok:true,roomId:'ABC234'})}}});
  const result=await client.createRoom({element:'BLOOM'}),body=JSON.parse(request.options.body);
  check(result.roomId==='ABC234'&&request.path==='/api/create-room','client calls create-room');
  check(request.options.headers.Authorization==='Bearer id-token'&&body.element==='BLOOM','client authenticates and sends its deck choice');
  await client.joinRoom('ABC234',{element:'EARTH'});const joinBody=JSON.parse(request.options.body);
  check(request.path==='/api/join-room'&&joinBody.roomId==='ABC234'&&joinBody.element==='EARTH','client sends room code and joiner deck choice');
 }
 {
  const state=matchFactory.createInitialState({players:[{element:'STORM'},{element:'BLOOM'}],random:()=>0.5});
  check(engine.validState(state),'shared match factory produces engine-valid hybrid state');
 }
 console.log(`Multiplayer room matchmaking 0.9.4: ${checks} checks passed`);
})().catch(error=>{console.error(error);process.exitCode=1});
