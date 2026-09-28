const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const ElementBoundCards=require('../lib/cardCatalog.js');
const ElementBoundMatchFactory=require('../lib/matchFactory.js');

let source=fs.readFileSync('js/game.js','utf8');
source=source.slice(0,source.lastIndexOf('\nsetup();')).replace(
  'return Object.freeze({DECKS:',
  'return Object.freeze({_makeState:makeState,_playTechnique:playTechnique,_addArmor:addArmor,_expireAllRoundEffectsSim:expireAllRoundEffectsSim,DECKS:'
);
const ctx=vm.createContext({console,window:{ElementBoundCards,ElementBoundMatchFactory},document:{getElementById:()=>null},setTimeout:()=>0,clearTimeout(){},requestAnimationFrame(){}});
vm.runInContext(source,ctx);

vm.runInContext(`
let checks=0;function check(v,msg){if(!v)throw Error(msg);checks++}add=()=>{};render=()=>{};bump=()=>{};ebQueueFx=()=>{};
{
 G={turn:4};let a={armor:0};
 check(gainArmor(a)===true&&a.armor===1,'live first Armor gain must resolve');
 a.armor=0;
 check(gainArmor(a)===false&&a.armor===0,'live consumed Armor must not reopen the same-round cap');
 let b={armor:0};check(gainArmor(b)===true&&b.armor===1,'live cap must be per Manifestation');
 expireRoundEffects(a);expireRoundEffects(b);
 G.turn=5;check(gainArmor(a)===true&&a.armor===1,'live cap must reset at round end');
}
{
 let st=EB_BALANCE._makeState('EARTH','FIRE','armor-cap'),a={armor:0,marks:[]},b={armor:0,marks:[]};st.turn=4;
 check(EB_BALANCE._addArmor(st,a)===true&&a.armor===1,'sim first Armor gain must resolve');
 a.armor=0;
 check(EB_BALANCE._addArmor(st,a)===false&&a.armor===0,'sim consumed Armor must not reopen the same-round cap');
 check(EB_BALANCE._addArmor(st,b)===true&&b.armor===1,'sim cap must be per Manifestation');
 EB_BALANCE._expireAllRoundEffectsSim(st);st.turn=5;
 check(EB_BALANCE._addArmor(st,a)===true&&a.armor===1,'sim cap must reset at round end');
}
{
 let st=EB_BALANCE._makeState('MAGMA','FIRE','magma-shared-cap'),p=st.p[0],e=st.p[1];
 let ally={n:'Ally',a:2,h:4,max:4,armor:0,marks:[],turnFlags:{}},enemy={n:'Enemy',a:1,h:4,max:4,armor:0,marks:['Burning'],turnFlags:{},_ebDamagedTurn:st.turn+':0'};
 p.slots=[ally,null,null];e.slots=[enemy,null,null];p.turnState.resonance.active=true;
 EB_BALANCE._playTechnique(st,0,{el:'MAGMA',n:'Molten Channel'});
 check(ally.armor===1,'Molten Channel must grant the shared Armor stack');
 EB_BALANCE._playTechnique(st,0,{el:'MAGMA',n:'Pressure Forge'});
 check(ally.armor===1,'Pressure Forge must respect the same-round shared cap');
 check(enemy.h===3,'Pressure Forge Resonance damage must remain independent of blocked Armor gain');
}
let result=EB_BALANCE.selfTest();check(result.passed===result.total,'Balance Lab self-test '+result.failures.join(','));
console.log('Earth Armor cap 0.8.61: '+checks+' focused checks; self-test '+result.passed+'/'+result.total);
`,ctx);

const version=fs.readFileSync('js/version.js','utf8');
assert.match(version,/version:'\d+\.\d+\.\d+'/);
assert.match(source,/function gainArmor\(m\)/);
assert.match(source,/function addArmor\(st,x\)/);
assert.match(source,/armorGainRound===G\?\.turn/);
assert.match(source,/armorGainRound===st\.turn/);
assert.match(source,/gain Armor only once per round/i);
assert.match(source,/EARTH and MAGMA/i);
