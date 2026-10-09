const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const engine=require('../lib/gameEngine.js');

function card(overrides={}){return{id:'card',el:'FIRE',n:'Unit',c:0,type:'MANIFESTATION',a:2,h:5,max:5,armor:0,ready:true,sick:false,guard:false,zone:'FIELD',marks:[],growth:0,momentum:0,quick:null,turnFlags:{},...overrides}}
function side(name,el='FIRE'){return{name,el,vit:30,maxE:7,e:7,deck:[],hand:[],wake:[],slots:[null,null,null],marks:[],initiationToken:false,responseEl:el,turnState:{resonance:{a:false,b:false,active:false},parents:[],resolved:[],moved:[]}}}
function state(){return{turn:1,active:0,startSeat:0,chain:0,rev:0,winner:null,p:[side('Attacker'),side('Defender','WATER')]}}
function move(payload){return{v:1,type:'PLAY_CARD',actor:0,rev:0,payload}}

const gameSource=fs.readFileSync('js/game.js','utf8');
const payloadSource=gameSource.slice(gameSource.indexOf('function ebMpPlayPayload('),gameSource.indexOf('function ebMpPlay(',gameSource.indexOf('function ebMpPlayPayload(')));
const payloadContext=vm.createContext({});vm.runInContext(payloadSource,payloadContext);
function payload(tech,target){return vm.runInContext('ebMpPlayPayload',payloadContext)(tech,null,target)}
function techniqueState(element,name='Technique'){
  const original=state(),tech=card({id:`tech-${element}`,el:element,n:name,type:'TECHNIQUE',zone:'HAND'}),friend=card({id:'friend',el:element}),enemy=card({id:'enemy',el:'WATER'});
  original.p[0].hand=[tech];original.p[0].slots[0]=friend;original.p[1].slots[0]=enemy;return{original,tech,friend,enemy};
}

let checks=0;function check(value,message){assert.ok(value,message);checks++}

for(const burning of [false,true])for(const guarded of [false,true]){
  const {original,tech,enemy}=techniqueState('FIRE','Flame Technique');if(burning)enemy.marks=['Burning'];if(guarded)original.p[1].slots[1]=card({id:'guard',guard:true});
  const result=engine.validateAndApplyMove(original,move(payload(tech,{enemy})));
  check(result.ok&&result.state.p[1].slots[0].h===(burning?2:3),`Fire Technique damages its chosen card for ${burning?3:2}${guarded?' through Guard':''}`);
  check(result.state.p[1].vit===30,'card-targeted Fire Technique never redirects damage to the Bender');
}

{
  const {original,tech}=techniqueState('FIRE','Flame Technique');original.p[1].slots[1]=card({id:'guard',guard:true});
  const blocked=engine.validateAndApplyMove(original,move(payload(tech,{bender:original.p[1]})));
  check(!blocked.ok&&blocked.error==='ILLEGAL_TARGET'&&original.p[1].vit===30,'Guard still blocks a Fire Technique explicitly aimed at the Bender');
  original.p[1].slots[1]=null;const hit=engine.validateAndApplyMove(original,move(payload(tech,{bender:original.p[1]})));
  check(hit.ok&&hit.state.p[1].vit===28&&hit.state.p[1].slots[0].h===5,'unguarded Bender targeting still damages the Bender rather than a card');
}

{
  const {original,tech,friend}=techniqueState('EARTH');const result=engine.validateAndApplyMove(original,move(payload(tech,{friend})));
  check(result.ok&&result.state.p[0].slots[0].armor===1,'Earth friendId reaches the intended friendly card');
}
{
  const {original,tech,friend}=techniqueState('NATURE');friend.marks=['Seeded'];const result=engine.validateAndApplyMove(original,move(payload(tech,{friend})));
  check(result.ok&&result.state.p[0].slots[0].growth===1,'Nature friendId reaches the intended Seeded card');
}
{
  const {original,tech,enemy}=techniqueState('WATER');const result=engine.validateAndApplyMove(original,move(payload(tech,{enemy})));
  check(result.ok&&result.state.p[1].slots[0].marks.includes('Soaked'),'Water enemyId reaches the intended enemy card');
}
{
  const {original,tech,friend}=techniqueState('AIR');const result=engine.validateAndApplyMove(original,move(payload(tech,{friend})));
  check(result.ok&&result.state.p[0].slots[0].momentum===1,'Air friendId reaches the intended friendly card');
}
{
  const {original,tech,friend,enemy}=techniqueState('MAGMA','Molten Channel');const result=engine.validateAndApplyMove(original,move(payload(tech,{friend,enemy,magmaMode:'BOTH'})));
  check(result.ok&&result.state.p[0].slots[0].armor===1&&result.state.p[1].slots[0].marks.includes('Burning'),'Magma friendId/enemyId/magmaMode reach both intended cards');
}
{
  const {original,tech,friend}=techniqueState('STORM','Static Reversal');const result=engine.validateAndApplyMove(original,move(payload(tech,{friend})));
  check(result.ok&&result.state.p[0].slots[0].quick?.kind==='MOVE','Storm friendId reaches the intended friendly card');
}
{
  const {original,tech,friend}=techniqueState('BLOOM','Rainseed');const result=engine.validateAndApplyMove(original,move(payload(tech,{friend})));
  check(result.ok&&result.state.p[0].slots[0].marks.includes('Seeded'),'Bloom friendId reaches the intended friendly card');
}
{
  // One card already played, so Static Step is the second card and Charges (1.13.2 fixed the engine, which used to need two).
  const {original,tech}=techniqueState('LIGHTNING');original.chain=1;const result=engine.validateAndApplyMove(original,move(payload(tech,{auto:true})));
  check(result.ok&&result.state.p[1].marks.includes('Charged'),'Lightning auto-target behavior remains independent of attack targetId fields');
}

{
  const original=state(),attacker=card({id:'attacker'}),target=card({id:'target'}),response=card({id:'response',el:'WATER',n:'Undertow',type:'RESPONSE',zone:'HAND',c:1});
  original.p[0].slots[0]=attacker;original.p[1].slots[0]=target;original.p[1].hand=[response];
  const result=engine.validateAndApplyMove(original,{v:1,type:'ATTACK',actor:0,rev:0,payload:{attackerId:'attacker',targetId:'target',targetType:'MANIFESTATION'}},{now:100});
  const offered=result.events.find(item=>item.type==='RESPONSE_OFFERED');
  check(offered.text==='Defender is choosing a response…','RESPONSE_OFFERED uses neutral defender-specific wording');
}

(async()=>{
  const submitSource=gameSource.slice(gameSource.indexOf('async function ebMpSubmit('),gameSource.indexOf('function ebMpSubscribeCompat',gameSource.indexOf('async function ebMpSubmit(')));
  let status=null,reopened=0;const context=vm.createContext({G:{rev:3},EB_INIT_LOCK:false,EB_MP:{enabled:true,client:{},input:{beginMove:()=>false}},ebMpStatus:value=>{status=value},ebMpOpenResponsePrompt:()=>{reopened++},clearTimeout(){},setTimeout(){},JSON});vm.runInContext(submitSource,context);
  const result=await vm.runInContext("ebMpSubmit('PASS',{}, {kind:'RESPONSE'})",context);
  check(result.error==='MOVE_PENDING'&&status.text==='Still sending your last move — tap Pass again'&&reopened===1,'a pending PASS is never silent and keeps/reopens the Response prompt');
  const respond=await vm.runInContext("ebMpSubmit('RESPOND',{element:'FIRE'}, {kind:'RESPONSE'})",context);
  check(respond.error==='MOVE_PENDING'&&status.text==='Still sending your last move — tap your response again'&&reopened===2,'a pending named response gets response-specific retry guidance');
  console.log(`Multiplayer Technique targeting and Response polish: ${checks} checks passed`);
})().catch(error=>{console.error(error);process.exitCode=1});
