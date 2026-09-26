const assert=require('node:assert/strict');
const fs=require('node:fs');
const engine=require('../lib/gameEngine.js');
const matchFactory=require('../lib/matchFactory.js');
const {buildPlayerView}=require('../lib/playerView.js');
const {createSubmitMoveHandler}=require('../api/submit-move.js');

function card(overrides={}){return{id:'card',el:'FIRE',n:'Unit',c:1,type:'MANIFESTATION',a:3,h:3,max:3,armor:0,ready:true,sick:false,guard:false,zone:'FIELD',marks:[],growth:0,momentum:0,quick:null,turnFlags:{},...overrides}}
function side(name,el='FIRE'){return{name,el,vit:30,maxE:2,e:2,deck:[],hand:[],wake:[],slots:[null,null,null],marks:[],initiationToken:false,responseEl:el,turnState:{resonance:{a:false,b:false,active:false},parents:[],resolved:[],moved:[]}}}
function state(){return{turn:1,active:0,startSeat:0,chain:0,rev:0,winner:null,p:[side('Player 1'),side('Player 2','WATER')]}}
function move(type,payload={},rev=0){return{v:1,type,actor:0,rev,payload}}
function response(){return{statusCode:null,body:null,status(code){this.statusCode=code;return this},json(body){this.body=body;return this},setHeader(){}}}

function mockDb(room){
  const writes=[],roomRef={path:'rooms/ROOM01',collection(name){return{doc(id){return{path:`rooms/ROOM01/${name}/${id}`}}}}};
  return{writes,collection(){return{doc(){return roomRef}}},async runTransaction(callback){const pending=[],tx={async get(){return{exists:true,data:()=>structuredClone(room)}},update(ref,data){pending.push({kind:'update',path:ref.path,data:structuredClone(data)})},set(ref,data){pending.push({kind:'set',path:ref.path,data:structuredClone(data)})}};const result=await callback(tx);writes.push(...pending);return result}};
}

(async()=>{
  let checks=0;const check=(value,message)=>{assert.ok(value,message);checks++};

  {
    const initial=matchFactory.createInitialState({players:[{name:'A',element:'FIRE'},{name:'B',element:'WATER'}],random:()=>0.25});
    const events=engine.createMatchEvents(initial);
    check(events.map(item=>item.type).join(',')==='MATCH_START,INITIATIVE','match creation emits ordered start and initiative events');
    check(events[0].text===initial.logs[0].replace(/^T1 /,'')&&events[1].text.includes('Initiation Token'),'initial event wording preserves the existing single-player log wording');
  }

  {
    const original=state(),attacker=card({id:'attacker',n:'Flare Hawk',a:3}),target=card({id:'target',n:'Guard',h:4,max:4,armor:2,el:'EARTH'});
    original.p[0].slots[0]=attacker;original.p[1].slots[0]=target;
    const result=engine.validateAndApplyMove(original,move('ATTACK',{attackerId:'attacker',targetId:'target'}));
    const damage=result.events.find(item=>item.type==='DAMAGE');
    check(result.ok&&result.events[0].type==='ATTACK'&&result.events[0].text==='Flare Hawk attacks Guard for 1','an accepted attack emits ATTACK first with existing log wording');
    check(damage.amount===1&&damage.armorAbsorbed===2&&damage.remainingHp===3,'damage reports immediate HP, armor absorption, and remaining HP');
    check(result.events.every(item=>item.turn===1),'each emitted event retains the turn on which it happened');
    check(result.state.p[1].slots[0].h===3,'the authoritative attack snapshot contains damage immediately');
  }

  {
    const original=state(),attacker=card({id:'ravager',n:'Obsidian Ravager',el:'MAGMA',a:1}),donor=card({id:'donor',n:'Armor Donor',armor:1}),target=card({id:'target',n:'Target',h:3,max:3,el:'WATER'});
    original.p[0].turnState.resonance.active=true;original.p[0].slots=[attacker,donor,null];original.p[1].slots[0]=target;
    const result=engine.validateAndApplyMove(original,move('ATTACK',{attackerId:'ravager',targetId:'target'}));
    check(result.ok&&result.state.p[0].slots[1].armor===0,'Obsidian Ravager spends its friendly donor Armor');
    check(!result.events.some(item=>item.type==='DAMAGE'&&item.targetId==='donor'),'Armor spent by an effect is not misreported as absorbed attack damage');
  }

  {
    const original=state(),attacker=card({id:'attacker'}),target=card({id:'target'}),responseCard=card({id:'response',type:'RESPONSE',zone:'HAND',c:1,el:'WATER'});
    original.p[0].slots[0]=attacker;original.p[1].slots[0]=target;original.p[1].hand=[responseCard];
    const result=engine.validateAndApplyMove(original,move('ATTACK',{attackerId:'attacker',targetId:'target'}));
    check(!result.ok&&result.error==='RESPONSE_WINDOW_REQUIRED'&&result.events.length===0,'response-gated attacks are refused and cannot produce delayed damage or events');
  }

  {
    const original=state(),unit=card({id:'summon',n:'Cinder Adept',zone:'HAND',sick:false});original.p[0].hand=[unit];
    const result=engine.validateAndApplyMove(original,move('PLAY_CARD',{cardId:'summon',slotIndex:1}));
    check(result.events.some(item=>item.type==='CARD_PLAYED'&&item.text==='SUMMON Cinder Adept → M2'),'summons emit CARD_PLAYED with existing log wording');
    check(result.events.some(item=>item.type==='STATUS_APPLIED'&&item.status==='Burning'),'card effects emit structured status events');
  }

  {
    const original=state(),tech=card({id:'tech',n:'Flame Burst',type:'TECHNIQUE',zone:'HAND',c:1}),target=card({id:'fragile',n:'Fragile Unit',h:2,max:2,el:'WATER'});
    original.p[0].hand=[tech];original.p[1].slots[0]=target;
    const result=engine.validateAndApplyMove(original,move('PLAY_CARD',{cardId:'tech',enemyId:'fragile',targetId:'fragile',targetType:'CARD'}));
    check(result.events.some(item=>item.type==='TECHNIQUE_RESOLVED'),'techniques emit a resolved event');
    check(result.events.some(item=>item.type==='DAMAGE'&&item.targetId==='fragile')&&result.events.some(item=>item.type==='DESTROYED'&&item.cardId==='fragile'),'lethal technique damage emits damage followed by destruction information');
  }

  {
    const original=state(),attacker=card({id:'finisher',n:'Finisher',a:30});original.p[0].slots[0]=attacker;
    const result=engine.validateAndApplyMove(original,move('ATTACK',{attackerId:'finisher',targetId:null,targetType:'BENDER'}));
    check(result.events.some(item=>item.type==='BENDER_DAMAGE'&&item.amount===30),'direct attacks emit immediate Bender damage');
    check(result.events.at(-1).type==='WIN'&&result.state.winner==='Player 1','terminal damage emits WIN after its damage events');
  }

  {
    const original=state();original.p[1].deck=[card({id:'secret-draw',n:'Secret Draw',zone:'DECK',el:'WATER'})];
    const result=engine.validateAndApplyMove(original,move('END_TURN'));
    const draw=result.events.find(item=>item.type==='DRAW');
    check(result.events.slice(0,2).map(item=>item.type).join(',')==='TURN_END,TURN_START'&&draw.cardName==='Secret Draw','turn transition emits end, start, and private draw events');
    const sequenced=result.events.map((item,index)=>({...item,seq:index+1}));
    const owner=buildPlayerView(result.state,1,sequenced),opponent=buildPlayerView(result.state,0,sequenced);
    check(owner.events.find(item=>item.type==='DRAW').cardName==='Secret Draw','drawer sees their drawn card event');
    const hidden=opponent.events.find(item=>item.type==='DRAW');
    check(!Object.hasOwn(hidden,'cardName')&&!Object.hasOwn(hidden,'cardId')&&!hidden.text.includes('Secret Draw'),'opponent event stream never leaks the drawn card identity');
  }


  {
    const original=state();original.startSeat=1;original.p[1].deck=[card({id:'round-two',n:'Round Two Draw',zone:'DECK',el:'WATER'})];
    const result=engine.validateAndApplyMove(original,move('END_TURN'));
    check(result.state.turn===2&&result.events.find(item=>item.type==='TURN_START').turn===2,'round rollover tags TURN_START with the new round');
    check(result.events.find(item=>item.type==='DRAW').turn===2,'round rollover tags the resulting draw with the new round');
  }

  {
    const original=state();original.p[1].deck=[card({id:'draw',n:'Hidden Card',zone:'DECK',el:'WATER'})];
    const history=Array.from({length:200},(_,index)=>({seq:index+1,type:'OLD',text:`old ${index+1}`}));
    const room={players:['uid-a','uid-b'],state:original,events:history,eventSeq:200},db=mockDb(room);
    const handler=createSubmitMoveHandler({auth:{async verifyIdToken(){return{uid:'uid-a'}}},db});
    const res=response();await handler({method:'POST',headers:{authorization:'Bearer token'},body:{roomId:'ROOM01',move:{v:1,type:'END_TURN',rev:0,payload:{}}}},res);
    const roomWrite=db.writes.find(write=>write.kind==='update').data,viewB=db.writes.find(write=>write.path.endsWith('/views/uid-b')).data.state;
    check(res.statusCode===200&&roomWrite.eventSeq===203,'server assigns monotonic sequence numbers to move events');
    check(roomWrite.events.length===200&&roomWrite.events.at(-1).seq===203,'server caps authoritative event history at 200 entries');
    check(viewB.events.at(-1).cardName==='Hidden Card','each private view receives the ordered event history filtered for its viewer');
    check(db.writes.length===3,'events ride in the existing room and two-view transaction without extra writes');
  }

  {
    const game=fs.readFileSync('js/game.js','utf8');
    check(/next\.events\.map\(item=>`#\$\{item\.seq\}/.test(game),'online Event Log renders ordered snapshot events');
    check(/G\.events\.filter\(item=>item\.seq>EB_LOG_COUNT\)/.test(game),'capped online history uses event sequence—not array length—as its fresh-event cursor');
  }

  console.log(`Multiplayer event stream 1.0.1: ${checks} checks passed`);
})().catch(error=>{console.error(error);process.exitCode=1});
