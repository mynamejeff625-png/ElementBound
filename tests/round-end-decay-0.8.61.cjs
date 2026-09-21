const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');

let source=fs.readFileSync('js/game.js','utf8');
source=source.slice(0,source.lastIndexOf('\nsetup();')).replace(
  'return Object.freeze({DECKS:',
  'return Object.freeze({_makeState:makeState,_startTurn:startTurn,_expireAllRoundEffectsSim:expireAllRoundEffectsSim,_addMomentum:addMomentum,DECKS:'
);
const ctx=vm.createContext({console,window:{},document:{getElementById:()=>null},setTimeout:()=>0,clearTimeout(){},requestAnimationFrame(){}});
vm.runInContext(source,ctx);

vm.runInContext(`
let checks=0;function check(v,msg){if(!v)throw Error(msg);checks++}hideModal=()=>{};render=()=>{};bump=()=>{};add=()=>{};ebQueueFx=()=>{};draw=()=>{};
{
 let a={a:2,armor:2,momentum:0,marks:['Charged']},b={a:3,armor:1,momentum:0,marks:['Charged']};gainMomentum(a);gainMomentum(b);
 let p0=player('A','AIR'),p1=player('B','EARTH');p0.slots=[a,null,null];p1.slots=[b,null,null];p0.marks=['Charged'];p1.marks=['Charged'];G={p:[p0,p1],active:1,turn:1,chain:0,logs:[]};
 turnStart();check(a.a===3&&a.armor===2&&a.momentum===1&&a.marks.includes('Charged')&&p0.marks.includes('Charged'),'live effects must survive the second action turn start');
 expireAllRoundEffects();check(a.a===2&&b.a===3&&a.armor===0&&b.armor===0&&a.momentum===0&&b.momentum===0,'live round end must clear Armor and reverse Momentum ATK');
 check(!a.marks.includes('Charged')&&!b.marks.includes('Charged')&&!p0.marks.includes('Charged')&&!p1.marks.includes('Charged'),'live round end must clear Charged from units and Benders');
}
{
 let st=EB_BALANCE._makeState('AIR','STORM','round-end-0861'),a={a:2,h:3,max:3,armor:2,momentum:0,marks:['Charged'],turnFlags:{}},b={a:3,h:3,max:3,armor:1,momentum:0,marks:['Charged'],turnFlags:{}};st.p[0].slots=[a,null,null];st.p[1].slots=[b,null,null];st.p[0].marks=['Charged'];st.p[1].marks=['Charged'];EB_BALANCE._addMomentum(st,a);EB_BALANCE._addMomentum(st,b);
 EB_BALANCE._startTurn(st,1,false);check(a.a===3&&a.armor===2&&a.momentum===1&&st.p[0].marks.includes('Charged'),'sim effects must survive the second action turn start');
 EB_BALANCE._expireAllRoundEffectsSim(st);check(a.a===2&&b.a===3&&a.armor===0&&b.armor===0&&a.momentum===0&&b.momentum===0,'sim round end must clear Armor and reverse Momentum ATK');
 check(!a.marks.includes('Charged')&&!b.marks.includes('Charged')&&!st.p[0].marks.includes('Charged')&&!st.p[1].marks.includes('Charged'),'sim round end must clear Charged everywhere');
}
let result=EB_BALANCE.selfTest();check(result.passed===result.total,'Balance Lab self-test '+result.failures.join(','));
console.log('Round-end decay 0.8.61: '+checks+' focused checks; self-test '+result.passed+'/'+result.total);
`,ctx);

const version=fs.readFileSync('js/version.js','utf8');
assert.match(version,/version:'0\.8\.61'/);
assert.match(source,/expireAllRoundEffects\(\);G\.active=0;G\.turn\+\+/);
assert.match(source,/if\(st\.active===st\.startSeat\)\{expireAllRoundEffectsSim\(st\)/);
assert.doesNotMatch(source,/unused Armor expires at the start of your next turn/i);
assert.doesNotMatch(source,/Momentum expires at the start of .* next turn/i);
