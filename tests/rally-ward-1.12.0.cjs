// Issue #96 Part B · Rally Ward: from round 2 on, a Manifestation summoned onto your empty field while the rival has
// Manifestations is Warded until your next turn begins. The engine, live play, the rival AI and the Balance Lab agree.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const engine=require('../lib/gameEngine.js');
const matchFactory=require('../lib/matchFactory.js');
const {buildPlayerView}=require('../lib/playerView.js');
const ElementBoundCards=require('../lib/cardCatalog.js');

let checks=0;const check=(value,message)=>{assert.ok(value,message);checks++};
function deepNoUndefined(value,path='root'){if(value===undefined)throw Error(`undefined at ${path}`);if(value&&typeof value==='object')for(const [k,v] of Object.entries(value))deepNoUndefined(v,`${path}.${k}`);return true}
function unit(id,o={}){return{id,el:'FIRE',n:o.n||id,c:1,type:'MANIFESTATION',a:o.a??2,h:o.h??4,max:o.h??4,armor:0,ready:o.ready??true,sick:false,guard:!!o.guard,zone:o.zone||'FIELD',marks:[...(o.marks||[])],growth:0,momentum:0,quick:null,turnFlags:{}}}
function side(name,el,extra={}){return{name,el,vit:30,maxE:5,e:5,deck:[unit(`${name}-d1`,{zone:'DECK'}),unit(`${name}-d2`,{zone:'DECK'})],hand:[],wake:[],slots:[null,null,null],marks:[],recycles:3,exhaustion:0,initiationToken:false,autoPass:false,responseEl:el,turnState:{resonance:{a:false,b:false,active:false},parents:[],resolved:[],moved:[]},...extra}}
function state(turn,extra={}){return{turn,active:0,startSeat:1,chain:0,rev:3,winner:null,p:[side('A','FIRE'),side('B','AIR')],...extra}}
const apply=(s,type,payload,actor=s.active)=>engine.validateAndApplyMove(s,{v:1,type,actor,rev:s.rev,payload},{now:1000});
const summon=(s,id='new',slotIndex=0)=>{s.p[s.active].hand.push(unit(id,{zone:'HAND'}));return apply(s,'PLAY_CARD',{cardId:id,slotIndex})};
const warded=(s,seat,id)=>!!s.p[seat].slots.find(m=>m&&m.id===id)?.marks.includes('Warded');

// Engine: when Rally Ward applies.
{
  let s=state(1);s.p[1].slots[0]=unit('foe');
  let r=summon(s);check(r.ok&&!warded(r.state,0,'new'),'round 1: the second player\'s first summon is not Warded');
  s=state(2);s.p[1].slots[0]=unit('foe');r=summon(s);
  check(r.ok&&warded(r.state,0,'new'),'round 2: a summon onto an empty field facing Manifestations is Warded');
  check(r.events.some(e=>e.type==='STATUS_APPLIED'&&e.status==='Warded'&&e.targetId==='new'),'a STATUS_APPLIED event announces the Ward');
  check(deepNoUndefined(r.state)&&deepNoUndefined(r.events),'state and events stay Firestore-safe');
  const views=[0,1].map(seat=>buildPlayerView(r.state,seat,r.events,1000));
  check(views.every(v=>v.p.some(p=>p.slots.some(m=>m&&m.marks.includes('Warded')))&&deepNoUndefined(v)),'both seats see the Warded mark');
  s=state(4);s.p[0].slots[1]=unit('mine');s.p[1].slots[0]=unit('foe');r=summon(s);check(r.ok&&!warded(r.state,0,'new'),'no Ward while you still have a Manifestation');
  s=state(4);r=summon(s);check(r.ok&&!warded(r.state,0,'new'),'no Ward when the rival field is empty too');
}

// Engine: what Ward blocks.
{
  const base=()=>{const s=state(3);s.p[0].slots[0]=unit('att',{a:3});s.p[1].slots[0]=unit('w',{marks:['Warded']});return s};
  let s=base(),r=apply(s,'ATTACK',{attackerId:'att',targetId:'w',targetType:'MANIFESTATION'});
  check(!r.ok&&r.error==='TARGET_WARDED'&&s.p[1].slots[0].h===4,'attacking a Warded Manifestation is rejected without changing the board');
  r=apply(base(),'ATTACK',{attackerId:'att',targetId:null,targetType:'BENDER'});
  check(r.ok&&r.state.p[1].vit===27,'with no Guard, the Bender can still be attacked past a Warded Manifestation');
  s=base();s.p[1].slots[0].guard=true;r=apply(s,'ATTACK',{attackerId:'att',targetId:null,targetType:'BENDER'});
  check(!r.ok&&r.error==='GUARD_BLOCKS_BENDER','a Warded Guard still protects its Bender');
  s=base();s.p[0].hand=[{id:'fb',el:'FIRE',n:'Flame Burst',c:2,type:'TECHNIQUE',zone:'HAND'}];
  r=apply(s,'PLAY_CARD',{cardId:'fb',enemyId:'w',targetId:'w',targetType:'CARD'});
  check(r.ok&&r.state.p[1].slots[0].h===2,'Techniques can still target a Warded Manifestation');
  // Slipstream never redirects onto a Warded Manifestation.
  s=state(3);s.p[0].slots[0]=unit('att',{a:3});s.p[1].slots=[unit('t1'),unit('w',{marks:['Warded']}),null];s.p[1].initiationToken=true;
  r=apply(s,'ATTACK',{attackerId:'att',targetId:'t1',targetType:'MANIFESTATION'});
  check(r.ok&&!(r.state.pendingResponse?.legalOptions||[]).some(o=>o.element==='AIR'),'Slipstream is not offered when the only other Manifestation is Warded');
}

// Engine: Ward lasts until its owner's next turn begins.
{
  let s=state(2);s.p[1].slots[0]=unit('foe');s.p[1].deck=[unit('B-d1',{zone:'DECK'})];
  let r=summon(s);s=r.state;
  r=apply(s,'END_TURN',{});check(r.ok&&warded(r.state,0,'new'),'Ward survives the end of your own turn');
  s=r.state;s.p[0].deck=[unit('A-d1',{zone:'DECK'})];
  r=apply(s,'END_TURN',{});check(r.ok&&r.state.active===0&&!warded(r.state,0,'new'),'Ward ends when your next turn begins');
}

// Live single-player, the rival AI and the Balance Lab.
let source=fs.readFileSync('js/game.js','utf8');
source=source.slice(0,source.lastIndexOf('\nsetup();')).replace('return Object.freeze({DECKS:','return Object.freeze({_makeState:makeState,_doPlay:doPlay,_attackOne:attackOne,_startTurn:startTurn,DECKS:');
const ctx=vm.createContext({console,Math,window:{ElementBoundCards,ElementBoundMatchFactory:matchFactory,ElementBoundEngine:engine},document:{getElementById:()=>null,querySelector:()=>null,querySelectorAll:()=>[]},setTimeout:()=>0,clearTimeout(){},requestAnimationFrame(){}});
vm.runInContext(source,ctx);
vm.runInContext(`add=()=>{};render=()=>{};bump=()=>{};ebQueueFx=()=>{};modal=()=>{};hideModal=()=>{};`,ctx);
const live=vm.runInContext(`(()=>{let a=player('You','FIRE'),b=player('Rival','EARTH'),foeUnit=mk('EARTH','Foe',1,3,5),c=mk('FIRE','Ember Guard',2,2,3);c.zone='HAND';a.hand=[c];a.e=5;b.slots=[foeUnit,null,null];
 G={p:[a,b],active:0,startSeat:1,turn:2,chain:0,logs:[],winner:null,trial:null,rev:0};EB_INIT_LOCK=false;
 play(c,0);let wardedOnSummon=ebWarded(c);
 let rivalAtt=mk('EARTH','Ram',3,4,5);rivalAtt.ready=true;b.slots[1]=rivalAtt;
 G.active=1;let targets=ebArenaAttackTargets(rivalAtt.id);
 // The rival AI must not attack the Warded unit; with no Guard it goes for the Bender instead.
 diff='Difficult';let saved=[expireAllRoundEffects,turnStart];expireAllRoundEffects=()=>{};turnStart=()=>{};b.hand=[];foeUnit.ready=false;
 let vitBefore=a.vit,hpBefore=c.h;try{ai()}finally{[expireAllRoundEffects,turnStart]=saved}
 let aiSpared=c.h===hpBefore&&a.vit<vitBefore;
 G.active=0;turnStart();let clearedOnTurn=!ebWarded(c);
 // Player view: an attacker of yours sees no Warded rival as a target.
 let w=mk('EARTH','Wall',2,1,6);w.marks=['Warded'];b.slots=[w,null,null];let mine=mk('FIRE','Hawk',3,3,3);mine.ready=true;mine.sick=false;a.slots[1]=mine;G.active=0;
 let info=ebArenaAttackTargets(mine.id),hp=w.h;attack(mine,w);
 return{wardedOnSummon,aiSpared,clearedOnTurn,arenaList:info.targets.map(t=>t.id===null?'bender':t.name).join(','),attackBlocked:w.h===hp,glossary:!!GLOSSARY.Warded}})()`,ctx);
check(live.wardedOnSummon,'live: a round-2 summon onto an empty field is Warded');
check(live.aiSpared,'rival AI never attacks a Warded Manifestation (it hits the Bender instead)');
check(live.clearedOnTurn,'live: Ward ends when your next turn begins');
check(live.arenaList==='bender'&&live.attackBlocked,`live: a Warded rival is not offered or attackable (targets: ${live.arenaList})`);
check(live.glossary,'the in-duel glossary explains Warded');

const aiGuard=vm.runInContext(`(()=>{let a=player('You','EARTH'),b=player('Rival','FIRE'),wall=mk('EARTH','Wall',2,1,6);wall.guard=true;wall.marks=['Warded'];a.slots=[wall,null,null];
 let hawk=mk('FIRE','Hawk',3,3,3);hawk.ready=true;b.slots=[hawk,null,null];b.hand=[];G={p:[a,b],active:1,startSeat:1,turn:3,chain:0,logs:[],winner:null,trial:null,rev:0};EB_INIT_LOCK=false;diff='Difficult';
 let saved=[expireAllRoundEffects,turnStart];expireAllRoundEffects=()=>{};turnStart=()=>{};let v=a.vit,h=wall.h;try{ai()}finally{[expireAllRoundEffects,turnStart]=saved}return{vit:a.vit===v,hp:wall.h===h}})()`,ctx);
check(aiGuard.vit&&aiGuard.hp,'rival AI cannot reach the Bender through a Warded Guard, and does not attack it');

const sim=vm.runInContext(`(()=>{let st=EB_BALANCE._makeState('FIRE','EARTH','rally-ward');st.turn=2;st.active=0;let p=st.p[0],e=st.p[1];p.slots=[null,null,null];
 e.slots=[{n:'Foe',a:3,h:5,max:5,marks:[],sid:'foe',ready:true,sick:false}];let c={n:'Ember Guard',el:'FIRE',c:2,type:'MANIFESTATION',a:2,h:3,max:3,marks:[],sid:'eg'};p.hand=[c];p.e=5;
 EB_BALANCE._doPlay(st,0,c);let wardedOnSummon=ebWarded(c),hp=c.h,vit=p.vit;
 EB_BALANCE._attackOne(st,1,e.slots[0]);let spared=c.h===hp&&p.vit<vit;
 EB_BALANCE._startTurn(st,0,false);return{wardedOnSummon,spared,cleared:!ebWarded(c)}})()`,ctx);
check(sim.wardedOnSummon&&sim.spared&&sim.cleared,`Balance Lab: Ward applies, blocks the attack and clears on its owner's turn (${JSON.stringify(sim)})`);

// Tome, Arena chip and glyph.
const tome=require('../js/tomeData.js'),arena=fs.readFileSync('js/arena.js','utf8'),sprite=fs.readFileSync('assets/icons.svg','utf8');
const page=tome.pages.find(p=>p.title==='Warded');
check(page&&page.chapter==='core'&&page.icon==='warded'&&/from round 2 on/.test(page.rule),'the Tome explains Rally Ward in Core Terms');
check(/Warded:\{icon:'warded',word:'Ward'/.test(arena)&&/<symbol id="warded" viewBox="0 0 24 24">/.test(sprite),'the Arena shows a Ward chip with its own glyph');

console.log(`Rally Ward 1.12.0: ${checks} checks passed`);
