// Issue #93 · Second Prime Techniques: catalog and deck split, then the same scenario resolved by the
// authoritative engine, live single-player, the rival AI and the Balance Lab simulator must agree (AGENTS.md §4).
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const ElementBoundCards=require('../lib/cardCatalog.js');
const ElementBoundMatchFactory=require('../lib/matchFactory.js');
const engine=require('../lib/gameEngine.js');
const browser=require('../js/cardBrowser.js');

let checks=0;const check=(value,message)=>{assert.ok(value,message);checks++};
const {TECH,TECH2,HYBRIDS}=ElementBoundCards;
const PRIMES=['FIRE','WATER','NATURE','EARTH','LIGHTNING','AIR'];
const EXPECTED={FIRE:['Searing Brand',1,2],WATER:['Riptide',2,3],NATURE:['Wild Growth',2,3],EARTH:['Stone Fist',2,3],LIGHTNING:['Recharge',1,2],AIR:['Downdraft',1,3]};

// Catalog, deck split, Codex.
check(Object.isFrozen(ElementBoundCards)&&Object.keys(TECH2).sort().join()===PRIMES.slice().sort().join(),'every Prime, and only Primes, has a second Technique');
for(const el of PRIMES){
  const [name,cost,copies]=EXPECTED[el],t=TECH2[el];
  check(t[0]===name&&t[3]===cost&&t[4]===copies&&t[1].length>20&&t[2].length>10,`${el}: ${name} costs ${cost}, ships ${copies} copies, and has text and a tip`);
  check(typeof ElementBoundCards.SHORT[name]==='string','${name} has a short line');
  let id=0;const deck=ElementBoundMatchFactory.createDeck(el,{nextId:()=>++id}),count=n=>deck.filter(c=>c.n===n).length;
  check(deck.length===21&&deck.filter(c=>c.type==='TECHNIQUE').length===7,`${el}: deck stays 21 cards with 7 Techniques`);
  check(count(TECH[el][0])===7-copies&&count(name)===copies,`${el}: ${7-copies} ${TECH[el][0]} + ${copies} ${name}`);
  check(deck.filter(c=>c.n===name).every(c=>c.c===cost&&c.type==='TECHNIQUE'&&c.text===t[1]&&!Object.values(c).includes(undefined)),`${el}: ${name} cards are built from the catalog without undefined fields`);
  check(browser.deckCards(el,ElementBoundCards).some(c=>c.n===name&&c.type==='TECHNIQUE'),`${el}: the Codex shows ${name}`);
}
for(const el of Object.keys(HYBRIDS)){
  let id=0;const deck=ElementBoundMatchFactory.createDeck(el,{nextId:()=>++id});
  check(!deck.some(c=>Object.values(TECH2).some(t=>t[0]===c.n)),`${el}: Hybrid decks keep only first Techniques`);
}
const tome=require('../js/tomeData.js');
for(const el of PRIMES){
  const page=tome.pages.find(p=>p.kind==='element'&&p.element===el);
  check(page&&page.techniques.join()===`${TECH[el][0]},${TECH2[el][0]}`,`Tome ${page?.title}: lists both Techniques`);
}

// Engine harness.
function eCard(o){return{id:o.id,el:o.el||'FIRE',n:o.n||o.id,c:1,type:'MANIFESTATION',a:o.a,h:o.h,max:o.max||o.h,armor:o.armor||0,ready:true,sick:false,guard:false,zone:'FIELD',marks:[...(o.marks||[])],growth:o.growth||0,momentum:0,quick:null,turnFlags:{}}}
function eSide(name,el){return{name,el,vit:30,maxE:3,e:3,deck:[eCard({id:`${name}-d1`,a:1,h:1}),eCard({id:`${name}-d2`,a:1,h:1})],hand:[],wake:[],slots:[null,null,null],marks:[],initiationToken:false,autoPass:false,responseEl:el,recycles:3,turnState:{resonance:{a:false,b:false,active:false},parents:[],resolved:[],moved:[]}}}
function runEngine(sc){
  const el=sc.el,t=TECH2[el],s={turn:2,active:0,startSeat:0,chain:0,rev:4,winner:null,p:[eSide('A',el),eSide('B','WATER')]};
  if(sc.friend)s.p[0].slots[0]=eCard({id:'F',n:'Friend',el,...sc.friend});if(sc.enemy)s.p[1].slots[0]=eCard({id:'X',n:'Enemy',el:'WATER',...sc.enemy});
  s.p[0].hand=[{id:'T',el,n:t[0],c:t[3],type:'TECHNIQUE',zone:'HAND',text:t[1],tip:t[2]}];
  const payload={cardId:'T'};if(sc.friend)payload.friendId='F';if(sc.enemy)payload.enemyId='X';else if(sc.bender)payload.targetType='BENDER';
  const r=engine.validateAndApplyMove(s,{v:1,type:'PLAY_CARD',actor:0,rev:4,payload},{now:1000});
  assert.ok(r.ok,`engine ${sc.label}: ${r.error}`);
  const deep=v=>{if(v===undefined)throw Error(`undefined in ${sc.label}`);if(v&&typeof v==='object')Object.values(v).forEach(deep)};deep(r.state);deep(r.events);
  return summary(r.state.p[0],r.state.p[1]);
}
function summary(me,foe){
  const unit=(side,name)=>{const m=side.slots.find(x=>x&&x.n===name);return m?{h:m.h,a:m.a,armor:m.armor||0,growth:m.growth||0,momentum:Math.max(0,Math.floor(m.momentum||0)),marks:[...(m.marks||[])].sort().join('|')}:'gone'};
  return JSON.stringify({F:unit(me,'Friend'),X:unit(foe,'Enemy'),vit:foe.vit,benderMarks:[...(foe.marks||[])].sort().join('|')});
}

// Browser harness: live play, rival AI and the Balance Lab simulator.
let source=fs.readFileSync('js/game.js','utf8');
source=source.slice(0,source.lastIndexOf('\nsetup();')).replace('return Object.freeze({DECKS:','return Object.freeze({_makeState:makeState,_playTechnique:playTechnique,_choosePlay:choosePlay,_makeDeck:makeDeck,DECKS:');
const ctx=vm.createContext({console,Math,window:{ElementBoundCards,ElementBoundMatchFactory},document:{getElementById:()=>null,querySelector:()=>null,querySelectorAll:()=>[]},setTimeout:()=>0,clearTimeout(){},requestAnimationFrame(){}});
vm.runInContext(source,ctx);
vm.runInContext(`add=()=>{};render=()=>{};bump=()=>{};ebQueueFx=()=>{};modal=()=>{};hideModal=()=>{};`,ctx);
ctx.summaryJs=summary;ctx.TECH2=TECH2;
vm.runInContext(`
function liveUnit(el,o,name){let m=mk(el,name,1,o.a,o.h);m.max=o.max||o.h;m.armor=o.armor||0;m.marks=[...(o.marks||[])];m.growth=o.growth||0;return m}
function runLive(sc,asRival){
 let t=TECH2[sc.el],p=player('You',sc.el),e=player('Rival','WATER');p.e=3;e.e=3;
 let friend=sc.friend?liveUnit(sc.el,sc.friend,'Friend'):null,enemy=sc.enemy?liveUnit('WATER',sc.enemy,'Enemy'):null;
 p.slots=[friend,null,null];e.slots=[enemy,null,null];let c={id:++uid,el:sc.el,n:t[0],c:t[3],type:'TECHNIQUE',zone:'HAND',text:t[1]};
 if(asRival){
  // The rival plays as seat 1 with only this card in hand.
  // The rival's unit is summoning-sick so ai() casts but does not attack; only the card is compared.
  if(friend){friend.sick=true;friend.ready=false}
  e.slots=[friend,null,null];p.slots=[enemy,null,null];e.hand=[c];e.deck=[mk(sc.el,'Filler',9,1,1)];p.deck=[mk('WATER','Filler',9,1,1)];e.el=sc.el;
  G={p:[p,e],active:1,turn:2,chain:0,logs:[],winner:null,trial:null,rev:0};EB_INIT_LOCK=false;diff='Difficult';
  // Round-end expiry and the next turn start are stubbed so only the card's own effect is compared.
  let saved=[expireAllRoundEffects,turnStart];expireAllRoundEffects=()=>{};turnStart=()=>{};
  let before=e.wake.length;try{ai()}finally{[expireAllRoundEffects,turnStart]=saved}return{played:e.wake.length>before,out:summaryJs(e,p)};
 }
 p.hand=[c];G={p:[p,e],active:0,turn:2,chain:0,logs:[],winner:null,trial:null,rev:0};EB_INIT_LOCK=false;
 let target={};if(friend)target.friend=friend;if(enemy)target.enemy=enemy;else if(sc.bender)target.bender=e;if(!friend&&!enemy&&!sc.bender)target.auto=true;
 play(c,null,target);return{played:!p.hand.length,out:summaryJs(p,e)};
}
function runSim(sc){
 let t=TECH2[sc.el],st=EB_BALANCE._makeState(sc.el,'WATER','second-tech-'+sc.label),p=st.p[0],e=st.p[1];
 let u=(o,name)=>({n:name,a:o.a,h:o.h,max:o.max||o.h,armor:o.armor||0,marks:[...(o.marks||[])],growth:o.growth||0,momentum:0,sid:name});
 p.slots=[sc.friend?u(sc.friend,'Friend'):null,null,null];e.slots=[sc.enemy?u(sc.enemy,'Enemy'):null,null,null];p.marks=[];e.marks=[];e.vit=30;
 EB_BALANCE._playTechnique(st,0,{el:sc.el,n:t[0],c:t[3],type:'TECHNIQUE'});return summaryJs(p,e);
}
`,ctx);

const SCENARIOS=[
  {label:'Searing Brand on a Manifestation',el:'FIRE',friend:{a:2,h:3},enemy:{a:3,h:5},want:{X:{h:4,marks:'Burning'}}},
  {label:'Searing Brand on an empty field',el:'FIRE',friend:{a:2,h:3},bender:true,want:{vit:29,benderMarks:'Burning'}},
  {label:'Riptide Soaks a dry enemy',el:'WATER',enemy:{a:3,h:5},want:{X:{h:5,marks:'Soaked'}}},
  {label:'Riptide hits a Soaked enemy',el:'WATER',enemy:{a:3,h:5,marks:['Soaked']},want:{X:{h:3,marks:'Soaked'}}},
  {label:'Riptide destroys a Soaked enemy',el:'WATER',enemy:{a:3,h:2,marks:['Soaked']},want:{X:'gone'}},
  {label:'Wild Growth Seeds and grows',el:'NATURE',friend:{a:2,h:4},want:{F:{a:3,growth:1,marks:'Seeded'}}},
  {label:'Wild Growth at Growth 3',el:'NATURE',friend:{a:5,h:4,growth:3},want:{F:{a:5,growth:3,marks:'Seeded'}}},
  {label:'Stone Fist with 2 Armor',el:'EARTH',friend:{a:1,h:5,armor:2},enemy:{a:3,h:5},want:{X:{h:2},F:{armor:2}}},
  {label:'Stone Fist into enemy Armor',el:'EARTH',friend:{a:1,h:5},enemy:{a:3,h:5,armor:1},want:{X:{h:5,armor:0}}},
  {label:'Stone Fist on an empty field',el:'EARTH',friend:{a:1,h:5,armor:1},bender:true,want:{vit:28}},
  {label:'Downdraft with an enemy',el:'AIR',friend:{a:2,h:3},enemy:{a:3,h:5},want:{F:{a:3,momentum:1,marks:'Momentum'},X:{a:2,marks:'Weakened'}}},
  {label:'Downdraft with no enemy',el:'AIR',friend:{a:2,h:3},want:{F:{a:3,momentum:1}}},
  {label:'Recharge',el:'LIGHTNING',friend:{a:2,h:2},want:{vit:30}}
];
let rivalPlayed=0;
for(const sc of SCENARIOS){
  const fromEngine=runEngine(sc),live=vm.runInContext('runLive',ctx)(sc,false),sim=vm.runInContext('runSim',ctx)(sc);
  const parsed=JSON.parse(fromEngine);
  for(const [key,value] of Object.entries(sc.want)){
    if(typeof value!=='object')check(JSON.stringify(parsed[key])===JSON.stringify(value),`${sc.label}: engine ${key} is ${JSON.stringify(value)} (got ${JSON.stringify(parsed[key])})`);
    else for(const [field,v] of Object.entries(value))check(parsed[key]?.[field]===v,`${sc.label}: engine ${key}.${field} is ${v} (got ${parsed[key]?.[field]})`);
  }
  check(live.played,`${sc.label}: live play spends the card`);
  check(live.out===fromEngine,`${sc.label}: live play matches the engine\n live   ${live.out}\n engine ${fromEngine}`);
  check(sim===fromEngine,`${sc.label}: Balance Lab matches the engine\n sim    ${sim}\n engine ${fromEngine}`);
  const rival=vm.runInContext('runLive',ctx)(sc,true);
  if(rival.played)rivalPlayed++;
  if(rival.played)check(rival.out===fromEngine,`${sc.label}: rival AI matches the engine\n rival  ${rival.out}\n engine ${fromEngine}`);
}

check(rivalPlayed===SCENARIOS.length,`the rival AI casts the card in ${rivalPlayed}/${SCENARIOS.length} scenarios`);

// Engine legality: a card that names a target must get one.
{
  const base=()=>{const s={turn:2,active:0,startSeat:0,chain:0,rev:4,winner:null,p:[eSide('A','WATER'),eSide('B','FIRE')]};s.p[0].slots[0]=eCard({id:'F',a:1,h:3});s.p[1].slots[0]=eCard({id:'X',a:1,h:3});return s};
  const tryCard=(el,payload)=>{const s=base(),t=TECH2[el];s.p[0].hand=[{id:'T',el,n:t[0],c:t[3],type:'TECHNIQUE',zone:'HAND'}];return engine.validateAndApplyMove(s,{v:1,type:'PLAY_CARD',actor:0,rev:4,payload:{cardId:'T',...payload}},{now:1})};
  check(tryCard('WATER',{}).error==='ILLEGAL_TARGET','Riptide needs an enemy Manifestation');
  check(tryCard('NATURE',{}).error==='ILLEGAL_TARGET','Wild Growth needs a friendly Manifestation');
  check(tryCard('EARTH',{friendId:'F'}).error==='ILLEGAL_TARGET','Stone Fist must name an enemy while one is present');
  check(tryCard('AIR',{friendId:'F'}).error==='ILLEGAL_TARGET','Downdraft must name an enemy while one is present');
  check(tryCard('FIRE',{targetType:'BENDER'}).error==='ILLEGAL_TARGET','Searing Brand cannot skip a present enemy Manifestation');
  check(tryCard('FIRE',{enemyId:'X'}).ok&&tryCard('LIGHTNING',{}).ok,'Searing Brand and Recharge resolve with a legal target');
}

// The rival and the Balance Lab score the cards the same way, and skip illegal ones.
vm.runInContext(`
var simCheck=(()=>{let st=EB_BALANCE._makeState('NATURE','WATER','second-tech-choice'),p=st.p[0];
 p.slots=[{n:'Friend',a:2,h:4,max:4,marks:[],growth:0},null,null];p.hand=[{n:'Wild Growth',el:'NATURE',c:2,type:'TECHNIQUE'},{n:'Verdant Mend',el:'NATURE',c:2,type:'TECHNIQUE'}];p.e=2;
 let pick=EB_BALANCE._choosePlay(st,0);
 let st2=EB_BALANCE._makeState('WATER','FIRE','second-tech-legal'),q=st2.p[0];q.slots=[null,null,null];st2.p[1].slots=[null,null,null];q.hand=[{n:'Riptide',el:'WATER',c:2,type:'TECHNIQUE'}];q.e=2;
 let none=EB_BALANCE._choosePlay(st2,0);
 let deck=EB_BALANCE._makeDeck('EARTH',()=>0.5).cards;
 return{pick:pick&&pick.n,none:none===null,stoneFist:deck.filter(c=>c.n==='Stone Fist').length,fortify:deck.filter(c=>c.n==='Fortify').length}})();
`,ctx);
const sim=ctx.simCheck;
check(sim.pick==='Wild Growth','Balance Lab picks Wild Growth over Verdant Mend when no ally is Seeded');
check(sim.none,'Balance Lab never casts Riptide at an empty enemy field');
check(sim.stoneFist===3&&sim.fortify===4,'Balance Lab Earth deck holds 4 Fortify + 3 Stone Fist');

console.log(`Second Techniques 1.11.0: ${checks} checks passed`);
