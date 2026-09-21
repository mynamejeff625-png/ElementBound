const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');

let source=fs.readFileSync('js/game.js','utf8');
source=source.slice(0,source.lastIndexOf('\nsetup();')).replace(
  'return Object.freeze({DECKS:',
  'return Object.freeze({_makeState:makeState,_playTechnique:playTechnique,_simSendToWake:simSendToWake,DECKS:'
);
const ctx=vm.createContext({console,window:{},document:{getElementById:()=>null},setTimeout:()=>0,clearTimeout(){},requestAnimationFrame(){}});
vm.runInContext(source,ctx);

vm.runInContext(`
let checks=0;function check(v,msg){if(!v)throw Error(msg);checks++}add=()=>{};render=()=>{};bump=()=>{};ebQueueFx=()=>{};
check(/Weaken both/.test(TECH.AIR[1])&&/-1 ATK until destroyed/.test(TECH.AIR[1]),'Crosswind card text must describe persistent Weakened');
check(/does not stack/.test(GLOSSARY.Weakened)&&/until that Manifestation is destroyed/.test(GLOSSARY.Weakened),'Weakened glossary must describe lifecycle and cap');
{
 let p=player('You','AIR'),e=player('Rival','EARTH'),ally=mk('AIR','Ally',1,1,3),left=mk('EARTH','Left',1,3,3),right=mk('EARTH','Right',1,2,3),c={id:++uid,el:'AIR',n:'Crosswind',c:1,type:'TECHNIQUE',zone:'HAND'};
 p.slots=[ally,null,null];p.hand=[c];p.e=2;e.slots=[left,null,right];G={p:[p,e],active:0,turn:1,chain:0,logs:[],winner:null,trial:null,rev:0};EB_INIT_LOCK=false;
 play(c,null,{friend:ally,enemy:left,swapWith:right});
 check(left.a===2&&right.a===1&&left.marks.includes('Weakened')&&right.marks.includes('Weakened'),'Human Crosswind must Weaken both swapped enemies');
 let leftAtk=left.a,rightAtk=right.a;applyCrosswindWeakness(left);applyCrosswindWeakness(right);
 check(left.a===leftAtk&&right.a===rightAtk,'Human Crosswind Weakened must not stack');
 expireAllRoundEffects();check(left.a===2&&right.a===1,'Weakened must survive round-end expiration');
 left.h=0;death(e);check(left.a===3&&!left.marks.includes('Weakened')&&left.crosswindAttackDebuff===0,'Human Weakened must clear when destroyed');
}
{
 let p=player('You','EARTH'),e=player('Rival','AIR'),left=mk('EARTH','Left',1,3,3),right=mk('EARTH','Right',1,2,3),ally=mk('AIR','Ally',1,1,3),c={id:++uid,el:'AIR',n:'Crosswind',c:1,type:'TECHNIQUE',zone:'HAND'};
 p.slots=[left,null,right];p.deck=[mk('EARTH','Filler',1,1,1)];e.slots=[ally,null,null];e.hand=[c];e.deck=[mk('AIR','Filler',1,1,1)];e.e=2;G={p:[p,e],active:1,turn:1,chain:0,logs:[],winner:null,trial:null,rev:0};EB_INIT_LOCK=false;diff='Difficult';
 ai();check(left.a===2&&right.a===1&&left.marks.includes('Weakened')&&right.marks.includes('Weakened'),'Rival AI Crosswind must Weaken both swapped enemies');
}
{
 let st=EB_BALANCE._makeState('AIR','EARTH','crosswind-debuff-0862'),p=st.p[0],e=st.p[1],ally={n:'Ally',a:1,h:3,max:3,marks:[],momentum:0},left={n:'Left',a:3,h:3,max:3,marks:[]},right={n:'Right',a:2,h:3,max:3,marks:[]};
 p.slots=[ally,null,null];e.slots=[left,null,right];EB_BALANCE._playTechnique(st,0,{el:'AIR',n:'Crosswind'});
 check(left.a===2&&right.a===1&&left.marks.includes('Weakened')&&right.marks.includes('Weakened'),'Simulator Crosswind must Weaken both swapped enemies');
 EB_BALANCE._playTechnique(st,0,{el:'AIR',n:'Crosswind'});check(left.a===2&&right.a===1,'Simulator Weakened must not stack');
 EB_BALANCE._simSendToWake(st,1,left);check(left.a===3&&!left.marks.includes('Weakened')&&left.crosswindAttackDebuff===0,'Simulator Weakened must clear when destroyed');
 check(st.metrics.effects['Crosswind Weakened']===2,'Simulator must count only first-time Weakened applications');
}
{
 let zero={n:'Zero',a:0,h:1,max:1,marks:[]};G={p:[player('You','AIR'),player('Rival','EARTH')],active:0,turn:1,logs:[]};
 check(applyCrosswindWeakness(zero)&&zero.a===0,'Weakened must apply without pushing zero ATK below zero');
 clearCrosswindWeakness(zero);check(zero.a===0&&!zero.marks.includes('Weakened'),'Clearing Weakened must not inflate a zero-ATK card');
}
let result=EB_BALANCE.selfTest();check(result.passed===result.total,'Balance Lab self-test '+result.failures.join(','));
console.log('Crosswind attack debuff 0.8.62: '+checks+' focused checks; self-test '+result.passed+'/'+result.total);
`,ctx);

const version=fs.readFileSync('js/version.js','utf8');
const index=fs.readFileSync('index.html','utf8');
assert.match(version,/version:'0\.8\.62'/);
assert.match(source,/CROSSWIND-ATTACK-DEBUFF-0\.8\.62/);
assert.match(index,/both become Weakened/);
