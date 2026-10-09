// Issue #103 · 1.17.0 second-player mulligan (Owner-approved). Once, before their first play, attack or end of turn,
// the Bender who goes second may shuffle any cards from hand back into the Deck and draw that many.
// Engine (server random only), both seats' views and events, the move endpoint, live single-player, the rival and the Lab.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const engine=require('../lib/gameEngine.js');
const matchFactory=require('../lib/matchFactory.js');
const {buildPlayerView}=require('../lib/playerView.js');
const ElementBoundCards=require('../lib/cardCatalog.js');

let checks=0;const check=(value,message)=>{assert.ok(value,message);checks++};
function deepNoUndefined(value,path='root'){if(value===undefined)throw Error(`undefined at ${path}`);if(value&&typeof value==='object')for(const [k,v] of Object.entries(value))deepNoUndefined(v,`${path}.${k}`);return true}
function seeded(seed){let a=seed>>>0;return()=>{a=(a+0x6D2B79F5)>>>0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
const fresh=(starter=0.2)=>matchFactory.createInitialState({players:[{name:'A',element:'FIRE'},{name:'B',element:'WATER'}],random:seeded(7)});
const move=(state,actor,type,payload,random)=>engine.validateAndApplyMove(state,{v:1,type,actor,rev:state.rev,payload},{now:1,random});

// The factory opens the mulligan for the second Bender only.
{
  const s=fresh(),second=1-s.startSeat;
  check(s.p[second].mulligan==='OPEN'&&s.p[second].initiationToken&&s.p[s.startSeat].mulligan===undefined,'only the second Bender (who holds the Initiation Token) may mulligan');
  check(engine.ACTIONS.includes('MULLIGAN'),'MULLIGAN is an engine action');
}
// A mulligan shuffles the chosen cards into the Deck and draws that many, on either Bender's turn.
{
  const s=fresh(),second=1-s.startSeat,side=s.p[second],ids=side.hand.slice(0,2).map(c=>c.id),deckBefore=side.deck.length,handBefore=side.hand.map(c=>c.id);
  check(s.active===s.startSeat,'the first Bender is active while the second decides');
  const r=move(s,second,'MULLIGAN',{cardIds:ids},seeded(3));
  check(r.ok,`the mulligan is accepted during the rival's turn (${r.error})`);
  const own=r.state.p[second];
  check(own.hand.length===4&&own.deck.length===deckBefore&&own.mulligan==='USED','hand stays at 4, the Deck keeps its size, and the mulligan is used');
  check(handBefore.slice(2).every(id=>own.hand.some(c=>c.id===id)),'the kept cards stay in hand');
  check(own.deck.some(c=>ids.includes(c.id))&&own.deck.filter(c=>ids.includes(c.id)).every(c=>c.zone==='DECK'),'the returned cards are in the Deck');
  check(r.state.rev===s.rev+1&&deepNoUndefined(r.state)&&deepNoUndefined(r.events),'revision advances; state and events are Firestore-safe');
  const pub=r.events.find(e=>e.type==='MULLIGAN'),draws=r.events.filter(e=>e.type==='DRAW');
  check(pub&&pub.count===2&&!('cardName' in pub)&&draws.length===2&&draws.every(e=>e.privateTo===second),'a public MULLIGAN event (count only) plus private DRAW events');
  // Privacy: the rival sees the count and draws, never the card names or the Deck order.
  const rivalSeat=1-second,events=r.events.map((e,i)=>({...e,seq:i+1}));
  const rivalView=buildPlayerView(r.state,rivalSeat,events,1),ownView=buildPlayerView(r.state,second,events,1);
  check(rivalView.p[second].hand.length===0&&rivalView.p[second].handCount===4&&rivalView.p[second].deck.length===0,'the rival view hides the hand and Deck');
  check(rivalView.events.filter(e=>e.type==='DRAW').every(e=>e.cardName===undefined&&e.cardId===undefined),'the rival view hides the drawn card names');
  check(ownView.events.filter(e=>e.type==='DRAW').every(e=>typeof e.cardName==='string')&&ownView.p[second].deck.length===0,'the mulligan Bender sees its own draws, never its Deck order');
  check(!JSON.stringify(rivalView).includes(ids[0])||!rivalView.p[second].hand.length,'returned card ids never reach the rival hand view');
  // Once only.
  check(move(r.state,second,'MULLIGAN',{cardIds:[]},seeded(1)).error==='MULLIGAN_UNAVAILABLE','a second mulligan is refused');
}
// Refusals.
{
  const s=fresh(),second=1-s.startSeat,first=s.startSeat,id=s.p[second].hand[0].id;
  check(move(s,first,'MULLIGAN',{cardIds:[]},seeded(1)).error==='MULLIGAN_UNAVAILABLE','the first Bender cannot mulligan');
  check(move(s,second,'MULLIGAN',{cardIds:[id,id]},seeded(1)).error==='ILLEGAL_MULLIGAN','duplicate cards are refused');
  check(move(s,second,'MULLIGAN',{cardIds:['nope']},seeded(1)).error==='ILLEGAL_MULLIGAN','cards not in hand are refused');
  check(move(s,second,'MULLIGAN',{cardIds:[id]},undefined).error==='MISSING_RANDOM','without the server random source the shuffle is refused');
  const keep=move(s,second,'MULLIGAN',{cardIds:[]},undefined);
  check(keep.ok&&keep.state.p[second].mulligan==='USED'&&keep.events[0].type==='MULLIGAN'&&keep.events[0].count===0,'keeping the hand needs no random source and closes the mulligan');
}
// Acting closes it: the second Bender's first end of turn (or play/attack).
{
  let s=fresh();const second=1-s.startSeat;
  s=move(s,s.startSeat,'END_TURN',{}).state;check(s.active===second&&s.p[second].mulligan==='OPEN','still open at the start of the second Bender’s first turn');
  s=move(s,second,'END_TURN',{}).state;check(s.p[second].mulligan==='CLOSED','closed once the second Bender acts');
  check(move(s,second,'MULLIGAN',{cardIds:[]},seeded(1)).error==='MULLIGAN_UNAVAILABLE','no mulligan after acting');
}
// The move endpoint passes the server's random source to the engine.
{
  const src=fs.readFileSync('api/submit-move.js','utf8');
  check(/random=Math\.random\}\)\{/.test(src)&&/validateAndApplyMove\(room\.state,move,\{now:serverNow,random\}\)/.test(src),'submit-move passes a server random source (injectable for tests)');
}

// Live single-player, the rival AI and the Balance Lab.
let source=fs.readFileSync('js/game.js','utf8');
source=source.slice(0,source.lastIndexOf('\nsetup();')).replace('return Object.freeze({DECKS:','return Object.freeze({_makeState:makeState,DECKS:');
const ctx=vm.createContext({console,Math,window:{ElementBoundCards,ElementBoundMatchFactory:matchFactory,ElementBoundEngine:engine,localStorage:null},document:{getElementById:()=>null,querySelector:()=>null,querySelectorAll:()=>[]},setTimeout:()=>0,clearTimeout(){},requestAnimationFrame(){}});
vm.runInContext(source,ctx);
vm.runInContext(`add=()=>{};render=()=>{};bump=()=>{};ebQueueFx=()=>{};hideModal=()=>{};go=()=>{};var LAST_MODAL=null;modal=(t,b,o)=>{LAST_MODAL={t,b,o}};`,ctx);
const live=vm.runInContext(`(()=>{let out={};
  // AI policy: a weak hand goes back; a hand with two 2+ cost Manifestations is kept.
  const u=(n,c)=>({n,c,type:'MANIFESTATION'}),t=(n,c)=>({n,c,type:'TECHNIQUE'}),r={n:'Backdraft',c:2,type:'RESPONSE'};
  out.weak=ebMulliganPick([u('Cinder Adept',1),u('Cinder Adept',1),t('Flame Burst',2),r]).map(c=>c.n);
  out.strong=ebMulliganPick([u('Ember Guard',2),u('Flare Hawk',3),t('Flame Burst',2),u('Cinder Adept',1)]).length;
  // The player goes second: the panel offers each card, then shuffles back the chosen ones and draws that many.
  let a=player('You','FIRE'),b=player('Rival','WATER');a.hand=a.deck.splice(0,4);b.hand=b.deck.splice(0,4);a.mulligan='OPEN';
  G={p:[a,b],active:1,startSeat:1,turn:1,chain:0,logs:[],winner:null,trial:null,rev:0};let doneCalled=false;
  ebOfferMulligan(()=>{doneCalled=true});out.offered=!!LAST_MODAL&&LAST_MODAL.o.dismissible===false&&LAST_MODAL.b.length===5;
  let first=a.hand[0].id;LAST_MODAL.b[0][1]();out.toggled=/PUT BACK/.test(LAST_MODAL.b[0][0]);
  let confirm=LAST_MODAL.b.find(x=>/^PUT BACK 1/.test(x[0]));confirm[1]();
  out.after={hand:a.hand.length,used:a.mulligan,firstGone:!a.hand.some(c=>c.id===first),inDeck:a.deck.some(c=>c.id===first),done:doneCalled};
  // The rival goes second: startMatch applies its mulligan at once (here: forced to a weak hand).
  return out})()`,ctx);
check(JSON.stringify(live.weak)==='["Cinder Adept","Flame Burst"]','AI: a weak hand returns everything but one 1-cost unit and the Response');
check(live.strong===0,'AI: a hand with two 2+ cost units is kept');
check(live.offered,'live: going second opens a non-dismissible panel listing the 4 cards and Keep hand');
check(live.toggled,'live: tapping a card marks it "PUT BACK" in words');
check(live.after.hand===4&&live.after.used==='USED'&&live.after.firstGone&&live.after.inDeck&&live.after.done,`live: the chosen card is shuffled back, 1 card drawn, and the rival turn continues (${JSON.stringify(live.after)})`);
const rival=vm.runInContext(`(()=>{diff='Difficult';choice='FIRE';EB_HYBRID_RESPONSE_CHOICE=null;let seen=[];for(let i=0;i<40;i++){startMatch();seen.push({second:G.p[1].mulligan,first:G.p[0].mulligan,starter:G.startSeat})}return seen})()`,ctx);
check(rival.every(x=>x.starter===0?(x.second==='USED'&&x.first===undefined):(x.first==='OPEN')),'live: when you start, the rival mulligans at once; when it starts, your mulligan is open');
const lab=vm.runInContext(`(()=>{let used=0;for(let i=0;i<20;i++){let st=EB_BALANCE._makeState('FIRE','WATER','mull-'+i,{startSeat:i%2});let s=st.p[1-st.startSeat];if(s.mulligan==='USED')used++;if(st.p[st.startSeat].mulligan)return -1}return used})()`,ctx);
check(lab===20,'Balance Lab: the second seat takes its mulligan decision every duel; the first never does');

// Rules text: Tome page and in-duel glossary.
const tome=require('../js/tomeData.js'),page=tome.pages.find(p=>p.title==='Mulligan');
check(page&&page.chapter==='core'&&/second may shuffle/.test(page.rule),'the Tome explains the mulligan in Core Terms');
check(/'Mulligan':'/.test(fs.readFileSync('js/game.js','utf8')),'the in-duel glossary explains the mulligan');
console.log(`Mulligan 1.17.0: ${checks} checks passed`);
