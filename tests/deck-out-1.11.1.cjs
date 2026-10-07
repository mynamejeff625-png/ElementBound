// Issue #96 Part A · One deck-out rule everywhere: an empty Deck never ends the duel, and Exhaustion grows
// 2, 3, 4… per Bender in the online engine, live single-player and the Balance Lab alike.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const engine=require('../lib/gameEngine.js');
const matchFactory=require('../lib/matchFactory.js');
const {buildPlayerView}=require('../lib/playerView.js');
const ElementBoundCards=require('../lib/cardCatalog.js');

let checks=0;const check=(value,message)=>{assert.ok(value,message);checks++};
function deepNoUndefined(value,path='root'){if(value===undefined)throw Error(`undefined at ${path}`);if(value&&typeof value==='object')for(const [k,v] of Object.entries(value))deepNoUndefined(v,`${path}.${k}`);return true}
function side(name,el,extra={}){return{name,el,vit:30,maxE:2,e:2,deck:[],hand:[],wake:[],slots:[null,null,null],marks:[],recycles:3,exhaustion:0,initiationToken:false,autoPass:false,responseEl:el,turnState:{resonance:{a:false,b:false,active:false},parents:[],resolved:[],moved:[]},...extra}}
const endTurn=(state,actor)=>engine.validateAndApplyMove(state,{v:1,type:'END_TURN',actor,rev:state.rev,payload:{}},{now:1000});

// Factory and engine.
{
  const s=matchFactory.createInitialState({players:[{name:'A',element:'FIRE'},{name:'B',element:'WATER'}],random:()=>0.3});
  check(s.p.every(p=>p.exhaustion===0)&&deepNoUndefined(s),'new matches start every Bender at Exhaustion 0');
  check(engine.EXHAUSTION_BASE===2,'Exhaustion starts at 2 damage');

  let state={turn:3,active:0,startSeat:0,chain:0,rev:7,winner:null,p:[side('A','FIRE'),side('B','WATER')]};
  const damage=[];
  for(let i=0;i<3;i++){
    const before=state.p[1].vit,r=endTurn(state,0);
    check(r.ok,`END_TURN ${i+1} is accepted with an empty Deck and Hand (${r.error})`);
    damage.push(before-r.state.p[1].vit);
    const ev=r.events.find(e=>e.type==='EXHAUSTION');
    check(ev&&ev.amount===2+i&&ev.count===i+1&&ev.actor===1,`EXHAUSTION event reports ${2+i} damage (${JSON.stringify(ev)})`);
    check(r.state.winner==null,`an empty Hand and Deck does not end the online duel (draw ${i+1})`);
    check(deepNoUndefined(r.state)&&deepNoUndefined(r.events),'state and events stay Firestore-safe');
    // Hand the turn back to seat 0 without its own Exhaustion so only seat 1's count moves.
    state=r.state;state.p[0].deck=[{id:`fill-${i}`,el:'FIRE',n:'Filler',c:9,type:'MANIFESTATION',a:1,h:1,max:1,zone:'DECK',marks:[]}];
    const back=endTurn(state,1);check(back.ok,'the other Bender ends its turn');state=back.state;
  }
  check(damage.join()==='2,3,4'&&state.p[1].exhaustion===3,`online Exhaustion grows 2, 3, 4 (got ${damage})`);
  check(state.p[0].exhaustion===0,'each Bender keeps its own Exhaustion count');

  const legacy={turn:3,active:0,startSeat:0,chain:0,rev:1,winner:null,p:[side('A','FIRE'),side('B','WATER')]};delete legacy.p[1].exhaustion;
  const old=endTurn(legacy,0);
  check(old.ok&&legacy.p[1].vit-old.state.p[1].vit===2&&old.state.p[1].exhaustion===1,'a room created before 1.11.1 reads a missing count as 0');

  const lethal={turn:9,active:0,startSeat:0,chain:0,rev:1,winner:null,p:[side('A','FIRE'),side('B','WATER',{vit:3,exhaustion:1})]};
  const end=endTurn(lethal,0);
  check(end.ok&&end.state.p[1].vit===0&&end.state.winner==='A'&&end.events.some(e=>e.type==='WIN'),'Exhaustion can still bring a Bender to 0 Vitality');

  const views=[0,1].map(seat=>buildPlayerView(state,seat,[],1000));
  check(views.every(v=>v.p[1].exhaustion===3&&v.p[0].exhaustion===0&&deepNoUndefined(v)),'both seats see both Exhaustion counts');
}

// Live single-player and the Balance Lab.
let source=fs.readFileSync('js/game.js','utf8');
source=source.slice(0,source.lastIndexOf('\nsetup();')).replace('return Object.freeze({DECKS:','return Object.freeze({_makeState:makeState,_draw:draw,DECKS:');
const ctx=vm.createContext({console,Math,window:{ElementBoundCards,ElementBoundMatchFactory:matchFactory},document:{getElementById:()=>null,querySelector:()=>null,querySelectorAll:()=>[]},setTimeout:()=>0,clearTimeout(){},requestAnimationFrame(){}});
vm.runInContext(source,ctx);
vm.runInContext(`add=()=>{};render=()=>{};bump=()=>{};ebQueueFx=()=>{};modal=()=>{};hideModal=()=>{};`,ctx);
const live=vm.runInContext(`(()=>{let a=player('A','FIRE'),b=player('B','WATER');a.deck=[];a.hand=[];G={p:[a,b],active:0,chain:0,logs:[],winner:null,trial:null,turn:5};
 let out=[];for(let i=0;i<3;i++){let v=a.vit;draw(a);out.push(v-a.vit)}winCheck();
 return{damage:out.join(),count:a.exhaustion,winner:G.winner,end:resolveDuelEnd(),glossary:GLOSSARY['Card Depletion']}})()`,ctx);
check(live.damage==='2,3,4'&&live.count===3,`live Exhaustion grows 2, 3, 4 (got ${live.damage})`);
check(live.winner==null&&live.end===null,'live play never ends a duel for an empty Hand and Deck');
check(/does not end the duel/.test(live.glossary),'the in-duel glossary explains the new rule');

const sim=vm.runInContext(`(()=>{let st=EB_BALANCE._makeState('FIRE','WATER','deck-out'),p=st.p[0];p.deck=[];p.hand=[];p.slots=[null,null,null];let out=[];for(let i=0;i<3;i++){let v=p.vit;EB_BALANCE._draw(st,0);out.push(v-p.vit)}
 let reasons={};for(const a of EB_BALANCE.DECKS)for(const b of EB_BALANCE.DECKS)for(let i=0;i<3;i++){let r=EB_BALANCE.simulate(a,b,{seed:'deck-out|'+a+'|'+b+'|'+i});reasons[r.reason]=(reasons[r.reason]||0)+1}
 return{damage:out.join(),reasons}})()`,ctx);
check(sim.damage==='2,3,4','Balance Lab Exhaustion grows 2, 3, 4');
check(!sim.reasons.CARD_DEPLETION&&!sim.reasons.STALL_CEILING&&sim.reasons.VITALITY===243,`every Balance Lab duel ends by Vitality (${JSON.stringify(sim.reasons)})`);

// Tome and lesson text.
const tome=require('../js/tomeData.js'),lessons=fs.readFileSync('js/tomeLessons.js','utf8');
const page=title=>tome.pages.find(p=>p.title===title);
check(/does not end the duel/.test(page('Card Depletion').rule)&&/then 1 more each time/.test(page('Exhaustion').rule),'Tome Card Depletion and Exhaustion pages describe the new rule');
check(page('When the Cards Run Out').says.join('|')==='Empty deck: 2 damage.|Again: 3 damage. It keeps growing.'&&lessons.includes("'Again: 3 damage. It keeps growing.'")&&lessons.includes("'tl-seal','Exhaustion grows'"),'Lesson VII demo teaches growing Exhaustion');

console.log(`Deck-out 1.11.1: ${checks} checks passed`);
