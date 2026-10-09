// Issue #103 · hotfix 1.13.2: rules bugs found by the card, effect and combo audit.
// 1. The live rival never treats its Response card as a Manifestation (it used to summon it and hit for NaN).
// 2-4. The online engine matches live play and the Balance Lab for Static Step, Gale Scout and Tidelily Guardian.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const engine=require('../lib/gameEngine.js');
const matchFactory=require('../lib/matchFactory.js');
const ElementBoundCards=require('../lib/cardCatalog.js');

let checks=0;const check=(value,message)=>{assert.ok(value,message);checks++};

let source=fs.readFileSync('js/game.js','utf8');
source=source.slice(0,source.lastIndexOf('\nsetup();'));
const ctx=vm.createContext({console,Math,window:{ElementBoundCards,ElementBoundMatchFactory:matchFactory,ElementBoundEngine:engine},document:{getElementById:()=>null,querySelector:()=>null,querySelectorAll:()=>[]},setTimeout:()=>0,clearTimeout(){},requestAnimationFrame(){}});
vm.runInContext(source,ctx);
vm.runInContext(`add=()=>{};render=()=>{};bump=()=>{};ebQueueFx=()=>{};modal=()=>{};hideModal=()=>{};`,ctx);

// 1 · The rival keeps its Response card in hand on every difficulty.
for(const level of ['Difficult','Medium','Easy']){
  const r=vm.runInContext(`(()=>{diff=${JSON.stringify(level)};let you=player('You','FIRE'),rival=player('Rival','EARTH');you.slots=[null,null,null];you.hand=[];rival.slots=[null,null,null];rival.e=4;rival.maxE=4;rival.deck=[];
    rival.hand=[{id:'eg',el:'EARTH',n:'Earthen Guard',c:2,a:1,h:5,max:5,type:'MANIFESTATION',guard:true,zone:'HAND',marks:[]},{id:'resp',el:'EARTH',n:'Stonewall',c:2,type:'RESPONSE',zone:'HAND',marks:[]}];
    G={p:[you,rival],active:1,startSeat:0,turn:3,chain:0,logs:[],winner:null,trial:null,rev:0};EB_INIT_LOCK=false;ai();
    let field=rival.slots.filter(Boolean).map(m=>m.type),held=rival.hand.some(c=>c.type==='RESPONSE');
    rival.slots.forEach(m=>{if(m){m.ready=true;m.sick=false}});G.active=1;ai();
    return{field,held,vit:you.vit}})()`,ctx);
  check(r.field.length===1&&r.field[0]==='MANIFESTATION',`${level} rival summons only its Manifestation (${JSON.stringify(r.field)})`);
  check(r.held,`${level} rival keeps Stonewall in hand for a Response window`);
  check(Number.isFinite(r.vit),`${level} rival attacks leave your Vitality a number (${r.vit})`);
}

// Engine helpers.
function unit(id,el,n,a,h,extra={}){return{id,el,n,c:1,type:'MANIFESTATION',a,h,max:h,armor:0,ready:true,sick:false,guard:false,zone:'FIELD',marks:[],growth:0,momentum:0,quick:null,turnFlags:{},...extra}}
function tech(id,el,n,c){return{id,el,n,c,type:'TECHNIQUE',zone:'HAND',marks:[]}}
function side(name,el,{slots=[null,null,null],hand=[],parents=[],vit=30}={}){return{name,el,vit,maxE:7,e:10,deck:[unit(name+'-d1',el,'D1',1,1,{zone:'DECK'}),unit(name+'-d2',el,'D2',1,1,{zone:'DECK'})],hand,wake:[],slots,marks:[],recycles:3,exhaustion:0,initiationToken:false,autoPass:true,responseEl:el,turnState:{resonance:{a:false,b:false,active:false},parents,moved:[],resolved:[]}}}
function duel(a,b){return{turn:3,active:0,startSeat:0,chain:0,rev:1,winner:null,p:[a,b]}}
function move(state,type,payload){const r=engine.validateAndApplyMove(state,{v:1,type,actor:0,rev:state.rev,payload},{now:1});assert.ok(r.ok,`${type} rejected: ${JSON.stringify(r.error||r)}`);return r.state}

// 2 · Static Step Charges the enemy Bender only as the second card this turn.
{
  const lightning=()=>[tech('r1','LIGHTNING','Recharge',1),tech('r2','LIGHTNING','Recharge',1),tech('ss','LIGHTNING','Static Step',1)];
  let s=duel(side('A','LIGHTNING',{hand:lightning()}),side('B','FIRE'));
  s=move(s,'PLAY_CARD',{cardId:'ss'});check(!s.p[1].marks.includes('Charged'),'engine: Static Step as the first card only Flows');
  s=duel(side('A','LIGHTNING',{hand:lightning()}),side('B','FIRE'));
  s=move(s,'PLAY_CARD',{cardId:'r1'});s=move(s,'PLAY_CARD',{cardId:'ss'});check(s.p[1].marks.includes('Charged'),'engine: Static Step as the second card Charges the enemy Bender');
  s=duel(side('A','LIGHTNING',{hand:lightning()}),side('B','FIRE'));
  s=move(s,'PLAY_CARD',{cardId:'r1'});s=move(s,'PLAY_CARD',{cardId:'r2'});s=move(s,'PLAY_CARD',{cardId:'ss'});check(!s.p[1].marks.includes('Charged'),'engine: Static Step as the third card only Flows');
  const live=vm.runInContext(`(()=>{let a=player('You','LIGHTNING'),b=player('Rival','FIRE');a.e=7;b.marks=[];let first=mk('LIGHTNING','Spark',1,1,1);first.type='TECHNIQUE';first.n='Recharge';let ss=mk('LIGHTNING','Static Step',1,0,0);ss.type='TECHNIQUE';
    a.hand=[ss];G={p:[a,b],active:0,startSeat:0,turn:3,chain:1,logs:[],winner:null,trial:null,rev:0};play(ss,null,{});return b.marks.includes('Charged')})()`,ctx);
  check(live,'live: Static Step as the second card Charges the rival Bender, like the engine');
  const text=ElementBoundCards.TECH.LIGHTNING[1];
  check(/second card this turn, apply Charged to the enemy Bender instead\./.test(text),'Static Step text says the Charge replaces the Flow');
  const short=ElementBoundCards.SHORT['Static Step'];check(short.length<=28&&/ or /.test(short),`Static Step short line stays within 28 characters (${short})`);
}

// 3 · Gale Scout's Crosswind Momentum counts in the attack that uses it: 2 ATK + 1 (Crosswind) + 1 (Air Opening) = 4.
{
  const scout=()=>unit('gs','AIR','Gale Scout',2,3);
  let s=duel(side('A','AIR',{slots:[scout(),null,null],hand:[tech('cw','AIR','Crosswind',1)]}),side('B','FIRE',{slots:[unit('e1','FIRE','E1',1,9),unit('e2','FIRE','E2',1,9),null]}));
  s=move(s,'PLAY_CARD',{cardId:'cw',friendId:'gs',enemyId:'e1',swapWithId:'e2'});
  s=move(s,'ATTACK',{attackerId:'gs',targetId:'e1',targetType:'MANIFESTATION'});
  const hit=s.p[1].slots.find(m=>m&&m.id==='e1');check(hit&&hit.h===5,`engine: Gale Scout hits for 4 after a Crosswind swap (HP 9 → ${hit&&hit.h})`);
  check(!s.p[0].turnState.airOpening,'engine: the Air Opening is spent');
  const live=vm.runInContext(`(()=>{let a=player('You','AIR'),b=player('Rival','FIRE');let gs=mk('AIR','Gale Scout',2,3,3);gs.a=3;gs.momentum=1;gs.marks=['Momentum'];let t=mk('FIRE','E1',1,1,9);a.slots=[gs,null,null];b.slots=[t,null,null];
    G={p:[a,b],active:0,startSeat:0,turn:3,chain:0,logs:[],winner:null,trial:null,rev:0};a.turnState.airOpening=true;return gs.a+elementalAttackBonus(gs,t,a)})()`,ctx);
  check(live===4,`live: the same attack has 4 power (${live})`);
}

// 4 · Tidelily Guardian heals during Resonance, once per turn, in the engine too.
{
  const bloom=(allyHP,vit=30)=>{const lily=unit('lily','BLOOM','Tidelily Guardian',2,5),ally=unit('al','WATER','Ally',1,4);ally.h=allyHP;
    return duel(side('A','BLOOM',{parents:['WATER','NATURE'],vit,slots:[lily,ally,null],hand:[tech('w','WATER','Current Shift',1),tech('n','NATURE','Verdant Mend',2),tech('rs','BLOOM','Rainseed',2),tech('fc','BLOOM','Flourishing Current',3)]}),side('B','FIRE',{slots:[unit('e1','FIRE','E1',1,9),null,null]}))};
  let s=bloom(2);s=move(s,'PLAY_CARD',{cardId:'rs',friendId:'lily'});
  check(s.p[0].slots[1].h===2&&!s.p[0].slots[0].growth,'engine: without Resonance, Rainseed only Seeds and Tidelily does not heal');
  s=bloom(2);s=move(s,'PLAY_CARD',{cardId:'w',enemyId:'e1'});s=move(s,'PLAY_CARD',{cardId:'n',friendId:'lily'});
  check(s.p[0].turnState.resonance.active,'engine: Water + Nature cards turn on Resonance');
  s=move(s,'PLAY_CARD',{cardId:'rs',friendId:'lily'});
  check(s.p[0].slots[0].growth===1&&s.p[0].slots[1].h===3,'engine: Tidelily gains Growth during Resonance and heals the damaged ally 1');
  s=move(s,'PLAY_CARD',{cardId:'fc',friendId:'lily'});
  check(s.p[0].slots[1].h===3,'engine: the heal triggers only the first time each turn');
  s=bloom(4,25);s=move(s,'PLAY_CARD',{cardId:'w',enemyId:'e1'});s=move(s,'PLAY_CARD',{cardId:'n',friendId:'lily'});s=move(s,'PLAY_CARD',{cardId:'rs',friendId:'lily'});
  check(s.p[0].vit===26,`engine: with no damaged ally, the Bender heals 1 (${s.p[0].vit})`);
  const live=vm.runInContext(`(()=>{let p=player('You','BLOOM'),lily=mk('BLOOM','Tidelily Guardian',4,2,5),ally=mk('WATER','Ally',1,1,4);ally.h=2;p.slots=[lily,ally,null];p.turnState.resonance.active=true;grow(lily,p);return ally.h})()`,ctx);
  check(live===3,'live: the same Resonance Growth heals the ally 1');
}

console.log(`Rules parity 1.13.2: ${checks} checks passed`);
