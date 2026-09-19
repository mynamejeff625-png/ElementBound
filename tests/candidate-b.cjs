const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
let source = fs.readFileSync('js/game.js','utf8');
source = source.slice(0,source.lastIndexOf('\nsetup();'));
// Expose closure internals only inside this test VM, never in the shipped game.
source = source.replace('return Object.freeze({DECKS:', 'return Object.freeze({_makeState:makeState,_attackOne:attackOne,_dealBody:dealBody,DECKS:');
const ctx=vm.createContext({console,window:{},document:{getElementById:()=>null},setTimeout:()=>0,clearTimeout(){},requestAnimationFrame(){}});
vm.runInContext(source,ctx);
vm.runInContext(`
let checks=0;
function check(v,msg){if(!v)throw Error(msg);checks++}
hideModal=()=>{};render=()=>{};ebQueueFx=()=>{};bump=()=>{};turnStart=()=>{};
function fixture(actor,body,power=5){
 let p=player('You','FIRE'),e=player('Rival','FIRE');p.hand=[];e.hand=[];p.e=e.e=0;
 G={p:[p,e],active:actor,turn:1,chain:0,logs:[],winner:null,trial:null,rev:0};diff='Difficult';EB_INIT_LOCK=false;
 let att=mk('FIRE','Test attacker',1,power,10);att.marks=['Soaked'];att.sick=false;G.p[actor].slots[0]=att;
 let target=body?mk('FIRE','Test target',1,1,10):null;if(target)G.p[1-actor].slots[0]=target;
 return {att,target,def:G.p[1-actor]};
}
for(const actor of [0,1])for(const body of [false,true])for(const power of [0,1,2,5]){
 let {att,target,def}=fixture(actor,body,power),before=body?target.h:def.vit;
 if(actor===0)attack(att,target);else ai();
 check(before-(body?target.h:def.vit)===Math.max(0,power-2),'live damage actor '+actor+' body '+body+' power '+power);
 check(!att.marks.includes('Soaked'),'live consumption');
 check(ebSoakedAttackPower(att,power)===power,'subsequent attack unaffected');
}
{let {att,target}=fixture(0,true,5);target.armor=2;attack(att,target);check(target.h===9&&target.armor===0,'Soaked before Armor')}
{let {att,target}=fixture(0,true,5);target.marks=['Soaked'];attack(att,target);check(target.marks.includes('Soaked'),'receiving attack preserves target Soaked')}
{let {att,target}=fixture(0,true,2);att.el='WATER';att.n='River Serpent';att.marks=[];attack(att,target);check(target.marks.includes('Soaked'),'River Serpent applies persistent mark')}
{let {att,target,def}=fixture(0,true,5);def.el='WATER';def.initiationToken=true;def.responseEl='WATER';attack(att,target);check(target.h===10&&att.marks.includes('Soaked'),'cancelled attack preserves Soaked')}
{let {att}=fixture(0,true);hit(att,1,'FIRE','Technique');check(att.marks.includes('Soaked'),'non-attack damage preserves Soaked')}
for(const el of ['WATER','BLOOM']){let cards=deck(el).filter(c=>c.n==='Tide Warden');check(cards.length>0&&cards.every(c=>c.a===2&&c.h===4&&c.c===2&&c.guard),'live Tide Warden '+el)}
for(const actor of [0,1])for(const body of [false,true])for(const power of [0,1,2,5]){
 let st=EB_BALANCE._makeState('FIRE','FIRE','candidate-b',{startSeat:actor});st.p.forEach(p=>{p.hand=[];p.initiationToken=false});
 let att={n:'Test',el:'FIRE',a:power,h:10,max:10,marks:['Soaked'],ready:true,turnFlags:{}};
 let target={n:'Target',el:'FIRE',a:1,h:10,max:10,armor:0,marks:[],ready:true};
 st.p[actor].slots[0]=att;if(body)st.p[1-actor].slots[0]=target;
 let before=body?target.h:st.p[1-actor].vit;EB_BALANCE._attackOne(st,actor,att);
 check(before-(body?target.h:st.p[1-actor].vit)===Math.max(0,power-2),'simulator damage');check(!att.marks.includes('Soaked'),'simulator consumption');
}
for(const el of ['WATER','BLOOM']){let st=EB_BALANCE._makeState(el,'FIRE','warden');let p=st.p[0],cards=[...p.deck,...p.hand].filter(c=>c.n==='Tide Warden');check(cards.length>0&&cards.every(c=>c.a===2&&c.h===4&&c.c===2&&c.guard),'sim Tide Warden '+el)}
{let p=player('Water','WATER'),before=p.deck.length;G={p:[p,player('Foe','FIRE')],logs:[],turn:1};flow1(p,true);check(p.deck.length===before,'Flow preserves deck length')}
{let a=EB_BALANCE.simulate('WATER','FIRE',{seed:'candidate-b'}),b=EB_BALANCE.simulate('WATER','FIRE',{seed:'candidate-b'});check(JSON.stringify(a)===JSON.stringify(b),'seed reproducibility')}
console.log('Candidate B: '+checks+' assertions passed');
`,ctx);
const html=fs.readFileSync('index.html','utf8');
assert(!/class="devBar"><(?:span|i)/.test(html+source));
assert(!/bar\.style\.width/.test(source));
assert(html.includes("style-src 'self';"));
console.log('Native progress markup and CSP checks passed');
