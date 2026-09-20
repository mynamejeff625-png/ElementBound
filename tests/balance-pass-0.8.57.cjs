const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');

let source=fs.readFileSync('js/game.js','utf8');
source=source.slice(0,source.lastIndexOf('\nsetup();'));
source=source.replace(
  'return Object.freeze({DECKS:',
  'return Object.freeze({_makeState:makeState,_playTechnique:playTechnique,_attackBonus:attackBonus,_summonGift:summonGift,_attackOne:attackOne,DECKS:'
);
const ctx=vm.createContext({console,window:{},document:{getElementById:()=>null},setTimeout:()=>0,clearTimeout(){},requestAnimationFrame(){}});
vm.runInContext(source,ctx);

vm.runInContext(`
let checks=0;
function check(v,msg){if(!v)throw Error(msg);checks++}
hideModal=()=>{};render=()=>{};bump=()=>{};ebQueueFx=()=>{};

check(TECH.EARTH[3]===2,'Fortify must cost 2');
let rainseed=HYBRID_CARDS.BLOOM.find(c=>c.n==='Rainseed');check(rainseed.c===2,'Rainseed must cost 2');
let eruption=HYBRID_CARDS.MAGMA.find(c=>c.n==='Eruption Guard');check(eruption.c===2&&/reduced by 1/.test(eruption.text),'Eruption Guard data mismatch');
check(/\\+2 ATK/.test(BASE.LIGHTNING[1][4]),'Arc Runner text must show +2 ATK');
check(/2 Momentum/.test(BASE.AIR[0][4]),'Breeze Disciple text must show 2 Momentum');
{
 let earth=EB_BALANCE._makeState('EARTH','FIRE','fortify-cost').p[0],bloom=EB_BALANCE._makeState('BLOOM','FIRE','rainseed-cost').p[0];
 check([...earth.hand,...earth.deck].find(c=>c.n==='Fortify').c===2,'Simulator deck must ingest Fortify cost 2');
 check([...bloom.hand,...bloom.deck].find(c=>c.n==='Rainseed').c===2,'Simulator deck must ingest Rainseed cost 2');
}

{
 let p=player('You','AIR'),e=player('Rival','EARTH'),target=mk('AIR','Target',1,3,4);p.slots=[target,null,null];G={p:[p,e],active:0,turn:1,chain:0,logs:[]};
 applyPrimeSummonGift({el:'AIR',n:'Breeze Disciple'},target);check(target.momentum===2&&target.a===5,'Live Breeze Disciple must grant 2 Momentum');
 target.momentum=2;target.a=5;applyPrimeSummonGift({el:'AIR',n:'Breeze Disciple'},target);check(target.momentum===3&&target.a===6,'Live Breeze Disciple must clamp at 3');
}
{
 let p=player('You','LIGHTNING'),e=player('Rival','EARTH');G={p:[p,e],active:0,turn:1,chain:2,logs:[]};
 check(elementalAttackBonus(mk('LIGHTNING','Arc Runner',2,2,3),e,p)===2,'Live Arc Runner must gain +2 at Chain 2');
}
{
 let p=player('You','MAGMA'),e=player('Rival','FIRE'),friend=mk('MAGMA','Friend',1,1,5);p.slots=[friend,null,null];G={p:[p,e],active:0,turn:1,chain:0,logs:[]};
 resolveHybridTechnique(p,e,{el:'MAGMA',n:'Eruption Guard'},false,{friend});check(friend.quick&&friend.quick.value===1,'Live Eruption Guard must arm reduction 1');
}
{
 let st=EB_BALANCE._makeState('AIR','EARTH','breeze-0857'),p=st.p[0],target={el:'AIR',n:'Sky Raptor',a:3,h:3,max:3,marks:[],momentum:0},gift={el:'AIR',n:'Breeze Disciple',a:1,h:3,max:3,marks:[],momentum:0};p.slots=[target,gift,null];
 EB_BALANCE._summonGift(st,0,gift);check(target.momentum===2&&target.a===5,'Simulator Breeze Disciple must grant 2 Momentum');
 target.momentum=2;target.a=5;EB_BALANCE._summonGift(st,0,gift);check(target.momentum===3&&target.a===6,'Simulator Breeze Disciple must clamp at 3');
}
{
 let st=EB_BALANCE._makeState('LIGHTNING','EARTH','arc-0857'),p=st.p[0],att={el:'LIGHTNING',n:'Arc Runner',a:2,marks:[],turnFlags:{}};p.chain=2;
 check(EB_BALANCE._attackBonus(st,0,att,st.p[1])===2,'Simulator Arc Runner must gain +2 at Chain 2');
}
{
 let st=EB_BALANCE._makeState('MAGMA','FIRE','eruption-0857'),p=st.p[0],e=st.p[1],shield={el:'MAGMA',n:'Shield',a:1,h:5,max:5,armor:0,marks:[],turnFlags:{}},att={el:'FIRE',n:'Attacker',a:3,h:4,max:4,armor:0,marks:[],ready:true,sick:false,turnFlags:{},_ebHasAttacked:false};p.slots=[shield,null,null];e.slots=[att,null,null];p.hand=e.hand=[];p.initiationToken=e.initiationToken=false;
 EB_BALANCE._playTechnique(st,0,{el:'MAGMA',n:'Eruption Guard'});EB_BALANCE._attackOne(st,1,att);check(shield.h===3&&st.metrics.effects['Eruption Guard reduction']===1,'Simulator Eruption Guard must reduce by 1');
}

let self=EB_BALANCE.selfTest();check(self.passed===self.total&&self.failures.length===0,'Balance Lab self-test failed: '+self.failures.join(', '));
console.log('Balance Pass 0.8.57: '+checks+' focused checks passed; Balance Lab self-test '+self.passed+'/'+self.total);
`,ctx);

const version=fs.readFileSync('js/version.js','utf8');
assert.match(version,/version:'\d+\.\d+\.\d+'/);
assert.match(version,/ruleset:'EB-RULES-\d+\.\d+\.\d+-BALANCE-PASS'/);
assert.doesNotMatch(source,/Fortify[^\n]*old cost|Rainseed[^\n]*old cost/);
console.log('Release metadata checks passed');
