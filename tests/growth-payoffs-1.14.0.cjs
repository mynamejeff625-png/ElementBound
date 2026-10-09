// Issue #103 · 1.14.0 Growth payoffs (Owner-approved):
// - Root Keeper gains 1 Growth whenever it is actually healed (Second Bloom, Rainseed, Flourishing Current, Tidelily Guardian);
// - Grove Beast gets +2 ATK per Growth instead of +1 (and loses 2 when Reclaiming Tide removes a Growth);
// - Nature plays 2 Wild Growth and 5 Verdant Mend.
// The engine, live play, the rival AI and the Balance Lab must agree.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const engine=require('../lib/gameEngine.js');
const matchFactory=require('../lib/matchFactory.js');
const ElementBoundCards=require('../lib/cardCatalog.js');

let checks=0;const check=(value,message)=>{assert.ok(value,message);checks++};
function deepNoUndefined(value,path='root'){if(value===undefined)throw Error(`undefined at ${path}`);if(value&&typeof value==='object')for(const [k,v] of Object.entries(value))deepNoUndefined(v,`${path}.${k}`);return true}

// Card data and deck lists.
{
  const grove=ElementBoundCards.BASE.NATURE.find(x=>x[0]==='Grove Beast'),root=ElementBoundCards.BASE.NATURE.find(x=>x[0]==='Root Keeper');
  check(grove[1]===4&&grove[2]===2&&grove[3]===5&&/\+2 ATK instead of \+1/.test(grove[4]),'Grove Beast stays 4-cost 2/5 and its text gives +2 ATK per Growth');
  check(ElementBoundCards.SHORT['Grove Beast']==='+2 ATK per Growth','Grove Beast short line');
  check(/When healed, gain 1 Growth/.test(root[4]),'Root Keeper text is unchanged');
  check(ElementBoundCards.TECH2.NATURE[4]===2,'Nature ships 2 Wild Growth');
  const deck=matchFactory.createPlayer({name:'N',element:'NATURE',nextId:(()=>{let n=0;return()=>++n})(),random:()=>0.5});
  const all=[...deck.deck,...deck.hand],count=n=>all.filter(c=>c.n===n).length;
  check(all.length===21&&count('Wild Growth')===2&&count('Verdant Mend')===5,`online Nature deck: 2 Wild Growth + 5 Verdant Mend (${count('Wild Growth')}+${count('Verdant Mend')})`);
}

// Engine helpers.
function unit(id,el,n,a,h,extra={}){return{id,el,n,c:1,type:'MANIFESTATION',a,h,max:h,armor:0,ready:true,sick:false,guard:false,zone:'FIELD',marks:[],growth:0,momentum:0,quick:null,turnFlags:{},...extra}}
function tech(id,el,n,c){return{id,el,n,c,type:'TECHNIQUE',zone:'HAND',marks:[]}}
function side(name,el,{slots=[null,null,null],hand=[],parents=[],token=false}={}){return{name,el,vit:30,maxE:7,e:10,deck:[unit(name+'-d1',el,'D1',1,1,{zone:'DECK'})],hand,wake:[],slots,marks:[],recycles:3,exhaustion:0,initiationToken:token,autoPass:false,responseEl:el,turnState:{resonance:{a:false,b:false,active:false},parents,moved:[],resolved:[]}}}
function duel(a,b){return{turn:3,active:0,startSeat:0,chain:0,rev:1,winner:null,p:[a,b]}}
function move(state,type,payload,actor=0){const r=engine.validateAndApplyMove(state,{v:1,type,actor,rev:state.rev,payload},{now:1});assert.ok(r.ok,`${type} rejected: ${JSON.stringify(r.error||r)}`);deepNoUndefined(r.state);deepNoUndefined(r.events);return r.state}
const find=(s,seat,id)=>s.p[seat].slots.find(m=>m&&m.id===id);

// Grove Beast: +2 ATK per Growth in the engine.
{
  let s=duel(side('A','NATURE',{slots:[unit('gb','NATURE','Grove Beast',2,5,{marks:['Seeded']}),null,null],hand:[tech('vm','NATURE','Verdant Mend',2),tech('wg','NATURE','Wild Growth',2)]}),side('B','FIRE'));
  s=move(s,'PLAY_CARD',{cardId:'vm',friendId:'gb'});check(find(s,0,'gb').a===4&&find(s,0,'gb').growth===1,'engine: Verdant Mend on Grove Beast → 4 ATK');
  s=move(s,'PLAY_CARD',{cardId:'wg',friendId:'gb'});check(find(s,0,'gb').a===6&&find(s,0,'gb').growth===2,'engine: Wild Growth on Grove Beast → 6 ATK');
  let o=duel(side('A','NATURE',{slots:[unit('rk','NATURE','Root Keeper',2,4,{marks:['Seeded']}),null,null],hand:[tech('vm','NATURE','Verdant Mend',2)]}),side('B','FIRE'));
  o=move(o,'PLAY_CARD',{cardId:'vm',friendId:'rk'});check(find(o,0,'rk').a===3,'engine: other Manifestations still get +1 ATK per Growth');
}
// Grove Beast: Reclaiming Tide removes 1 Growth and its 2 ATK (Bloom, engine).
{
  let s=duel(side('A','FIRE',{slots:[unit('att','FIRE','Attacker',9,9),null,null]}),side('B','BLOOM',{parents:['WATER','NATURE'],slots:[unit('gb','NATURE','Grove Beast',6,5,{growth:2,marks:['Seeded'],quick:{kind:'SURVIVE',ownerTurn:2}}),null,null]}));
  s=move(s,'ATTACK',{attackerId:'att',targetId:'gb',targetType:'MANIFESTATION'});
  if(s.pendingResponse)s=move(s,'PASS',{},1);
  const gb=find(s,1,'gb');check(gb&&gb.h===1&&gb.growth===1&&gb.a===4,`engine: Reclaiming Tide saves Grove Beast at 1 HP with 1 Growth and 4 ATK (${gb&&[gb.h,gb.growth,gb.a]})`);
}
// Root Keeper grows when healed: Rainseed, Flourishing Current, and Second Bloom through a real Response window (engine).
{
  const bloom=()=>duel(side('A','BLOOM',{parents:['WATER','NATURE'],slots:[unit('rk','NATURE','Root Keeper',2,4,{h:2,marks:['Seeded']}),null,null],hand:[tech('rs','BLOOM','Rainseed',2),tech('w','WATER','Current Shift',1),tech('n','NATURE','Verdant Mend',2),tech('fc','BLOOM','Flourishing Current',3)]}),side('B','FIRE',{slots:[unit('e1','FIRE','E1',1,9),null,null]}));
  let s=bloom();s=move(s,'PLAY_CARD',{cardId:'rs',friendId:'rk'});
  check(find(s,0,'rk').h===3&&find(s,0,'rk').growth===1&&find(s,0,'rk').a===3,'engine: Rainseed heals a Seeded Root Keeper → +1 Growth');
  s=bloom();s=move(s,'PLAY_CARD',{cardId:'w',enemyId:'e1'});s=move(s,'PLAY_CARD',{cardId:'n',friendId:'rk'});s=move(s,'PLAY_CARD',{cardId:'fc',friendId:'rk'});
  check(find(s,0,'rk').h===3&&find(s,0,'rk').growth===3,'engine: Verdant Mend, then Flourishing Current heals (+1 Growth) and grows (+1 Growth): Growth 3');
  const full=duel(side('A','BLOOM',{parents:['WATER','NATURE'],slots:[unit('rk','NATURE','Root Keeper',2,4,{marks:['Seeded']}),null,null],hand:[tech('rs','BLOOM','Rainseed',2)]}),side('B','FIRE'));
  s=move(full,'PLAY_CARD',{cardId:'rs',friendId:'rk'});check(find(s,0,'rk').growth===0,'engine: a heal at full HP does not grow Root Keeper');
  let r=duel(side('A','FIRE',{slots:[unit('att','FIRE','Attacker',1,9),null,null]}),side('B','NATURE',{token:true,slots:[unit('rk','NATURE','Root Keeper',2,4,{h:2}),unit('x','NATURE','Other',1,5),null]}));
  r=move(r,'ATTACK',{attackerId:'att',targetId:'x',targetType:'MANIFESTATION'});
  check(r.pendingResponse&&r.pendingResponse.defenderSeat===1,'engine: the attack opens a Response window for the Nature seat');
  r=move(r,'RESPOND',{element:'NATURE',source:'TOKEN',targetId:'rk'},1);
  check(find(r,1,'rk').h===3&&find(r,1,'rk').growth===1&&find(r,1,'rk').a===3,'engine: Second Bloom heals Root Keeper → +1 Growth');
}

// Live play, the rival AI and the Balance Lab.
let source=fs.readFileSync('js/game.js','utf8');
source=source.slice(0,source.lastIndexOf('\nsetup();')).replace('return Object.freeze({DECKS:','return Object.freeze({_makeState:makeState,_playTechnique:playTechnique,_simResolveResponse:simResolveResponse,_simQuickAfter:simQuickAfterAttackDamage,_makeDeck:makeDeck,_rng:rng,DECKS:');
const ctx=vm.createContext({console,Math,window:{ElementBoundCards,ElementBoundMatchFactory:matchFactory,ElementBoundEngine:engine},document:{getElementById:()=>null,querySelector:()=>null,querySelectorAll:()=>[]},setTimeout:()=>0,clearTimeout(){},requestAnimationFrame(){}});
vm.runInContext(source,ctx);
vm.runInContext(`add=()=>{};render=()=>{};bump=()=>{};ebQueueFx=()=>{};modal=()=>{};hideModal=()=>{};`,ctx);
const live=vm.runInContext(`(()=>{let out={};
  let a=player('You','NATURE'),b=player('Rival','FIRE');let gb=mk('NATURE','Grove Beast',4,2,5);gb.marks=['Seeded'];a.slots=[gb,null,null];a.e=7;
  let vm_=mk('NATURE','Verdant Mend',2,0,0);vm_.type='TECHNIQUE';a.hand=[vm_];G={p:[a,b],active:0,startSeat:0,turn:3,chain:0,logs:[],winner:null,trial:null,rev:0};
  play(vm_,null,{friend:gb});out.playerGrove=gb.a;
  // Rival Hard casts Verdant Mend on its Seeded Grove Beast.
  diff='Difficult';let you=player('You','FIRE'),r=player('Rival','NATURE');let rg=mk('NATURE','Grove Beast',4,2,5);rg.marks=['Seeded'];rg.sick=true;r.slots=[rg,null,null];r.e=2;r.maxE=2;
  let rv=mk('NATURE','Verdant Mend',2,0,0);rv.type='TECHNIQUE';r.hand=[rv];you.slots=[null,null,null];G={p:[you,r],active:1,startSeat:0,turn:3,chain:0,logs:[],winner:null,trial:null,rev:0};EB_INIT_LOCK=false;ai();out.rivalGrove=rg.a;
  // Second Bloom (live resolver used by both the player and the rival) heals Root Keeper.
  let def=player('Def','NATURE'),att=mk('FIRE','Attacker',1,1,9),rk=mk('NATURE','Root Keeper',2,2,4);rk.h=2;let other=mk('NATURE','Other',1,1,5);def.slots=[rk,other,null];def.initiationToken=true;
  let atkSide=player('Att','FIRE');atkSide.slots=[att,null,null];G={p:[atkSide,def],active:0,startSeat:0,turn:3,chain:0,logs:[],winner:null,trial:null,rev:0};
  let opt=ebResponseOptions(def,att,other,'BEFORE').find(o=>o.el==='NATURE'&&o.source==='TOKEN');ebResolveResponse(opt,def,att,other,rk,'BEFORE');out.secondBloom=[rk.h,rk.growth,rk.a];
  // Reclaiming Tide on a grown Grove Beast.
  let gbr=mk('NATURE','Grove Beast',4,2,5);gbr.growth=2;gbr.a=6;gbr.marks=['Seeded'];gbr.quick={kind:'SURVIVE'};gbr.h=0;applyQuickAfterDamage(def,gbr);out.reclaim=[gbr.h,gbr.growth,gbr.a];
  // Rainseed heal (no Resonance) on a Seeded, damaged Root Keeper.
  let p=player('B','BLOOM'),rk2=mk('NATURE','Root Keeper',2,2,4);rk2.h=2;rk2.marks=['Seeded'];p.slots=[rk2,null,null];let rs=mk('BLOOM','Rainseed',2,0,0);rs.type='TECHNIQUE';G={p:[p,player('X','FIRE')],active:0,startSeat:0,turn:3,chain:0,logs:[],winner:null,trial:null,rev:0};
  resolveHybridTechnique(p,G.p[1],rs,false,{friend:rk2});out.rainseed=[rk2.h,rk2.growth,rk2.a];
  return out})()`,ctx);
check(live.playerGrove===4,`live: Verdant Mend on Grove Beast → 4 ATK (${live.playerGrove})`);
check(live.rivalGrove===4,`rival AI: Verdant Mend on its Grove Beast → 4 ATK (${live.rivalGrove})`);
check(live.secondBloom.join()==='3,1,3',`live: Second Bloom heals Root Keeper → +1 Growth (${live.secondBloom})`);
check(live.reclaim.join()==='1,1,4',`live: Reclaiming Tide removes Grove Beast's 2 ATK with the Growth (${live.reclaim})`);
check(live.rainseed.join()==='3,1,3',`live: Rainseed heals Root Keeper → +1 Growth (${live.rainseed})`);
const sim=vm.runInContext(`(()=>{let out={};const B=EB_BALANCE;
  let st=B._makeState('NATURE','FIRE','growth-1140'),p=st.p[0];let gb={el:'NATURE',n:'Grove Beast',a:2,h:5,max:5,marks:['Seeded'],growth:0};p.slots=[gb,null,null];B._playTechnique(st,0,{el:'NATURE',n:'Verdant Mend'});out.grove=gb.a;
  let st2=B._makeState('FIRE','NATURE','growth-1140b',{responseElB:'NATURE'}),att={n:'Attacker',el:'FIRE',a:2,h:9,max:9,marks:[]},rk={el:'NATURE',n:'Root Keeper',a:2,h:2,max:4,marks:[],growth:0},x={el:'NATURE',n:'X',a:1,h:5,max:5,marks:[]},def=st2.p[1];
  st2.p[0].slots=[att,null,null];def.slots=[rk,x,null];def.hand=[];def.initiationToken=true;B._simResolveResponse(st2,0,att,x);out.secondBloom=[rk.h,rk.growth,rk.a];
  let gbr={el:'NATURE',n:'Grove Beast',a:6,h:0,max:5,growth:2,marks:['Seeded'],quick:{kind:'SURVIVE'}};B._simQuickAfter(st2,gbr);out.reclaim=[gbr.h,gbr.growth,gbr.a];
  let d=B._makeDeck('NATURE',B._rng('deck-1140')).cards;out.wild=d.filter(c=>c.n==='Wild Growth').length;out.mend=d.filter(c=>c.n==='Verdant Mend').length;
  return out})()`,ctx);
check(sim.grove===4,`Balance Lab: Verdant Mend on Grove Beast → 4 ATK (${sim.grove})`);
check(sim.secondBloom.join()==='3,1,3',`Balance Lab: Second Bloom heals Root Keeper → +1 Growth (${sim.secondBloom})`);
check(sim.reclaim.join()==='1,1,4',`Balance Lab: Reclaiming Tide removes Grove Beast's 2 ATK with the Growth (${sim.reclaim})`);
check(sim.wild===2&&sim.mend===5,`Balance Lab Nature deck: 2 Wild Growth + 5 Verdant Mend (${sim.wild}+${sim.mend})`);

// Docs and the Nature Trial follow the new numbers.
const guides=fs.readFileSync('docs/DECK_GUIDES.md','utf8');check(/\+2 ATK for each Growth/.test(guides),'deck guide states +2 ATK per Growth');
const trials=fs.readFileSync('js/trials.js','utf8');check(/name:'Grove Beast'\},\{kind:'hit',value:4\}/.test(trials),'Trial of Roots expects a 4-damage hit');

console.log(`Growth payoffs 1.14.0: ${checks} checks passed`);
