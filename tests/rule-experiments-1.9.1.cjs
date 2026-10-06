// Issue #83: simulator-only rule experiments (Strike Back, Arrival Ward, Arrival Shield, Bender Arts, Ascension).
const fs=require('node:fs');
const vm=require('node:vm');
const ElementBoundCards=require('../lib/cardCatalog.js');
const ElementBoundMatchFactory=require('../lib/matchFactory.js');

let source=fs.readFileSync('js/game.js','utf8');
source=source.slice(0,source.lastIndexOf('\nsetup();'));
source=source.replace('return Object.freeze({DECKS:','return Object.freeze({_makeState:makeState,_attackOne:attackOne,DECKS:');
const ctx=vm.createContext({console,window:{ElementBoundCards,ElementBoundMatchFactory},document:{getElementById:()=>null},setTimeout:()=>0,clearTimeout(){},requestAnimationFrame(){}});
vm.runInContext(source,ctx);
const checks=vm.runInContext(`
let checks=0;
function check(v,msg){if(!v)throw Error(msg);checks++}
function unit(el,n,a,h,extra={}){return{el,n,a,h,max:h,armor:0,marks:[],growth:0,momentum:0,ready:true,sick:false,turnFlags:{},_ebHasAttacked:false,_ebFirstOpportunitySeen:true,_ebSummonedTurn:1,...extra}}

// Off by default: the current rules are untouched.
{
 let a=EB_BALANCE.simulate('FIRE','WATER',{seed:'exp-off'}),b=EB_BALANCE.simulate('FIRE','WATER',{seed:'exp-off',strikeBack:false,arrivalWard:false,arrivalShield:false,benderArts:false,ascension:false});
 check(a.fingerprint===b.fingerprint,'Disabled experiments changed the simulation');
 check(a.metrics.experiment===undefined,'Baseline run recorded experiment metrics');
}

// Strike Back: the defender deals its ATK back; a Strike Back kill never overflows onto the attacker's Bender.
{
 let st=EB_BALANCE._makeState('FIRE','EARTH','exp-strike',{strikeBack:true}),p=st.p[0],e=st.p[1],att=unit('FIRE','Attacker',3,3),def=unit('EARTH','Wall',2,5);
 p.slots=[att,null,null];e.slots=[def,null,null];e.hand=[];e.initiationToken=false;
 EB_BALANCE._attackOne(st,0,att);
 check(def.h===2&&att.h===1,'Strike Back damage is wrong');
 let st2=EB_BALANCE._makeState('FIRE','EARTH','exp-strike2',{strikeBack:true}),a2=unit('FIRE','Glass',3,1),d2=unit('EARTH','Spikes',4,5);
 st2.p[0].slots=[a2,null,null];st2.p[1].slots=[d2,null,null];st2.p[1].hand=[];st2.p[1].initiationToken=false;let vit=st2.p[0].vit;
 EB_BALANCE._attackOne(st2,0,a2);
 check(!st2.p[0].slots.includes(a2)&&st2.p[0].vit===vit&&st2.metrics.experiment.strikeBackKills===1,'Strike Back kill overflowed or was not counted');
}

// Arrival Ward: a Manifestation is never removed by an attack before its owner's next turn.
{
 for(const [a,b] of [['LIGHTNING','EARTH'],['MAGMA','NATURE'],['AIR','WATER'],['FIRE','FIRE']]){
   for(let i=0;i<4;i++){let r=EB_BALANCE.simulate(a,b,{seed:'ward'+i,arrivalWard:true});for(const bucket of r.metrics.initiative.preAttackRemovalBySource)for(const key of Object.keys(bucket))check(!key.startsWith('ATTACK:'),'A warded unit was removed by an attack: '+key)}
 }
}

// Arrival Shield: new units take 1 less attack damage.
{
 let st=EB_BALANCE._makeState('FIRE','EARTH','exp-shield',{arrivalShield:true}),att=unit('FIRE','Attacker',3,3),fresh=unit('EARTH','Fresh',1,4,{_ebFirstOpportunitySeen:false,_ebSummonedTurn:1});
 st.p[0].slots=[att,null,null];st.p[1].slots=[fresh,null,null];st.p[1].hand=[];st.p[1].initiationToken=false;
 EB_BALANCE._attackOne(st,0,att);
 check(fresh.h===2,'Arrival Shield did not prevent 1 damage');
}

// The experiment runner covers every matchup and reports finite metrics.
{
 for(const v of EB_BALANCE.EXPERIMENTS){
   let r=EB_BALANCE.experiment(v.opt,1);
   check(r.games===81,'Experiment did not cover all 81 matchups: '+v.key);
   for(const [k,x] of Object.entries({...r.perGame,avgTurns:r.avgTurns,removed:r.removedBeforeFirstAttack,depletion:r.cardDepletion,spread:r.deckSpread}))check(Number.isFinite(x)&&x>=0,'Bad metric '+k+' in '+v.key);
   check(r.stalls===0,'Experiment stalled: '+v.key);
 }
}
checks`,ctx);
console.log(`Rule experiments 1.9.1: ${checks} checks passed`);
