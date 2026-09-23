const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const ElementBoundCards=require('../lib/cardCatalog.js');
const ElementBoundMatchFactory=require('../lib/matchFactory.js');

let source=fs.readFileSync('js/game.js','utf8');
source=source.slice(0,source.lastIndexOf('\nsetup();'));
source=source.replace(
  'return Object.freeze({DECKS:',
  'return Object.freeze({_makeState:makeState,_playTechnique:playTechnique,_attackOne:attackOne,_dealBody:dealBody,DECKS:'
);
const ctx=vm.createContext({console,window:{ElementBoundCards,ElementBoundMatchFactory},document:{getElementById:()=>null},setTimeout:()=>0,clearTimeout(){},requestAnimationFrame(){}});
vm.runInContext(source,ctx);

vm.runInContext(`
let checks=0;
function check(v,msg){if(!v)throw Error(msg);checks++}
hideModal=()=>{};render=()=>{};bump=()=>{};ebQueueFx=()=>{};
function liveState(){let p=player('You','MAGMA'),e=player('Rival','AIR');p.hand=[];p.deck=[];p.wake=[];p.slots=[null,null,null];p.e=10;e.hand=[];e.deck=[];e.wake=[];e.slots=[null,null,null];e.e=10;G={p:[p,e],active:0,turn:4,chain:0,logs:[],winner:null,trial:null,rev:0};return{p,e}}

{
 let {p,e}=liveState(),friend=mk('MAGMA','Friend',1,2,4),enemy=mk('AIR','Enemy',1,1,5);p.slots=[friend,null,null];e.slots=[enemy,null,null];hit(enemy,1,'FIRE','Probe');
 resolveHybridTechnique(p,e,{el:'MAGMA',n:'Molten Channel'},false,{enemy,magmaMode:'BURNING'});
 check(enemy.marks.includes('Burning')&&friend.armor===0,'Live Molten Channel Burning choice failed');
 p.turnState.resonance.active=true;enemy.marks=[];resolveHybridTechnique(p,e,{el:'MAGMA',n:'Molten Channel'},false,{friend,enemy,magmaMode:'BOTH'});
 check(friend.armor===1&&enemy.marks.includes('Burning'),'Live Molten Channel Resonance must resolve both modes');
}
{
 let {p,e}=liveState(),friend=mk('MAGMA','Friend',1,2,4),enemy=mk('AIR','Enemy',1,1,5);p.slots=[friend,null,null];e.slots=[enemy,null,null];enemy.marks=['Burning'];p.turnState.resonance.active=true;
 resolveHybridTechnique(p,e,{el:'MAGMA',n:'Pressure Forge'},false,{friend});check(friend.armor===1&&enemy.h===4,'Live Pressure Forge parity failed');
 resolveHybridTechnique(p,e,{el:'MAGMA',n:'Eruption Guard'},false,{friend});check(friend.quick&&friend.quick.kind==='REDUCE'&&friend.quick.value===1,'Live Eruption Guard did not arm');
}
{
 let {p,e}=liveState(),ravager=mk('MAGMA','Obsidian Ravager',4,4,5),donor=mk('EARTH','Donor',1,1,4),target=mk('AIR','Target',1,1,4);donor.armor=1;p.slots=[ravager,donor,null];e.slots=[target,null,null];p.turnState.resonance.active=true;
 check(applyObsidianRavagerTrigger(ravager,target,p)&&donor.armor===0&&target.marks.includes('Burning'),'Live Obsidian Ravager trigger failed');
 check(!applyObsidianRavagerTrigger(ravager,target,p),'Live Obsidian Ravager triggered more than once');
}

{
 let st=EB_BALANCE._makeState('MAGMA','AIR','molten'),p=st.p[0],e=st.p[1],friend={el:'MAGMA',n:'Friend',a:2,h:4,max:4,armor:0,marks:[],turnFlags:{}},enemy={el:'AIR',n:'Enemy',a:1,h:5,max:5,armor:0,marks:[],turnFlags:{}};p.slots=[friend,null,null];e.slots=[enemy,null,null];p.hand=[];e.hand=[];p.initiationToken=e.initiationToken=false;
 EB_BALANCE._dealBody(st,0,enemy,1,{el:'FIRE',n:'Probe',type:'TECHNIQUE'});EB_BALANCE._playTechnique(st,0,{el:'MAGMA',n:'Molten Channel'});
 check(enemy.marks.includes('Burning')&&friend.armor===0&&st.metrics.effects['Molten Channel Burning']===1,'Simulator Molten Channel Burning choice failed');
 enemy.marks=[];p.turnState.resonance.active=true;EB_BALANCE._playTechnique(st,0,{el:'MAGMA',n:'Molten Channel'});
 check(friend.armor===1&&enemy.marks.includes('Burning')&&st.metrics.effects['Molten Channel Armor']===1,'Simulator Molten Channel Resonance failed');
}
{
 let st=EB_BALANCE._makeState('MAGMA','AIR','forge'),p=st.p[0],e=st.p[1],friend={el:'MAGMA',n:'Friend',a:2,h:4,max:4,armor:0,marks:[],turnFlags:{}},enemy={el:'AIR',n:'Enemy',a:1,h:5,max:5,armor:0,marks:['Burning'],turnFlags:{}};p.slots=[friend,null,null];e.slots=[enemy,null,null];p.turnState.resonance.active=true;
 EB_BALANCE._playTechnique(st,0,{el:'MAGMA',n:'Pressure Forge',type:'TECHNIQUE'});check(friend.armor===1&&enemy.h===4&&st.metrics.effects['Pressure Forge Armor']===1&&st.metrics.effects['Pressure Forge damage']===1,'Simulator Pressure Forge failed');
}
{
 let st=EB_BALANCE._makeState('MAGMA','FIRE','guard'),p=st.p[0],e=st.p[1],shield={el:'MAGMA',n:'Shield',a:1,h:5,max:5,armor:0,marks:[],turnFlags:{}},att={el:'FIRE',n:'Attacker',a:3,h:4,max:4,armor:0,marks:[],ready:true,sick:false,turnFlags:{},_ebHasAttacked:false};p.slots=[shield,null,null];e.slots=[att,null,null];p.hand=e.hand=[];p.initiationToken=e.initiationToken=false;
 EB_BALANCE._playTechnique(st,0,{el:'MAGMA',n:'Eruption Guard'});EB_BALANCE._attackOne(st,1,att);
 check(shield.h===3&&!shield.quick&&st.metrics.effects['Eruption Guard armed']===1&&st.metrics.effects['Eruption Guard reduction']===1,'Simulator Eruption Guard combat reduction failed');
}
{
 let st=EB_BALANCE._makeState('MAGMA','AIR','ravager'),p=st.p[0],e=st.p[1],ravager={el:'MAGMA',n:'Obsidian Ravager',a:4,h:5,max:5,armor:0,marks:[],ready:true,sick:false,turnFlags:{},_ebHasAttacked:false},donor={el:'EARTH',n:'Donor',a:1,h:4,max:4,armor:1,marks:[],turnFlags:{}},target={el:'AIR',n:'Target',a:1,h:8,max:8,armor:0,marks:[],turnFlags:{}};p.slots=[ravager,donor,null];e.slots=[target,null,null];p.hand=e.hand=[];p.initiationToken=e.initiationToken=false;p.turnState.resonance.active=true;
 EB_BALANCE._attackOne(st,0,ravager);check(donor.armor===0&&target.marks.includes('Burning')&&st.metrics.effects['Obsidian Ravager Burning']===1,'Simulator Obsidian Ravager trigger failed');
}

let self=EB_BALANCE.selfTest();check(self.passed===self.total&&self.failures.length===0,'Balance Lab self-test failed: '+self.failures.join(', '));
console.log('Magma parity: '+checks+' focused checks passed; Balance Lab self-test '+self.passed+'/'+self.total);
`,ctx);

assert.match(source,/c\.n==='Molten Channel'/);
assert.match(source,/c\.n==='Pressure Forge'/);
assert.match(source,/c\.n==='Eruption Guard'/);
assert.match(source,/Obsidian Ravager Burning/);
console.log('Magma card-specific source checks passed');
