const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

let source = fs.readFileSync('js/game.js','utf8');
source = source.slice(0,source.lastIndexOf('\nsetup();'));
source = source.replace(
  'return Object.freeze({DECKS:',
  'return Object.freeze({_makeState:makeState,_playTechnique:playTechnique,_attackBonus:attackBonus,_addMomentum:addMomentum,_momentum:momentum,DECKS:'
);
const ctx=vm.createContext({console,window:{},document:{getElementById:()=>null},setTimeout:()=>0,clearTimeout(){},requestAnimationFrame(){}});
vm.runInContext(source,ctx);

vm.runInContext(`
let checks=0;
function check(v,msg){if(!v)throw Error(msg);checks++}
hideModal=()=>{};render=()=>{};bump=()=>{};ebQueueFx=()=>{};turnStart=()=>{};
function liveState(a='AIR',b='EARTH'){
 let p=player('You',a),e=player('Rival',b);p.hand=[];p.deck=[];p.wake=[];p.slots=[null,null,null];p.e=10;e.hand=[];e.deck=[];e.wake=[];e.slots=[null,null,null];e.e=10;
 G={p:[p,e],active:0,turn:1,chain:0,logs:[],winner:null,trial:null,rev:0};EB_INIT_LOCK=false;diff='Difficult';return{p,e};
}
function tech(el,name=null){let t=HYBRIDS[el]?HYBRID_CARDS[el].find(x=>x.n===name):TECH[el];return{id:++uid,el,n:t.n||t[0],c:t.c||t[3],type:'TECHNIQUE',zone:'HAND',text:t.text||t[1],tip:t.tip||t[2]}}

let lily0856=HYBRID_CARDS.BLOOM.find(c=>c.n==='Tidelily Guardian'),flourishing0856=HYBRID_CARDS.BLOOM.find(c=>c.n==='Flourishing Current');
check(lily0856.c===4&&lily0856.a===2&&lily0856.h===5,'Tidelily Guardian must be 4 cost with unchanged stats');
check(/Heal a friendly Manifestation 1\./.test(flourishing0856.text)&&/Seeded/.test(flourishing0856.text)&&/Growth/.test(flourishing0856.text),'Flourishing Current text mismatch');
check(BASE.AIR[1][1]===2&&BASE.AIR[1][2]===2&&BASE.AIR[1][3]===3,'Gale Scout base stats changed');
check(/\\+2 ATK/.test(BASE.AIR[1][4]),'Gale Scout Crosswind text must match +2 payoff');
for(const el of Object.keys(BASE))for(const card of BASE[el])check(Number.isFinite(card[1])&&Number.isInteger(card[1])&&card[1]>0,'Prime cost must be a finite positive integer');

{
 let {p}=liveState(),scout=mk('AIR','Gale Scout',2,2,3);p.turnState.airOpening=true;
 check(hybridAttackBonus(scout,p)===2&&!p.turnState.airOpening,'Live Gale Scout must receive and consume +2 Air Opening');
 check(hybridAttackBonus(scout,p)===0,'Live Gale Scout Air Opening must apply only once');
}

{
 let unit=mk('AIR','Stacker',1,2,4);for(let i=0;i<4;i++)gainMomentum(unit);
 check(unit.momentum===3&&unit.a===5&&unit.marks.filter(x=>x==='Momentum').length===1,'Live Momentum must stack to 3 and add exactly +3 ATK');
}

{
 let {p,e}=liveState(),enemy=mk('EARTH','Only Enemy',1,1,3),ally=mk('AIR','Sky Raptor',3,3,3),last=null,flows=0;
 e.slots=[enemy,null,null];p.slots=[ally,null,null];let c=tech('AIR');p.hand=[c];let oldModal=modal,oldFlow=flow1;modal=(title,buttons)=>{last={title,buttons}};flow1=()=>{flows++;return true};
 chooseTechniqueTarget(c);check(last&&last.buttons.length===1&&last.buttons[0][0].includes('Momentum 0/3'),'Crosswind fallback must offer friendly target selection');last.buttons[0][1]();modal=oldModal;flow1=oldFlow;
 check(ally.momentum===1&&ally.a===4&&flows===0&&!p.turnState.airOpening,'Crosswind fallback must grant Momentum and never Flow');
 check(attackBypassesGuard(ally,{turnState:{}}),'Sky Raptor bypass must activate at 1 Momentum');
}

{
 let {p,e}=liveState('STORM','FIRE'),unit=mk('STORM','Tempest Striker',3,3,3),spark=tech('STORM','Crosswind Spark');p.slots=[unit,null,null];
 for(let i=0;i<3;i++)resolveHybridTechnique(p,e,spark,false,{friend:unit});
 check(unit.momentum===3&&unit.a===6,'Storm Crosswind Spark must use unified Momentum stacks');
 let before=unit.a;resolveHybridTechnique(p,e,spark,false,{friend:unit});check(unit.momentum===3&&unit.a===before,'Storm Momentum must cap at 3');
}

{
 let {p,e}=liveState('BLOOM','FIRE'),target=mk('BLOOM','Target',1,2,5),c=tech('BLOOM','Flourishing Current');target.h=2;target.marks=['Seeded'];p.slots=[target,null,null];p.turnState.resonance={a:true,b:true,active:true};
 resolveHybridTechnique(p,e,c,false,{friend:target});check(target.h===3&&target.growth===1&&target.a===3,'Live Flourishing Current must heal 1 and preserve Resonance Growth');
}

{
 let st=EB_BALANCE._makeState('AIR','EARTH','gale-0856'),p=st.p[0],att={el:'AIR',n:'Gale Scout',a:2,marks:[],turnFlags:{}};p.turnState.airOpening=true;
 check(EB_BALANCE._attackBonus(st,0,att,st.p[1])===2&&!p.turnState.airOpening,'Simulator Gale Scout +2 parity failed');
}

{
 let st=EB_BALANCE._makeState('AIR','EARTH','momentum-0856'),p=st.p[0],e=st.p[1],ally={n:'Sky Raptor',a:3,h:3,max:3,marks:[],momentum:0};p.slots=[ally,null,null];e.slots=[{n:'Only Enemy'},null,null];
 EB_BALANCE._playTechnique(st,0,{el:'AIR',n:'Crosswind'});EB_BALANCE._playTechnique(st,0,{el:'AIR',n:'Crosswind'});EB_BALANCE._playTechnique(st,0,{el:'AIR',n:'Crosswind'});EB_BALANCE._playTechnique(st,0,{el:'AIR',n:'Crosswind'});
 check(ally.momentum===3&&ally.a===6&&!(st.metrics.effects['Flow 1']>0),'Simulator Crosswind fallback must stack Momentum to 3 without Flow');
}

{
 let st=EB_BALANCE._makeState('STORM','FIRE','storm-0856'),p=st.p[0],unit={n:'Tempest Striker',a:3,h:3,max:3,marks:[],momentum:0};p.slots=[unit,null,null];
 for(let i=0;i<4;i++)EB_BALANCE._playTechnique(st,0,{el:'STORM',n:'Crosswind Spark'});
 check(unit.momentum===3&&unit.a===6,'Simulator Storm unified Momentum parity failed');
}

{
 let st=EB_BALANCE._makeState('BLOOM','FIRE','bloom-0856'),p=st.p[0],target={n:'Bloom Target',a:2,h:2,max:5,marks:['Seeded'],growth:0,momentum:0};p.slots=[target,null,null];p.turnState.resonance.active=true;
 EB_BALANCE._playTechnique(st,0,{el:'BLOOM',n:'Flourishing Current'});check(target.h===3&&target.growth===1&&target.a===3,'Simulator Flourishing Current parity failed');
}

let self=EB_BALANCE.selfTest();check(self.passed===self.total&&self.failures.length===0,'Balance Lab self-test failed: '+self.failures.join(', '));
console.log('Balance Pass 0.8.56: '+checks+' focused checks passed; Balance Lab self-test '+self.passed+'/'+self.total);
`,ctx);

const version=fs.readFileSync('js/version.js','utf8');
assert.match(source,/OPENING EXPLOITED · \+2 ATK/,'Gale Scout combat banner must display the +2 payoff');
assert.match(version,/version:'\d+\.\d+\.\d+'/);
assert.match(version,/ruleset:'EB-RULES-\d+\.\d+\.\d+-BALANCE-PASS'/);
assert(!/Crosswind[^\n]*Flow 1/.test(fs.readFileSync('js/game.js','utf8')));
console.log('Release metadata and Crosswind no-Flow checks passed');
