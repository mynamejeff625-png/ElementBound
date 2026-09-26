const assert=require('node:assert/strict');
const fs=require('node:fs');
const engine=require('../lib/gameEngine.js');
const {buildPlayerView}=require('../lib/playerView.js');
const {createSubmitMoveHandler}=require('../api/submit-move.js');
const {createMultiplayerClient}=require('../js/multiplayerClient.js');

function card(overrides={}){return{id:'card',el:'FIRE',n:'Unit',c:1,type:'MANIFESTATION',a:2,h:3,max:3,armor:0,ready:true,sick:false,guard:false,zone:'FIELD',marks:[],growth:0,momentum:0,quick:null,turnFlags:{},...overrides}}
function response(element,name){return card({id:`response-${element}`,el:element,n:name,c:2,type:'RESPONSE',zone:'HAND',a:undefined,h:undefined,max:undefined})}
function side(name,el='FIRE'){return{name,el,vit:30,maxE:7,e:7,deck:[],hand:[],wake:[],slots:[null,null,null],marks:[],initiationToken:false,responseEl:el,turnState:{resonance:{a:false,b:false,active:false},parents:[],resolved:[],moved:[]}}}
function state(defenderElement='WATER'){return{turn:1,active:0,startSeat:0,chain:0,rev:0,winner:null,p:[side('Attacker'),side('Defender',defenderElement)]}}
function attackMove(rev=0,target='target'){return{v:1,type:'ATTACK',actor:0,rev,payload:{attackerId:'attacker',targetId:target,targetType:target?'MANIFESTATION':'BENDER'}}}
function action(type,actor,rev,payload={}){return{v:1,type,actor,rev,payload}}
function battle(element='WATER',{token=false,responseCard=null,full=false,attackerHp=3,targetArmor=0,targetHp=3}={}){const original=state(element);original.p[0].slots[0]=card({id:'attacker',n:'Attacker',h:attackerHp,max:attackerHp});original.p[1].slots[0]=card({id:'target',n:'Target',h:targetHp,max:targetHp,armor:targetArmor,el:element});if(full){original.p[1].slots[1]=card({id:'ally-1'});original.p[1].slots[2]=card({id:'ally-2'})}original.p[1].initiationToken=token;if(responseCard)original.p[1].hand=[responseCard];return original}
function types(result){return result.events.map(item=>item.type)}
function noUndefined(value){if(value===undefined)return false;if(Array.isArray(value))return value.every(noUndefined);if(value&&typeof value==='object')return Object.values(value).every(noUndefined);return true}
function mockDb(room){const writes=[],roomRef={path:'rooms/ROOM01',collection(name){return{doc(id){return{path:`rooms/ROOM01/${name}/${id}`}}}}};return{writes,collection(){return{doc(){return roomRef}}},async runTransaction(callback){const pending=[],tx={async get(){return{exists:true,data:()=>structuredClone(room)}},update(ref,data){pending.push({path:ref.path,data})},set(ref,data){pending.push({path:ref.path,data})}};const result=await callback(tx);writes.push(...pending);return result}}}
function httpResponse(){return{statusCode:null,body:null,status(code){this.statusCode=code;return this},json(body){this.body=body;return this},setHeader(){}}}

let checks=0;const check=(value,message)=>{assert.ok(value,message);checks++};

{
  const original=battle('WATER',{token:true}),offered=engine.validateAndApplyMove(original,attackMove(),{now:1000});
  check(offered.ok&&offered.state.pendingResponse.timing==='BEFORE'&&offered.state.pendingResponse.deadline===31000,'legal body attack opens a deterministic 30-second BEFORE window');
  check(types(offered).includes('RESPONSE_OFFERED')&&offered.state.p[1].slots[0].h===3,'damage waits while the response is pending');
  const essence=offered.state.p[1].e,hand=offered.state.p[1].hand.length;
  const used=engine.validateAndApplyMove(offered.state,action('RESPOND',1,1,{element:'WATER',source:'TOKEN',targetId:'target'}),{now:2000});
  check(used.ok&&!used.state.p[1].initiationToken&&used.state.p[1].e===essence&&used.state.p[1].hand.length===hand,'token funding is one-time and does not touch hand or Essence');
  check(!used.state.pendingResponse&&used.state.p[1].slots[0]===null&&types(used).includes('INITIATION_TOKEN_SPENT'),'Undertow moves the defender and cancels the attack');
}

{
  const original=battle('WATER',{token:true,full:true}),result=engine.validateAndApplyMove(original,attackMove(),{now:0});
  check(result.ok&&!result.state.pendingResponse&&result.state.p[1].slots[0].h===1,'Undertow is not offered without an empty slot, even with a token');
}

{
  const original=battle('AIR',{token:true}),result=engine.validateAndApplyMove(original,attackMove(),{now:0});
  check(result.ok&&!result.state.pendingResponse,'Slipstream is not offered without another friendly Manifestation');
}

{
  const original=battle('EARTH',{responseCard:response('EARTH','Stonewall')}),offered=engine.validateAndApplyMove(original,attackMove(),{now:0});
  const used=engine.validateAndApplyMove(offered.state,action('RESPOND',1,1,{element:'EARTH',source:'CARD',cardId:'response-EARTH',targetId:'target'}),{now:1});
  check(used.ok&&used.state.p[1].e===5&&used.state.p[1].hand.length===0&&used.state.p[1].wake.some(item=>item.id==='response-EARTH'),'card funding spends Essence and sends the Response to Wake');
  check(used.state.p[1].slots[0].h===2,'Stonewall applies Armor before the continuing attack');
}

{
  const original=battle('EARTH',{token:true});
  original.p[1].slots[0].armor=3;original.p[1].slots[1]=card({id:'already-armored',el:'EARTH',armor:1,armorGainRound:1});
  const result=engine.validateAndApplyMove(original,attackMove(),{now:0});
  check(!result.state.pendingResponse,'Stonewall is not offered when every friendly unit is capped or already gained Armor this round');
}

{
  const original=battle('LIGHTNING',{token:true,attackerHp:2}),offered=engine.validateAndApplyMove(original,attackMove(),{now:0});
  const used=engine.validateAndApplyMove(offered.state,action('RESPOND',1,1,{element:'LIGHTNING',source:'TOKEN',targetId:'target'}),{now:1});
  check(used.ok&&!used.state.pendingResponse&&used.state.p[0].slots[0]===null&&used.state.p[1].slots[0].h===3,'lethal Flash Step destroys the attacker and cancels combat damage');
}

{
  const original=battle('AIR',{token:true});original.p[1].slots[1]=card({id:'replacement',n:'Replacement',h:5,max:5});
  const offered=engine.validateAndApplyMove(original,attackMove(),{now:0});
  const used=engine.validateAndApplyMove(offered.state,action('RESPOND',1,1,{element:'AIR',source:'TOKEN',targetId:'replacement'}),{now:1});
  check(used.ok&&used.state.p[1].slots[0].id==='replacement'&&used.state.p[1].slots[0].h===3,'Slipstream redirects the continuing attack to the chosen replacement');
}

{
  const original=battle('NATURE',{token:true});original.p[1].slots[1]=card({id:'hurt',n:'Hurt',h:1,max:3,el:'NATURE'});
  const offered=engine.validateAndApplyMove(original,attackMove(),{now:0});
  const used=engine.validateAndApplyMove(offered.state,action('RESPOND',1,1,{element:'NATURE',source:'TOKEN',targetId:'hurt'}),{now:1});
  check(used.state.p[1].slots[1].h===2&&used.state.p[1].slots[1].marks.includes('Second Bloom Used'),'Second Bloom heals and records its once-per-duel use');
  const retry=battle('NATURE',{token:true});retry.p[1].slots[1]=card({id:'hurt',h:1,max:3,el:'NATURE',marks:['Second Bloom Used']});
  const noWindow=engine.validateAndApplyMove(retry,attackMove(),{now:2});
  check(!noWindow.state.pendingResponse,'Second Bloom cannot target the same marked unit again when no other legal heal exists');
}

{
  const original=battle('FIRE',{responseCard:response('FIRE','Backdraft')}),hit=engine.validateAndApplyMove(original,attackMove(),{now:100});
  check(hit.ok&&hit.state.p[1].slots[0].h===1&&hit.state.pendingResponse?.timing==='AFTER'&&hit.state.pendingResponse.deadline===30100,'Backdraft opens a separate AFTER window only after positive damage');
  const used=engine.validateAndApplyMove(hit.state,action('RESPOND',1,1,{element:'FIRE',source:'CARD',cardId:'response-FIRE',targetId:'target'}),{now:200});
  check(used.state.p[0].slots[0].h===1&&types(used).includes('RESPONSE_USED'),'Backdraft retaliates after the original damage');
  const armored=battle('FIRE',{responseCard:response('FIRE','Backdraft'),targetArmor:3}),blocked=engine.validateAndApplyMove(armored,attackMove(),{now:0});
  check(!blocked.state.pendingResponse&&blocked.state.p[1].slots[0].h===3,'fully Armor-absorbed damage does not open Backdraft');
}

{
  const original=battle('STORM',{token:true,responseCard:response('FIRE','Backdraft'),attackerHp:3});original.p[1].turnState.parents=['LIGHTNING','FIRE'];
  const before=engine.validateAndApplyMove(original,attackMove(),{now:100}),responded=engine.validateAndApplyMove(before.state,action('RESPOND',1,1,{element:'LIGHTNING',source:'TOKEN',targetId:'target'}),{now:200});
  check(before.state.pendingResponse.timing==='BEFORE'&&before.state.pendingResponse.deadline===30100,'hybrid attack begins with its own BEFORE deadline');
  check(responded.state.pendingResponse?.timing==='AFTER'&&responded.state.pendingResponse.deadline===30200,'positive damage opens a distinct Backdraft AFTER deadline');
}

{
  const original=battle('WATER',{token:true}),offered=engine.validateAndApplyMove(original,attackMove(),{now:1000});
  check(engine.validateAndApplyMove(offered.state,action('RESPOND',0,1,{element:'WATER',source:'TOKEN',targetId:'target'}),{now:1001}).error==='NOT_RESPONSE_DEFENDER','attacker cannot spoof RESPOND');
  check(engine.validateAndApplyMove(offered.state,action('END_TURN',0,1),{now:1001}).error==='RESPONSE_PENDING','all ordinary actions are blocked while pending');
  check(engine.validateAndApplyMove(offered.state,action('RESOLVE_EXPIRED',0,1),{now:30999}).error==='RESPONSE_NOT_EXPIRED','auto-pass is rejected before the deadline');
  const auto=engine.validateAndApplyMove(offered.state,action('RESOLVE_EXPIRED',0,1),{now:31000});
  check(auto.ok&&auto.autoResolved&&types(auto).includes('RESPONSE_AUTO_PASSED')&&auto.state.p[1].slots[0].h===1,'attacker deadline resolution auto-passes and continues the attack');
  const defenderAuto=engine.validateAndApplyMove(offered.state,action('RESOLVE_EXPIRED',1,1),{now:31000});
  check(defenderAuto.ok&&defenderAuto.autoResolved,'either connected client can resolve an expired window');
  const late=engine.validateAndApplyMove(offered.state,action('RESPOND',1,1,{element:'WATER',source:'TOKEN',targetId:'target'}),{now:31000});
  check(late.ok&&late.autoResolved&&late.state.p[1].initiationToken,'late RESPOND auto-resolves as PASS instead of applying the submitted response');
}

{
  const original=battle('WATER',{token:true}),missing=engine.validateAndApplyMove(original,attackMove());
  check(!missing.ok&&missing.error==='MISSING_SERVER_TIME','an attack that would open a response window requires finite server time');
  const offered=engine.validateAndApplyMove(original,attackMove(),{now:0});
  const pendingMissing=engine.validateAndApplyMove(offered.state,action('PASS',1,1));
  check(!pendingMissing.ok&&pendingMissing.error==='MISSING_SERVER_TIME','every action against a pending response requires finite server time');
}

{
  const original=battle('WATER',{token:true}),offered=engine.validateAndApplyMove(original,attackMove(),{now:0});
  const passed=engine.validateAndApplyMove(offered.state,action('PASS',1,1),{now:1});
  check(passed.ok&&types(passed).includes('RESPONSE_PASSED')&&passed.state.p[1].initiationToken,'manual PASS preserves the token and resolves the attack');
}

{
  const original=battle('STORM',{token:true});original.p[1].turnState.parents=['LIGHTNING','AIR'];original.p[1].slots[1]=card({id:'other',el:'AIR'});
  const offered=engine.validateAndApplyMove(original,attackMove(),{now:0}),tokenElements=offered.state.pendingResponse.legalOptions.filter(item=>item.source==='TOKEN').map(item=>item.element).sort();
  check(tokenElements.join(',')==='AIR,LIGHTNING','hybrid token can fund either parent element legal Response');
}

{
  const original=battle('WATER',{token:true}),bender=engine.validateAndApplyMove(original,attackMove(0,null),{now:0});
  check(bender.ok&&!bender.state.pendingResponse&&bender.state.p[1].vit===28,'Bender attacks do not open Response windows');
}

{
  const original=battle('EARTH',{responseCard:response('EARTH','Stonewall')}),offered=engine.validateAndApplyMove(original,attackMove(),{now:500});
  const attackerView=buildPlayerView(offered.state,0,offered.events,750),defenderView=buildPlayerView(offered.state,1,offered.events,750);
  check(!attackerView.pendingResponse.legalOptions&&attackerView.pendingResponse.waiting,'attacker view contains only a generic waiting window');
  check(defenderView.pendingResponse.legalOptions.some(item=>item.responseName==='Stonewall'),'defender view contains legal options');
  const serialized=JSON.stringify(attackerView.pendingResponse);
  check(!serialized.includes('Stonewall')&&!serialized.includes('cardId')&&!serialized.includes('source'),'attacker view and offered event do not reveal card or funding source');
  check(attackerView.serverNow===750&&defenderView.serverNow===750,'both private views carry the same server clock sample');
}

{
  const original=battle('WATER',{token:true}),offered=engine.validateAndApplyMove(original,attackMove(),{now:0});
  const used=engine.validateAndApplyMove(offered.state,action('RESPOND',1,1,{element:'WATER',source:'TOKEN',targetId:'target'}),{now:1});
  check(noUndefined(offered.state)&&noUndefined(offered.events)&&noUndefined(used.state)&&noUndefined(used.events),'pending states and response events contain no undefined values');
}

(async()=>{
  const original=battle('WATER',{token:true}),offered=engine.validateAndApplyMove(original,attackMove(),{now:1000}).state;
  async function request(uid,type){const db=mockDb({players:['attacker-uid','defender-uid'],state:offered,events:[],eventSeq:0}),handler=createSubmitMoveHandler({auth:{async verifyIdToken(){return{uid}}},db,now:()=>2000}),res=httpResponse();await handler({method:'POST',headers:{authorization:'Bearer token'},body:{roomId:'ROOM01',move:{v:1,type,rev:1,payload:type==='RESPOND'?{element:'WATER',source:'TOKEN',targetId:'target'}:{}}}},res);return{res,db}}
  const spoof=await request('attacker-uid','RESPOND');check(spoof.res.statusCode===403&&spoof.res.body.error==='NOT_RESPONSE_DEFENDER'&&spoof.db.writes.length===0,'server rejects authenticated attacker spoofing RESPOND without writes');
  const defender=await request('defender-uid','PASS');check(defender.res.statusCode===200&&defender.db.writes.length===3,'server accepts PASS from authenticated defender and updates room plus both views');
  check(defender.res.body.state.serverNow===2000&&defender.db.writes.filter(write=>write.path.includes('/views/')).every(write=>write.data.state.serverNow===2000),'submit-move stamps both views and its response with server time');
  const game=fs.readFileSync('js/game.js','utf8');
  check(/Opponent is deciding…/.test(game)&&/Response available/.test(game)&&/setInterval\(update,250\)/.test(game),'client renders attacker waiting and defender countdown states');
  check(/ebMpSubmit\('RESPOND'/.test(game)&&/ebMpSubmit\('PASS'/.test(game)&&/ebMpSubmit\('RESOLVE_EXPIRED'/.test(game),'client submits response, pass, and attacker expiry actions');
  check(/modalDismiss.*style\.display='none'/.test(game)&&/onClick:defending\?ebMpOpenResponsePrompt/.test(game),'response prompt has no dismiss action and its status banner can reopen it');
  check(/Date\.now\(\)\+Number\(EB_MP\.serverClockOffset/.test(game)&&/view\.serverNow-Date\.now\(\)/.test(game),'response countdown uses a server-derived clock offset');
  check(/!seconds&&!EB_MP\.responseExpirySent/.test(game),'both attacker and defender clients request expiry when the countdown ends');
  check(/RESPONSE_NOT_EXPIRED/.test(game)&&/remainingMs/.test(game)&&/responseRetryTimer/.test(game),'an early expiry rejection schedules a retry using the server remaining time');
  const messages=[],replies=[{ok:false,status:400,body:{ok:false,error:'RESPONSE_NOT_EXPIRED',detail:{remainingMs:125}}},{ok:true,status:200,body:{ok:true,autoResolved:true}}];
  const client=createMultiplayerClient({roomId:'ROOM01',uid:'attacker-uid',getIdToken:async()=>'token',subscribeView:()=>()=>{},fetchImpl:async()=>{const reply=replies.shift();return{ok:reply.ok,status:reply.status,json:async()=>reply.body}},onView(){},onMessage:message=>messages.push(message)});
  const early=await client.submit(action('RESOLVE_EXPIRED',0,1)),eventual=await client.submit(action('RESOLVE_EXPIRED',0,1));
  check(!early.ok&&early.error==='RESPONSE_NOT_EXPIRED'&&early.detail.remainingMs===125&&!messages.some(message=>message.kind==='error'),'early expiry preserves retry timing without showing an error banner');
  check(eventual.ok&&eventual.autoResolved&&messages.at(-1).text==='Response window expired — the attack continued.','auto-resolved transport result shows the dedicated expiry message');
  console.log(`Multiplayer Response Window 1.1.0: ${checks} checks passed`);
})().catch(error=>{console.error(error);process.exitCode=1});
