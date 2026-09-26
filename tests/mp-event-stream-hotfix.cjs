const assert=require('node:assert/strict');
const engine=require('../lib/gameEngine.js');
const matchFactory=require('../lib/matchFactory.js');
const {createSubmitMoveHandler}=require('../api/submit-move.js');
const {createInputCoordinator,orientPlayerView}=require('../js/multiplayerClient.js');

function card(overrides={}){return{id:'card',el:'FIRE',n:'Unit',c:1,type:'MANIFESTATION',a:2,h:3,max:3,armor:0,ready:true,sick:false,guard:false,zone:'FIELD',marks:[],growth:0,momentum:0,quick:null,turnFlags:{},...overrides}}
function side(name,el='FIRE'){return{name,el,vit:30,maxE:7,e:7,deck:[],hand:[],wake:[],slots:[null,null,null],marks:[],initiationToken:false,responseEl:el,turnState:{resonance:{a:false,b:false,active:false},parents:[],resolved:[],moved:[]}}}
function state(active=0){return{turn:1,active,startSeat:0,chain:0,rev:0,winner:null,p:[side('Player 1'),side('Player 2','WATER')]}}
function move(type,payload={},actor=0){return{v:1,type,actor,rev:0,payload}}
function undefinedPaths(value,path='$',found=[]){if(value===undefined)found.push(path);else if(Array.isArray(value))value.forEach((item,index)=>undefinedPaths(item,`${path}[${index}]`,found));else if(value&&typeof value==='object')Object.entries(value).forEach(([key,item])=>undefinedPaths(item,`${path}.${key}`,found));return found}
function assertFirestoreSafe(result,label){assert.equal(result.ok,true,`${label} must resolve`);assert.deepEqual(undefinedPaths(result.state),[],`${label} state must not contain undefined`);assert.deepEqual(undefinedPaths(result.events),[],`${label} events must not contain undefined`)}

function techniquePayload(tech,original){
  const payload={cardId:tech.id};
  if(tech.el==='FIRE')Object.assign(payload,{enemyId:'enemy',targetId:'enemy',targetType:'CARD'});
  if(['EARTH','NATURE'].includes(tech.el))payload.friendId='friend';
  if(tech.el==='WATER')payload.enemyId='enemy';
  if(tech.el==='AIR')payload.friendId='friend';
  if(tech.el==='MAGMA'){
    if(tech.n==='Molten Channel')Object.assign(payload,{friendId:'friend',enemyId:'enemy',magmaMode:'BOTH'});
    else payload.friendId='friend';
  }
  if(tech.el==='STORM'){payload.friendId='friend';if(tech.n!=='Static Reversal')payload.toSlot=1;if(tech.n==='Thunderstep')payload.enemyId='enemy'}
  if(tech.el==='BLOOM')payload.friendId='friend';
  if(tech.n==='Reclaiming Tide'){original.p[0].slots[0].marks=['Seeded'];original.p[0].slots[0].growth=1}
  return payload;
}

function mockDb(room){
  const writes=[],roomRef={path:'rooms/ROOM01',collection(name){return{doc(id){return{path:`rooms/ROOM01/${name}/${id}`}}}}};
  return{writes,collection(){return{doc(){return roomRef}}},async runTransaction(callback){const pending=[],tx={async get(){return{exists:true,data:()=>structuredClone(room)}},update(ref,data){pending.push({kind:'update',path:ref.path,data:structuredClone(data)})},set(ref,data){pending.push({kind:'set',path:ref.path,data:structuredClone(data)})}};const result=await callback(tx);writes.push(...pending);return result}};
}
function response(){return{statusCode:null,body:null,status(code){this.statusCode=code;return this},json(body){this.body=body;return this},setHeader(){}}}
async function submit(room,uid,requestedMove){const db=mockDb(room),handler=createSubmitMoveHandler({auth:{async verifyIdToken(){return{uid}}},db}),res=response();await handler({method:'POST',headers:{authorization:'Bearer token'},body:{roomId:'ROOM01',move:requestedMove}},res);return{db,res}}

(async()=>{
  let checks=0;const check=(value,message)=>{assert.ok(value,message);checks++};

  {
    let id=0;
    for(const element of matchFactory.ELEMENTS){
      const deck=matchFactory.createDeck(element,{nextId:()=>++id});
      const techniques=[...new Map(deck.filter(item=>item.type==='TECHNIQUE').map(item=>[item.n,item])).values()];
      for(const source of techniques){
        const original=state(),tech=structuredClone(source);tech.id=`tech-${element}-${tech.n}`;tech.zone='HAND';tech.c=0;
        const friend=card({id:'friend',n:'Friend',el:element}),enemy=card({id:'enemy',n:'Enemy',el:'WATER'});
        original.p[0].hand=[tech];original.p[0].slots[0]=friend;original.p[1].slots[0]=enemy;
        assertFirestoreSafe(engine.validateAndApplyMove(original,move('PLAY_CARD',techniquePayload(tech,original))),`${element} ${tech.n}`);checks++;
      }
    }
  }

  {
    const manifestations=[
      card({id:'plain',n:'Plain',zone:'HAND'}),
      card({id:'air-gift',n:'Breeze Disciple',el:'AIR',zone:'HAND'}),
      card({id:'earth-gift',n:'Stone Initiate',el:'EARTH',zone:'HAND'}),
      card({id:'nature-gift',n:'Sproutling',el:'NATURE',zone:'HAND'})
    ];
    for(const unit of manifestations){const original=state();original.p[0].hand=[unit];original.p[0].slots[0]=card({id:'friend'});assertFirestoreSafe(engine.validateAndApplyMove(original,move('PLAY_CARD',{cardId:unit.id,slotIndex:1,...(unit.id==='plain'?{}:{friendId:'friend'})})),unit.n);checks++}
  }

  {
    for(const targetType of ['CARD','BENDER']){const original=state(),attacker=card({id:'attacker'});original.p[0].slots[0]=attacker;if(targetType==='CARD')original.p[1].slots[0]=card({id:'target'});assertFirestoreSafe(engine.validateAndApplyMove(original,move('ATTACK',{attackerId:'attacker',targetId:targetType==='CARD'?'target':null,targetType})),`${targetType} attack`);checks++}
    const original=state();original.p[1].deck=[card({id:'draw',zone:'DECK'})];assertFirestoreSafe(engine.validateAndApplyMove(original,move('END_TURN')),'END_TURN');checks++;
  }

  for(const actingSeat of [0,1]){
    const original=state(actingSeat),waitingSeat=1-actingSeat,attacker=card({id:'attacker',n:'Attacker'}),target=card({id:'target',n:'Target',h:3,max:3});
    original.p[actingSeat].slots[0]=attacker;original.p[waitingSeat].slots[0]=target;
    const room={players:['uid-a','uid-b'],state:original,events:[],eventSeq:0};
    const {db,res}=await submit(room,room.players[actingSeat],{v:1,type:'ATTACK',rev:0,payload:{attackerId:'attacker',targetId:'target'}});
    check(res.statusCode===200,`seat ${actingSeat} attack succeeds`);
    const waitingWrite=db.writes.find(write=>write.path.endsWith(`/views/${room.players[waitingSeat]}`)).data.state;
    check(waitingWrite.p[waitingSeat].slots[0].h===1&&waitingWrite.events.some(item=>item.type==='DAMAGE'),`seat ${waitingSeat} view receives HP and DAMAGE in the same transaction`);
    let rendered=null;const input=createInputCoordinator({onView:view=>{rendered=orientPlayerView(view)}});input.beginInteraction();input.receiveView(waitingWrite,true);
    check(rendered.p[0].slots[0].h===1&&rendered.events.some(item=>item.type==='DAMAGE'&&item.text.includes('2 damage')),`waiting seat ${waitingSeat} applies opponent-turn HP and log immediately`);
    check(!input.isInteracting(),`waiting seat ${waitingSeat} cannot keep the authoritative snapshot queued`);
  }

  console.log(`Multiplayer event stream hotfix: ${checks} checks passed`);
})().catch(error=>{console.error(error);process.exitCode=1});
