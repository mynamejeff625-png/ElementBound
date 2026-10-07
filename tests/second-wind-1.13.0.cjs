// Issue #99 · Second Wind: from round 2, start your turn with fewer Manifestations than the rival and either 2 or
// fewer cards in hand or 2+ fewer Manifestations → draw 1 extra card (never from an empty Deck).
// The engine, live play, the rival AI and the Balance Lab use the same rule.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const engine=require('../lib/gameEngine.js');
const matchFactory=require('../lib/matchFactory.js');
const {buildPlayerView}=require('../lib/playerView.js');
const ElementBoundCards=require('../lib/cardCatalog.js');

let checks=0;const check=(value,message)=>{assert.ok(value,message);checks++};
function deepNoUndefined(value,path='root'){if(value===undefined)throw Error(`undefined at ${path}`);if(value&&typeof value==='object')for(const [k,v] of Object.entries(value))deepNoUndefined(v,`${path}.${k}`);return true}
function unit(id,zone='FIELD'){return{id,el:'FIRE',n:id,c:1,type:'MANIFESTATION',a:1,h:3,max:3,armor:0,ready:true,sick:false,guard:false,zone,marks:[],growth:0,momentum:0,quick:null,turnFlags:{}}}
function side(name,{field=0,hand=0,deck=6}={}){return{name,el:'FIRE',vit:30,maxE:3,e:3,deck:Array.from({length:deck},(_,i)=>unit(`${name}-d${i}`,'DECK')),hand:Array.from({length:hand},(_,i)=>unit(`${name}-h${i}`,'HAND')),wake:[],slots:[0,1,2].map(i=>i<field?unit(`${name}-f${i}`):null),marks:[],recycles:3,exhaustion:0,initiationToken:false,autoPass:false,responseEl:'FIRE',turnState:{resonance:{a:false,b:false,active:false},parents:[],resolved:[],moved:[]}}}
// Seat 1 ends its turn; seat 0 starts round `round` (seat 0 started the duel).
function startTurnFor(you,rival,round=3){const s={turn:round-1,active:1,startSeat:0,chain:0,rev:2,winner:null,p:[side('You',you),side('Rival',rival)]};return engine.validateAndApplyMove(s,{v:1,type:'END_TURN',actor:1,rev:2,payload:{}},{now:1})}
const drew=r=>r.events.filter(e=>e.type==='DRAW'&&e.actor===0).length;
const wind=r=>r.events.some(e=>e.type==='SECOND_WIND'&&e.actor===0);

// When it applies (hand counts are after the normal draw).
{
  let r=startTurnFor({field:0,hand:1},{field:1});check(r.ok&&drew(r)===2&&wind(r)&&r.state.p[0].hand.length===3,'behind with a low hand: draw 1 extra card');
  r=startTurnFor({field:1,hand:3},{field:2});check(r.ok&&drew(r)===1&&!wind(r),'1 behind with 4 cards: no Second Wind');
  r=startTurnFor({field:1,hand:2},{field:2});check(r.ok&&drew(r)===1&&!wind(r)&&r.state.p[0].hand.length===3,'boundary: 1 behind with 3 cards after the draw → no Second Wind');
  r=startTurnFor({field:1,hand:1},{field:2});check(r.ok&&drew(r)===2&&wind(r),'boundary: 1 behind with 2 cards after the draw → Second Wind');
  r=startTurnFor({field:0,hand:4},{field:2});check(r.ok&&drew(r)===2&&wind(r),'2 behind: Second Wind whatever the hand size');
  r=startTurnFor({field:1,hand:0},{field:1});check(r.ok&&drew(r)===1&&!wind(r),'level field: no Second Wind');
  r=startTurnFor({field:0,hand:0,deck:1},{field:2});check(r.ok&&drew(r)===1&&!wind(r)&&r.state.p[0].vit===30,'only the normal draw when the Deck has one card; Second Wind never causes Exhaustion');
  r=startTurnFor({field:0,hand:0,deck:0},{field:2});check(r.ok&&!wind(r)&&r.state.p[0].vit===28&&r.state.p[0].exhaustion===1,'an empty Deck takes only the normal Exhaustion');
  // Round 1: the second player's first turn never gets Second Wind.
  const s={turn:1,active:0,startSeat:0,chain:0,rev:2,winner:null,p:[side('A',{field:1}),side('B',{hand:0})]};
  r=engine.validateAndApplyMove(s,{v:1,type:'END_TURN',actor:0,rev:2,payload:{}},{now:1});
  check(r.ok&&r.state.active===1&&r.state.turn===1&&r.state.p[1].hand.length===1,'round 1: no Second Wind');
}
// Privacy: both drawn cards stay private to the drawing seat.
{
  const r=startTurnFor({field:0,hand:0},{field:2});
  check(deepNoUndefined(r.state)&&deepNoUndefined(r.events),'state and events stay Firestore-safe');
  const rival=buildPlayerView(r.state,1,r.events.map((e,i)=>({...e,seq:i+1})),1),own=buildPlayerView(r.state,0,r.events.map((e,i)=>({...e,seq:i+1})),1);
  const rivalDraws=rival.events.filter(e=>e.type==='DRAW'),ownDraws=own.events.filter(e=>e.type==='DRAW');
  check(rivalDraws.length===2&&rivalDraws.every(e=>e.cardName===undefined&&e.cardId===undefined),'the rival sees two draws but no card names');
  check(ownDraws.length===2&&ownDraws.every(e=>typeof e.cardName==='string'),'the drawing Bender sees both card names');
  check(rival.events.some(e=>e.type==='SECOND_WIND')&&rival.p[0].handCount===2,'the rival sees that Second Wind happened and the new hand size');
}

// Live single-player, rival AI and the Balance Lab.
let source=fs.readFileSync('js/game.js','utf8');
source=source.slice(0,source.lastIndexOf('\nsetup();')).replace('return Object.freeze({DECKS:','return Object.freeze({_makeState:makeState,_startTurn:startTurn,DECKS:');
const ctx=vm.createContext({console,Math,window:{ElementBoundCards,ElementBoundMatchFactory:matchFactory,ElementBoundEngine:engine},document:{getElementById:()=>null,querySelector:()=>null,querySelectorAll:()=>[]},setTimeout:()=>0,clearTimeout(){},requestAnimationFrame(){}});
vm.runInContext(source,ctx);
vm.runInContext(`add=()=>{};render=()=>{};bump=()=>{};ebQueueFx=()=>{};modal=()=>{};hideModal=()=>{};`,ctx);
const live=vm.runInContext(`(()=>{const filler=n=>Array.from({length:n},(_,i)=>mk('FIRE','Filler',9,1,1));
 let a=player('You','FIRE'),b=player('Rival','FIRE');a.hand=[];a.deck=filler(5);a.slots=[null,null,null];b.slots=[mk('FIRE','X',1,1,3),null,null];
 G={p:[a,b],active:1,startSeat:0,turn:2,chain:0,logs:[],winner:null,trial:null,rev:0};EB_INIT_LOCK=false;ebPassTurn(0);let you=a.hand.length;
 // The rival (seat 1) behind 2 with a full hand still catches its Second Wind.
 b.slots=[null,null,null];a.slots=[mk('FIRE','Y',1,1,3),mk('FIRE','Z',1,1,3),null];b.hand=filler(4);b.deck=filler(5);ebPassTurn(1);let rival=b.hand.length;
 // Trials never trigger it.
 let c=player('T','FIRE');c.hand=[];c.deck=filler(3);G={p:[c,b],active:1,startSeat:0,turn:3,chain:0,logs:[],winner:null,trial:{element:'FIRE',progress:{}},rev:0};b.slots=[mk('FIRE','Q',1,1,3),null,null];ebPassTurn(0);
 return{you,rival,trial:c.hand.length,glossary:!!GLOSSARY['Second Wind']}})()`,ctx);
check(live.you===2,'live: behind with an empty hand → normal draw + Second Wind');
check(live.rival===6,'live rival: 2 behind with a full hand → normal draw + Second Wind');
check(live.trial===1,'Trials keep their scripted draws');
check(live.glossary,'the in-duel glossary explains Second Wind');
const sim=vm.runInContext(`(()=>{let st=EB_BALANCE._makeState('FIRE','WATER','second-wind');st.turn=3;let p=st.p[0],e=st.p[1];p.slots=[null,null,null];e.slots=[{n:'X',a:1,h:3,max:3,marks:[]},null,null];p.hand=[];
 EB_BALANCE._startTurn(st,0,true);let behind=p.hand.length;p.hand=[];e.slots=[null,null,null];EB_BALANCE._startTurn(st,0,true);return{behind,level:p.hand.length}})()`,ctx);
check(sim.behind===2&&sim.level===1,`Balance Lab applies the same rule (${JSON.stringify(sim)})`);

const tome=require('../js/tomeData.js'),page=tome.pages.find(p=>p.title==='Second Wind');
check(page&&page.chapter==='core'&&/2 or fewer cards/.test(page.rule)&&/never draws from an empty/.test(page.rule),'the Tome explains Second Wind in Core Terms');
console.log(`Second Wind 1.13.0: ${checks} checks passed`);
