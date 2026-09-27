const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const {orientPlayerView}=require('../js/multiplayerClient.js');

const source=fs.readFileSync('js/game.js','utf8');
let checks=0;function check(value,message){assert.ok(value,message);checks++}

const start=source.indexOf('function ebMpCardLocation('),end=source.indexOf('function ebMpClearResponseTimer',start);
const adapterSource=source.slice(start,end);
const queued=[];
const context=vm.createContext({
  G:null,EB_VIS:null,EB_INIT_LOCK:false,
  EB_MP:{lastAnimatedSeq:null,initiativeShown:false,attackFxContext:null},
  ebQueueFx:event=>queued.push(event),
  ebInitiativeShow:()=>{context.initiativeShows++},initiativeShows:0,
  setTimeout:callback=>{callback();return 1},
  ebMpSyncServerClock(){},ebMpPerspective:value=>value,ebMpHandleResponseWindow(){},
  render(){},go(){},selectedCardId:null,diff:'Online'
});
vm.runInContext(adapterSource,context);

function unit(id,el='FIRE'){return{id,n:id,el,ready:true}}
function visualState(events=[],rev=1){return{rev,active:0,initiative:{starter:0,revealed:true,finished:true},p:[{slots:[unit('friendly','WATER'),null,null],hand:[],deck:[],wake:[unit('tech','EARTH')]},{slots:[unit('attacker','FIRE'),unit('summon','NATURE'),null],hand:[],deck:[],wake:[unit('destroyed','AIR')]}],events}}

{
  context.G=visualState();context.EB_VIS={p:[{slots:[{id:'friendly'},null,null]},{slots:[{id:'attacker'},{id:'destroyed'},null]}]};
  const events=[
    {seq:1,type:'ATTACK',actor:1,attackerId:'attacker',attackerName:'Attacker'},
    {seq:2,type:'DAMAGE',seat:0,targetId:'friendly',targetName:'Friendly',amount:2},
    {seq:3,type:'BENDER_DAMAGE',seat:0,amount:3},
    {seq:4,type:'DESTROYED',seat:1,cardId:'destroyed',cardName:'Destroyed'},
    {seq:5,type:'STATUS_APPLIED',seat:0,targetType:'CARD',targetId:'friendly',status:'Soaked'},
    {seq:6,type:'CARD_PLAYED',actor:1,cardId:'summon',cardName:'Summon',cardType:'MANIFESTATION',slotIndex:1},
    {seq:7,type:'CARD_PLAYED',actor:0,cardId:'tech',cardName:'Technique',cardType:'TECHNIQUE'},
    {seq:8,type:'TECHNIQUE_RESOLVED',actor:0,cardId:'tech',cardName:'Technique'},
    {seq:9,type:'RESPONSE_USED',defenderSeat:0,responseName:'Undertow',element:'WATER'},
    {seq:10,type:'INITIATION_TOKEN_SPENT',seat:0},
    {seq:11,type:'WIN',winner:'Player',text:'Player wins'}
  ];
  vm.runInContext('ebMpQueueVisualEvents',context)(events);
  check(queued.map(event=>event.kind).join(',')==='attack,hit,benderHit,defeat,status,summon,announce,announce,announce,announce','structured events enter the existing FX queue in event sequence order');
  check(queued[1].side===0&&queued[2].side===0&&queued[3].side===1,'damage, Bender, and destruction FX retain their oriented sides');
  check(queued[1].el==='FIRE'&&queued[4].el==='WATER'&&queued[5].el==='NATURE','damage inherits its attack element while status and summon FX use their matching elements');
}

{
  queued.length=0;context.EB_MP.attackFxContext=null;context.G=visualState();
  vm.runInContext('ebMpQueueVisualEvents',context)([{seq:1,type:'ATTACK',actor:1,attackerId:'attacker',attackerName:'Attacker'}]);
  queued.length=0;
  vm.runInContext('ebMpQueueVisualEvents',context)([{seq:2,type:'RESPONSE_PASSED'},{seq:3,type:'DAMAGE',seat:0,targetId:'friendly',amount:2}]);
  check(queued.length===1&&queued[0].kind==='hit'&&queued[0].el==='FIRE'&&queued[0].label==='Attacker','attack context survives a Response-window snapshot boundary');
}

{
  queued.length=0;context.EB_MP.lastAnimatedSeq=null;context.EB_MP.initiativeShown=false;context.G=visualState([{seq:1,type:'OLD'},{seq:2,type:'OLD'}],7);
  vm.runInContext('ebMpPrepareVisualEvents()',context);
  check(queued.length===0&&context.EB_MP.lastAnimatedSeq===2,'first load of an in-progress match baselines history without replaying FX');
  context.G.events.push({seq:3,type:'WIN',text:'New win'});vm.runInContext('ebMpPrepareVisualEvents()',context);let count=queued.length;
  vm.runInContext('ebMpPrepareVisualEvents()',context);
  check(count===1&&queued.length===1&&context.EB_MP.lastAnimatedSeq===3,'new events animate once and duplicate snapshots never replay them');
}

{
  queued.length=0;context.EB_MP.lastAnimatedSeq=null;context.EB_MP.initiativeShown=false;context.initiativeShows=0;context.EB_INIT_LOCK=false;
  context.G=visualState([{seq:1,type:'MATCH_START'},{seq:2,type:'INITIATIVE',starter:1,tokenSeat:0}],0);
  vm.runInContext('ebMpPrepareVisualEvents()',context);
  check(context.initiativeShows===1&&context.EB_INIT_LOCK&&context.G.initiative.starter===1&&!context.G.initiative.finished,'new rev-0 rooms show and lock on the server-authored initiative result');
  vm.runInContext('ebMpPrepareVisualEvents()',context);
  check(context.initiativeShows===1,'duplicate initial snapshots cannot replay the coin overlay');
}

{
  const remote={viewerSeat:1,active:0,startSeat:0,initiative:{starter:0},p:[{},{ }],events:[{seq:1,type:'INITIATIVE',starter:0,tokenSeat:1},{seq:2,type:'DAMAGE',seat:0}]};
  const oriented=orientPlayerView(remote);
  check(oriented.active===1&&oriented.initiative.starter===1&&oriented.events[0].starter===1&&oriented.events[0].tokenSeat===0,'player 2 sees server initiative from their own you/rival perspective');
  check(oriented.events[1].seat===1,'player 2 receives damage FX on the correctly flipped side');
}

{
  const required={ATTACK:'attack',DAMAGE:'hit',BENDER_DAMAGE:'benderHit',DESTROYED:'defeat',STATUS_APPLIED:'status',CARD_PLAYED:'summon',TECHNIQUE_RESOLVED:'announce',RESPONSE_USED:'announce',INITIATION_TOKEN_SPENT:'announce',WIN:'announce'};
  for(const [type,kind] of Object.entries(required))check(source.includes(`item.type==='${type}'`)&&source.includes(`kind:'${kind}'`),`${type} is mapped to the existing ${kind} FX path`);
  check(/q\.forEach\(\(ev,ix\)=>EB_FX_TIMERS\.push\(setTimeout/.test(source)&&/ix\*110/.test(source),'batched event FX use the existing bounded ordered timer queue');
  check(/item\.cardName==='Spark Runner'.*kind:'chain'/.test(source)&&/ev\.kind==='chain'[\s\S]{0,80}ebPulseChain/.test(source),'Spark Runner reuses the single-player Chain pulse online');
  check(/if\(EB_INIT_LOCK\)return \{ok:false,error:'INITIATIVE_PENDING'\}/.test(source),'online moves are blocked only while the initiative overlay is active');
  check(!adapterSource.includes('Math.random'),'online initiative presentation never randomizes the server result locally');
  check(!adapterSource.includes('hideModal')&&!adapterSource.includes('modal('),'event FX do not close or replace the Response prompt');
  check(/eventlessChanged=o\.armor!==n\.armor[\s\S]*o\.growth!==n\.growth[\s\S]*o\.quick!==n\.quick/.test(source)&&/!EB_MP\.enabled\|\|eventlessChanged/.test(source),'online Armor, Growth, and quick changes retain snapshot-derived target feedback');
}

console.log(`Multiplayer visual parity 1.1.1: ${checks} checks passed`);
