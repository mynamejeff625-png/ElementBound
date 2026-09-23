const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const ElementBoundCards=require('../lib/cardCatalog.js');
const ElementBoundMatchFactory=require('../lib/matchFactory.js');

let source=fs.readFileSync('js/game.js','utf8');
source=source.slice(0,source.lastIndexOf('\nsetup();')).replace(
  'return Object.freeze({DECKS:',
  'return Object.freeze({_makeState:makeState,_playTechnique:playTechnique,_simGrow:simGrow,DECKS:'
);
const ctx=vm.createContext({console,window:{ElementBoundCards,ElementBoundMatchFactory},document:{getElementById:()=>null},setTimeout:()=>0,clearTimeout(){},requestAnimationFrame(){}});
vm.runInContext(source,ctx);

vm.runInContext(`
let checks=0;function check(v,msg){if(!v)throw Error(msg);checks++}add=()=>{};render=()=>{};bump=()=>{};ebQueueFx=()=>{};
let lilyCard=HYBRID_CARDS.BLOOM.find(c=>c.n==='Tidelily Guardian'),currentCard=HYBRID_CARDS.BLOOM.find(c=>c.n==='Flourishing Current');
check(/Resonance/.test(lilyCard.text)&&/first time each turn/.test(lilyCard.text),'Tidelily Guardian text must state the Resonance gate');
check(/Resonance/.test(currentCard.text)&&/Otherwise, no effect/.test(currentCard.text),'Flourishing Current text must state the Resonance gate');
{
 let p=player('You','BLOOM'),e=player('Rival','FIRE'),target=mk('BLOOM','Target',1,2,5);target.h=2;target.marks=['Seeded'];p.slots=[target,null,null];p.turnState.resonance={a:false,b:false,active:false};G={p:[p,e],active:0,turn:1,chain:0,logs:[]};
 resolveHybridTechnique(p,e,{el:'BLOOM',n:'Flourishing Current'},false,{friend:target});
 check(target.h===2&&(target.growth||0)===0&&target.a===2,'Live Flourishing Current must do nothing without Resonance');
 p.turnState.resonance.active=true;resolveHybridTechnique(p,e,{el:'BLOOM',n:'Flourishing Current'},false,{friend:target});
 check(target.h===3&&target.growth===1&&target.a===3,'Live Flourishing Current must heal and grow during Resonance');
}
{
 let p=player('You','BLOOM'),e=player('Rival','FIRE'),lily=mk('BLOOM','Tidelily Guardian',4,2,5),ally=mk('WATER','Ally',1,1,4);ally.h=2;p.slots=[lily,ally,null];p.turnState.resonance={a:false,b:false,active:false};G={p:[p,e],active:0,turn:1,chain:0,logs:[]};
 grow(lily,p);check(ally.h===2,'Live Tidelily Guardian must not heal without Resonance');
 p.turnState.resonance.active=true;grow(lily,p);check(ally.h===3&&lily.turnFlags.tidelilyGrowthHeal,'Live Tidelily Guardian must heal once during Resonance');
 grow(lily,p);check(ally.h===3,'Live Tidelily Guardian must remain once per turn');
}
{
 let st=EB_BALANCE._makeState('BLOOM','FIRE','flourish-gate'),p=st.p[0],target={n:'Target',a:2,h:2,max:5,marks:['Seeded'],growth:0,turnFlags:{}};p.slots=[target,null,null];p.turnState.resonance.active=false;
 EB_BALANCE._playTechnique(st,0,{el:'BLOOM',n:'Flourishing Current'});check(target.h===2&&target.growth===0&&target.a===2,'Simulator Flourishing Current must do nothing without Resonance');
 p.turnState.resonance.active=true;EB_BALANCE._playTechnique(st,0,{el:'BLOOM',n:'Flourishing Current'});check(target.h===3&&target.growth===1&&target.a===3,'Simulator Flourishing Current must heal and grow during Resonance');
}
{
 let st=EB_BALANCE._makeState('BLOOM','FIRE','lily-gate'),p=st.p[0],lily={n:'Tidelily Guardian',a:2,h:5,max:5,marks:[],growth:0,turnFlags:{}},ally={n:'Ally',a:1,h:2,max:4,marks:[],growth:0,turnFlags:{}};p.slots=[lily,ally,null];p.turnState.resonance.active=false;
 EB_BALANCE._simGrow(st,0,lily);check(ally.h===2,'Simulator Tidelily Guardian must not heal without Resonance');
 p.turnState.resonance.active=true;EB_BALANCE._simGrow(st,0,lily);check(ally.h===3&&lily.turnFlags.tidelilyGrowthHeal,'Simulator Tidelily Guardian must heal once during Resonance');
 EB_BALANCE._simGrow(st,0,lily);check(ally.h===3,'Simulator Tidelily Guardian must remain once per turn');
}
let result=EB_BALANCE.selfTest();check(result.passed===result.total,'Balance Lab self-test '+result.failures.join(','));
console.log('Bloom Resonance gate 0.8.61: '+checks+' focused checks; self-test '+result.passed+'/'+result.total);
`,ctx);

const version=fs.readFileSync('js/version.js','utf8');
assert.match(version,/version:'\d+\.\d+\.\d+'/);
assert.match(source,/function triggerTidelilyGrowth/);
assert.match(source,/function simTidelilyGrowth/);
