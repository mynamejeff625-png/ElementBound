// Issue #91: the Balance Lab simulator chooses cards the way the live Hard rival does (ai() techScore/bodyScore).
const fs=require('node:fs');
const vm=require('node:vm');
const ElementBoundCards=require('../lib/cardCatalog.js');
const ElementBoundMatchFactory=require('../lib/matchFactory.js');
let source=fs.readFileSync('js/game.js','utf8');
source=source.slice(0,source.lastIndexOf('\nsetup();'));
source=source.replace('return Object.freeze({DECKS:','return Object.freeze({_makeState:makeState,_choosePlay:choosePlay,DECKS:');
const ctx=vm.createContext({console,window:{ElementBoundCards,ElementBoundMatchFactory},document:{getElementById:()=>null},setTimeout:()=>0,clearTimeout(){},requestAnimationFrame(){}});
vm.runInContext(source,ctx);
const checks=vm.runInContext(`
let checks=0;function check(v,m){if(!v)throw Error(m);checks++}
function unit(el,n,c,a,h,extra={}){return{el,n,c,a,h,max:h,type:'MANIFESTATION',guard:false,marks:[],armor:0,growth:0,momentum:0,ready:true,sick:false,...extra}}
function tech(el,n,c){return{el,n,c,type:'TECHNIQUE',marks:[]}}
{
  // Flame Burst with no enemy Manifestation scores 2 (live AI), so a 1-cost body is preferred.
  let st=EB_BALANCE._makeState('FIRE','WATER','fid-fire'),p=st.p[0];p.e=3;p.hand=[tech('FIRE','Flame Burst',2),unit('FIRE','Cinder Adept',1,1,2)];p.slots=[null,null,null];st.p[1].slots=[null,null,null];
  check(EB_BALANCE._choosePlay(st,0).n==='Cinder Adept','Flame Burst is not cast at an empty enemy field when a body is available');
  st.p[1].slots[0]=unit('WATER','Mist Adept',1,1,3);
  check(EB_BALANCE._choosePlay(st,0).n==='Flame Burst','Flame Burst is preferred once there is an enemy Manifestation');
}
{
  // Verdant Mend scores 7 with a Seeded ally (it used to be a flat 4.5, below Sproutling).
  let st=EB_BALANCE._makeState('NATURE','WATER','fid-nature'),p=st.p[0];p.e=3;p.hand=[tech('NATURE','Verdant Mend',2),unit('NATURE','Sproutling',1,1,3)];p.slots=[unit('NATURE','Grove Beast',4,2,5,{marks:['Seeded']}),null,null];
  check(EB_BALANCE._choosePlay(st,0).n==='Verdant Mend','Verdant Mend is cast when a Seeded ally can grow');
  p.slots[0].marks=[];
  check(EB_BALANCE._choosePlay(st,0).n==='Sproutling','without a Seeded ally a body is preferred to a Mend that would do nothing');
}
{
  // Fortify with no friendly Manifestation scores 0.
  let st=EB_BALANCE._makeState('EARTH','WATER','fid-earth'),p=st.p[0];p.e=2;p.hand=[tech('EARTH','Fortify',2)];p.slots=[null,null,null];
  let pick=EB_BALANCE._choosePlay(st,0);
  check(pick&&pick.n==='Fortify','a legal zero-value Technique is still the only legal play (live AI behaves the same)');
}
checks`,ctx);
console.log(`Simulator AI fidelity 1.10.3: ${checks} checks passed`);
