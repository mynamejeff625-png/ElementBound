// Issue #103 · 1.15.0 Hybrid Resonance planner. The Hard rival and the Balance Lab share ebPlanHybridPlay():
// play the missing parent cards first, hold Resonance payoffs until Resonance is on, and move a ready Tempest Striker.
// Rules are unchanged; only which card the rival (and the Lab) chooses.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const engine=require('../lib/gameEngine.js');
const matchFactory=require('../lib/matchFactory.js');
const ElementBoundCards=require('../lib/cardCatalog.js');

let checks=0;const check=(value,message)=>{assert.ok(value,message);checks++};
let source=fs.readFileSync('js/game.js','utf8');
source=source.slice(0,source.lastIndexOf('\nsetup();')).replace('return Object.freeze({DECKS:','return Object.freeze({_makeState:makeState,_choosePlay:choosePlay,_doPlay:doPlay,DECKS:');
const ctx=vm.createContext({console,Math,window:{ElementBoundCards,ElementBoundMatchFactory:matchFactory,ElementBoundEngine:engine},document:{getElementById:()=>null,querySelector:()=>null,querySelectorAll:()=>[]},setTimeout:()=>0,clearTimeout(){},requestAnimationFrame(){}});
vm.runInContext(source,ctx);
vm.runInContext(`add=()=>{};render=()=>{};bump=()=>{};ebQueueFx=()=>{};modal=()=>{};hideModal=()=>{};`,ctx);

// Balance Lab: play a whole turn with choosePlay/doPlay and record each card with the Resonance state it resolved under.
const lab=vm.runInContext(`(()=>{const B=EB_BALANCE;let sid=0;
  const u=(el,n,c,a,h,extra={})=>({el,n,c,a,h,max:h,type:'MANIFESTATION',guard:false,marks:[],armor:0,growth:0,momentum:0,ready:true,sick:false,sid:'t'+(++sid),_ebSummonedTurn:0,_ebFirstOpportunitySeen:true,...extra});
  const t=(el,n,c)=>({el,n,c,type:'TECHNIQUE',marks:[],sid:'t'+(++sid)});
  function turn(st,owner){let out=[];for(let k=0;k<5;k++){let c=B._choosePlay(st,owner);if(!c)break;let before=!!st.p[owner].turnState.resonance.active;B._doPlay(st,owner,c);out.push([c.n,c.type==='TECHNIQUE'?before:null])}return out}
  let r={};
  // Magma: payoff in hand with one Fire and one Earth card → Fire, Earth, then Molten Channel under Resonance.
  let st=B._makeState('MAGMA','FIRE','planner-magma'),p=st.p[0];p.slots=[u('EARTH','Earthen Guard',2,1,5),null,null];p.hand=[t('MAGMA','Molten Channel',2),u('FIRE','Cinder Adept',1,1,2),u('EARTH','Stone Initiate',1,1,3)];p.e=4;
  r.magma=turn(st,0);
  // Magma with a tempting alternative: Obsidian Ravager (4 Essence) would take the turn; the plan comes first.
  st=B._makeState('MAGMA','FIRE','planner-ravager');p=st.p[0];p.slots=[u('EARTH','Earthen Guard',2,1,5),null,null];p.hand=[u('MAGMA','Obsidian Ravager',4,4,5),t('MAGMA','Molten Channel',2),u('FIRE','Cinder Adept',1,1,2),t('EARTH','Fortify',2)];p.e=5;
  r.ravager=turn(st,0);
  // Magma hold: no Earth card, so Molten Channel stays in hand.
  st=B._makeState('MAGMA','FIRE','planner-hold');p=st.p[0];p.slots=[u('EARTH','Earthen Guard',2,1,5),null,null];p.hand=[t('MAGMA','Molten Channel',2),u('FIRE','Flare Hawk',3,3,3)];p.e=5;
  r.hold=turn(st,0);r.holdHand=p.hand.map(c=>c.n);
  // Bloom: Rainseed waits for a Water and a Nature card, then grants Growth under Resonance.
  st=B._makeState('BLOOM','FIRE','planner-bloom');p=st.p[0];let ally=u('WATER','Tide Warden',2,2,4);p.slots=[ally,null,null];p.hand=[t('BLOOM','Rainseed',2),t('WATER','Current Shift',1),t('NATURE','Verdant Mend',2)];p.e=5;
  r.bloom=turn(st,0);r.bloomGrowth=ally.growth;
  // Storm: a ready Tempest Striker and an empty slot → Crosswind Spark moves the Striker, not the first unit.
  st=B._makeState('STORM','FIRE','planner-storm');p=st.p[0];let first=u('AIR','Gale Scout',2,2,3),striker=u('STORM','Tempest Striker',3,3,3);p.slots=[first,striker,null];p.hand=[t('STORM','Crosswind Spark',1)];p.e=1;
  r.storm=turn(st,0);r.strikerSlot=p.slots.indexOf(striker);r.strikerMoved=p.turnState.moved.includes(striker.sid);
  // Prime decks: the planner has no opinion.
  r.prime=ebPlanHybridPlay({el:'FIRE',slots:[null,null,null],turnState:{}},[{n:'Flame Burst',c:2,el:'FIRE',type:'TECHNIQUE'}],()=>1,m=>m.sid)===undefined;
  return r})()`,ctx);
check(lab.magma.length===3&&lab.magma[2][0]==='Molten Channel'&&lab.magma[2][1]===true,`Lab Magma: two parent cards, then Molten Channel under Resonance (${JSON.stringify(lab.magma)})`);
check(new Set(lab.magma.slice(0,2).map(x=>x[0])).size===2&&lab.magma.slice(0,2).every(x=>['Cinder Adept','Stone Initiate'].includes(x[0])),'Lab Magma: the two parent cards come first');
check(lab.ravager.map(x=>x[0]).join()==='Cinder Adept,Fortify,Molten Channel'&&lab.ravager[2][1]===true,`Lab Magma: the Resonance plan beats a bigger card when it fits this turn (${JSON.stringify(lab.ravager)})`);
check(JSON.stringify(lab.hold)==='[["Flare Hawk",null]]'&&lab.holdHand.join()==='Molten Channel',`Lab Magma: without an Earth card, Molten Channel is held (${JSON.stringify(lab.hold)})`);
check(lab.bloom.length===3&&lab.bloom[2][0]==='Rainseed'&&lab.bloom[2][1]===true&&lab.bloomGrowth>=1,`Lab Bloom: Rainseed resolves under Resonance and grants Growth (${JSON.stringify(lab.bloom)}, growth ${lab.bloomGrowth})`);
check(lab.storm[0][0]==='Crosswind Spark'&&lab.strikerSlot===2&&lab.strikerMoved,`Lab Storm: Crosswind Spark moves Tempest Striker (slot ${lab.strikerSlot})`);
check(lab.prime,'Prime decks: the planner returns no opinion');

// Live Hard rival: same scenarios through ai(); record the Resonance state each Hybrid Technique resolves under.
const live=vm.runInContext(`(()=>{let seen=[],orig=resolveHybridTechnique;resolveHybridTechnique=function(p,e,c,...rest){seen.push([c.n,resonant(p)]);return orig(p,e,c,...rest)};
  const tech=(el,n,c)=>{let x=mk(el,n,c,0,0);x.type='TECHNIQUE';return x};
  function rivalTurn(el,slots,hand,essence,level='Difficult'){diff=level;seen=[];let you=player('You','FIRE'),r=player('Rival',el);you.slots=[null,null,null];you.deck=[mk('FIRE','D',1,1,1)];r.slots=slots;r.hand=hand;r.e=essence;r.maxE=essence;r.deck=[];
    G={p:[you,r],active:1,startSeat:0,turn:3,chain:0,logs:[],winner:null,trial:null,rev:0};EB_INIT_LOCK=false;ai();return r}
  let out={};
  let guard=mk('EARTH','Earthen Guard',2,1,5);guard.sick=true;
  rivalTurn('MAGMA',[guard,null,null],[tech('MAGMA','Molten Channel',2),mk('FIRE','Cinder Adept',1,1,2),mk('EARTH','Stone Initiate',1,1,3)],4);out.magma=seen.slice();
  let g0=mk('EARTH','Earthen Guard',2,1,5);g0.sick=true;let r0=rivalTurn('MAGMA',[g0,null,null],[mk('MAGMA','Obsidian Ravager',4,4,5),tech('MAGMA','Molten Channel',2),mk('FIRE','Cinder Adept',1,1,2),tech('EARTH','Fortify',2)],5);out.ravager=seen.slice();out.ravagerHand=r0.hand.map(c=>c.n);
  let g2=mk('EARTH','Earthen Guard',2,1,5);g2.sick=true;let r2=rivalTurn('MAGMA',[g2,null,null],[tech('MAGMA','Molten Channel',2),mk('FIRE','Flare Hawk',3,3,3)],5);out.holdHand=r2.hand.map(c=>c.n);
  let ally=mk('WATER','Tide Warden',2,2,4);ally.sick=true;rivalTurn('BLOOM',[ally,null,null],[tech('BLOOM','Rainseed',2),tech('WATER','Current Shift',1),tech('NATURE','Verdant Mend',2)],5);out.bloom=seen.slice();out.bloomGrowth=ally.growth;
  let first=mk('AIR','Gale Scout',2,2,3),striker=mk('STORM','Tempest Striker',3,3,3);first.sick=true;let r3=rivalTurn('STORM',[first,striker,null],[tech('STORM','Crosswind Spark',1)],1);out.strikerSlot=r3.slots.indexOf(striker);out.strikerMomentum=striker.momentum||0;
  // Medium keeps its old choice (no planner): Molten Channel is never held back.
  let g3=mk('EARTH','Earthen Guard',2,1,5);g3.sick=true;let r4=rivalTurn('MAGMA',[g3,null,null],[tech('MAGMA','Molten Channel',2),mk('FIRE','Flare Hawk',3,3,3)],5,'Medium');out.mediumHand=r4.hand.map(c=>c.n);
  resolveHybridTechnique=orig;return out})()`,ctx);
check(JSON.stringify(live.magma)==='[["Molten Channel",true]]',`live Hard rival: Molten Channel resolves under Resonance (${JSON.stringify(live.magma)})`);
check(JSON.stringify(live.ravager)==='[["Molten Channel",true]]'&&live.ravagerHand.join()==='Obsidian Ravager',`live Hard rival: the Resonance plan beats a bigger card (${JSON.stringify(live.ravager)}, hand ${live.ravagerHand})`);
check(live.holdHand.join()==='Molten Channel','live Hard rival: without an Earth card, Molten Channel stays in hand');
check(JSON.stringify(live.bloom)==='[["Rainseed",true]]'&&live.bloomGrowth>=1,`live Hard rival: Rainseed resolves under Resonance and grants Growth (${JSON.stringify(live.bloom)})`);
// The rival's turn ends the round here, so Crosswind Spark's Momentum has already expired; the move is what counts.
check(live.strikerSlot===2,`live Hard rival: Crosswind Spark moves Tempest Striker (slot ${live.strikerSlot})`);
check(live.mediumHand.length===0,'live Medium rival: unchanged, it does not hold Hybrid payoffs');

const version=fs.readFileSync('js/version.js','utf8');check(/version:'1\.15\.0'/.test(version)&&/balanceLab:'Balance Lab XXVII'/.test(version),'release 1.15.0 with a new Balance Lab identifier');
console.log(`Hybrid planner 1.15.0: ${checks} checks passed`);
