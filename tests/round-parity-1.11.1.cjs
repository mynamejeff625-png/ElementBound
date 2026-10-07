// Issue #96 · Live single-player ends a round when the turn returns to the starting Bender, exactly like
// lib/gameEngine.js. Before 1.11.1 a rival-first duel gave the player +1 Essence every turn and expired
// round effects one turn early.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const engine=require('../lib/gameEngine.js');
const matchFactory=require('../lib/matchFactory.js');
const ElementBoundCards=require('../lib/cardCatalog.js');

let checks=0;const check=(value,message)=>{assert.ok(value,message);checks++};
function filler(id){return{id,el:'FIRE',n:'Filler',c:9,type:'MANIFESTATION',a:1,h:1,max:1,zone:'DECK',marks:[]}}
function engineEssence(startSeat){
  const side=name=>({name,el:'FIRE',vit:30,maxE:2,e:2,deck:Array.from({length:8},(_,i)=>filler(`${name}-${i}`)),hand:[],wake:[],slots:[null,null,null],marks:[],recycles:3,exhaustion:0,initiationToken:false,autoPass:false,responseEl:'FIRE',turnState:{resonance:{a:false,b:false,active:false},parents:[],resolved:[],moved:[]}});
  let state={turn:1,active:startSeat,startSeat,chain:0,rev:1,winner:null,p:[side('You'),side('Rival')]};const seen=[`${startSeat?'R':'Y'}${state.p[startSeat].maxE}@${state.turn}`];
  for(let i=0;i<3;i++){const r=engine.validateAndApplyMove(state,{v:1,type:'END_TURN',actor:state.active,rev:state.rev,payload:{}},{now:1});assert.ok(r.ok,r.error);state=r.state;seen.push(`${state.active?'R':'Y'}${state.p[state.active].maxE}@${state.turn}`)}
  return seen.join(' ');
}

let source=fs.readFileSync('js/game.js','utf8');source=source.slice(0,source.lastIndexOf('\nsetup();'));
const ctx=vm.createContext({console,Math,window:{ElementBoundCards,ElementBoundMatchFactory:matchFactory,ElementBoundEngine:engine},document:{getElementById:()=>null,querySelector:()=>null,querySelectorAll:()=>[]},setTimeout:()=>0,clearTimeout(){},requestAnimationFrame(){}});
vm.runInContext(source,ctx);
vm.runInContext(`add=()=>{};render=()=>{};bump=()=>{};ebQueueFx=()=>{};modal=()=>{};hideModal=()=>{};`,ctx);
const live=startSeat=>vm.runInContext(`(()=>{let a=player('You','FIRE'),b=player('Rival','FIRE');G={p:[a,b],active:${startSeat},startSeat:${startSeat},turn:1,chain:0,logs:[],winner:null,trial:null,rev:0};EB_INIT_LOCK=false;
 let seen=[(G.active?'R':'Y')+G.p[G.active].maxE+'@'+G.turn];for(let i=0;i<3;i++){ebPassTurn(1-G.active);seen.push((G.active?'R':'Y')+G.p[G.active].maxE+'@'+G.turn)}return seen.join(' ')})()`,ctx);

for(const startSeat of [0,1]){
  const expected=engineEssence(startSeat),got=live(startSeat);
  check(got===expected,`${startSeat?'rival':'player'} starts: live Essence and round match the engine\n live   ${got}\n engine ${expected}`);
}
check(live(1).startsWith('R2@1 Y2@1'),'when the rival starts, the player still opens with 2 Essence in round 1');

// Round effects last until the turn returns to the starting Bender.
const fx=vm.runInContext(`(()=>{let a=player('You','FIRE'),b=player('Rival','EARTH'),guard=mk('EARTH','Wall',2,1,5);b.slots=[guard,null,null];G={p:[a,b],active:1,startSeat:1,turn:1,chain:0,logs:[],winner:null,trial:null,rev:0};EB_INIT_LOCK=false;
 gainArmor(guard);ebPassTurn(0);let duringYourTurn=guard.armor;ebPassTurn(1);return{duringYourTurn,afterRound:guard.armor,round:G.turn}})()`,ctx);
check(fx.duringYourTurn===1,'Armor the rival gains in its first turn still protects during your turn');
check(fx.afterRound===0&&fx.round===2,'that Armor expires when the round ends, as the turn returns to the rival');

const game=fs.readFileSync('js/game.js','utf8');
check(/function finishAI\(\)\{bump\(\);if\(!G\.winner\)ebPassTurn\(0\)\}/.test(game)&&/ebPassTurn\(1\);setTimeout\(ai,350\)/.test(game),'both live turn handoffs go through ebPassTurn()');

console.log(`Round parity 1.11.1: ${checks} checks passed`);
