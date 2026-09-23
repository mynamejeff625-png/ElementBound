const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const engine=require('../lib/gameEngine.js');

function card(overrides={}){
  return {id:'card',el:'FIRE',n:'Cinder Adept',c:1,type:'MANIFESTATION',a:1,h:2,max:2,
    armor:0,ready:true,sick:false,guard:false,zone:'HAND',marks:[],growth:0,momentum:0,
    quick:null,turnFlags:{},...overrides};
}
function side(name,el='FIRE'){
  return {name,el,vit:30,maxE:2,e:2,deck:[],hand:[],wake:[],slots:[null,null,null],marks:[],
    initiationToken:false,responseEl:el,turnState:{resonance:{a:false,b:false,active:false},parents:[],resolved:[],moved:[]}};
}
function state(){return {turn:1,active:0,startSeat:0,chain:0,rev:0,winner:null,p:[side('A'),side('B','WATER')]}}
function move(type,payload={},actor=0,rev=0){return {v:1,type,actor,rev,payload}}

let checks=0;
function check(value,message){assert.ok(value,message);checks++}
function snapshot(value){return JSON.stringify(value)}

{
  const original=state(),before=snapshot(original);
  const result=engine.validateAndApplyMove(original,move('PLAY_CARD',{cardId:'missing',slotIndex:0}));
  check(!result.ok&&result.error==='CARD_NOT_IN_HAND','missing card must be rejected');
  check(result.state===original,'rejection must return the original state identity');
  check(snapshot(original)===before,'rejection must not mutate state');
}
{
  const malformed={rev:0,active:0,p:[{},{}]},before=snapshot(malformed);
  const result=engine.validateAndApplyMove(malformed,move('END_TURN'));
  check(!result.ok&&result.error==='INVALID_STATE','malformed authoritative state must be rejected');
  check(snapshot(malformed)===before,'invalid-state rejection must not mutate input');
}
{
  const original=state(),before=snapshot(original);
  const result=engine.validateAndApplyMove(original,move('END_TURN',{},1));
  check(!result.ok&&result.error==='NOT_YOUR_TURN','wrong actor must be rejected');
  check(snapshot(original)===before,'wrong-turn rejection must not mutate state');
}
{
  const original=state(),before=snapshot(original);
  const result=engine.validateAndApplyMove(original,move('END_TURN',{},0,4));
  check(!result.ok&&result.error==='REVISION_MISMATCH','stale revision must be rejected');
  check(snapshot(original)===before,'stale rejection must not mutate state');
}
{
  const original=state(),unit=card();original.p[0].hand=[unit];
  const action=move('PLAY_CARD',{cardId:unit.id,slotIndex:0});
  const before=snapshot(original),a=engine.validateAndApplyMove(original,action),b=engine.validateAndApplyMove(original,action);
  check(a.ok&&b.ok,'legal summon must resolve');
  check(snapshot(a.state)===snapshot(b.state),'same state and move must be deterministic');
  check(snapshot(original)===before,'legal resolution must not mutate input state');
  check(a.state!==original&&a.state.rev===1,'legal resolution must return a new revisioned state');
  check(a.state.p[0].slots[0].id===unit.id&&a.state.p[0].e===1,'summon must update field and Essence');
  check(a.state.p[1].marks.includes('Burning'),'Cinder Adept summon effect must resolve in pure engine');
}
{
  const original=state(),tech=card({id:'tech',n:'Crosswind',el:'AIR',type:'TECHNIQUE',c:1});
  const ally=card({id:'ally',n:'Ally',el:'AIR',zone:'FIELD'}),left=card({id:'left',zone:'FIELD'}),right=card({id:'right',zone:'FIELD'});
  original.p[0].hand=[tech];original.p[0].slots[0]=ally;original.p[1].slots=[left,right,null];
  const before=snapshot(original),result=engine.validateAndApplyMove(original,move('PLAY_CARD',{cardId:'tech',friendId:'ally'}));
  check(!result.ok&&result.error==='ILLEGAL_TARGET','Crosswind must require two swap targets when available');
  check(snapshot(original)===before,'failed Technique must not leak Momentum or other nested mutation');
}
{
  const original=state(),attacker=card({id:'attacker',n:'Flare Hawk',a:3,h:3,max:3,zone:'FIELD',sick:false,ready:true});
  const defender=card({id:'defender',el:'WATER',n:'Target',a:1,h:2,max:2,zone:'FIELD',marks:['Burning']});
  original.p[0].slots[0]=attacker;original.p[1].slots[0]=defender;
  const result=engine.validateAndApplyMove(original,move('ATTACK',{attackerId:'attacker',targetId:'defender'}));
  check(result.ok,'legal body attack must resolve');
  check(result.state.p[1].slots[0]===null&&result.state.p[1].wake[0].id==='defender','lethal target must move to Wake');
  check(original.p[1].slots[0]===defender&&defender.h===2,'attack must not mutate original nested objects');
}
{
  const original=state(),attacker=card({id:'attacker',zone:'FIELD',sick:false,ready:true});
  const guard=card({id:'guard',el:'EARTH',n:'Earthen Guard',guard:true,zone:'FIELD'});
  original.p[0].slots[0]=attacker;original.p[1].slots[0]=guard;
  const before=snapshot(original),result=engine.validateAndApplyMove(original,move('ATTACK',{attackerId:'attacker',targetId:null,targetType:'BENDER'}));
  check(!result.ok&&result.error==='GUARD_BLOCKS_BENDER','Guard must reject an illegal direct attack');
  check(snapshot(original)===before,'Guard rejection must not mutate state');
}
{
  const original=state(),attacker=card({id:'attacker',zone:'FIELD',sick:false,ready:true}),defender=card({id:'defender',zone:'FIELD'});
  const response=card({id:'response',n:'Undertow',el:'WATER',type:'RESPONSE',c:2});
  original.p[0].slots[0]=attacker;original.p[1].slots[0]=defender;original.p[1].hand=[response];
  const before=snapshot(original),result=engine.validateAndApplyMove(original,move('ATTACK',{attackerId:'attacker',targetId:'defender'}));
  check(!result.ok&&result.error==='RESPONSE_WINDOW_REQUIRED','reactive combat must remain gated for the dedicated Response branch');
  check(snapshot(original)===before,'response-window rejection must not mutate input');
}
{
  const original=state();original.p[1].deck=[card({id:'draw',zone:'DECK'})];
  const result=engine.validateAndApplyMove(original,move('END_TURN'));
  check(result.ok&&result.state.active===1&&result.state.p[1].hand[0].id==='draw','end turn must advance and draw');
  check(result.state.rev===1&&original.active===0&&original.rev===0,'end turn must preserve original and increment copy');
}
{
  const html=fs.readFileSync('index.html','utf8');
  check(html.indexOf('lib/gameEngine.js')<html.indexOf('js/game.js'),'browser must load pure engine before game adapter');
  const source=fs.readFileSync('js/game.js','utf8');
  check(/ElementBoundEngine\.validateAndApplyMove\(state,action\)/.test(source),'browser reducer must call shared engine');
}
{
  const source=fs.readFileSync('lib/gameEngine.js','utf8');
  const context=vm.createContext({globalThis:{},structuredClone});
  vm.runInContext(source,context);
  check(typeof context.globalThis.ElementBoundEngine.validateAndApplyMove==='function','browser global export must exist');
}

console.log(`Pure engine extraction: ${checks} checks passed`);
