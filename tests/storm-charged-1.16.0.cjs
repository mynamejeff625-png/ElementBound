// Issue #103 · 1.16.0 (Owner-approved package, PR 2 of 3):
// - Charged: a Charged enemy Bender is released by the next Lightning attack this round, whatever it targets (+1);
// - Storm plays a 2nd Tempest Striker and a 2nd Crosswind Spark, replacing one Spark Runner and one Breeze Disciple;
// - Spark Runner 2/2 → 2/1.
// The engine, live play, the rival AI and the Balance Lab must agree.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const engine=require('../lib/gameEngine.js');
const matchFactory=require('../lib/matchFactory.js');
const ElementBoundCards=require('../lib/cardCatalog.js');

let checks=0;const check=(value,message)=>{assert.ok(value,message);checks++};

// Card data and deck lists.
const spark=ElementBoundCards.BASE.LIGHTNING.find(x=>x[0]==='Spark Runner');
check(spark[1]===1&&spark[2]===2&&spark[3]===1,'Spark Runner is 1-cost 2/1');
check(JSON.stringify(ElementBoundCards.HYBRID_EXTRAS)==='{"STORM":["Tempest Striker","Crosswind Spark"]}','only Storm has extra Hybrid copies');
const counts=el=>{let n=0;const p=matchFactory.createPlayer({name:'X',element:el,nextId:()=>++n,random:()=>0.5}),all=[...p.deck,...p.hand],c={};all.forEach(x=>c[x.n]=(c[x.n]||0)+1);c.total=all.length;return c};
const storm=counts('STORM');
check(storm.total===21&&storm['Tempest Striker']===2&&storm['Crosswind Spark']===2,`online Storm deck: 21 cards with 2 Tempest Striker and 2 Crosswind Spark (${JSON.stringify(storm)})`);
check(storm['Spark Runner']===2&&storm['Breeze Disciple']===2&&storm['Arc Runner']===2&&storm['Gale Scout']===2,'Storm drops one Spark Runner and one Breeze Disciple; its 2-cost units stay');
for(const el of ['MAGMA','BLOOM']){const c=counts(el);check(c.total===21&&Object.entries(c).filter(([k])=>k!=='total').every(([k,v])=>!ElementBoundCards.HYBRID_CARDS[el].some(h=>h.n===k)||v===1),`${el} deck is unchanged (one copy of each Hybrid card)`)}

// Engine helpers.
function unit(id,el,n,a,h,extra={}){return{id,el,n,c:1,type:'MANIFESTATION',a,h,max:h,armor:0,ready:true,sick:false,guard:false,zone:'FIELD',marks:[],growth:0,momentum:0,quick:null,turnFlags:{},...extra}}
function side(name,el,{slots=[null,null,null],marks=[]}={}){return{name,el,vit:30,maxE:7,e:7,deck:[unit(name+'-d1',el,'D1',1,1,{zone:'DECK'})],hand:[],wake:[],slots,marks,recycles:3,exhaustion:0,initiationToken:false,autoPass:true,responseEl:el,turnState:{resonance:{a:false,b:false,active:false},parents:[],moved:[],resolved:[]}}}
function attack(attackerEl,{benderCharged=true,targetCharged=false}={}){
  const s={turn:3,active:0,startSeat:0,chain:0,rev:1,winner:null,p:[side('A',attackerEl,{slots:[unit('att',attackerEl,'Attacker',2,9),null,null]}),side('B','FIRE',{marks:benderCharged?['Charged']:[],slots:[unit('t','FIRE','Target',1,9,{marks:targetCharged?['Charged']:[]}),null,null]})]};
  const r=engine.validateAndApplyMove(s,{v:1,type:'ATTACK',actor:0,rev:1,payload:{attackerId:'att',targetId:'t',targetType:'MANIFESTATION'}},{now:1});assert.ok(r.ok,JSON.stringify(r.error));
  return{hp:r.state.p[1].slots[0].h,bender:r.state.p[1].marks.includes('Charged'),target:r.state.p[1].slots[0].marks.includes('Charged')};
}
{
  let r=attack('LIGHTNING');check(r.hp===6&&!r.bender,`engine: a Lightning attack on a Manifestation draws the Bender's Charge (+1, 9 → ${r.hp})`);
  r=attack('FIRE');check(r.hp===7&&r.bender,'engine: a non-Lightning attack leaves the Charged Bender alone');
  r=attack('LIGHTNING',{benderCharged:false});check(r.hp===7,'engine: no Charge, no bonus');
  r=attack('LIGHTNING',{targetCharged:true});check(r.hp===6&&!r.target&&r.bender,'engine: a Charged target is used first; the Bender keeps its Charge');
}

// Live play, the rival AI and the Balance Lab.
let source=fs.readFileSync('js/game.js','utf8');
source=source.slice(0,source.lastIndexOf('\nsetup();')).replace('return Object.freeze({DECKS:','return Object.freeze({_makeState:makeState,_attackBonus:attackBonus,_makeDeck:makeDeck,_rng:rng,DECKS:');
const ctx=vm.createContext({console,Math,window:{ElementBoundCards,ElementBoundMatchFactory:matchFactory,ElementBoundEngine:engine},document:{getElementById:()=>null,querySelector:()=>null,querySelectorAll:()=>[]},setTimeout:()=>0,clearTimeout(){},requestAnimationFrame(){}});
vm.runInContext(source,ctx);
vm.runInContext(`add=()=>{};render=()=>{};bump=()=>{};ebQueueFx=()=>{};modal=()=>{};hideModal=()=>{};`,ctx);
const live=vm.runInContext(`(()=>{let you=player('You','LIGHTNING'),rival=player('Rival','LIGHTNING');G={p:[you,rival],active:0,startSeat:0,turn:3,chain:0,logs:[],winner:null,trial:null,rev:0};
  let mine=mk('LIGHTNING','Arc Runner',2,4,3),theirs=mk('LIGHTNING','Volt Lynx',3,3,3),fire=mk('FIRE','Flare Hawk',3,3,3),t=mk('FIRE','Target',1,1,9);
  rival.marks=['Charged'];let player1=elementalAttackBonus(mine,t,you),playerCleared=!rival.marks.includes('Charged'),player2=elementalAttackBonus(mine,t,you);
  rival.marks=['Charged'];let fireBonus=elementalAttackBonus(fire,t,you),fireKept=rival.marks.includes('Charged');
  you.marks=['Charged'];G.active=1;let rivalBonus=elementalAttackBonus(theirs,t,rival),rivalCleared=!you.marks.includes('Charged');
  return{player1,playerCleared,player2,fireBonus,fireKept,rivalBonus,rivalCleared}})()`,ctx);
check(live.player1===1&&live.playerCleared&&live.player2===0,`live: your Lightning attack draws the rival Bender's Charge once (+1) (${JSON.stringify(live)})`);
check(live.fireBonus===0&&live.fireKept,'live: a non-Lightning attack does not');
check(live.rivalBonus===1&&live.rivalCleared,'rival AI: its Lightning attack draws your Bender\'s Charge');
const sim=vm.runInContext(`(()=>{const B=EB_BALANCE;let st=B._makeState('LIGHTNING','FIRE','charged-1160'),e=st.p[1];e.marks=['Charged'];
  let att={el:'LIGHTNING',n:'Arc Runner',a:4,h:3,marks:[]},t={el:'FIRE',n:'Target',a:1,h:9,marks:[]};let first=B._attackBonus(st,0,att,t),cleared=!e.marks.includes('Charged'),second=B._attackBonus(st,0,att,t);
  let d=B._makeDeck('STORM',B._rng('storm-1160')).cards,c={};d.forEach(x=>c[x.n]=(c[x.n]||0)+1);
  let l=B._makeDeck('LIGHTNING',B._rng('l-1160')).cards.find(x=>x.n==='Spark Runner');
  return{first,cleared,second,total:d.length,striker:c['Tempest Striker'],spark:c['Crosswind Spark'],runner:c['Spark Runner'],breeze:c['Breeze Disciple'],sparkRunner:[l.a,l.h]}})()`,ctx);
check(sim.first===1&&sim.cleared&&sim.second===0,`Balance Lab: the same Charge rule (${JSON.stringify(sim)})`);
check(sim.total===21&&sim.striker===2&&sim.spark===2&&sim.runner===2&&sim.breeze===2,'Balance Lab Storm deck matches the online deck');
check(sim.sparkRunner.join()==='2,1','Balance Lab Spark Runner is 2/1');

// The Tome and the in-duel glossary explain the new Charged rule (the two Tome files stay mirrored by tome-1.7.0).
const tome=require('../js/tomeData.js'),page=tome.pages.find(p=>p.title==='Charged');
check(page&&/Charged rival Bender is released by your next Lightning attack this round, whatever it targets/.test(page.rule),'Tome Charged page states the new rule');
check(/whatever it targets/.test(fs.readFileSync('js/game.js','utf8').match(/'Charged':'[^']*'/)[0]),'in-duel glossary states the new rule');

console.log(`Storm and Charged 1.16.0: ${checks} checks passed`);
