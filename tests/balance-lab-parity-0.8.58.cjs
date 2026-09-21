const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');

let source=fs.readFileSync('js/game.js','utf8');
source=source.slice(0,source.lastIndexOf('\nsetup();'));
source=source.replace(
  'return Object.freeze({DECKS:',
  'return Object.freeze({_makeState:makeState,_playTechnique:playTechnique,_attackBonus:attackBonus,_attackOne:attackOne,_dealBody:dealBody,_canBypass:canBypass,_simShouldRespond:simShouldRespond,_simDamagedThisTurn:simDamagedThisTurn,DECKS:'
);
const ctx=vm.createContext({console,window:{},document:{getElementById:()=>null},setTimeout:()=>0,clearTimeout(){},requestAnimationFrame(){}});
vm.runInContext(source,ctx);

vm.runInContext(`
let checks=0;
function check(v,msg){if(!v)throw Error(msg);checks++}
hideModal=()=>{};render=()=>{};bump=()=>{};ebQueueFx=()=>{};turnStart=()=>{};
function unit(el,n,a,h,extra={}){return{el,n,a,h,max:h,armor:0,marks:[],growth:0,momentum:0,ready:true,sick:false,turnFlags:{},_ebHasAttacked:false,...extra}}
function liveState(a='FIRE',b='FIRE'){
 let human=player('You',a),rival=player('Rival',b);for(const p of [human,rival]){p.hand=[];p.deck=[mk(p.el,'Filler',1,1,2)];p.wake=[];p.slots=[null,null,null];p.e=10}
 G={p:[human,rival],active:1,turn:3,chain:0,logs:[],winner:null,trial:null,rev:0};EB_INIT_LOCK=false;diff='Difficult';return{human,rival};
}

// Growth is stored directly in ATK and must not be re-added at attack/response time.
{
 let st=EB_BALANCE._makeState('NATURE','FIRE','growth-0858'),att=unit('NATURE','Grove Beast',4,5,{growth:2}),target=unit('FIRE','Target',1,6);
 check(EB_BALANCE._attackBonus(st,0,att,target)===0,'Simulator re-added stored Growth at attack time');
 check(EB_BALANCE._simShouldRespond(st,st.p[1],att,target,{el:'EARTH'},'BEFORE')===true,'Response estimate did not use stored ATK');
}

// Storm cards dispatch by name and no longer share Crosswind Spark behavior.
{
 let st=EB_BALANCE._makeState('STORM','FIRE','storm-dispatch-0858'),p=st.p[0],e=st.p[1],t=unit('STORM','Tempest Striker',3,3,{sid:'storm-avatar'}),enemy=unit('FIRE','Enemy',1,5);
 p.slots=[t,null,null];e.slots=[enemy,null,null];p.turnState.resonance.active=true;
 EB_BALANCE._playTechnique(st,0,{el:'STORM',n:'Crosswind Spark',type:'TECHNIQUE'});
 check(t.momentum===1&&t.a===4&&t.marks.includes('Charged')&&st.metrics.effects['Crosswind Spark movement']===1,'Crosswind Spark parity failed');
 enemy._ebDamagedTurn=st.turn+':0';
 check(EB_BALANCE._simDamagedThisTurn(st,0,enemy),'Thunderstep damaged-this-turn fixture failed');
 let momentumBefore=t.momentum;
 check(p.turnState.resonance.active&&t.marks.includes('Charged')&&t.momentum>0,'Thunderstep payoff fixture state failed');
 EB_BALANCE._playTechnique(st,0,{el:'STORM',n:'Thunderstep',type:'TECHNIQUE'});
 check(enemy.h===4&&t.momentum===momentumBefore&&st.metrics.effects['Thunderstep damage']===1,'Thunderstep resolved as Crosswind Spark: '+JSON.stringify({hp:enemy.h,momentum:t.momentum,before:momentumBefore,effects:st.metrics.effects,turn:st.turn,damaged:enemy._ebDamagedTurn}));
 EB_BALANCE._playTechnique(st,0,{el:'STORM',n:'Static Reversal',type:'TECHNIQUE'});
 check(t.quick?.kind==='MOVE'&&st.metrics.effects['Static Reversal armed']===1,'Static Reversal was not armed');
 let guardSide=st.p[1],guard=unit('EARTH','Guard',1,5,{guard:true});guardSide.slots=[guard,null,null];
 p.turnState.moved=[];
 check(!EB_BALANCE._canBypass(t,p),'Tempest Striker bypassed without current movement state');
 p.turnState.moved=[t.sid];p.turnState.resonance.active=false;check(!EB_BALANCE._canBypass(t,p),'Tempest Striker bypassed without Resonance');
 p.turnState.resonance.active=true;check(EB_BALANCE._canBypass(t,p),'Tempest Striker failed moved + Resonance bypass');
 t.turnFlags={};guard.marks=['Charged'];check(EB_BALANCE._attackBonus(st,0,t,guard)===1&&guard.marks.includes('Charged'),'Storm attacker incorrectly released Charged');
}
{
 let st=EB_BALANCE._makeState('FIRE','STORM','static-combat-0858'),att=unit('FIRE','Attacker',2,4,{sid:'att'}),target=unit('STORM','Target',1,5,{sid:'target',quick:{kind:'MOVE'}});
 st.p[0].slots=[att,null,null];st.p[1].slots=[target,null,null];st.p[0].hand=st.p[1].hand=[];st.p[0].deck=[unit('FIRE','Filler',1,2)];st.p[1].deck=[unit('STORM','Filler',1,2)];st.p[0].initiationToken=st.p[1].initiationToken=false;
 EB_BALANCE._attackOne(st,0,att);
 check(st.p[1].slots[1]===target&&!target.quick&&target.h===3&&st.metrics.effects['Static Reversal movement']===1,'Static Reversal did not move before combat');
}

// Reclaiming Tide arms and resolves only its own lethal-attack survival effect.
{
 let st=EB_BALANCE._makeState('BLOOM','FIRE','reclaim-0858'),p=st.p[0],e=st.p[1],target=unit('BLOOM','Bloom Target',4,2,{sid:'bloom',growth:2,marks:['Seeded']}),att=unit('FIRE','Attacker',4,4,{sid:'fire'});
 p.slots=[target,null,null];e.slots=[att,null,null];p.hand=e.hand=[];p.deck=[unit('BLOOM','Filler',1,2)];e.deck=[unit('FIRE','Filler',1,2)];p.initiationToken=e.initiationToken=false;
 EB_BALANCE._playTechnique(st,0,{el:'BLOOM',n:'Reclaiming Tide',type:'TECHNIQUE'});check(target.quick?.kind==='SURVIVE','Reclaiming Tide was not armed');
 EB_BALANCE._attackOne(st,1,att);
 check(target.h===1&&target.growth===1&&target.a===3&&!target.marks.includes('Seeded')&&!target.quick&&p.slots.includes(target),'Reclaiming Tide survival did not resolve');
 check(st.metrics.effects['Reclaiming Tide survival']===1,'Reclaiming Tide survival metric missing');
}

// Backdraft remains legal and retaliates after the defender is destroyed.
{
 let st=EB_BALANCE._makeState('FIRE','FIRE','backdraft-0858',{responseElB:'FIRE'}),p=st.p[0],d=st.p[1],att=unit('FIRE','Attacker',2,3,{sid:'att'}),target=unit('FIRE','Defender',1,1,{sid:'def'}),response=[...d.hand,...d.deck].find(c=>c.type==='RESPONSE'&&c.el==='FIRE');
 p.slots=[att,null,null];d.slots=[target,null,null];p.hand=[];d.hand=[response];p.deck=[unit('FIRE','Filler',1,2)];d.deck=[unit('FIRE','Filler',1,2)];p.initiationToken=d.initiationToken=false;d.e=7;
 EB_BALANCE._attackOne(st,0,att);
 check(!d.slots.includes(target)&&att.h===1&&st.metrics.effects['Backdraft retaliation']===1,'Backdraft failed after lethal combat');
}

// Simulator cleanup mirrors Cinder Adept's source-bound live cleanup.
{
 let st=EB_BALANCE._makeState('FIRE','FIRE','cinder-cleanup-0858'),att=unit('FIRE','Attacker',3,4,{sid:'att'}),cinder=unit('FIRE','Cinder Adept',1,2,{sid:'cinder'});
 st.p[0].slots=[att,null,null];st.p[1].slots=[cinder,null,null];st.p[0].marks=['Burning'];
 EB_BALANCE._dealBody(st,0,cinder,3,att,true);
 check(!st.p[0].marks.includes('Burning')&&!st.p[1].slots.includes(cinder),'Cinder Adept source-bound Burning was not cleared');
}

// Live rival AI now executes both missing Prime summon gifts.
{
 let {human,rival}=liveState('EARTH','FIRE');rival.hand=[mk('FIRE','Cinder Adept',1,1,2)];ai();
 check(human.marks.includes('Burning'),'Live AI Cinder Adept did not apply Burning');
}
{
 let flows=0,{rival}=liveState('EARTH','WATER');rival.hand=[mk('WATER','Mist Adept',1,1,3)];let oldFlow=flow1;flow1=(owner,isAI)=>{if(owner===rival&&isAI)flows++;return true};ai();flow1=oldFlow;
 check(flows===1,'Live AI Mist Adept did not Flow 1');
}

let self=EB_BALANCE.selfTest();check(self.passed===self.total&&self.failures.length===0,'Balance Lab self-test failed: '+self.failures.join(', '));
console.log('Balance Lab parity 0.8.58: '+checks+' focused checks passed; Balance Lab self-test '+self.passed+'/'+self.total);
`,ctx);

assert.doesNotMatch(source,/bonus\s*\+=\s*\(att\.growth/);
assert.doesNotMatch(source,/att\.a\s*\+\s*\(att\.growth/);
assert.match(source,/c\.n==='Thunderstep'/);
assert.match(source,/c\.n==='Static Reversal'/);
assert.match(source,/c\.n==='Reclaiming Tide'/);

const version=fs.readFileSync('js/version.js','utf8');
assert.match(version,/version:'0\.8\.(?:5[8-9]|[6-9]\d)'/);
assert.match(version,/balanceLab:'Balance Lab (?:XV|XVI|XVII)'/);
console.log('Parity source and release metadata checks passed');
