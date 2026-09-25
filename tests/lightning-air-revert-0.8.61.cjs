const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const ElementBoundCards=require('../lib/cardCatalog.js');
const ElementBoundMatchFactory=require('../lib/matchFactory.js');

let source=fs.readFileSync('js/game.js','utf8');
source=source.slice(0,source.lastIndexOf('\nsetup();')).replace(
  'return Object.freeze({DECKS:',
  'return Object.freeze({_makeState:makeState,_playTechnique:playTechnique,_attackBonus:attackBonus,DECKS:'
);
const ctx=vm.createContext({console,window:{ElementBoundCards,ElementBoundMatchFactory},document:{getElementById:()=>null},setTimeout:()=>0,clearTimeout(){},requestAnimationFrame(){}});
vm.runInContext(source,ctx);

vm.runInContext(`
let checks=0;function check(v,msg){if(!v)throw Error(msg);checks++}add=()=>{};render=()=>{};bump=()=>{};ebQueueFx=()=>{};
check(BASE.LIGHTNING[1][2]===3&&BASE.LIGHTNING[1][3]===3,'Arc Runner must be 3 ATK / 3 HP');
check(/\\+1 ATK/.test(BASE.LIGHTNING[1][4]),'Arc Runner Chain bonus must remain +1');
check(BASE.LIGHTNING[2][2]===3&&BASE.LIGHTNING[2][3]===3,'Volt Lynx base stats must remain 3 ATK / 3 HP');
check(/\\+2 damage/.test(BASE.LIGHTNING[2][4]),'Volt Lynx card text must show +2 damage');
check(/Give a friendly Manifestation 1 Momentum/.test(TECH.AIR[1])&&/also swap/.test(TECH.AIR[1]),'Crosswind text must make Momentum unconditional');
{
 let p=player('You','AIR'),e=player('Rival','EARTH'),ally=mk('AIR','Gale Scout',2,2,3),left=mk('EARTH','Left',1,1,3),right=mk('EARTH','Right',1,1,3),c={id:++uid,el:'AIR',n:'Crosswind',c:1,type:'TECHNIQUE',zone:'HAND'};
 p.slots=[ally,null,null];p.hand=[c];p.e=2;e.slots=[left,null,right];G={p:[p,e],active:0,turn:1,chain:0,logs:[],winner:null,trial:null,rev:0};EB_INIT_LOCK=false;
 play(c,null,{friend:ally,enemy:left,swapWith:right});
 check(ally.momentum===1&&ally.a===3,'Live Crosswind must grant Momentum when a swap succeeds');
 check(e.slots[0]===right&&e.slots[2]===left&&p.turnState.airOpening,'Live Crosswind must preserve its swap and Gale Scout opening');
}
{
 let p=player('You','LIGHTNING'),e=player('Rival','EARTH'),lynx=mk('LIGHTNING','Volt Lynx',3,3,3);G={p:[p,e],active:0,turn:1,chain:3,logs:[]};lynx.turnFlags={};
 check(elementalAttackBonus(lynx,e,p)===2,'Live Volt Lynx must gain +2 at Chain 3+');
 check(elementalAttackBonus(lynx,e,p)===0,'Live Volt Lynx payoff must remain first-attack-only');
}
{
 let st=EB_BALANCE._makeState('AIR','EARTH','crosswind-0861'),p=st.p[0],e=st.p[1],ally={el:'AIR',n:'Gale Scout',a:2,h:3,max:3,marks:[],momentum:0,turnFlags:{}},left={n:'Left'},right={n:'Right'};
 p.slots=[ally,null,null];e.slots=[left,null,right];EB_BALANCE._playTechnique(st,0,{el:'AIR',n:'Crosswind'});
 check(ally.momentum===1&&ally.a===3,'Simulator Crosswind must grant Momentum when a swap succeeds');
 check(e.slots[0]===right&&e.slots[2]===left&&p.turnState.airOpening,'Simulator Crosswind swap/opening parity failed');
}
{
 let st=EB_BALANCE._makeState('LIGHTNING','EARTH','lynx-0861'),p=st.p[0],lynx={el:'LIGHTNING',n:'Volt Lynx',a:3,marks:[],turnFlags:{}};p.chain=3;
 check(EB_BALANCE._attackBonus(st,0,lynx,st.p[1])===2,'Simulator Volt Lynx must gain +2 at Chain 3+');
 check(EB_BALANCE._attackBonus(st,0,lynx,st.p[1])===0,'Simulator Volt Lynx payoff must remain first-attack-only');
}
let result=EB_BALANCE.selfTest();check(result.passed===result.total,'Balance Lab self-test '+result.failures.join(','));
console.log('Lightning/Air correction 0.8.61: '+checks+' focused checks; self-test '+result.passed+'/'+result.total);
`,ctx);

const version=fs.readFileSync('js/version.js','utf8');
const index=fs.readFileSync('index.html','utf8');
assert.match(version,/version:'\d+\.\d+\.\d+'/);
assert.match(source,/Volt Lynx Chain \$\{G\.chain\} → \+2 ATK/);
assert.match(source,/Crosswind always grants 1 Momentum/);
assert.match(index,/Crosswind always grants friendly Momentum/);
