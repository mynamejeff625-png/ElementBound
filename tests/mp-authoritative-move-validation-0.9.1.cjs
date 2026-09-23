const assert=require('node:assert/strict');
const {createSubmitMoveHandler}=require('../api/submit-move.js');

function card(overrides={}){
  return {id:'card',el:'FIRE',n:'Cinder Adept',c:1,type:'MANIFESTATION',a:1,h:2,max:2,
    armor:0,ready:true,sick:false,guard:false,zone:'HAND',marks:[],growth:0,momentum:0,
    quick:null,turnFlags:{},...overrides};
}

function side(name,el='FIRE'){
  return {name,el,vit:30,maxE:2,e:2,deck:[],hand:[],wake:[],slots:[null,null,null],marks:[],
    initiationToken:false,responseEl:el,turnState:{resonance:{a:false,b:false,active:false},parents:[],resolved:[],moved:[]}};
}

function state(){
  const result={turn:1,active:0,startSeat:0,chain:0,rev:0,winner:null,p:[side('A'),side('B','WATER')]};
  result.p[0].hand=[card({id:'private-a'})];
  result.p[0].deck=[card({id:'deck-a',zone:'DECK'})];
  result.p[1].hand=[card({id:'private-b',el:'WATER'})];
  result.p[1].deck=[card({id:'deck-b',el:'WATER',zone:'DECK'})];
  return result;
}

function mockDb(room){
  const writes=[];
  const roomRef={
    path:'rooms/room-1',
    collection(name){
      return {doc(id){return {path:`rooms/room-1/${name}/${id}`}}};
    }
  };
  return {
    writes,
    collection(name){assert.equal(name,'rooms');return {doc(id){assert.equal(id,'room-1');return roomRef}}},
    async runTransaction(callback){
      const pending=[];
      const transaction={
        async get(ref){assert.equal(ref,roomRef);return {exists:true,data:()=>structuredClone(room)}},
        update(ref,data){pending.push({type:'update',path:ref.path,data:structuredClone(data)})},
        set(ref,data){pending.push({type:'set',path:ref.path,data:structuredClone(data)})}
      };
      const result=await callback(transaction);
      writes.push(...pending);
      return result;
    }
  };
}

function request(uid,body,overrides={}){
  return {method:'POST',headers:{authorization:`Bearer token-${uid}`},body,...overrides};
}

function response(){
  return {statusCode:null,body:null,headers:{},status(code){this.statusCode=code;return this},json(body){this.body=body;return this},setHeader(name,value){this.headers[name]=value}};
}

function handlerFor(uid,room,db=mockDb(room)){
  const auth={async verifyIdToken(token){
    assert.equal(token,`token-${uid}`);
    return {uid};
  }};
  return {db,handler:createSubmitMoveHandler({auth,db})};
}

async function invoke(handler,req){const res=response();await handler(req,res);return res}

(async()=>{
  let checks=0;
  function check(value,message){assert.ok(value,message);checks++}

  {
    const room={players:['uid-a','uid-b'],state:state()};
    const {handler,db}=handlerFor('uid-a',room);
    const res=await invoke(handler,request('uid-a',{roomId:'room-1',move:{v:1,type:'END_TURN',rev:0,payload:{}}}));
    check(res.statusCode===200&&res.body.ok,'legal move must succeed');
    check(db.writes.length===3,'state and both player views must be written atomically');
    const stateWrite=db.writes.find(write=>write.type==='update');
    check(stateWrite.data.state.rev===1&&stateWrite.data.state.active===1,'authoritative state must advance');
    const viewA=db.writes.find(write=>write.path.endsWith('/views/uid-a')).data.state;
    const viewB=db.writes.find(write=>write.path.endsWith('/views/uid-b')).data.state;
    check(viewA.p[0].hand[0].id==='private-a'&&viewA.p[1].hand.length===0&&viewA.p[1].handCount===2,'player A view must hide player B hand contents');
    check(viewB.p[1].hand.some(item=>item.id==='private-b')&&viewB.p[0].hand.length===0&&viewB.p[0].handCount===1,'player B view must hide player A hand contents');
    check(viewA.p[0].deck.length===0&&viewA.p[0].deckCount===1&&viewB.p[1].deck.length===0,'deck order must be hidden from both views');
  }

  {
    const room={players:['uid-a','uid-b'],state:state()};
    const {handler,db}=handlerFor('uid-a',room);
    const res=await invoke(handler,request('uid-a',{roomId:'room-1',move:{v:1,type:'PLAY_CARD',rev:0,payload:{cardId:'missing',slotIndex:0}}}));
    check(res.statusCode===400&&res.body.error==='CARD_NOT_IN_HAND','illegal move must return the engine rejection');
    check(db.writes.length===0,'illegal move must not mutate authoritative state or views');
  }

  {
    const room={players:['uid-a','uid-b'],state:state()};
    const {handler,db}=handlerFor('attacker',room);
    const res=await invoke(handler,request('attacker',{roomId:'room-1',uid:'uid-a',move:{v:1,type:'END_TURN',actor:0,rev:0,payload:{}}}));
    check(res.statusCode===403&&res.body.error==='NOT_A_PLAYER','body uid must not let an outsider spoof a player seat');
    check(db.writes.length===0,'spoofed uid attempt must not write');
  }

  {
    const room={players:['uid-a','uid-b'],state:state()};
    const {handler,db}=handlerFor('uid-b',room);
    const res=await invoke(handler,request('uid-b',{roomId:'room-1',move:{v:1,type:'END_TURN',actor:0,rev:0,payload:{}}}));
    check(res.statusCode===403&&res.body.error==='ACTOR_MISMATCH','client actor must not override the authenticated seat');
    check(db.writes.length===0,'actor mismatch must not write');
  }

  {
    const room={players:['uid-a','uid-b'],state:state()};
    const {handler,db}=handlerFor('uid-a',room);
    const res=await invoke(handler,request('uid-a',{roomId:'room-1',move:{v:1,type:'END_TURN',rev:7,payload:{}}}));
    check(res.statusCode===409&&res.body.error==='REVISION_MISMATCH','stale revision must return conflict');
    check(db.writes.length===0,'stale revision must not write');
  }

  {
    const room={players:['uid-a','uid-b'],state:state()};
    const {handler,db}=handlerFor('uid-b',room);
    const res=await invoke(handler,request('uid-b',{roomId:'room-1',move:{v:1,type:'END_TURN',rev:0,payload:{}}}));
    check(res.statusCode===403&&res.body.error==='NOT_YOUR_TURN','authenticated wrong-seat move must be forbidden');
    check(db.writes.length===0,'wrong-turn move must not write');
  }

  console.log(`Authoritative move validation 0.9.1: ${checks} checks passed`);
})().catch(error=>{console.error(error);process.exitCode=1});
