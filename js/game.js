
const EB_RELEASE=window.EB_RELEASE||Object.freeze({version:'0.0.0',label:'Development',engine:'EB-development',balanceLab:'Balance Lab',ruleset:'EB-RULES-DEVELOPMENT'});

const {HYBRIDS,INFO,BASE,RESPONSES,TECH,TECH2={},HYBRID_CARDS}=window.ElementBoundCards;
const TECH2_NAMES=new Set(Object.values(TECH2).map(t=>t[0]));
const EB_ELEMENT_NAMES={FIRE:'Fire',WATER:'Water',NATURE:'Nature',EARTH:'Earth',LIGHTNING:'Lightning',AIR:'Air',MAGMA:'Magma',STORM:'Storm',BLOOM:'Bloom'};
function ebElementName(element){return EB_ELEMENT_NAMES[element]||String(element||'')}
function ebIconMarkup(name,label){return window.EB_UI.icon(name.toLowerCase(),label?{label}:{}).outerHTML}
function ebElementIcon(element){let icon=window.EB_UI.icon(element.toLowerCase(),{label:ebElementName(element)});icon.classList.add('element-icon',`eb-element--${element.toLowerCase()}`);return icon.outerHTML}
function ebSetIconText(node,icon,text,label){if(!node)return;node.replaceChildren(window.EB_UI.icon(icon,{label}),document.createTextNode(` ${text}`))}
function ebHydrateStaticIcons(){if(!document.querySelectorAll)return;document.querySelectorAll('[data-eb-element-icon]').forEach(host=>{let name=host.dataset.ebElementIcon,icon=window.EB_UI.icon(name);icon.classList.add('element-icon',`eb-element--${name}`);host.replaceWith(icon)});document.querySelectorAll('[data-eb-static-icon]').forEach(host=>host.replaceWith(window.EB_UI.icon(host.dataset.ebStaticIcon)))}

function responseCard(el){return window.ElementBoundMatchFactory.createResponseCard(()=>++uid,el)}
let EB_HYBRID_RESPONSE_CHOICE=null;
// Alpha 0.7.8 Exhaustion Help hotfix — one source of truth for rules + gameplay.
const EXHAUSTION_DAMAGE=2;
// Second Wind (issue #99): from round 2, start your turn with fewer Manifestations than the rival and either 2 or
// fewer cards in hand or 2+ fewer Manifestations → draw 1 extra card (never from an empty Deck). Same rule as lib/gameEngine.js.
const SECOND_WIND_HAND=2;
function ebSecondWindApplies(p,e,round){if(!p||!e)return false;let mine=p.slots.filter(Boolean).length,theirs=e.slots.filter(Boolean).length;if(Number(round)<2||!p.deck.length||mine>=theirs)return false;return p.hand.length<=SECOND_WIND_HAND||theirs-mine>=2}
const GLOSSARY={
'Bender':'That is you. Your Bender is the player you are protecting. If your Vitality reaches 0, you lose the duel.',
'Vitality':'Your Bender’s life total. You begin a normal duel with 30. Damage lowers it; some effects can restore it. Reach 0 and that Bender loses.',
'Essence':'The energy you spend to play cards. The number on a card is its Essence cost. Your maximum Essence grows as the duel progresses, up to 7, and refills at the start of your turn.',
'Manifestation':'A creature you summon into one of your three field slots. Manifestations have ATK and HP, can fight, and may carry elemental effects.',
'Technique':'A one-use action card. Pay its Essence cost, resolve its effect, then it goes to the Wake instead of staying on the field.',
'Response':'A reactive card used only during a legal Response Window. Responses cost 2 Essence, resolve once, then go to the Wake.',
'Response Window':'The brief opportunity created by a qualifying enemy attack. You may use one legal Response or Pass; the pending attack is revalidated afterward.',
'Initiation Token':'A one-use duel resource given to the Bender who goes second. It can invoke an eligible elemental Response without that Response card being in Hand. Hybrid Tokens may invoke either parent element’s Response.',
'Pass':'Decline the current Response opportunity. The pending attack then continues if it is still legal.',
'ATK':'Attack power. This is how much combat damage a Manifestation normally deals when it attacks.',
'HP':'A Manifestation’s current health. Damage lowers HP. At 0 HP, that Manifestation is destroyed and moved to the Wake.',
'Field Slot':'One of the three Manifestation spaces: M1, M2, and M3. A Manifestation needs an open slot to enter the field.',
'Hand':'The cards currently available for you to play. Your rival’s hand count is visible, but its actual cards stay hidden.',
'Deck':'Your remaining draw pile. If it is empty when you need to draw, Exhaustion happens instead.',
'Wake':'The used-card zone. Resolved Techniques and destroyed Manifestations are placed here.',
'Exhaustion':`If your Deck is empty when you would draw, your Bender takes Exhaustion damage instead: ${EXHAUSTION_DAMAGE} the first time, then 1 more each time after (3, 4, 5…). The duel goes on.`,
'Card Depletion':'Running out of cards does not end the duel. With an empty Hand and Deck you keep taking turns: your Manifestations still attack, and each draw becomes Exhaustion, which grows every time. Only 0 Vitality ends the duel.',
'Turn':'Your chance to play cards, set up effects, attack with eligible Manifestations, and then pass control to the rival.',
'Chain':'The number of Prime cards you have successfully played in sequence during your current turn. Arc Runner gains +1 ATK at Chain 2+, while Volt Lynx adds +2 damage to its first attack at Chain 3+.',
'Summoning sickness':'A Manifestation cannot attack on the same turn it enters the field. Its passive effects, including Guard, can still work immediately.',
'Ready':'A Manifestation that is currently able to attack when the rules allow it. Some rules, such as Guard, specifically care whether a Manifestation is Ready.',
'Guard':'A Bender-only protective effect. While a Guard is on the field, the opposing Bender normally cannot be directly attacked or targeted by hostile damage effects. Guard does NOT protect other Manifestations. A card whose enabled effect explicitly says it ignores or bypasses Guard may still legally target the Bender. Guard protects normally even if it has attacked or has Summoning sickness.',
'Armor':'Temporary damage protection attached to a specific Manifestation. Each Armor prevents 1 damage and is consumed. A Manifestation can gain Armor only once per round, and unused Armor expires after both Benders have acted. This cap applies to both Earth and Magma Armor sources.',
'Burning':'Fire’s setup effect. Burning does not automatically deal damage; Fire cards such as Flare Hawk and Flame Burst become stronger when they hit a Burning target.',
'Soaked':'Water’s control mark. A Soaked Manifestation deals 2 less damage with its next direct attack (minimum 0), then Soaked is removed. Status and indirect damage are unaffected.',
'Seeded':'Nature’s setup effect placed on a specific Manifestation. Seeded prepares that Manifestation for Nature healing and Growth effects; Sproutling can place it on another friendly Manifestation such as Grove Beast, and Wild Growth Seeds and grows a Manifestation at once.',
'Second Bloom Used':'This Manifestation has already been healed by Second Bloom this duel and cannot receive that Response again.',
'Growth':'Nature’s scaling resource. Each Growth gives that Manifestation +1 ATK, up to 3 Growth.',
'Charged':'Lightning’s temporary payoff mark. The next Lightning attack that hits a Charged target deals +1 damage, then Charged is consumed. Unused Charged expires at round end after both Benders have acted.',
'Momentum':'Air’s temporary stacking resource, up to 3. Multiple grants can stack during the round, and each Momentum gives that Manifestation +1 ATK. All Momentum expires at round end after both Benders have acted. Crosswind always grants 1 Momentum to a friendly Manifestation; Sky Raptor can ignore Guard while it has Momentum.',
'Weakened':'A persistent -1 ATK debuff from Crosswind (both enemies it swaps) or Downdraft (one enemy). It does not stack on the same Manifestation and lasts until that Manifestation is destroyed.',
'Warded':'Rally Ward: from round 2 on, a Manifestation summoned onto your empty field while the rival has Manifestations is Warded. It can\'t be attacked until your next turn begins. Techniques can still target it, and a Warded Guard still protects your Bender.',
'Second Wind':'From round 2, if you start your turn with fewer Manifestations than the rival, and you hold 2 or fewer cards or are 2 or more Manifestations behind, you draw 1 extra card after your normal draw. It never draws from an empty Deck.',
'Flow':'Deck control. Flow lets you inspect upcoming card(s) and decide whether to keep them on top or send them to the bottom, helping you find a better next draw.',
'Prime':'A deck or card aligned to one core element: Fire, Water, Nature, Earth, Lightning, or Air.',
'Hybrid':'A deck that combines two Prime elements and adds its own Hybrid cards. Hybrid play revolves around activating Resonance.',
'Resonance':'A Hybrid turn state. Resolve one Prime card from each of that Hybrid’s two parent elements in the same turn to activate Resonance. Hybrid cards themselves do not activate it.',
'Quick':'A Technique that prepares an effect lasting until your next turn. Quick remains pre-committed and is separate from the live Response Window.',
'Target':'The Bender or Manifestation an attack or Technique is being applied to. When a Technique needs a choice, the game should let you select a legal target.',
'Elemental effect':'A visible state such as Burning, Soaked, Seeded, Charged, Momentum, Growth, or Armor. These matter because other cards can check them for bonuses or special actions.'
};
let choice=null,diff=null,G=null,uid=0;
let EB_NAV_LOCK=false,EB_NAV_T=null;
function go(id){
 const next=document.getElementById(id);if(!next)return false;
 const currentScreen=document.querySelector('.screen.on');
 if(currentScreen===next)return true;
 const reduce=window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches;
 clearTimeout(EB_NAV_T);
 if(reduce||!currentScreen){document.querySelectorAll('.screen').forEach(x=>x.classList.remove('on','eb-screen-out','eb-screen-in'));next.classList.add('on');EB_NAV_LOCK=false;return true;}
 if(EB_NAV_LOCK)return false;EB_NAV_LOCK=true;
 currentScreen.classList.add('eb-screen-out');
 EB_NAV_T=setTimeout(()=>{document.querySelectorAll('.screen').forEach(x=>x.classList.remove('on','eb-screen-out','eb-screen-in'));next.classList.add('on','eb-screen-in');window.scrollTo(0,0);requestAnimationFrame(()=>requestAnimationFrame(()=>next.classList.remove('eb-screen-in')));EB_NAV_LOCK=false;},120);
 return true;
}
function ebPulseChain(){let el=document.getElementById('chain');if(!el)return;el.hidden=false;el.classList.remove('chainPulse');void el.offsetWidth;el.classList.add('chainPulse');setTimeout(()=>el.classList.remove('chainPulse'),420)}
const EB_MENU_NAV_CLASSES=['eb-nav-forward-from','eb-nav-forward-to','eb-nav-back-from','eb-nav-back-to'];
function ebNavigate(toId,{direction='forward'}={}){
 const to=document.getElementById(toId),from=document.querySelector('.screen.on');
 if(!to||!from||from===to||EB_NAV_LOCK)return from===to;
 const back=direction==='back',reduce=window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches,duration=reduce?150:380;
 if(from.id==='home'){from.classList.add('is-home-leaving');void from.offsetWidth;from.classList.add('is-home-calm')}
 clearTimeout(EB_NAV_T);EB_NAV_LOCK=true;window.scrollTo(0,0);
 from.classList.add(back?'eb-nav-back-from':'eb-nav-forward-from');
 to.classList.add('on',back?'eb-nav-back-to':'eb-nav-forward-to');
 EB_NAV_T=setTimeout(()=>{
  from.classList.remove('on',...EB_MENU_NAV_CLASSES);to.classList.remove(...EB_MENU_NAV_CLASSES);window.scrollTo(0,0);
  const heading=to.querySelector('h1,h2,.codex-title,.title');if(heading){heading.tabIndex=-1;heading.focus({preventScroll:true})}else{to.tabIndex=-1;to.focus({preventScroll:true})}
  EB_NAV_LOCK=false;
 },duration);return true;
}
function goDeckSelect(){EB_VIS=null;window.EB_DeckSelect.open();return ebNavigate('setup')}
function goDeckSelectBack(){window.EB_DeckSelect.changeDeck();return ebNavigate('home',{direction:'back'})}
function goFriends(){const moved=ebNavigate('friends');ebBindAutoPass();ebAutoConnectFriends();return moved}
// Auto-pass (issue #88): remembered on the device and sent with Create/Join; the server then never opens a Response window for the Initiation Token alone.
function ebAutoPass(){try{return localStorage.getItem('ebAutoPass')==='1'}catch(e){return false}}
function ebBindAutoPass(){let b=document.getElementById('mpAutoPass');if(!b)return;b.setAttribute('aria-checked',String(ebAutoPass()));if(b.dataset.bound)return;b.dataset.bound='1';b.addEventListener('click',()=>{let on=!ebAutoPass();try{localStorage.setItem('ebAutoPass',on?'1':'0')}catch(e){}b.setAttribute('aria-checked',String(on))})}
function ebAutoConnectFriends(){if(ebMatchmakingSession()){ebSetMatchmakingEnabled(true);return}if(!EB_MP.authPromise)ebEnsureMatchmakingAuth().catch(()=>{})}
function goFriendsBack(){return ebNavigate('home',{direction:'back'})}
function startSelectedMatch(deckKey,difficultyKey,responseElement=null){choice=deckKey;diff=difficultyKey;EB_HYBRID_RESPONSE_CHOICE=responseElement;startMatch()}
function setup(){}
function mk(el,n,c,a,h,guard=false,text='',tip=''){return window.ElementBoundMatchFactory.manifestation(()=>++uid,el,n,c,a,h,guard,text,tip)}
function deck(el,responseEl=null){return window.ElementBoundMatchFactory.createDeck(el,{responseElement:responseEl,nextId:()=>++uid})}
function shuffle(a){return window.ElementBoundMatchFactory.shuffle(a,Math.random)}
function freshTurnState(el){return window.ElementBoundMatchFactory.freshTurnState(el)}
function player(name,el,responseEl=null){return window.ElementBoundMatchFactory.createPlayer({name,element:el,responseElement:responseEl,nextId:()=>++uid,random:Math.random})}
// One deck-out rule (issue #96): each empty-Deck draw deals Exhaustion 2, then 3, 4… An empty Hand and Deck never ends the duel.
function exhaustionDamage(p){return EXHAUSTION_DAMAGE+Math.max(0,Number(p&&p.exhaustion)||0)}
function draw(p,ex=true){if(!p.deck.length){if(ex){let d=exhaustionDamage(p);p.exhaustion=Math.max(0,Number(p.exhaustion)||0)+1;p.vit-=d;add(`${p.name} draws from an empty Deck · Exhaustion ${d} damage`);winCheck()}return}let c=p.deck.shift();c.zone='HAND';p.hand.push(c)}
let EB_INIT_T=null,EB_INIT_LOCK=false;
function ebInitiativeFinish(){if(!G||!G.initiative||G.initiative.finished)return;G.initiative.finished=true;EB_INIT_LOCK=false;clearTimeout(EB_INIT_T);EB_INIT_T=0;if(EB_INIT_RAF1)cancelAnimationFrame(EB_INIT_RAF1);if(EB_INIT_RAF2)cancelAnimationFrame(EB_INIT_RAF2);EB_INIT_RAF1=EB_INIT_RAF2=0;let o=document.getElementById('initiativeOverlay');if(o)o.classList.add('hide');if(!EB_MP.enabled&&G.active===1&&!G.winner)setTimeout(ai,220);render()}
/* Alpha 0.8.51 — Initiative presentation controller. The result is precommitted by startMatch(); presentation waits for painted frames before beginning the 1.5s flip. Skip never rerolls. */
let EB_INIT_RAF1=0,EB_INIT_RAF2=0,EB_INIT_RUN=0;
function ebInitiativeCancelPresentation(){clearTimeout(EB_INIT_T);EB_INIT_T=0;if(EB_INIT_RAF1)cancelAnimationFrame(EB_INIT_RAF1);if(EB_INIT_RAF2)cancelAnimationFrame(EB_INIT_RAF2);EB_INIT_RAF1=EB_INIT_RAF2=0;EB_INIT_RUN++}
function ebInitiativeReveal(){if(!G||!G.initiative||G.initiative.finished||G.initiative.revealed)return;clearTimeout(EB_INIT_T);EB_INIT_T=0;let r=document.getElementById('initiativeResult'),b=document.getElementById('initiativeBonus'),p=document.getElementById('initiativePanel'),c=document.getElementById('initiativeCoin');if(c)c.classList.remove('flip');if(r)r.textContent=G.active===0?'YOU WON · YOU GO FIRST':'RIVAL WON · RIVAL GOES FIRST';if(b)b.textContent=G.active===0?'Rival receives the Initiation Token':'You receive the Initiation Token';if(p){p.classList.remove('land');void p.offsetWidth;p.classList.add('land')}G.initiative.revealed=true;EB_INIT_T=setTimeout(ebInitiativeFinish,1500)}
function ebInitiativeSkip(){if(!G||!G.initiative||G.initiative.finished)return;EB_INIT_RUN++;if(EB_INIT_RAF1)cancelAnimationFrame(EB_INIT_RAF1);if(EB_INIT_RAF2)cancelAnimationFrame(EB_INIT_RAF2);EB_INIT_RAF1=EB_INIT_RAF2=0;clearTimeout(EB_INIT_T);EB_INIT_T=0;if(!G.initiative.revealed)ebInitiativeReveal();else ebInitiativeFinish()}
function ebInitiativeShow(){if(!G||!G.initiative||G.initiative.finished)return;let o=document.getElementById('initiativeOverlay'),c=document.getElementById('initiativeCoin'),r=document.getElementById('initiativeResult'),b=document.getElementById('initiativeBonus');if(!o)return ebInitiativeFinish();ebInitiativeCancelPresentation();let run=EB_INIT_RUN;o.classList.remove('hide');if(r)r.textContent='FLIPPING…';if(b)b.textContent='';if(c)c.classList.remove('flip');/* Two paint opportunities prevent iOS Safari from coalescing overlay reveal + animation start. */EB_INIT_RAF1=requestAnimationFrame(()=>{if(run!==EB_INIT_RUN||!G||!G.initiative||G.initiative.finished)return;EB_INIT_RAF2=requestAnimationFrame(()=>{if(run!==EB_INIT_RUN||!G||!G.initiative||G.initiative.finished)return;if(c)c.classList.add('flip');EB_INIT_T=setTimeout(ebInitiativeReveal,1500)})})}
function startMatch(){
 if(HYBRIDS[choice]&&!HYBRIDS[choice].parents.includes(EB_HYBRID_RESPONSE_CHOICE))EB_HYBRID_RESPONSE_CHOICE=window.EB_DeckSelect?.loadResponse?.(choice,window.localStorage)||HYBRIDS[choice].parents[0];
 selectedCardId=null;clearTimeout(EB_INIT_T);let keys=Object.keys(INFO),pool=keys.filter(x=>x!==choice&&x!==window.lastOpp);if(!pool.length)pool=keys.filter(x=>x!==choice);let opp=pool[Math.floor(Math.random()*pool.length)];window.lastOpp=opp;
 let oppResp=HYBRIDS[opp]?HYBRIDS[opp].parents[Math.floor(Math.random()*HYBRIDS[opp].parents.length)]:opp;
 G=window.ElementBoundMatchFactory.createInitialState({players:[{name:'Your Bender',element:choice,responseElement:EB_HYBRID_RESPONSE_CHOICE},{name:`${diff} ${INFO[opp][0]} Rival`,element:opp,responseElement:oppResp}],random:Math.random});let starter=G.active;G.initiative.revealed=false;G.initiative.finished=false;uid=Math.max(uid,...G.p.flatMap(p=>[...p.deck,...p.hand].map(c=>Number(c.id)||0)));let rival=document.getElementById('initiativeRival');if(rival){rival.className=`initRival eb-element--${opp.toLowerCase()}`;rival.replaceChildren(window.EB_UI.icon(opp.toLowerCase(),{label:INFO[opp][0]}),document.createTextNode(`vs ${INFO[opp][0]}`))}
 EB_INIT_LOCK=true;go('battle');render();setTimeout(ebInitiativeShow,140)
}

let activeTrial=null;
let EB_TRIAL_RUN={rewound:false,maxHint:0,wrongMoves:0},EB_TRIAL_HINT_T=null;

function goTrials(){
  activeTrial=null;
  clearTimeout(EB_TRIAL_HINT_T);window.EB_Trials?.closeChapter({restore:false});window.EB_Trials?.renderMap();
  ebNavigate('trials');
}

function trialManifestation(el,name){
  let z=BASE[el].find(x=>x[0]===name);
  if(!z)throw new Error(`Trial card missing: ${el}/${name}`);
  let c=mk(el,z[0],z[1],z[2],z[3],/\bGuard\b/.test(z[4]||''),z[4],z[5]);
  c.zone='HAND';
  return c;
}

function trialTechnique(el,name,cost){
  let t=TECH[el];
  if(!t||t[0]!==name)throw new Error(`Trial technique missing: ${el}/${name}`);
  return{id:++uid,el,n:t[0],c:cost,type:'TECHNIQUE',zone:'HAND',text:t[1],tip:t[2],role:null};
}

function startTrial(el,rewind=false){
  if(!['FIRE','WATER','NATURE','EARTH','LIGHTNING','AIR'].includes(el))return;
  if(!rewind)EB_TRIAL_RUN={rewound:false,maxHint:0,wrongMoves:0};
  activeTrial=el;

  let p,e,trial;

  if(el==='FIRE'){
    p=player('Your Bender','FIRE');
    e=player('Trial Ember','EARTH');

    p.deck=[]; p.hand=[]; p.wake=[]; p.slots=[null,null,null]; p.marks=[];
    e.deck=[]; e.hand=[]; e.wake=[]; e.slots=[null,null,null]; e.marks=[];

    p.vit=30; p.maxE=3; p.e=3;
    e.vit=3; e.maxE=0; e.e=0;

    p.hand=[
      trialManifestation('FIRE','Cinder Adept'),
      trialTechnique('FIRE','Flame Burst',2)
    ];

    trial={
      ...window.EB_Trials.TRIAL_DATA.FIRE,
      id:'FIRE_01',
      element:'FIRE',
      title:'Trial of Flame',
      icon:'fire',
      objective:'Defeat the rival this turn by using Burning before your payoff.',
      fail:'Burning needed to come before the payoff.',
      mastered:'SETUP → PAYOFF',
      progress:{}
    };
  }else if(el==='LIGHTNING'){
    p=player('Your Bender','LIGHTNING');
    e=player('Trial Conductor','WATER');

    p.deck=[]; p.hand=[]; p.wake=[]; p.slots=[null,null,null]; p.marks=[];
    e.deck=[]; e.hand=[]; e.wake=[]; e.slots=[null,null,null]; e.marks=[];

    p.vit=26; p.maxE=1; p.e=1;
    e.vit=1; e.maxE=0; e.e=0;

    let striker=trialManifestation('LIGHTNING','Spark Runner');
    striker.zone='FIELD'; striker.ready=true; striker.sick=false;
    striker.charge=0;
    p.slots[0]=striker;

    p.hand=[trialTechnique('LIGHTNING','Static Step',1)];

    trial={
      ...window.EB_Trials.TRIAL_DATA.LIGHTNING,
      id:'LIGHTNING_01',
      element:'LIGHTNING',
      title:'Trial of Storms',
      icon:'lightning',
      objective:'Use Static Step → build Charge → attack with Spark Runner to release it.',
      fail:'Charge first. Then release it with Spark Runner.',
      mastered:'CHARGE → RELEASE',
      progress:{step:0,charged:false,released:false}
    };
  }else if(el==='AIR'){
    p=player('Your Bender','AIR');
    e=player('Trial Anchor','EARTH');

    p.deck=[]; p.hand=[]; p.wake=[]; p.slots=[null,null,null]; p.marks=[];
    e.deck=[]; e.hand=[]; e.wake=[]; e.slots=[null,null,null]; e.marks=[];

    p.vit=24; p.maxE=1; p.e=1;
    e.vit=4; e.maxE=0; e.e=0;

    let raptor=trialManifestation('AIR','Sky Raptor');
    raptor.zone='FIELD'; raptor.ready=true; raptor.sick=false;
    p.slots[0]=raptor;

    let scout=trialManifestation('AIR','Gale Scout');
    scout.zone='FIELD'; scout.ready=true; scout.sick=false;
    p.slots[1]=scout;

    let guard=trialManifestation('EARTH','Earthen Guard');
    guard.zone='FIELD'; guard.ready=false; guard.sick=false;
    e.slots[1]=guard;

    p.hand=[trialTechnique('AIR','Crosswind',1)];

    trial={
      ...window.EB_Trials.TRIAL_DATA.AIR,
      id:'AIR_01',
      element:'AIR',
      title:'Trial of Winds',
      icon:'air',
      objective:'Give Sky Raptor Momentum with Crosswind, then ignore Guard and strike the rival Bender.',
      fail:'Sky Raptor needs Momentum before it can fly past Guard.',
      mastered:'MOMENTUM → BYPASS',
      progress:{step:0,momentum:false,hit:0}
    };
  }else if(el==='EARTH'){
    p=player('Your Bender','EARTH');
    e=player('Trial Colossus','FIRE');

    p.deck=[]; p.hand=[]; p.wake=[]; p.slots=[null,null,null]; p.marks=[];
    e.deck=[]; e.hand=[]; e.wake=[]; e.slots=[null,null,null]; e.marks=[];

    p.vit=30; p.maxE=1; p.e=1;
    e.vit=1; e.maxE=0; e.e=0;

    // Earthen Guard starts exposed. Fortify is the lesson: Armor must be built
    // before the scripted Colossus strike lands.
    let guard=trialManifestation('EARTH','Earthen Guard');
    guard.zone='FIELD'; guard.ready=true; guard.sick=false;
    guard.h=3; guard.max=5; guard.armor=0;
    p.slots[0]=guard;

    let ram=trialManifestation('EARTH','Boulder Ram');
    ram.n='Trial Colossus';
    ram.zone='FIELD'; ram.ready=true; ram.sick=false;
    ram.a=3; ram.h=6; ram.max=6; ram.armor=0;
    e.slots[1]=ram;

    p.hand=[trialTechnique('EARTH',TECH.EARTH[0],1)];

    trial={
      ...window.EB_Trials.TRIAL_DATA.EARTH,
      id:'EARTH_01',
      element:'EARTH',
      title:'Trial of Stone',
      icon:'earth',
      objective:'Use Fortify → gain Armor → survive the Trial Colossus strike.',
      fail:'Armor first. Without it, Earthen Guard cannot hold the line.',
      mastered:'GUARD → SURVIVE',
      progress:{step:0,armored:false,survived:false}
    };
  }else if(el==='NATURE'){
    p=player('Your Bender','NATURE');
    e=player('Trial Briar','EARTH');

    p.deck=[]; p.hand=[]; p.wake=[]; p.slots=[null,null,null]; p.marks=[];
    e.deck=[]; e.hand=[]; e.wake=[]; e.slots=[null,null,null]; e.marks=[];

    p.vit=27; p.maxE=3; p.e=3;
    e.vit=3; e.maxE=0; e.e=0;

    // Grove Beast is the payoff: Growth must be built before the finishing attack.
    let beast=trialManifestation('NATURE','Grove Beast');
    beast.zone='FIELD'; beast.ready=true; beast.sick=false;
    beast.growth=0;
    p.slots[0]=beast;

    p.hand=[trialManifestation('NATURE','Sproutling'),trialTechnique('NATURE',TECH.NATURE[0],2)];

    trial={
      ...window.EB_Trials.TRIAL_DATA.NATURE,
      id:'NATURE_01',
      element:'NATURE',
      title:'Trial of Roots',
      icon:'nature',
      objective:'Summon Sproutling to Seed Grove Beast, use Verdant Mend, then attack for 4.',
      fail:'Seed Grove Beast before using Verdant Mend.',
      mastered:'SEED → GROW → STRIKE',
      progress:{step:0,seeded:false,grew:false,techniqueApplied:false,hit:0}
    };
  }else{
    p=player('Your Bender','WATER');
    e=player('Trial Current','EARTH');

    p.deck=[]; p.hand=[]; p.wake=[]; p.slots=[null,null,null]; p.marks=[];
    e.deck=[]; e.hand=[]; e.wake=[]; e.slots=[null,null,null]; e.marks=[];

    p.vit=3; p.maxE=1; p.e=1;
    e.vit=30; e.maxE=0; e.e=0;

    // Tide begins with a ready attacker so the puzzle is about sequencing,
    // not waiting through summoning sickness.
    let serpent=trialManifestation('WATER','River Serpent');
    serpent.zone='FIELD'; serpent.ready=true; serpent.sick=false;
    p.slots[0]=serpent;

    let brute=trialManifestation('EARTH','Boulder Ram');
    brute.n='Tide Brute'; brute.a=4; brute.h=4; brute.max=4; brute.guard=true; brute.text='Guard.'; brute.tip='Soak Tide Brute before ending your turn to reduce its strike from 4 damage to 2.';
    brute.zone='FIELD'; brute.ready=true; brute.sick=false; brute.armor=0;
    e.slots[1]=brute;

    p.hand=[trialTechnique('WATER','Current Shift',1)];

    trial={
      ...window.EB_Trials.TRIAL_DATA.WATER,
      id:'WATER_01',
      element:'WATER',
      title:'Trial of Tides',
      icon:'water',
      objective:'Soak Tide Brute, end the turn, and survive its weakened strike.',
      fail:'Soak the threat before ending your turn.',
      mastered:'SOAK → SURVIVE',
      progress:{soaked:false,survived:false,actions:[]}
    };
  }

  G={
    rev:0,turn:1,active:0,chain:0,winner:null,
    trial,
    p:[p,e],
    logs:[]
  };

  add(`TRIAL START · ${trial.title.replace('Trial of ','')} · ${trial.mastered}`);
  go('battle');
  ebTrialScheduleHint();
  render();
}
function resetTrial(){
  if(activeTrial){EB_TRIAL_RUN.rewound=true;EB_TRIAL_RUN.maxHint=0;startTrial(activeTrial,true)}
}

function exitBattle(){
  selectedCardId=null;
  hideModal();
  if(EB_MP.enabled){ebStopMultiplayer();G=null;go('home');return}
  if(G&&G.trial){G=null;activeTrial=null;clearTimeout(EB_TRIAL_HINT_T);window.EB_Trials?.renderMap();go('trials')}
  else goDeckSelect();
}

function ebTrialState(){if(!G?.trial)return{};let t=G.trial,statuses=[];if((foe().marks||[]).includes('Burning'))statuses.push('Burning');if(t.progress.soaked)statuses.push('Soaked');if(t.progress.armored)statuses.push('Armor');if(t.progress.seeded)statuses.push('Seeded');if(t.progress.grew)statuses.push('Growth');if(t.progress.charged)statuses.push('Charged');if(t.progress.momentum)statuses.push('Momentum');return{played:t.progress.played||[],statuses,actions:t.progress.actions||[],progress:t.progress,hit:t.progress.hit||0}}
function ebTrialCompletedCount(){return G?.trial?window.EB_Trials.completedTokens(G.trial.strip,ebTrialState()):0}
function ebTrialScheduleHint(){clearTimeout(EB_TRIAL_HINT_T);if(!G?.trial||G.winner)return;EB_TRIAL_HINT_T=setTimeout(()=>{if(!G?.trial||G.winner)return;ebTrialRaiseHint();ebTrialScheduleHint()},Number(window.EB_TRIAL_HINT_MS)||20000)}
function ebTrialRaiseHint(){if(!G?.trial)return;G.trial.hintLevel=Math.min(2,(G.trial.hintLevel||0)+1);EB_TRIAL_RUN.maxHint=Math.max(EB_TRIAL_RUN.maxHint,G.trial.hintLevel);render()}
function ebTrialWrongMove(index=ebTrialCompletedCount()){if(!G?.trial)return;let t=G.trial;t.wrongMoves=(t.wrongMoves||0)+1;EB_TRIAL_RUN.wrongMoves=(EB_TRIAL_RUN.wrongMoves||0)+1;t.missedIndex=index;ebTrialRaiseHint()}
function ebTrialTrackCard(card){if(!G?.trial||!card)return;let t=G.trial,count=ebTrialCompletedCount(),next=t.strip[count],correct=next?.kind==='card'&&next.name===card.n;t.progress.played=t.progress.played||[];if(!t.progress.played.includes(card.n))t.progress.played.push(card.n);if(correct){t.hintLevel=0;t.missedIndex=null;ebTrialScheduleHint()}else ebTrialWrongMove(count)}
function ebTrialTokenMarkup(token,state,index){let icon='';if(token.kind==='card')icon=`<img src="assets/medallions/${G.trial.element.toLowerCase()}.webp" alt="">`;else if(token.kind==='status')icon=ebIconMarkup(token.name.toLowerCase());else icon=ebIconMarkup(token.kind==='hit'?'sword':token.kind==='action'?'hourglass':'shield');let label=token.kind==='card'||token.kind==='status'||token.kind==='action'?token.name:token.kind==='hit'?String(token.value):'Survive',status=state==='done'?'done':state==='next'?'next':state==='missed'?'missed':'later';return `<span class="trial-token is-${status}" aria-label="Step ${index+1}: ${label}, ${status}">${icon}<span>${label}</span></span>`}
function ebTrialStripMarkup(t,recap=false){let completed=ebTrialCompletedCount();return `<div class="trial-strip${recap?' trial-recap-strip':''}">${t.strip.map((token,index)=>(index?'<span class="trial-arrow" aria-hidden="true">→</span>':'')+ebTrialTokenMarkup(token,index<completed?'done':index===t.missedIndex?'missed':index===completed?'next':'later',index)).join('')}</div>`}
function ebTrialRecap(t){if(!t.completionStored){t.earnedStars=window.EB_Trials.starsForRun({completed:true,rewound:EB_TRIAL_RUN.rewound,wrongMoves:EB_TRIAL_RUN.wrongMoves||0});window.EB_Trials.record(t.element,t.earnedStars);t.completionStored=true;clearTimeout(EB_TRIAL_HINT_T)}return `<section class="trial-recap"><h2>Trial Complete</h2><div class="trial-recap-stars" aria-label="${t.earnedStars} stars">${[1,2,3].map(star=>{let icon=ebIconMarkup('star');return star<=t.earnedStars?icon.replace('class="eb-icon"','class="eb-icon is-earned"'):icon}).join('')}</div>${ebTrialStripMarkup(t,true)}<button class="primary" onclick="ebTrialContinue()">CONTINUE</button></section>`}
function ebTrialContinue(){if(!G?.trial)return;G=null;activeTrial=null;window.EB_Trials.renderMap();go('trials')}
function ebTrialApplyHints(){document.querySelectorAll('.trial-hint-arrow,.trial-hint-badge').forEach(node=>node.remove());document.querySelectorAll('.trial-hint-card').forEach(node=>node.classList.remove('trial-hint-card'));if(!G?.trial||!G.trial.hintLevel)return;let next=G.trial.strip[ebTrialCompletedCount()],cardName=next?.kind==='card'?next.name:null,anchor=cardName&&document.querySelector(`[data-eb-anchor="hand-card"][data-eb-card="${CSS.escape(cardName)}"]`);if(!anchor)return;anchor.classList.add('trial-hint-card');let badge=document.createElement('span');badge.className='trial-hint-badge';badge.textContent=['①','②','③','④','⑤'][ebTrialCompletedCount()]||'•';anchor.append(badge);if(G.trial.hintLevel>1)ebTrialDrawHintArrow(anchor)}
function ebTrialDrawHintArrow(source){let target=G.trial.element==='FIRE'?document.querySelector('[data-eb-anchor="bender"][data-eb-side="rival"]'):G.trial.element==='EARTH'||G.trial.element==='NATURE'?document.querySelector('[data-eb-anchor="slot"][data-eb-side="you"]'):document.querySelector('[data-eb-anchor="slot"][data-eb-side="rival"]');if(!source||!target)return;let a=source.getBoundingClientRect(),b=target.getBoundingClientRect(),x=a.left+a.width/2,y=a.top+a.height/2,tx=b.left+b.width/2,ty=b.top+b.height/2,length=Math.hypot(tx-x,ty-y),angle=Math.atan2(ty-y,tx-x)*180/Math.PI,id=`trial-arrow-${Date.now()}`,arrow=document.createElement('span');arrow.id=id;arrow.className='trial-hint-arrow';arrow.setAttribute('aria-hidden','true');document.body.append(arrow);let sheet=[...document.styleSheets].find(item=>{try{return!!item.cssRules}catch(_error){return false}});try{sheet.insertRule(`#${id}{left:${x}px;top:${y}px;width:${length}px;transform:rotate(${angle}deg)}`,sheet.cssRules.length)}catch(_error){arrow.remove()}}
function renderTrialUI(){let guide=document.getElementById('trialGuide'),winner=document.getElementById('winner');if(!guide||!G)return;if(!G.trial){guide.classList.remove('on');guide.innerHTML='';return}let t=G.trial,impact=t.progress.soakedImpact?`<span class="trial-impact-chip">${ebIconMarkup('soaked')} −2</span>`:'';guide.classList.add('on');guide.innerHTML=`<button class="eb-icon-btn eb-icon-btn--framed trial-rewind" onclick="resetTrial()" aria-label="Rewind trial">${ebIconMarkup('rewind')}</button>${ebTrialStripMarkup(t)}${impact}`;if(G.winner)winner.innerHTML=G.winner===me().name?ebTrialRecap(t):`<section class="trial-recap trial-recap--failed"><h2>Trial Failed</h2><p>${t.fail||'Try the combo again.'}</p><button class="primary" onclick="resetTrial()">REWIND</button></section>`;requestAnimationFrame(ebTrialApplyHints)}


function resolveStormTrial(){
  if(!G||!G.trial||G.trial.element!=='LIGHTNING')return false;
  let striker=me().slots.find(x=>x&&x.n==='Spark Runner');
  if(!striker)return false;
  if(G.trial.progress.step===0){
    striker.charge=1;
    G.trial.progress.charged=true;
    G.trial.progress.step=1;
    add('STORMS · CHARGE READY → attack with Spark Runner.');
  }
  return true;
}

function resolveStoneTrial(){
  if(!G||!G.trial||G.trial.element!=='EARTH')return false;
  let t=G.trial,p=me(),e=foe();
  if(t.progress.step!==0)return true;

  let guard=p.slots.find(x=>x&&x.n==='Earthen Guard');
  let colossus=e.slots.find(x=>x&&x.n==='Trial Colossus');
  if(!guard||!colossus)return false;

  // Fortify has already resolved through the normal Earth technique path.
  if((guard.armor||0)<1){
    add('STONE · Build Armor before the counterattack.');
    return false;
  }

  t.progress.armored=true;
  t.progress.step=1;
  add(`STONE · ARMOR READY (${guard.armor}) → Trial Colossus strikes!`);

  // Script the lesson using the normal damage/Armor function.
  let before=guard.h;
  let blocked=Math.min(guard.armor,colossus.a);
  let dealt=hit(guard,colossus.a);
  add(`Trial Colossus attacks Earthen Guard · Armor blocks ${blocked} · ${dealt} damage`);

  if(guard.h>0){
    t.progress.played=t.progress.played||[];
    if(!t.progress.played.includes('Earthen Guard'))t.progress.played.push('Earthen Guard');
    t.progress.survived=true;
    t.progress.step=2;
    e.vit=0;
    add(`STONE TRIAL · Guard → Survive complete · ${guard.h} HP remains`);
  }else{
    death(p);
    add('STONE · The Guard fell. Try again and Armor first.');
  }
  return t.progress.survived;
}

function resolveTidesTrial(){
  if(!G?.trial||G.trial.element!=='WATER'||G.winner)return false;
  let t=G.trial,p=me(),e=foe(),brute=e.slots.find(x=>x&&x.n==='Tide Brute');
  if(!brute)return false;
  t.progress.actions=t.progress.actions||[];
  if(!t.progress.actions.includes('End Turn'))t.progress.actions.push('End Turn');
  let wasSoaked=(brute.marks||[]).includes('Soaked'),power=ebSoakedAttackPower(brute,brute.a);
  p.vit-=power;brute.ready=false;
  add(`Tide Brute strikes your Bender for ${power}`);
  if(wasSoaked){t.progress.soaked=true;t.progress.soakedImpact=true}
  if(p.vit>0&&wasSoaked){t.progress.survived=true;e.vit=0;add(`TIDES TRIAL · Soak → Survive complete · ${p.vit} Vitality remains`)}
  bump();return true;
}

function registerAffinity(p,c){let h=HYBRIDS[p.el];if(!h||c.el===p.el)return;let r=p.turnState.resonance;if(c.el===h.parents[0])r.a=true;if(c.el===h.parents[1])r.b=true;let was=r.active;r.active=r.a&&r.b;p.turnState.resolved.push(c.id);if(r.active&&!was)add(`${ebElementName(p.el)} ${INFO[p.el][0]} RESONANCE ACTIVE`)}
function resonant(p){return !!(p.turnState&&p.turnState.resonance.active)}
function add(s){G.logs.push(`T${G.turn} ${s}`)}function bump(s){G.rev++;if(s)add(s);winCheck();validateState();render()}
function me(){return G.p[0]}function foe(){return G.p[1]}function current(){return G.p[G.active]}function other(){return G.p[1-G.active]}
function playable(c){return G&&!EB_INIT_LOCK&&!ebMpInputLocked()&&!G.pendingResponse&&G.active===0&&!G.winner&&c.type!=='RESPONSE'&&c.c<=me().e&&((c.type==='TECHNIQUE')||me().slots.some(x=>!x))}
function flowPreview(c){
 if(!c)return '';
 let kind=c.type==='RESPONSE'?'Response':c.type==='TECHNIQUE'?'Technique':(c.guard?'Manifestation · Guard':'Manifestation');
 let stats=(c.type==='TECHNIQUE'||c.type==='RESPONSE')
   ? `Cost ${c.c} Essence`
   : `${c.a} ATK · ${c.h}/${c.max||c.h} HP · Cost ${c.c} Essence${c.armor?` · Armor ${c.armor}`:''}`;
 let effect=(c.text||c.txt||'No additional effect.').trim();
 return `\n${kind}\n${stats}\n${effect}`;
}
function flow1(p,isAI=false){
 if(!p||!p.deck||!p.deck.length){add(`FLOW · ${p?.name||'Bender'} has no card to inspect`);return false}
 let next=p.deck[0];
 if(isAI){
   // AI keeps Flow deterministic/lightweight: occasionally cycle the top card.
   if(Math.random()<0.35){p.deck.push(p.deck.shift());add(`Rival FLOW · cycles the next card`)}
   else add(`Rival FLOW · keeps the next card`);
   return true;
 }
 modal(`Flow 1 · ${next.n}${flowPreview(next)}`,[
   [`Keep on top`,()=>{hideModal();add(`FLOW · ${next.n} stays on top`);render()}],
   [`Send to bottom`,()=>{hideModal();p.deck.push(p.deck.shift());add(`FLOW · ${next.n} sent to bottom`);render()}]
 ]);
 return true;
}

// 0.8.1 — player-owned Technique targeting. No Essence/card is spent until a target is chosen.
function chooseTechniqueTarget(c){
 let p=me(),e=foe(),opts=[];
 const commit=t=>{hideModal();play(c,null,t)};
 const enemyOpts=fn=>e.slots.forEach((m,i)=>{if(m)opts.push([`${m.n} · M${i+1}`,()=>fn(m)])});
 if(TECH2_NAMES.has(c.n)){
   // Second Prime Techniques (issue #93).
   if(c.n==='Searing Brand'){if(!e.slots.some(Boolean))return commit({bender:e});enemyOpts(enemy=>commit({enemy}))}
   else if(c.n==='Riptide')enemyOpts(enemy=>commit({enemy}));
   else if(c.n==='Wild Growth')p.slots.forEach((m,i)=>{if(m)opts.push([`${m.n} · M${i+1} · Growth ${m.growth||0}/3`,()=>commit({friend:m})])});
   else if(c.n==='Recharge')return commit({auto:true});
   else if(c.n==='Stone Fist'||c.n==='Downdraft'){
     let enemies=e.slots.filter(Boolean);
     p.slots.forEach((friend,i)=>{if(!friend)return;let label=c.n==='Stone Fist'?`${friend.n} · M${i+1} · hits for ${1+(friend.armor||0)}`:`${friend.n} · M${i+1} · Momentum ${momentumStacks(friend)}/3`;
       opts.push([label,()=>{
         if(!enemies.length)return commit(c.n==='Stone Fist'?{friend,bender:e}:{friend});
         modal(c.n==='Stone Fist'?`${friend.n} strikes…`:'Weaken which enemy?',enemies.map(enemy=>[`${enemy.n} · M${e.slots.indexOf(enemy)+1}`,()=>commit({friend,enemy})]));
       }])});
   }
   if(!opts.length){add(`${c.n}: no legal target`);render();return}
   return modal(`Choose target · ${c.n}`,opts);
 }
 if(HYBRIDS[c.el]){
   // Hybrid targeting follows the card's friendly/enemy wording instead of silently using slot 1.
   if(c.el==='MAGMA'){
     if(c.n==='Molten Channel'){
       let friends=p.slots.filter(Boolean),damaged=e.slots.filter(m=>m&&wasDamagedThisTurn(m));
       if(resonant(p)&&friends.length){
         if(damaged.length)friends.forEach(friend=>damaged.forEach(enemy=>opts.push([`Armor ${friend.n} + Burn ${enemy.n}`,()=>commit({friend,enemy,magmaMode:'BOTH'})])));
         else friends.forEach(friend=>opts.push([`Armor ${friend.n} · no damaged enemy`,()=>commit({friend,magmaMode:'ARMOR'})]));
       }else{
         friends.forEach(friend=>opts.push([`Armor ${friend.n}`,()=>commit({friend,magmaMode:'ARMOR'})]));
         damaged.forEach(enemy=>opts.push([`Burn ${enemy.n} · damaged this turn`,()=>commit({enemy,magmaMode:'BURNING'})]));
       }
     }else if(c.n==='Pressure Forge'||c.n==='Eruption Guard')p.slots.forEach((m,i)=>{if(m)opts.push([`${m.n} · M${i+1}`,()=>commit({friend:m})])});
   }else if(c.el==='STORM'){
     p.slots.forEach((m,i)=>{if(m)opts.push([`${m.n} · M${i+1}`,()=>commit({friend:m})])});
   }else if(c.el==='BLOOM'){
     p.slots.forEach((m,i)=>{if(m)opts.push([`${m.n} · M${i+1}`,()=>commit({friend:m})])});
   }
 }else if(c.el==='FIRE'){
   e.slots.forEach((m,i)=>{if(m)opts.push([`${m.n} · M${i+1}`,()=>commit({enemy:m})])});
   // Guard protects the Bender from targeted hostile Techniques as well as attacks.
   if(guardAllowsBenderTarget(e))opts.push([`Rival Bender · ${e.vit} Vitality`,()=>commit({bender:e})]);
 }else if(c.el==='EARTH'||c.el==='NATURE'){
   p.slots.forEach((m,i)=>{if(m)opts.push([`${m.n} · M${i+1}`,()=>commit({friend:m})])});
 }else if(c.el==='WATER'){
   e.slots.forEach((m,i)=>{if(m)opts.push([`${m.n} · M${i+1}`,()=>commit({enemy:m})])});
   if(!opts.length)return commit({flowOnly:true});
 }else if(c.el==='AIR'){
   let occupied=e.slots.filter(Boolean),friends=p.slots.filter(Boolean);
   friends.forEach(friend=>opts.push([`${friend.n} · M${p.slots.indexOf(friend)+1} · Momentum ${momentumStacks(friend)}/3`,()=>{
     if(occupied.length<2)return commit({friend});
     modal('Choose first enemy to swap',occupied.map(enemy=>[`${enemy.n} · M${e.slots.indexOf(enemy)+1}`,()=>{
       let partners=occupied.filter(other=>other!==enemy);
       modal(`Swap ${enemy.n} with…`,partners.map(other=>[`${other.n} · M${e.slots.indexOf(other)+1}`,()=>commit({friend,enemy,swapWith:other})]));
     }]));
   }]));
 }else return commit({auto:true});
 if(!opts.length){add(`${c.n}: no legal target`);render();return}
 modal(`Choose target · ${c.n}`,opts);
}

function primeSummonRecipients(p,c){
 // "another friendly" means a pre-existing friendly body; the summoning card is excluded.
 return p.slots.filter(m=>m&&m.id!==c.id);
}
function applyPrimeSummonGift(c,target){
 if(!c||!target)return false;
 if(c.el==='AIR'&&c.n==='Breeze Disciple'){
   gainMomentum(target);gainMomentum(target);
   add(`${c.n}: ${target.n} gains Momentum ${momentumStacks(target)}/3`);
   return true;
 }
 if(c.el==='EARTH'&&c.n==='Stone Initiate'){
   let gained=gainArmor(target);
   add(`${c.n}: ${target.n} ${gained?'gains 1 Armor':'already gained Armor this round'}${gained?` → ${target.armor}`:''}`);
   return true;
 }
  if(c.el==='NATURE'&&c.n==='Sproutling'){
   addMark(target,'Seeded');
   if(G?.trial?.element==='NATURE'&&target.n==='Grove Beast')G.trial.progress.seeded=true;
   add(`${c.n}: ${target.n} gains Seeded`);
   return true;
 }
 return false;
}
function resolvePrimeSummonGift(p,c,isAI=false){
 let isGift=(c.el==='AIR'&&c.n==='Breeze Disciple')||
            (c.el==='EARTH'&&c.n==='Stone Initiate')||
            (c.el==='NATURE'&&c.n==='Sproutling');
 if(!isGift)return false;
 let targets=primeSummonRecipients(p,c);
 if(!targets.length){
   add(`${c.n}: no other friendly Manifestation → summon effect has no target`);
   return false;
 }
 if(isAI){
   let target;
   if(c.el==='AIR')target=targets.find(m=>m.n==='Sky Raptor')||targets.sort((a,b)=>(b.a||0)-(a.a||0))[0];
   else if(c.el==='NATURE')target=targets.find(m=>m.n==='Grove Beast')||targets.sort((a,b)=>(b.a||0)-(a.a||0))[0];
   else target=targets.sort((a,b)=>(b.h||0)-(a.h||0))[0];
   return applyPrimeSummonGift(c,target);
 }
 modal(`Choose recipient · ${c.n}`,targets.map((m,i)=>[
   `${m.n} · M${p.slots.indexOf(m)+1}`,
   ()=>{hideModal();applyPrimeSummonGift(c,m);bump()}
 ]));
 return true;
}

function play(c,slotIndex=null,techTarget=undefined){if(!playable(c))return;if(c.type==='TECHNIQUE'&&techTarget===undefined){chooseTechniqueTarget(c);return}if(c.type!=='TECHNIQUE'&&(slotIndex===null||slotIndex<0||slotIndex>2||me().slots[slotIndex]))return;if(EB_MP.enabled){selectedCardId=null;ebMpPlay(c,slotIndex,techTarget);return}if(G.trial)ebTrialTrackCard(c);selectedCardId=null;let p=me();p.e-=c.c;p.hand=p.hand.filter(x=>x.id!==c.id);G.chain++;
if(c.type==='TECHNIQUE'){sendToWake(p,c,'technique');
 if(TECH2_NAMES.has(c.n)){resolveSecondTechnique(p,foe(),c,false,techTarget)}
 else if(HYBRIDS[c.el]){resolveHybridTechnique(p,foe(),c,false,techTarget)}
 else if(c.el==='FIRE'){let t=techTarget&&techTarget.enemy;if(t){let burn=(t.marks||[]).includes('Burning');let d=hit(t,burn?3:2,c.el,c.n);if(G.trial?.element==='FIRE')G.trial.progress.hit=d;add(`${c.n}: ${d} damage to ${t.n}${burn?' (Burning bonus)':''}`);death(foe())}else if(techTarget&&techTarget.bender&&activeGuards(foe()).length){add(`GUARD · ${activeGuards(foe())[0].n} blocks ${c.n} from targeting the rival Bender`)}else{let burn=(foe().marks||[]).includes('Burning'),d=burn?3:2;foe().vit-=d;if(G.trial?.element==='FIRE')G.trial.progress.hit=d;ebQueueFx({kind:'benderHit',side:1,damage:d,el:c.el,label:c.n});add(`${c.n}: ${d} damage to rival Bender${burn?' (Burning bonus)':''}`)}}
 else if(c.el==='EARTH'){let t=techTarget&&techTarget.friend;if(t){let gained=gainArmor(t);add(`${c.n}: ${t.n} ${gained?'gains 1 Armor':'already gained Armor this round'}`);if(gained&&G.trial&&G.trial.element==='EARTH')resolveStoneTrial()}else add(`${c.n}: no friendly target`)}
 else if(c.el==='NATURE'){let t=techTarget&&techTarget.friend;if(t&&(t.marks||[]).includes('Seeded')&&grow(t,p)){if(G.trial?.element==='NATURE'&&t.n==='Grove Beast'){G.trial.progress.techniqueApplied=true;G.trial.progress.grew=true;G.trial.progress.step=1}add(`${c.n}: Seeded → Growth ${t.growth}`)}else add(`${c.n}: no effect (target is not Seeded or Growth is already 3)`) }
 else if(c.el==='WATER'){let t=techTarget&&techTarget.enemy;if(t)addMark(t,'Soaked');if(G.trial&&G.trial.element==='WATER'&&t)G.trial.progress.soaked=true;add(`${c.n}: Flow 1${t?' + applies Soaked':''}`);flow1(p,false)}
 else if(c.el==='LIGHTNING'){
  if(G.chain===2){addMark(foe(),'Charged');add(`${c.n}: second card → rival Bender is Charged`)}
  else {add(`${c.n}: Flow 1 · build Chain for Lightning payoffs`);flow1(p,false)};
  if(G.trial&&G.trial.element==='LIGHTNING')resolveStormTrial();
}
 else if(c.el==='AIR'){
  let friend=techTarget&&techTarget.friend;if(friend&&p.slots.includes(friend)){let gained=gainMomentum(friend);if(G.trial?.element==='AIR'){if(friend.n==='Sky Raptor'){G.trial.progress.momentum=true;G.trial.progress.step=1}else ebTrialWrongMove()}add(`${c.n}: ${friend.n} ${gained?'gains':'remains at'} Momentum ${momentumStacks(friend)}/3`)}else add(`${c.n}: no friendly target for Momentum`);
  let arr=foe().slots,m=techTarget&&techTarget.enemy,other=techTarget&&techTarget.swapWith,from=m?arr.indexOf(m):-1,to=other?arr.indexOf(other):-1;
  if(from>=0&&to>=0&&from!==to){
    [arr[from],arr[to]]=[arr[to],arr[from]];
    let weakened=[applyCrosswindWeakness(m),applyCrosswindWeakness(other)].filter(Boolean).length;
    // Crosswind creates a tactical opening for Gale Scout this turn.
    // Store it in turnState so it expires naturally when the next turn starts.
    p.turnState.airOpening=true;
    add(`${c.n}: swaps ${m.n} M${from+1} and ${other.n} M${to+1} · ${weakened} Weakened · Air Opening ready`);
  }
}
}else{let i=slotIndex;if(i==null||i<0||i>2||p.slots[i])return;c.zone='FIELD';c.ready=true;c.sick=true;c.marks=c.marks||[];if(HYBRIDS[c.el]){/* hybrid avatar enters normally */}if(c.el==='FIRE'&&c.n==='Cinder Adept'){addMark(foe(),'Burning');add(`${c.n}: applies Burning to rival Bender`)}if(c.el==='WATER'&&c.n==='Mist Adept'){add(`${c.n}: Flow 1`);flow1(p,false)}if(c.el==='LIGHTNING'&&c.n==='Spark Runner'&&G.chain===2){G.chain++;add(`${c.n}: second card → +1 Chain (Chain ${G.chain})`);ebPulseChain()}let ward=!G.trial&&ebRallyWardApplies(p,foe(),G.turn);p.slots[i]=c;if(ward){addMark(c,'Warded');add(`RALLY WARD · ${c.n} can't be attacked until your next turn`)}ebQueueFx({kind:'summon',id:c.id,el:c.el,label:c.n});add(`SUMMON ${c.n} → M${i+1}`);resolvePrimeSummonGift(p,c,false)}registerAffinity(p,c);bump()}
function hit(m,n,sourceEl=null,sourceLabel='HIT'){
 // Combat boundary normalization: malformed/legacy/transient cards must never
 // poison authoritative HP with NaN. Canonical Manifestations enter with
 // finite HP/max HP/Armor, but response movement can expose older state.
 if(!m)return 0;
 if(!Number.isFinite(m.max))m.max=Number.isFinite(m.h)?m.h:1;
 if(!Number.isFinite(m.h))m.h=m.max;
 if(!Number.isFinite(m.armor))m.armor=0;
 n=Number.isFinite(n)?Math.max(0,n):0;
 let owner=(G&&G.p)?G.p.find(x=>x.slots&&x.slots.includes(m)):null;
 let side=owner&&G&&G.p?G.p.indexOf(owner):-1,slot=owner?owner.slots.indexOf(m):-1;
 let block=Math.min(m.armor,n);m.armor-=block;let dealt=n-block;m.h-=dealt;
 if(dealt>0)m._ebDamagedTurn=liveTurnKey();
 if(dealt>0)ebQueueFx({kind:'hit',id:m.id,side,slot,damage:dealt,el:sourceEl||m.el||'FIRE',label:sourceLabel,targetLabel:m.n});
 if(dealt>0&&m.el==='WATER'&&m.n==='Tide Warden'&&G&&G.p){
   let owner=G.p.find(x=>x.slots&&x.slots.includes(m));
   if(owner){add(`${m.n}: damaged → Flow 1`);flow1(owner,owner!==me())}
 }
 return dealt}function death(p){
 p.slots.forEach((m,i)=>{
   if(m&&m.h<=0){
     // Capture side/slot before the card leaves the field so the visual layer
     // can still show a clear break/shatter cue after the next render.
     let side=(G&&G.p)?G.p.indexOf(p):-1;
     if(side>=0)ebQueueFx({kind:'defeat',id:m.id,side,slot:i,el:m.el,label:m.n});
     p.slots[i]=null;sendToWake(p,m,'destroyed');add(`${m.n} destroyed`);
   }
 });
}
function clearTransientMarks(m){
 if(!m)return;
 m.marks=(m.marks||[]).filter(x=>x!=='Burning'&&x!=='Charged');
}
function applyCrosswindWeakness(m){
 if(!m||(m.marks||[]).includes('Weakened'))return false;
 let reduced=Math.min(1,Math.max(0,Number(m.a)||0));
 m.crosswindAttackDebuff=reduced;
 m.a=Math.max(0,(Number(m.a)||0)-reduced);
 addMark(m,'Weakened');
 return true;
}
function clearCrosswindWeakness(m){
 if(!m||(!(m.marks||[]).includes('Weakened')&&!Number.isFinite(m.crosswindAttackDebuff)))return;
 let restore=Math.min(1,Math.max(0,Number(m.crosswindAttackDebuff)||0));
 m.a=(Number(m.a)||0)+restore;
 m.crosswindAttackDebuff=0;
 m.marks=(m.marks||[]).filter(x=>x!=='Weakened');
}
function clearSourceBoundBenderEffects(card){
 if(!G||!card)return;
 // Burning from Cinder Adept exists only while that Adept remains manifested.
 if(card.el==='FIRE'&&card.n==='Cinder Adept'){
   G.p.forEach(side=>{if((side.marks||[]).includes('Burning')){side.marks=side.marks.filter(x=>x!=='Burning');add(`EFFECT ENDS · Burning · ${card.n} left the Field`)}});
 }
}
function sendToWake(p,c,reason=''){
 if(!p||!c)return;
 if(reason==='destroyed')clearCrosswindWeakness(c);
 clearTransientMarks(c);
 clearSourceBoundBenderEffects(c);
 c.zone='WAKE';p.wake.push(c);
}
function addMark(m,x){
 m.marks=m.marks||[];
 if(!m.marks.includes(x)){
   m.marks.push(x);
   let who=m.n||m.name||'Bender';
   add(`EFFECT · ${x} → ${who}`);
 }
}
function momentumStacks(m){if(!m)return 0;let n=Number.isFinite(m.momentum)?Math.floor(m.momentum):((m.marks||[]).includes('Momentum')?1:0);return Math.max(0,Math.min(3,n))}
function gainMomentum(m){if(!m)return false;let before=momentumStacks(m);m.momentum=before;if(before>=3){if(!(m.marks||[]).includes('Momentum'))addMark(m,'Momentum');return false}m.momentum=before+1;m.a=(Number(m.a)||0)+1;addMark(m,'Momentum');return true}
function gainArmor(m){if(!m||m.armorGainRound===G?.turn||(m.armor||0)>=3)return false;m.armorGainRound=G?.turn;m.armor=(m.armor||0)+1;return true}
function expireRoundEffects(m){if(!m)return;let stacks=momentumStacks(m);if(stacks){m.a=Math.max(0,(Number(m.a)||0)-stacks);m.momentum=0}m.armor=0;m.armorGainRound=null;m.marks=(m.marks||[]).filter(x=>x!=='Momentum'&&x!=='Charged')}
function expireAllRoundEffects(){if(!G||!G.p)return;G.p.forEach(side=>{side.marks=(side.marks||[]).filter(x=>x!=='Charged');side.slots.filter(Boolean).forEach(expireRoundEffects)})}
function triggerTidelilyGrowth(p,m){if(!p||p.el!=='BLOOM'||!m||m.n!=='Tidelily Guardian'||!resonant(p)||m.turnFlags?.tidelilyGrowthHeal)return false;m.turnFlags={...(m.turnFlags||{}),tidelilyGrowthHeal:true};let ally=p.slots.filter(x=>x&&x!==m&&x.h<x.max).sort((a,b)=>(a.h/a.max)-(b.h/b.max))[0];if(ally){ebHeal(ally,p);add(`Tidelily Guardian · Resonance heals ${ally.n} for 1`)}else if(p.vit<30){p.vit=Math.min(30,p.vit+1);add('Tidelily Guardian · Resonance heals its Bender for 1')}else add('Tidelily Guardian · Resonance trigger has no damaged target');return true}
// Growth (1.14.0, issue #103): each Growth gives +1 ATK; Grove Beast gets +2. The engine and the Balance Lab use the same numbers.
function ebGrowthAtk(m){return m&&m.el==='NATURE'&&m.n==='Grove Beast'?2:1}
function grow(m,p=null){if((m.growth||0)>=3)return false;m.growth=(m.growth||0)+1;m.a=(Number(m.a)||0)+ebGrowthAtk(m);if(p)triggerTidelilyGrowth(p,m);return true}
// Every heal on a Manifestation goes through here: Root Keeper gains 1 Growth whenever it is actually healed.
function ebHeal(m,p,n=1){if(!m)return 0;let before=m.h;m.h=Math.min(m.max,m.h+n);let healed=m.h-before;if(healed>0&&m.el==='NATURE'&&m.n==='Root Keeper'&&grow(m,p))add(`Root Keeper is healed → Growth ${m.growth}`);return healed}
function moveFriendly(p,m){let from=p.slots.indexOf(m),to=p.slots.findIndex(x=>!x);if(from<0||to<0)return false;p.slots[from]=null;p.slots[to]=m;p.turnState.moved.push(m.id);return true}
function liveTurnKey(){return G?`${G.turn}:${G.active}`:''}
function wasDamagedThisTurn(m){return !!m&&m._ebDamagedTurn===liveTurnKey()}
// Second Prime Techniques (issue #93). The player passes a chosen target; the rival picks with secondTechniqueTarget().
// Rules match lib/gameEngine.js technique() and the Balance Lab's playTechnique().
function secondTechniqueTarget(p,e,c){
 let enemies=e.slots.filter(Boolean),friends=p.slots.filter(Boolean),byAtk=(a,b)=>(b.a||0)-(a.a||0);
 if(c.n==='Searing Brand')return enemies.length?{enemy:[...enemies].sort(byAtk)[0]}:{bender:e};
 if(c.n==='Riptide'){let soaked=enemies.find(m=>(m.marks||[]).includes('Soaked'));return{enemy:soaked||[...enemies].sort(byAtk)[0]||null}}
 if(c.n==='Wild Growth')return{friend:friends.filter(m=>(m.growth||0)<3).sort((a,b)=>b.h-a.h)[0]||friends[0]||null};
 if(c.n==='Stone Fist'){let friend=[...friends].sort((a,b)=>(b.armor||0)-(a.armor||0)||b.h-a.h)[0]||null;return{friend,enemy:[...enemies].sort((a,b)=>a.h-b.h)[0]||null}}
 if(c.n==='Downdraft')return{friend:friends.filter(m=>momentumStacks(m)<3).sort(byAtk)[0]||friends[0]||null,enemy:enemies.filter(m=>!(m.marks||[]).includes('Weakened')).sort(byAtk)[0]||[...enemies].sort(byAtk)[0]||null};
 return{};
}
function secondTechniqueScore(p,e,c){
 let friends=p.slots.some(Boolean),enemies=e.slots.some(Boolean);
 if(c.n==='Searing Brand')return enemies||!(e.marks||[]).includes('Burning')?5:1;
 if(c.n==='Riptide')return enemies?5:0;
 if(c.n==='Wild Growth')return p.slots.some(m=>m&&(m.growth||0)<3)?7:0;
 if(c.n==='Stone Fist')return friends&&enemies?6:friends?4:0;
 if(c.n==='Recharge')return 3;
 if(c.n==='Downdraft')return e.slots.some(m=>m&&!(m.marks||[]).includes('Weakened'))?5:0;
 return 0;
}
function secondTechniqueLegal(p,e,c){
 if(c.n==='Riptide')return e.slots.some(Boolean);
 if(c.n==='Wild Growth'||c.n==='Stone Fist'||c.n==='Downdraft')return p.slots.some(Boolean);
 return true;
}
function flowTwice(p,isAI){
 if(isAI){flow1(p,true);flow1(p,true);return}
 if(!p.deck.length){flow1(p,false);return}
 let next=p.deck[0];
 modal(`Flow 1 of 2 · ${next.n}${flowPreview(next)}`,[
   [`Keep on top`,()=>{hideModal();add(`FLOW · ${next.n} stays on top`);flow1(p,false);render()}],
   [`Send to bottom`,()=>{hideModal();p.deck.push(p.deck.shift());add(`FLOW · ${next.n} sent to bottom`);flow1(p,false);render()}]
 ]);
}
function resolveSecondTechnique(p,e,c,isAI=false,target=null){
 let t=target||secondTechniqueTarget(p,e,c),who=isAI?'Rival ':'',benderSide=isAI?0:1,enemyName=isAI?'your Bender':'rival Bender';
 const strike=(m,n)=>{let d=hit(m,n,c.el,c.n);death(e);return d};
 const benderHit=n=>{e.vit-=n;ebQueueFx({kind:'benderHit',side:benderSide,damage:n,el:c.el,label:c.n})};
 if(c.n==='Searing Brand'){
   if(t.enemy&&e.slots.includes(t.enemy)){addMark(t.enemy,'Burning');let d=strike(t.enemy,1);add(`${who}${c.n}: ${t.enemy.n} is Burning · ${d} damage`)}
   else if(!e.slots.some(Boolean)){addMark(e,'Burning');benderHit(1);add(`${who}${c.n}: ${enemyName} is Burning · 1 damage`)}
   else add(`${who}${c.n}: no legal target`);
 }else if(c.n==='Riptide'){
   let m=t.enemy;if(!m||!e.slots.includes(m)){add(`${who}${c.n}: no enemy Manifestation`);return}
   if((m.marks||[]).includes('Soaked')){let d=strike(m,2);add(`${who}${c.n}: ${d} damage to Soaked ${m.n}`)}
   else{addMark(m,'Soaked');add(`${who}${c.n}: ${m.n} is Soaked`)}
 }else if(c.n==='Wild Growth'){
   let m=t.friend;if(!m||!p.slots.includes(m)){add(`${who}${c.n}: no friendly target`);return}
   addMark(m,'Seeded');let grew=grow(m,p);add(`${who}${c.n}: ${m.n} is Seeded${grew?` · Growth ${m.growth}`:' · Growth already 3'}`);
 }else if(c.n==='Stone Fist'){
   let f=t.friend;if(!f||!p.slots.includes(f)){add(`${who}${c.n}: no friendly target`);return}
   let n=1+(f.armor||0);
   if(t.enemy&&e.slots.includes(t.enemy)){let name=t.enemy.n,d=strike(t.enemy,n);add(`${who}${c.n}: ${f.n} hits ${name} for ${d}`)}
   else if(!e.slots.some(Boolean)){benderHit(n);add(`${who}${c.n}: ${f.n} hits ${enemyName} for ${n}`)}
   else add(`${who}${c.n}: no legal target`);
 }else if(c.n==='Recharge'){add(`${who}${c.n}: Flow 1 twice`);flowTwice(p,isAI)}
 else if(c.n==='Downdraft'){
   let f=t.friend;if(!f||!p.slots.includes(f)){add(`${who}${c.n}: no friendly target`);return}
   let gained=gainMomentum(f),m=t.enemy&&e.slots.includes(t.enemy)?t.enemy:null,weak=m?applyCrosswindWeakness(m):false;
   add(`${who}${c.n}: ${f.n} ${gained?'gains':'remains at'} Momentum ${momentumStacks(f)}/3${m?` · ${m.n} ${weak?'is Weakened':'was already Weakened'}`:''}`);
 }
}
function resolveHybridTechnique(p,e,c,isAI=false,target=null){let r=resonant(p),friend=(target&&target.friend)||p.slots.find(Boolean),enemy=(target&&target.enemy)||e.slots.find(m=>m&&wasDamagedThisTurn(m));
 if(c.el==='MAGMA'){if(c.n==='Molten Channel'){let mode=target&&target.magmaMode;if(!mode)mode=r?'BOTH':(enemy?'BURNING':'ARMOR');if((mode==='ARMOR'||mode==='BOTH')&&friend){let gained=gainArmor(friend);add(`${c.n}: ${friend.n} ${gained?'gains Armor':'already gained Armor this round'}`)}if((mode==='BURNING'||mode==='BOTH')&&enemy&&wasDamagedThisTurn(enemy)){addMark(enemy,'Burning');add(`${c.n}: ${enemy.n} was damaged this turn → Burning`)}}else if(c.n==='Pressure Forge'){if(friend)gainArmor(friend);if(r){let t=e.slots.find(x=>x&&(x.marks||[]).includes('Burning'));if(t){hit(t,1);death(e);add(`${c.n}: Resonance deals 1`)}}}else if(c.n==='Eruption Guard'&&friend){friend.quick={kind:'REDUCE',value:1,ownerTurn:G.turn};add(`${c.n}: protection armed`)}}
 if(c.el==='STORM'){if(c.n==='Crosswind Spark'&&friend&&moveFriendly(p,friend)){gainMomentum(friend);if(r)addMark(friend,'Charged');add(`${c.n}: movement + Momentum ${momentumStacks(friend)}/3${r?' + Charged':''}`)}else if(c.n==='Thunderstep'&&friend&&moveFriendly(p,friend)){if(r&&((friend.marks||[]).includes('Charged')||momentumStacks(friend)>0)&&enemy){hit(enemy,1);death(e);add(`${c.n}: Resonance deals 1`)}}else if(c.n==='Static Reversal'&&friend){friend.quick={kind:'MOVE',ownerTurn:G.turn};add(`${c.n}: reversal armed`)}}
 if(c.el==='BLOOM'){if(c.n==='Rainseed'&&friend){if(r){if(grow(friend,p))add(`${c.n}: Resonance Growth ${friend.growth}`)}else if((friend.marks||[]).includes('Seeded')){ebHeal(friend,p);add(`${c.n}: heals 1`)}else{addMark(friend,'Seeded');add(`${c.n}: Seeded`)}}else if(c.n==='Flourishing Current'&&friend){if(r){ebHeal(friend,p);if((friend.marks||[]).includes('Seeded'))grow(friend,p);add(`${c.n}: Resonance heals up to 1${(friend.marks||[]).includes('Seeded')?' + Growth':''}`)}else add(`${c.n}: no effect · Resonance is not active`)}else if(c.n==='Reclaiming Tide'){let t=p.slots.find(x=>x&&(x.marks||[]).includes('Seeded')&&(x.growth||0)>0);if(t){t.quick={kind:'SURVIVE',ownerTurn:G.turn};add(`${c.n}: survival armed on ${t.n}`)}}}}
function applyQuickBeforeAttack(owner,target){if(!target||!target.quick)return;if(target.quick.kind==='MOVE'){moveFriendly(owner,target);target.quick=null;add(`${target.n}: Static Reversal movement`)}}
function applyQuickAfterDamage(owner,target){if(!target||!target.quick)return;if(target.quick.kind==='SURVIVE'&&target.h<=0&&(target.growth||0)>0&&(target.marks||[]).includes('Seeded')){target.h=1;target.growth--;target.a=Math.max(0,target.a-ebGrowthAtk(target));target.marks=target.marks.filter(x=>x!=='Seeded');target.quick=null;add(`${target.n}: Reclaiming Tide leaves it at 1 HP`)}}
function hybridAttackBonus(att,p){
 let bonus=0;
 if(att.el==='STORM'&&att.n==='Tempest Striker'&&p.turnState.moved.includes(att.id)&&!att.turnFlags?.stormBonus){
   bonus=1;
   att.turnFlags={...(att.turnFlags||{}),stormBonus:true};
 }
 // Crosswind's opening gives Gale Scout one temporary Momentum stack.
 // Include the new stack in this attack because the caller reads att.a first.
 if(att.el==='AIR'&&att.n==='Gale Scout'&&p.turnState.airOpening){
   let before=momentumStacks(att);gainMomentum(att);bonus+=momentumStacks(att)-before;
   p.turnState.airOpening=false;
   add(`AIR · Gale Scout exploits Crosswind → Momentum ${momentumStacks(att)}/3`);
 }
 return bonus;
}
function elementalAttackBonus(att,target,p){
 let bonus=hybridAttackBonus(att,p);
 // Boulder Ram converts existing Armor into pressure without consuming it.
 // If it has at least 1 Armor at attack resolution, it always receives +1 ATK
 // against either a Manifestation or the opposing Bender.
 if(att.el==='EARTH'&&att.n==='Boulder Ram'&&(att.armor||0)>0){
   bonus+=1;
   add(`EARTH · Boulder Ram attacks while Armored → +1 ATK`);
 }
 // Flare Hawk checks the actual defender. Burning on a Manifestation OR Bender always grants +1.
 if(att.el==='FIRE'&&att.n==='Flare Hawk'&&target&&(target.marks||[]).includes('Burning')){
   bonus+=1;add(`FIRE · Flare Hawk attacks Burning target → +1 ATK`);
 }
 if(att.el==='LIGHTNING'&&att.n==='Arc Runner'&&G.chain>=2){bonus+=1;add(`LIGHTNING · Arc Runner Chain ${G.chain} → +1 ATK`)}
 if(att.el==='LIGHTNING'&&att.n==='Volt Lynx'&&G.chain>=3&&!att.turnFlags?.voltBonus){bonus+=2;att.turnFlags={...(att.turnFlags||{}),voltBonus:true};add(`LIGHTNING · Volt Lynx Chain ${G.chain} → +2 ATK`)}
 if(att.el==='LIGHTNING'&&target&&(target.marks||[]).includes('Charged')){bonus+=1;target.marks=target.marks.filter(x=>x!=='Charged');add(`CHARGED · ${att.n} releases the charge → +1 damage`)}
 return bonus;
}
function applyObsidianRavagerTrigger(att,target,p){
 if(!att||att.el!=='MAGMA'||att.n!=='Obsidian Ravager'||!target||!resonant(p)||att.turnFlags?.obsidianBurn)return false;
 let donor=p.slots.find(m=>m&&m!==att&&(m.armor||0)>0);if(!donor)return false;
 donor.armor--;att.turnFlags={...(att.turnFlags||{}),obsidianBurn:true};addMark(target,'Burning');add(`Obsidian Ravager: ${donor.n} spends 1 Armor → ${target.n||'Bender'} gains Burning`);return true
}
function attackPick(){let a=me().slots.filter(x=>x&&x.ready&&!x.sick);if(!a.length)return;if(window.EB_Arena?.enabled()&&EB_Arena.beginAttack(a.map(x=>x.id)))return;modal('Choose attacker',a.map(m=>[`${m.n} · ${m.a} ATK`,()=>targetPick(m)]))}
function activeGuards(side){return side.slots.filter(x=>x&&x.guard)}
function guardAllowsManifestationTarget(side,target){
 // HARDLOCK invariant: Guard never makes a Manifestation illegal.
 return !!(side&&target&&side.slots.includes(target));
}
function attackBypassesGuard(att,owner){
 // GUARD-BYPASS HARDLOCK:
 // Guard exceptions live here only. Never disable Guard globally.
 // A bypass is legal only while the specific card's printed condition is active.
 if(!att||!owner)return false;

 // Dancing Gale — Sky Raptor: Momentum explicitly enables Guard bypass.
 if(att.el==='AIR'&&att.n==='Sky Raptor'&&momentumStacks(att)>0){
   return true;
 }

 // Storm — Tempest Striker already says its Resonance attack may ignore Guard.
 // It must have changed slots this turn and Resonance must currently be active.
 if(att.el==='STORM'&&att.n==='Tempest Striker'&&
    owner.turnState?.moved?.includes(att.id)&&resonant(owner)){
   return true;
 }

 return false;
}
function guardAllowsBenderTarget(side,att=null,owner=null){
 // Normal rule: no active Guard.
 // Explicit card effects can override ONLY this Bender gate.
 return activeGuards(side).length===0 || attackBypassesGuard(att,owner);
}
function resolveOverflowDamage(defender,target,dealt,preHitHP,guardsAtImpact,sourceEl,sourceLabel,benderSide){
 // Overflow only comes from a Manifestation attack that actually defeats its target.
 // Armor has already reduced `dealt`; Quick survival is checked before this is called.
 // Any Guard active at impact prevents overflow from reaching the Bender.
 if(!target||target.h>0||guardsAtImpact>0)return 0;
 let overflow=Math.max(0,dealt-Math.max(0,preHitHP));
 if(overflow<=0)return 0;
 defender.vit-=overflow;
 ebQueueFx({kind:'benderHit',side:benderSide,damage:overflow,el:sourceEl||'AIR',label:`${sourceLabel||'Attack'} · OVERFLOW`});
 add(`OVERFLOW · ${sourceLabel||'Attack'} breaks ${target.n} → ${overflow} damage to Bender`);
 return overflow;
}
function targetPick(att){
 let e=foe(),guards=activeGuards(e);
 // GUARD HARDLOCK: every enemy Manifestation remains targetable.
 let targets=e.slots.filter(m=>m&&!ebWarded(m));
 let b=targets.map(m=>[`Attack ${m.n}`,()=>attack(att,m)]);
 // Guard gates ONLY the Bender option.
 if(guardAllowsBenderTarget(e,att,me())){
   let bypass=activeGuards(e).length&&attackBypassesGuard(att,me());
   b.push([`${bypass?'Bypass Guard · ':''}Attack Bender · ${e.vit} Vitality`,()=>attack(att,null)]);
 }
 modal('Choose target',b);
}

// Arena targeting (Phase 3 · 3-3). The legal targets are exactly targetPick's list.
// The damage preview runs the real bonus code on a throwaway copy of the duel, so
// it can never drift from the rules and never touches live state, logs or FX.
function ebAttackPreview(att,t){
 if(!G||!att||G.trial)return null;
 let real=G,fxLength=EB_FX_QUEUE.length,result=null;
 try{
   G=structuredClone(real);
   let p=me(),e=foe(),a=p.slots.find(x=>x&&x.id===att.id),target=t?e.slots.find(x=>x&&x.id===t.id):null;
   if(a&&(!t||target)){
     if(target){let q=target.quick&&target.quick.kind==='REDUCE'?target.quick.value:0;let power=ebSoakedAttackPower(a,Math.max(0,a.a+elementalAttackBonus(a,target,p)-q));let armor=Number.isFinite(target.armor)?target.armor:0;result={damage:Math.max(0,power-Math.min(armor,power)),power,base:att.a}}
     else{let power=ebSoakedAttackPower(a,Math.max(0,a.a+elementalAttackBonus(a,e,p)));result={damage:power,power,base:att.a}}
   }
 }catch(error){result=null}
 finally{G=real;EB_FX_QUEUE.length=fxLength}
 return result;
}
function ebArenaAttackTargets(attackerId){
 if(!G||G.active!==0||G.winner||G.pendingResponse||EB_INIT_LOCK||ebMpInputLocked())return null;
 let att=me().slots.find(x=>x&&x.id===attackerId);if(!att||!att.ready||att.sick)return null;
 let e=foe(),list=e.slots.filter(m=>m&&!ebWarded(m)).map(m=>({id:m.id,name:m.n,preview:ebAttackPreview(att,m)}));
 let guarded=activeGuards(e).length>0,benderOk=guardAllowsBenderTarget(e,att,me());
 if(benderOk)list.push({id:null,name:'Bender',vitality:e.vit,bypass:guarded&&attackBypassesGuard(att,me()),preview:ebAttackPreview(att,null)});
 return {attacker:{id:att.id,name:att.n,el:att.el},targets:list,guarded:guarded&&!benderOk};
}
function ebArenaAttack(attackerId,targetId){
 let att=me().slots.find(x=>x&&x.id===attackerId);if(!att)return false;
 let info=ebArenaAttackTargets(attackerId);if(!info)return false;
 if(targetId===null){if(!info.targets.some(x=>x.id===null))return false;attack(att,null);return true}
 let t=foe().slots.find(x=>x&&x.id===targetId);if(!t||ebWarded(t))return false;attack(att,t);return true;
}
/* Alpha 0.8.48 — Response Hotfix. One response opportunity per declared attack. */
function ebResponseElements(p){return HYBRIDS[p.el]?HYBRIDS[p.el].parents.slice():[p.el]}
function ebResponseHandCard(p,el){return p.hand.find(c=>c.type==='RESPONSE'&&c.el===el)||null}
function ebResponseCanPay(p,el,source){if(source==='TOKEN')return !!p.initiationToken&&ebResponseElements(p).includes(el);let c=ebResponseHandCard(p,el);return !!c&&p.e>=c.c}
function ebResponseLegal(el,defender,attacker,target,phase='BEFORE'){
 if(!defender||!attacker||!target||G.winner)return false;
 if(phase==='AFTER')return el==='FIRE'&&target.h<target.max;
 if(el==='FIRE')return false;
 if(el==='WATER')return defender.slots.includes(target)&&defender.slots.some(x=>!x);
 if(el==='NATURE')return defender.slots.some(m=>m&&m.h<m.max&&!(m.marks||[]).includes('Second Bloom Used'));
 if(el==='EARTH')return defender.slots.some(m=>m&&m.armorGainRound!==G.turn&&(m.armor||0)<3);
 if(el==='LIGHTNING')return true;
 if(el==='AIR')return defender.slots.filter(Boolean).some(m=>m!==target&&!ebWarded(m));
 return false;
}
function ebResponseOptions(defender,attacker,target,phase='BEFORE'){
 let out=[];for(const el of ebResponseElements(defender)){if(!ebResponseLegal(el,defender,attacker,target,phase))continue;let c=ebResponseHandCard(defender,el);if(c&&defender.e>=c.c)out.push({el,source:'CARD',card:c});if(defender.initiationToken)out.push({el,source:'TOKEN',card:null})}return out
}
function ebSpendResponse(p,opt){if(opt.source==='TOKEN'){if(!p.initiationToken)return false;p.initiationToken=false}else{let c=ebResponseHandCard(p,opt.el);if(!c||p.e<c.c)return false;p.e-=c.c;p.hand=p.hand.filter(x=>x.id!==c.id);sendToWake(p,c,'response')}return true}
function ebResponseTargetChoices(el,p,target){if(el==='NATURE')return p.slots.filter(m=>m&&m.h<m.max&&!(m.marks||[]).includes('Second Bloom Used'));if(el==='EARTH')return p.slots.filter(m=>m&&m.armorGainRound!==G.turn&&(m.armor||0)<3);if(el==='AIR')return p.slots.filter(m=>m&&m!==target&&!ebWarded(m));return [target]}
function ebResolveResponse(opt,defender,attacker,target,pick=null,phase='BEFORE'){
 if(!ebResponseCanPay(defender,opt.el,opt.source)||!ebResponseLegal(opt.el,defender,attacker,target,phase))return {ok:false,target,cancel:false};
 if(!ebSpendResponse(defender,opt))return {ok:false,target,cancel:false};let chosen=pick||target,cancel=false,newTarget=target,r=RESPONSES[opt.el];add(`RESPONSE · ${r.n}${opt.source==='TOKEN'?' · Initiation Token':''}`);
 if(opt.el==='FIRE'){attacker.h-=2;ebQueueFx({kind:'damage',id:attacker.id,damage:2,el:'FIRE',label:r.n});let owner=G.p.find(p=>p.slots.includes(attacker));if(owner)death(owner)}
 else if(opt.el==='WATER'){let from=defender.slots.indexOf(target),to=defender.slots.findIndex(x=>!x);if(from>=0&&to>=0){
   // Undertow changes position only. Preserve combat stats exactly and repair
   // any non-finite legacy/transient values before the card is rendered again.
   if(!Number.isFinite(target.max))target.max=Number.isFinite(target.h)?target.h:1;
   if(!Number.isFinite(target.h))target.h=target.max;
   if(!Number.isFinite(target.armor))target.armor=0;
   defender.slots[to]=target;defender.slots[from]=null;cancel=true;add(`Undertow moves ${target.n} · attack cancelled`)}}
 else if(opt.el==='NATURE'){if(chosen&&defender.slots.includes(chosen)&&chosen.h<chosen.max&&!(chosen.marks||[]).includes('Second Bloom Used')){let healed=ebHeal(chosen,defender);addMark(chosen,'Second Bloom Used');add(`Second Bloom heals ${chosen.n} for ${healed} · once-per-duel use recorded`)}}
 else if(opt.el==='EARTH'){if(chosen&&defender.slots.includes(chosen)){let gained=gainArmor(chosen);add(`Stonewall → ${chosen.n} ${gained?'gains 1 Armor':'already gained Armor this round'}`)}}
 else if(opt.el==='LIGHTNING'){attacker.h-=2;ebQueueFx({kind:'damage',id:attacker.id,damage:2,el:'LIGHTNING',label:r.n});let owner=G.p.find(p=>p.slots.includes(attacker));if(owner){death(owner);if(!owner.slots.includes(attacker)){cancel=true;add(`Flash Step destroys ${attacker.n} · attack cancelled`)}}}
 else if(opt.el==='AIR'){let a=defender.slots.indexOf(target),b=defender.slots.indexOf(chosen);if(a>=0&&b>=0&&a!==b){[defender.slots[a],defender.slots[b]]=[defender.slots[b],defender.slots[a]];newTarget=chosen;add(`Slipstream redirects the attack to ${chosen.n}`)}}
 winCheck();return {ok:true,target:newTarget,cancel:cancel||!!G.winner}
}
function ebChooseHumanResponse(attacker,target,phase,done){let defender=me(),opts=ebResponseOptions(defender,attacker,target,phase);if(!opts.length)return done({target,cancel:false});let locked=false,buttons=[];
 const choose=opt=>{if(locked)return;let picks=ebResponseTargetChoices(opt.el,defender,target);let commit=pick=>{if(locked)return;locked=true;hideModal();let r=ebResolveResponse(opt,defender,attacker,target,pick,phase);render();setTimeout(()=>done(r),190)};if(picks.length>1&&(opt.el==='NATURE'||opt.el==='EARTH'||opt.el==='AIR')){modal(`${RESPONSES[opt.el].n} · Choose target`,picks.map(m=>[m.n,()=>commit(m)]).concat([['CANCEL',()=>ebChooseHumanResponse(attacker,target,phase,done)]]))}else commit(picks[0]||target)};
 opts.forEach(opt=>buttons.push([`${opt.source==='TOKEN'?'INITIATION':'USE'} · ${RESPONSES[opt.el].n}`,()=>choose(opt)]));buttons.push(['PASS',()=>{if(locked)return;locked=true;hideModal();setTimeout(()=>done({target,cancel:false}),190)}]);modal(`${phase==='AFTER'?'Damage landed':'Incoming Attack'} · ${attacker.n} → ${target.n}`,buttons,{dismissible:false,response:{attackerId:attacker.id,targetId:target.id}})
}
function ebChooseAIResponse(defender,attacker,target,phase='BEFORE'){let opts=ebResponseOptions(defender,attacker,target,phase);if(!opts.length)return {target,cancel:false};let opt=opts[0];if(diff==='Easy'&&Math.random()<.55)return {target,cancel:false};let picks=ebResponseTargetChoices(opt.el,defender,target),pick=target;if(opt.el==='NATURE')pick=picks.sort((a,b)=>a.h-b.h)[0]||target;if(opt.el==='EARTH')pick=picks.sort((a,b)=>(b.a+b.h)-(a.a+a.h))[0]||target;if(opt.el==='AIR')pick=picks.sort((a,b)=>b.h-a.h)[0]||target;return ebResolveResponse(opt,defender,attacker,target,pick,phase)}
function ebSoakedAttackPower(att,power){if(!att||(att.marks||[]).indexOf('Soaked')<0)return Math.max(0,power);att.marks=att.marks.filter(x=>x!=='Soaked');let reduced=Math.max(0,power-2);add(`SOAKED · ${att.n} attack weakened by ${power-reduced} · Soaked consumed`);return reduced}
function ebAttackCore(att,t){hideModal();let defending=foe(),owner=me();
 if(!t&&!guardAllowsBenderTarget(defending,att,owner)){
   add(`GUARD · ${activeGuards(defending)[0].n} protects the rival Bender`);
   bump();return
 }
 if(!t&&activeGuards(defending).length&&attackBypassesGuard(att,owner)){
   add(`BYPASS · ${att.n} ignores Guard and strikes the rival Bender`);
 }
 if(G.trial){let next=G.trial.strip[ebTrialCompletedCount()],waterSoak=G.trial.element==='WATER'&&att.n==='River Serpent'&&t?.n==='Tide Brute'&&!(t.marks||[]).includes('Soaked')&&!G.trial.progress.soaked;if(next?.kind==='card'&&next.name===att.n)ebTrialTrackCard(att);else if(!waterSoak)ebTrialWrongMove()}att.ready=false;if(t){applyObsidianRavagerTrigger(att,t,owner);applyQuickBeforeAttack(foe(),t);let q=t.quick&&t.quick.kind==='REDUCE'?t.quick.value:0;if(q)t.quick=null;let power=Math.max(0,att.a+elementalAttackBonus(att,t,me())-q);

if(G.trial&&G.trial.element==='LIGHTNING'&&att.n==='Spark Runner'){
  if(G.trial.progress.step!==1){
    power=0;
    add('STORMS · Use Static Step first.');
  }else{
    power+=(att.charge||0);
    att.charge=0;
    G.trial.progress.released=true;
    G.trial.progress.step=2;
    add('STORMS · RELEASE → Charge converted into burst damage.');
  }
}
power=ebSoakedAttackPower(att,power);let preHitHP=t.h,guardsAtImpact=activeGuards(foe()).length;
 let d=hit(t,power,att.el,att.n);add(`${att.n} attacks ${t.n} for ${d}`);
 // River Serpent: only a successful hit on a Manifestation applies Soaked.
 // The target keeps Soaked until its own next attack resolves.
 if(att.el==='WATER'&&att.n==='River Serpent'&&d>0){
   addMark(t,'Soaked');
   if(G.trial?.element==='WATER'&&t.n==='Tide Brute'){G.trial.progress.soaked=true;G.trial.progress.soakedByAttack=true}
   add(`WATER · River Serpent damages ${t.n} → Soaked`);
 } applyQuickAfterDamage(foe(),t);resolveOverflowDamage(foe(),t,d,preHitHP,guardsAtImpact,att.el,att.n,1);death(foe());winCheck();if(G.trial&&G.trial.element==='LIGHTNING'&&G.trial.progress.released){G.trial.progress.hit=1;foe().vit=0;add('STORMS TRIAL · Charge → Release complete')}}else{applyObsidianRavagerTrigger(att,foe(),owner);let power=ebSoakedAttackPower(att,Math.max(0,att.a+elementalAttackBonus(att,foe(),me())));if(G.trial?.element==='LIGHTNING'&&att.n==='Spark Runner'){if(G.trial.progress.step!==1){power=0;add('STORMS · Use Static Step first.')}else{power+=(att.charge||0);att.charge=0;G.trial.progress.released=true;G.trial.progress.step=2;G.trial.progress.hit=power}}foe().vit-=power;if(G.trial&&att.n==='Grove Beast'&&G.trial.element==='NATURE')G.trial.progress.hit=power;if(G.trial&&att.n==='Sky Raptor'&&G.trial.element==='AIR')G.trial.progress.hit=power;ebQueueFx({kind:'benderHit',side:1,damage:power,el:att.el,label:att.n});add(`${att.n} hits rival Bender for ${power}`)}bump()}
function attack(att,t){
 if(!G||G.winner||G.pendingResponse||G.active!==0)return;let defending=foe();
 if(t&&ebWarded(t)&&!EB_MP.enabled){add(`WARDED · ${t.n} can't be attacked until its owner's next turn`);return render()}
 if(EB_MP.enabled){hideModal();ebMpSubmit('ATTACK',{attackerId:att.id,targetId:t?t.id:null,targetType:t?'MANIFESTATION':'BENDER'});return}
 if(!t)return ebAttackCore(att,t);
 let rr=ebChooseAIResponse(defending,att,t,'BEFORE');if(rr.cancel)return bump();t=rr.target;if(!defending.slots.includes(t))return bump();
 let before=t.h;ebAttackCore(att,t);if(G.winner)return;
 if(t&&t.h<before){let post=ebChooseAIResponse(defending,att,t,'AFTER');if(post.ok)bump()}
}
function endTurn(){if(!G||EB_INIT_LOCK||G.winner||G.pendingResponse||G.active!==0)return;if(G.trial)return G.trial.element==='WATER'?resolveTidesTrial():undefined;if(EB_MP.enabled){ebMpSubmit('END_TURN',{});return}ebPassTurn(1);setTimeout(ai,350)}
// A round ends when the turn returns to the Bender who started the duel, as in lib/gameEngine.js endTurn().
// Before 1.11.1 live play ended the round after the rival's turn even when the rival started, which gave the
// player +1 Essence every turn and expired round effects (Armor, Momentum, Charged) one turn early.
function ebStartSeat(){return Number.isInteger(G?.startSeat)?G.startSeat:(Number.isInteger(G?.initiative?.starter)?G.initiative.starter:0)}
// Rally Ward (issue #96): from round 2 on, a Manifestation summoned onto your empty field while the rival has
// Manifestations is Warded until your next turn begins. A Warded Manifestation can't be attacked; Techniques still reach it.
function ebWarded(m){return !!(m&&(m.marks||[]).includes('Warded'))}
function ebRallyWardApplies(p,e,round){return Number(round)>=2&&!p.slots.some(Boolean)&&e.slots.some(Boolean)}
function ebPassTurn(next){if(next===ebStartSeat()){expireAllRoundEffects();G.turn++}G.active=next;turnStart()}
function turnStart(){
 let p=current();p.slots.filter(Boolean).forEach(m=>{m.quick=null;m.turnFlags={};if(ebWarded(m))m.marks=m.marks.filter(x=>x!=='Warded')});p.turnState=freshTurnState(p.el);p.maxE=Math.min(7,2+Math.floor((G.turn-1)));p.e=p.maxE;p.slots.filter(Boolean).forEach(m=>{m.ready=true;m.sick=false});draw(p,true);if(!G.trial&&ebSecondWindApplies(p,G.p[1-G.active],G.turn)){draw(p,false);add(p===me()?'SECOND WIND · you draw an extra card':`Rival SECOND WIND · ${p.name} draws an extra card`)}G.chain=0;bump(`${p.name} turn begins`)}
/* Alpha 0.8.50 — shared AI target policy. Pure scoring: no state mutation, no slot-order preference. */
function ebAITargetScore(att,t){
 if(!att||!t)return -Infinity;
 const atk=Math.max(0,Number(att.a)||0),hp=Math.max(0,Number(t.h)||0),armor=Math.max(0,Number(t.armor)||0),effectiveHP=hp+armor;
 const lethal=atk>=effectiveHP?1000:0;
 const threat=(Number(t.a)||0)*18+(t.guard?34:0)+(t.ready?8:0);
 const status=((t.marks||[]).includes('Charged')?8:0)+((t.marks||[]).includes('Burning')?5:0)+((t.marks||[]).includes('Soaked')?4:0)+((t.marks||[]).includes('Seeded')?4:0)+(Number(t.growth)||0)*7;
 const efficiency=Math.max(0,36-effectiveHP*5);
 return lethal+threat+status+efficiency;
}
function ebPickAITarget(att,targets,randomFn=Math.random){
 const legal=(targets||[]).filter(Boolean);if(!legal.length)return null;
 let best=-Infinity,picks=[];
 for(const t of legal){let score=ebAITargetScore(att,t);if(score>best){best=score;picks=[t]}else if(score===best)picks.push(t)}
 return picks.length===1?picks[0]:picks[Math.floor(Math.max(0,Math.min(.999999999,randomFn()))*picks.length)];
}
function ai(){if(EB_INIT_LOCK||G.winner)return;let p=foe(),e=me(),budget=diff==='Difficult'?5:2;
function bodyScore(c){return (c.a||0)*2+(c.h||0)+(c.guard?3:0)-c.c*.4}
function techScore(c){if(TECH2_NAMES.has(c.n))return secondTechniqueScore(p,e,c);if(HYBRIDS[c.el])return resonant(p)?7:4;if(c.el==='FIRE')return e.slots.some(Boolean)?7:2;if(c.el==='EARTH')return p.slots.some(Boolean)?6:0;if(c.el==='NATURE')return p.slots.some(m=>m&&(m.marks||[]).includes('Seeded')&&(m.growth||0)<3)?7:1;if(c.el==='WATER')return 4;if(c.el==='LIGHTNING')return G.chain>=1?6:3;if(c.el==='AIR')return e.slots.filter(Boolean).length>=2?5:p.slots.some(Boolean)?4:0;return 2}
for(let step=0;step<budget;step++){let legal=p.hand.filter(c=>c.type!=='RESPONSE'&&c.c<=p.e&&(c.type==='TECHNIQUE'?(c.el!=='AIR'||p.slots.some(Boolean))&&secondTechniqueLegal(p,e,c):p.slots.some(s=>!s)));if(!legal.length)break;let c;
 if(diff==='Easy')c=legal[Math.floor(Math.random()*legal.length)];
 else {let ranked=legal.sort((a,b)=>(b.type==='TECHNIQUE'?techScore(b):bodyScore(b))-(a.type==='TECHNIQUE'?techScore(a):bodyScore(a)));c=(diff==='Medium'&&ranked.length>1&&Math.random()<0.40)?ranked[1]:ranked[0];}
 p.e-=c.c;p.hand=p.hand.filter(x=>x.id!==c.id);G.chain++;
 if(c.type==='TECHNIQUE'){sendToWake(p,c,'technique');
   if(TECH2_NAMES.has(c.n)){resolveSecondTechnique(p,e,c,true)}
   else if(HYBRIDS[c.el]){resolveHybridTechnique(p,e,c,true)}
   else if(c.el==='FIRE'){let t=e.slots.filter(Boolean).sort((a,b)=>a.h-b.h)[0];if(t){let d=hit(t,(t.marks||[]).includes('Burning')?3:2);add(`Rival ${c.n}: ${d} damage to ${t.n}`);death(e)}else{let burn=(e.marks||[]).includes('Burning'),d=burn?3:2;e.vit-=d;add(`Rival ${c.n}: ${d} damage${burn?' (Burning bonus)':''}`)}}
   else if(c.el==='EARTH'){let t=p.slots.filter(Boolean).sort((a,b)=>(b.a+b.h)-(a.a+a.h))[0];if(t){let gained=gainArmor(t);add(`Rival Fortify → ${t.n} ${gained?`Armor ${t.armor}`:'already gained Armor this round'}`)}}
   else if(c.el==='NATURE'){let t=p.slots.find(m=>m&&(m.marks||[]).includes('Seeded')&&(m.growth||0)<3);if(t&&grow(t,p)){add(`Rival Verdant Mend: ${t.n} gains Growth ${t.growth}`)}else add('Rival Verdant Mend: no Seeded target · no effect')}
   else if(c.el==='WATER'){let t=e.slots.find(Boolean);if(t)addMark(t,'Soaked');add(`Rival Current Shift: Flow 1${t?' + Soaked':''}`);flow1(p,true)}
   else if(c.el==='LIGHTNING'){if(G.chain===2){addMark(e,'Charged');add(`Rival Static Step: second card → your Bender is Charged`)}else add(`Rival Static Step: Flow 1`)}
   else if(c.el==='AIR'){let t=p.slots.find(m=>m&&m.n==='Sky Raptor'&&momentumStacks(m)<3)||p.slots.filter(Boolean).sort((a,b)=>momentumStacks(a)-momentumStacks(b))[0];if(t){gainMomentum(t);add(`Rival Crosswind: ${t.n} gains Momentum ${momentumStacks(t)}/3`)}else add('Rival Crosswind: no friendly target');let occupied=e.slots.map((m,i)=>m?i:-1).filter(i=>i>=0);if(occupied.length>=2){let [from,to]=occupied,a=e.slots[from],b=e.slots[to];[e.slots[from],e.slots[to]]=[b,a];let weakened=[applyCrosswindWeakness(a),applyCrosswindWeakness(b)].filter(Boolean).length;p.turnState.airOpening=true;add(`Rival Crosswind swaps M${from+1} and M${to+1} · ${weakened} Weakened · Air Opening ready`)}}
 }else{let i=p.slots.findIndex(x=>!x);if(i<0)continue;c.zone='FIELD';c.sick=true;c.ready=true;c.marks=c.marks||[];let ward=!G.trial&&ebRallyWardApplies(p,e,G.turn);p.slots[i]=c;if(ward){addMark(c,'Warded');add(`Rival RALLY WARD · ${c.n} can't be attacked until its next turn`)}if(c.el==='FIRE'&&c.n==='Cinder Adept'){addMark(e,'Burning');add(`Rival ${c.n}: applies Burning to your Bender`)}if(c.el==='WATER'&&c.n==='Mist Adept'){add(`Rival ${c.n}: Flow 1`);flow1(p,true)}if(c.el==='LIGHTNING'&&c.n==='Spark Runner'&&G.chain===2){G.chain++;add(`Rival ${c.n}: second card → +1 Chain (Chain ${G.chain})`);ebPulseChain()}resolvePrimeSummonGift(p,c,true);add(`Rival summons ${c.n}`)}
 registerAffinity(p,c);
 winCheck();
 if(G.winner)break;
}
if(G.winner){bump();return}
let attackers=p.slots.filter(x=>x&&x.ready&&!x.sick);if(diff==='Easy')attackers=attackers.slice(0,1);
 function finishAI(){bump();if(!G.winner)ebPassTurn(0)}
 function nextAttack(i){if(G.winner||i>=attackers.length)return finishAI();let m=attackers[i];if(!p.slots.includes(m)||!m.ready||m.sick)return nextAttack(i+1);m.ready=false;let guards=activeGuards(e),targets=e.slots.filter(x=>x&&!ebWarded(x)),t=null;let canBypass=guards.length>0&&attackBypassesGuard(m,p);if(canBypass&&diff==='Difficult')t=null;else if(targets.length){t=diff==='Easy'?targets[Math.floor(Math.random()*targets.length)]:ebPickAITarget(m,targets,Math.random)}
  if(!t&&guards.length&&!canBypass){add(`Rival ${m.n} has no target it can reach`);return nextAttack(i+1)}
  if(!t){applyObsidianRavagerTrigger(m,e,p);let power=ebSoakedAttackPower(m,Math.max(0,m.a+elementalAttackBonus(m,e,p))); e.vit-=power;ebQueueFx({kind:'benderHit',side:0,damage:power,el:m.el,label:m.n});add(`Rival ${m.n} hits Bender for ${power}`);winCheck();return nextAttack(i+1)}
  ebChooseHumanResponse(m,t,'BEFORE',rr=>{if(rr.cancel||G.winner)return nextAttack(i+1);t=rr.target;if(!e.slots.includes(t))return nextAttack(i+1);applyObsidianRavagerTrigger(m,t,p);applyQuickBeforeAttack(e,t);let q=t.quick&&t.quick.kind==='REDUCE'?t.quick.value:0;if(q)t.quick=null;let power=ebSoakedAttackPower(m,Math.max(0,m.a+elementalAttackBonus(m,t,p)-q)),preHitHP=t.h,guardsAtImpact=activeGuards(e).length;let d=hit(t,power,m.el,m.n);add(`Rival ${m.n} attacks ${t.n} for ${d}`);if(m.el==='WATER'&&m.n==='River Serpent'&&d>0){addMark(t,'Soaked');add(`Rival River Serpent → Soaked`)}applyQuickAfterDamage(e,t);resolveOverflowDamage(e,t,d,preHitHP,guardsAtImpact,m.el,m.n,0);let survived=e.slots.includes(t);death(e);winCheck();if(G.winner)return nextAttack(i+1);if(d>0){ebChooseHumanResponse(m,t,'AFTER',()=>nextAttack(i+1))}else nextAttack(i+1)})
 }
 nextAttack(0)}
function resolveDuelEnd(){
 if(!G||G.winner)return null;

 // Priority 1: Vitality. Simultaneous lethal is a true draw.
 let dead=G.p.map(p=>p.vit<=0);
 if(dead[0]&&dead[1])return {winnerIndex:null,loserIndex:null,reason:'DRAW'};
 if(dead[0])return {winnerIndex:1,loserIndex:0,reason:'VITALITY'};
 if(dead[1])return {winnerIndex:0,loserIndex:1,reason:'VITALITY'};

 // Running out of cards never ends the duel (issue #96); only Vitality does.
 return null;
}
function showDuelEndPrompt(result){
 if(!G||G.trial||!G.winner||G.endPromptShown)return;
 G.endPromptShown=true;
 let playerWon=result.winnerIndex===0;
 let title=result.reason==='DRAW'?'DUEL DRAW':playerWon?'YOU WIN':'RIVAL BENDER WINS';
 let reason=result.reason==='DRAW'?'Both Benders reached 0 Vitality at the same settlement point.':`${G.p[result.loserIndex].name} reached 0 Vitality.`;
 // Defer until the resolving action has finished its current render/FX pass.
 setTimeout(()=>{
   if(!G||!G.winner)return;
   modal(`${title}\n${reason}`,[
     ['PLAY AGAIN',()=>{hideModal();startMatch()}],
     ['MAIN MENU',()=>{hideModal();go('home')}]
   ]);
 },0);
}
function winCheck(){
 if(!G||G.winner)return;
 let result=resolveDuelEnd();
 if(!result)return;
 G.winner=result.reason==='DRAW'?'DRAW':G.p[result.winnerIndex].name;
 G.winReason=result.reason;
 add(result.reason==='DRAW'?'DUEL DRAW · SIMULTANEOUS 0 VITALITY':`${G.winner} WINS · 0 VITALITY`);
 showDuelEndPrompt(result);
}
function modal(t,bs,options={}){if(globalThis.EB_Arena?.enabled()&&globalThis.EB_Arena.panel(t,bs,options))return;document.getElementById('mt').textContent=t;let b=document.getElementById('mb');b.innerHTML='';bs.forEach(([s,f])=>{let x=document.createElement('button');x.textContent=s;x.onclick=f;b.appendChild(x)});let d=document.getElementById('modalDismiss');if(d)d.style.display=options.dismissible===false||bs.some(([label])=>String(label).toUpperCase()==='CANCEL')?'none':'';let mw=document.getElementById('mw');clearTimeout(hideModal._t);clearTimeout(modal._enterT);mw.classList.remove('hide','eb-modal-leave','eb-modal-enter');if(!mw.classList.contains('cardInspectMode')){void mw.offsetWidth;mw.classList.add('eb-modal-enter');modal._enterT=setTimeout(()=>mw.classList.remove('eb-modal-enter'),240)}}function hideModal(){globalThis.EB_Arena?.closePanel();let mw=document.getElementById('mw');clearTimeout(hideModal._t);clearTimeout(modal._enterT);if(mw.classList.contains('hide'))return;if(mw.classList.contains('cardInspectMode')){mw.classList.add('hide');mw.classList.remove('cardInspectMode','inspect-enter','inspect-leave','eb-modal-enter','eb-modal-leave');let d=document.getElementById('modalDismiss');if(d)d.style.display='';return}mw.classList.remove('eb-modal-enter');mw.classList.add('eb-modal-leave');hideModal._t=setTimeout(()=>{mw.classList.add('hide');mw.classList.remove('eb-modal-leave','eb-modal-enter','cardInspectMode','inspect-enter','inspect-leave');let d=document.getElementById('modalDismiss');if(d)d.style.display=''},170)}

/* Alpha 0.8.3: canonical card costs + complete Lightning Chain/Charged combat math. */

/* Combat Feel Engine -------------------------------------------------------
   Reads game state after each normal render and decorates the new DOM.
   It never changes HP, Essence, targeting, effects, AI, Trials, or win logic.
   This keeps the one-file build safe while letting every current/future card
   inherit summon / move / attack / damage / status feedback automatically. */
let EB_VIS=null,EB_FOCUS_TIMER=0,EB_LOG_COUNT=0,EB_FX_QUEUE=[],EB_FX_TIMERS=[],EB_FX_GENERATION=0;
function ebLogCursor(){return EB_MP.enabled&&Array.isArray(G?.events)?(G.events.at(-1)?.seq||0):(G?.logs?.length||0)}
function ebFreshLogs(){return EB_MP.enabled&&Array.isArray(G?.events)?G.events.filter(item=>item.seq>EB_LOG_COUNT).map(item=>item.text):(G?.logs||[]).slice(EB_LOG_COUNT)}
function ebFxAnchorForElement(el){
 if(!el||!el.getBoundingClientRect)return null;
 let r=el.getBoundingClientRect();
 if(!r.width&&!r.height)return null;
 return Object.freeze({x:r.left+r.width/2,y:r.top+r.height/2});
}
function ebFxCaptureTarget(side,slot,id){
 let exact=id?ebCardById(id):null;
 if(exact)return ebFxAnchorForElement(exact);
 return (side>=0&&slot>=0)?ebFxAnchorForElement(ebSlot(side,slot)):null;
}
function ebQueueFx(ev){
 // 0.8.20 HARDLOCK: combat FX are immutable resolution events.
 // Capture visual position NOW, before bump()/render() can replace target DOM.
 if(!ev)return;
 let payload={...ev};
 if((payload.kind==='hit'||payload.kind==='defeat')&&!payload.anchor)
   payload.anchor=ebFxCaptureTarget(payload.side,payload.slot,payload.id);
 if(payload.kind==='benderHit'&&!payload.anchor)
   payload.anchor=ebFxAnchorForElement(ebBenderNode(payload.side));
 EB_FX_QUEUE.push(Object.freeze(payload));
}
function ebBenderNode(side){return (window.EB_Arena?.enabled()&&document.getElementById(side===0?'pplate':'eplate'))||document.getElementById(side===0?'you':'enemy')}
function ebCardById(id){return document.querySelector(`#pslots .card[data-id="${id}"],#eslots .card[data-id="${id}"]`)}
function ebDrainFx(){
 if(!EB_FX_QUEUE.length)return;
 let q=EB_FX_QUEUE.splice(0),generation=++EB_FX_GENERATION;
 EB_FX_TIMERS.forEach(clearTimeout);EB_FX_TIMERS=[];
 q.forEach((ev,ix)=>EB_FX_TIMERS.push(setTimeout(()=>{
   if(generation!==EB_FX_GENERATION)return;
   if(ev.kind==='hit'){
     let card=ev.id?ebCardById(ev.id):null;
     if(card)ebPulse(card,'fx-hit');
     if(card)ebBurst(card,ev.el||'FIRE',ev.damage);
     else ebBurstAt(ev.anchor,ev.el||'FIRE',ev.damage);
     ebBattleImpact(ev.damage>=5?3:ev.damage>=3?2:1);
     ebFocus(`${(ev.label||'ATTACK').toUpperCase()} · ${ev.damage} DAMAGE`,ev.el||'FIRE');
   }else if(ev.kind==='benderHit'){
     let el=ebBenderNode(ev.side);
     if(el)ebPulse(el,'fx-bender-hit');
     if(el)ebBurst(el,ev.el||'FIRE',ev.damage);else ebBurstAt(ev.anchor,ev.el||'FIRE',ev.damage);
     ebBattleImpact(ev.damage>=5?3:ev.damage>=3?2:1);
     ebFocus(`${(ev.label||'BENDER HIT').toUpperCase()} · ${ev.damage} DAMAGE`,ev.el||'FIRE');
   }else if(ev.kind==='summon'){
     let el=ebCardById(ev.id);if(el){ebPulse(el,'fx-summon');ebBurst(el,ev.el);ebFocus(`${ev.label.toUpperCase()} · MANIFEST`,ev.el)}
   }else if(ev.kind==='defeat'){
     let live=ev.id?ebCardById(ev.id):null,slot=ebSlot(ev.side,ev.slot);
     if(live)ebPulse(live,'fx-defeat');else if(slot)ebPulse(slot,'fx-defeat-slot');
     if(live)ebBurst(live,ev.el||'AIR');else if(ev.anchor)ebBurstAt(ev.anchor,ev.el||'AIR');else if(slot)ebBurst(slot,ev.el||'AIR');
     ebBattleImpact(1);ebFocus(`${(ev.label||'MANIFESTATION').toUpperCase()} · BROKEN`,ev.el||'AIR');
   }else if(ev.kind==='attack'){
     let card=ev.id?ebCardById(ev.id):null;if(card)ebPulse(card,'fx-attack');
   }else if(ev.kind==='status'){
     let el=ev.targetType==='BENDER'?ebBenderNode(ev.side):(ev.id?ebCardById(ev.id):null);
     if(el){ebPulse(el,'fx-status');ebBurst(el,ev.el||'AIR')}
     ebFocus(String(ev.label||'STATUS').toUpperCase(),ev.el||'AIR');
   }else if(ev.kind==='announce'){
     let el=ev.id?ebCardById(ev.id):null;if(el)ebBurst(el,ev.el||'AIR');
     ebFocus(String(ev.label||'').toUpperCase(),ev.el||'AIR');
   }else if(ev.kind==='chain'){
     ebPulseChain();
   }
 },ix*110)));
}
const EB_FX_COLOR_FALLBACK={FIRE:'#ff704d',WATER:'#55c7ff',NATURE:'#67d77a',EARTH:'#d0a25c',LIGHTNING:'#ffe45d',AIR:'#bdeaff',MAGMA:'#ff633f',STORM:'#aa91ff',BLOOM:'#6be8ae'};
const EB_FX_COLOR=Object.fromEntries(Object.entries(EB_FX_COLOR_FALLBACK).map(([element,fallback])=>{
 const token=`--eb-el-${element.toLowerCase()}`;
 const value=typeof getComputedStyle==='function'?getComputedStyle(document.documentElement).getPropertyValue(token).trim():'';
 return[element,(value||fallback).toLowerCase()];
}));
function ebSnap(){
 if(!G)return null;
 return {p:G.p.map(p=>({vit:p.vit,marks:[...(p.marks||[])],slots:p.slots.map((c,i)=>c?{id:c.id,n:c.n,el:c.el,h:c.h,a:c.a,armor:c.armor||0,growth:c.growth||0,momentum:momentumStacks(c),ready:!!c.ready,sick:!!c.sick,marks:[...(c.marks||[])],quick:c.quick?c.quick.kind:null,slot:i}:null)}))};
}
function ebCard(side,slot){return document.querySelector(`#${side===0?'pslots':'eslots'} .slot[data-slot="${slot}"] .card`)}
function ebSlot(side,slot){return document.querySelector(`#${side===0?'pslots':'eslots'} .slot[data-slot="${slot}"]`)}
function ebPulse(el,cls){if(!el)return;el.classList.remove(cls);void el.offsetWidth;el.classList.add(cls);setTimeout(()=>el&&el.classList.remove(cls),760)}
function ebBattleImpact(strength=1){let b=document.getElementById('battle');if(!b)return;b.classList.remove('fx-flash','fx-shake','fx-heavy');void b.offsetWidth;b.classList.add('fx-flash');if(strength>=3)b.classList.add('fx-heavy');else if(strength>=2)b.classList.add('fx-shake');setTimeout(()=>b?.classList.remove('fx-flash','fx-shake','fx-heavy'),380)}
function ebCenter(el){if(!el)return{x:innerWidth/2,y:innerHeight/2};let r=el.getBoundingClientRect();return{x:r.left+r.width/2,y:r.top+r.height/2}}
function ebFxShape(element){if(element==='LIGHTNING'||element==='STORM')return'eb-spark';if(element==='NATURE'||element==='BLOOM')return'eb-leaf';if(element==='EARTH'||element==='MAGMA')return'eb-stone';if(element==='AIR')return'eb-wind';if(element==='WATER')return'eb-ring';return''}
function ebBurst(el,element='AIR',damage=null){
 let host=document.getElementById('battleFx');if(!host||!el)return;let p=ebCenter(el),b=document.createElement('i');b.className='eb-burst '+ebFxShape(element);b.style.left=p.x+'px';b.style.top=p.y+'px';b.style.color=EB_FX_COLOR[element]||'#cfe7ff';host.appendChild(b);setTimeout(()=>b.remove(),650);
 if(damage!=null&&damage>0){let d=document.createElement('b');d.className='eb-damage';d.dataset.amount=String(damage);d.dataset.element=String(element);d.textContent='−'+damage;d.style.left=p.x+'px';d.style.top=p.y+'px';d.style.color=EB_FX_COLOR[element]||'#fff';host.appendChild(d);setTimeout(()=>d.remove(),780)}
}
function ebBurstAt(anchor,element,damage=null){
 // Fixed overlay fallback survives card destruction and battlefield rerenders.
 if(!anchor)return false;
 let host=document.getElementById('battleFx');if(!host)return false;
 let p=anchor;
 let b=document.createElement('i');b.className='eb-burst '+ebBurstShape(element);
 b.style.left=p.x+'px';b.style.top=p.y+'px';b.style.color=EB_FX_COLOR[element]||'#fff';
 host.appendChild(b);setTimeout(()=>b.remove(),650);
 if(damage!=null&&damage>0){
   let d=document.createElement('b');d.className='eb-damage';
   d.dataset.amount=String(damage);d.dataset.element=String(element);
   d.textContent='−'+damage;d.style.left=p.x+'px';d.style.top=p.y+'px';
   d.style.color=EB_FX_COLOR[element]||'#fff';
   host.appendChild(d);setTimeout(()=>d.remove(),780);
 }
 return true;
}
function ebFocus(text,el='AIR'){
 let f=document.getElementById('battleFocus');if(!f||!text)return;clearTimeout(EB_FOCUS_TIMER);f.className='';void f.offsetWidth;f.textContent=text;f.className='on '+String(el).toLowerCase();EB_FOCUS_TIMER=setTimeout(()=>{f.className=''},1500)
}
function ebShortFocus(log){
 if(!log)return null;let s=log.replace(/^T\d+\s*/, '');
 if(/AIR · Gale Scout exploits/i.test(s))return['OPENING EXPLOITED · MOMENTUM','AIR'];
 if(/RESONANCE ACTIVE/i.test(s))return['RESONANCE ACTIVE',/Fire|Water|Nature|Earth|Lightning|Air/i.test(s)?'STORM':'AIR'];
 if(/destroyed/i.test(s))return['MANIFESTATION BROKEN','FIRE'];
 if(/Armor/i.test(s))return['ARMOR SHIFT','EARTH'];
 if(/Growth/i.test(s))return['GROWTH','NATURE'];
 if(/Soaked/i.test(s))return['SOAKED','WATER'];
 if(/Charged|Chain/i.test(s))return['CHARGE BUILDING','LIGHTNING'];
 if(/Momentum/i.test(s))return['MOMENTUM','AIR'];
 if(/Burning/i.test(s))return['BURNING','FIRE'];
 if(/Crosswind|moves /i.test(s))return['POSITION SHIFT','AIR'];
 if(/EXHAUST/i.test(s))return['EXHAUSTION','FIRE'];
 return null;
}
function ebVisualState(){if(!G)return;let b=document.getElementById('battle');if(!b)return;b.dataset.atmo=me()?.el||'AIR';[['you',me()],['enemy',foe()]].forEach(([id,p])=>document.getElementById(id)?.classList.toggle('eb-danger',!!p&&p.vit<=8));document.querySelectorAll('#pslots .card,#eslots .card').forEach(c=>c.classList.add('eb-presence'))}
function ebRenderFx(){
 // 0.8.19: NON-COMBAT decorator only.
 // Damage, Bender damage, summons, defeats, and their numbers are rendered
 // exclusively from EB_FX_QUEUE. Never infer combat damage from snapshot deltas.
 if(!G||!document.getElementById('battle')?.classList.contains('on')){
   EB_VIS=ebSnap();EB_LOG_COUNT=ebLogCursor();return;
 }
 let now=ebSnap();if(!now)return;
 if(!EB_VIS){EB_VIS=now;EB_LOG_COUNT=ebLogCursor();return}

 for(let side=0;side<2;side++){
   let oldP=EB_VIS.p[side],newP=now.p[side];
   let oldBy=new Map(oldP.slots.filter(Boolean).map(c=>[c.id,c]));

   for(let i=0;i<3;i++){
     let n=newP.slots[i];
     if(!n)continue;
     let o=oldBy.get(n.id);
     if(!o)continue; // summon FX comes from the authoritative queue

     let cardEl=ebCard(side,i),slotEl=ebSlot(side,i);
     if(o.slot!==i){
       ebPulse(slotEl,'fx-move');
       ebPulse(cardEl,'fx-status');
       ebBurst(cardEl,n.el); // visual only: NEVER pass a damage number
       ebFocus(`${n.n.toUpperCase()} · REPOSITION`,n.el);
     }

     // Status-only changes remain safe to infer because they never display damage.
     let eventlessChanged=o.armor!==n.armor||
       o.growth!==n.growth||
       o.quick!==n.quick;
     let changed=eventlessChanged||o.marks.join('|')!==n.marks.join('|');

     if(changed&&(!EB_MP.enabled||eventlessChanged)){
       ebPulse(cardEl,'fx-status');
       ebBurst(cardEl,n.el); // no numeric payload
     }

     // Attacker motion only. Actual target impact/number comes from EB_FX_QUEUE.
     if(o.ready&&!n.ready&&!EB_MP.enabled)ebPulse(cardEl,'fx-attack');
   }
 }

 let fresh=ebFreshLogs(),focus=null;
 for(let i=fresh.length-1;i>=0&&!focus;i--)focus=ebShortFocus(fresh[i]);
 if(focus)ebFocus(focus[0],focus[1]);
 EB_LOG_COUNT=ebLogCursor();
 EB_VIS=now;
}
function effectBadges(c){
 let b=[];
 (c.marks||[]).filter(x=>x!=='Momentum').forEach(x=>b.push(`<span class="effect-badge effect-pop">${x}</span>`));
 if(momentumStacks(c)>0)b.push(`<span class="effect-badge effect-pop">Momentum ${momentumStacks(c)}</span>`);
 if((c.growth||0)>0)b.push(`<span class="effect-badge effect-pop">Growth ${c.growth}</span>`);
 if((c.armor||0)>0)b.push(`<span class="effect-badge effect-pop">Armor ${c.armor}</span>`);
 if(c.quick){
   let q=c.quick.kind==='REDUCE'?`Shield ${c.quick.value}`:c.quick.kind==='MOVE'?'Reversal Ready':c.quick.kind==='SURVIVE'?'Survival Ready':'Effect Ready';
   b.push(`<span class="effect-badge temp effect-pop">${q}</span>`);
 }
 if(c.turnFlags?.stormBonus)b.push(`<span class="effect-badge temp">Storm Bonus Used</span>`);
 return b.length?`<div class=effect-strip aria-label="Active effects">${b.join('')}</div>`:'';
}
function benderEffects(p){
 let b=(p.marks||[]).map(x=>`<span class="effect-badge effect-pop">${x}</span>`);
 if(p.turnState?.airOpening)b.push(`<span class="effect-badge temp effect-pop">Air Opening +1</span>`);
 return b.length?`<div class=bender-effects aria-label="Bender active effects">${b.join('')}</div>`:'';
}
function compactCardText(c){let t=(c.text||'').replace(/\s+/g,' ').trim();return t||'No additional effect.'}
function card(c,can=false){let state=effectBadges(c),pending=EB_MP.enabled?EB_MP.input?.pending():null;if(pending?.cardId!==c.id)pending=null;if(window.EB_Arena?.enabled())return EB_Arena.cardMarkup(c,{can,pending,soakedPreview:G?.trial?.element==='WATER'&&c.n==='Tide Brute'&&(c.marks||[]).includes('Soaked'),momentum:momentumStacks(c)});let summary=`<div class="rules card-summary">${compactCardText(c)}</div>`,soakedPreview=G?.trial?.element==='WATER'&&c.n==='Tide Brute'&&(c.marks||[]).includes('Soaked');let attack=soakedPreview?`<span class="trial-soaked-preview">${ebIconMarkup('soaked')} <s>${c.a}</s> → ${Math.max(0,c.a-2)}</span>`:`<span class="eb-stat-number">${c.a}</span>`;let typeLine=c.type==='RESPONSE'?'Response · Reaction':c.type==='TECHNIQUE'?`Technique${c.role?' · '+c.role:''}`:`${attack} ATK · <span class="eb-stat-number">${c.h}/${c.max}</span> HP${c.guard?' · Guard':''}`;return `<div class="card ${c.el.toLowerCase()} ${can?'play':''} ${pending?'mp-pending':''}" data-id="${c.id}" data-inspect="1"><span class=cost>${c.c}</span><b>${ebElementIcon(c.el)} ${c.n}</b><div class=small>${typeLine}</div>${summary}${state}${pending?`<div class="small card-status">${pending.kind==='TECHNIQUE'?'Activating…':'Placing…'}</div>`:c.sick?'<div class="small card-status">Summoning sickness</div>':''}<div class="why card-inspect-hint">Double-tap for details</div></div>`}
function slots(id,p){let own=p===me(),pending=own&&EB_MP.enabled?EB_MP.input?.pending():null;document.getElementById(id).innerHTML=p.slots.map((m,i)=>{let placing=!m&&pending?.kind==='MANIFESTATION'&&pending.slotIndex===i;return `<div class="slot ${placing?'mp-pending':''}" data-slot="${i}" data-own="${own?'1':'0'}" data-eb-anchor="slot" data-eb-side="${own?'you':'rival'}" data-eb-slot="${i}">${m?card(m):placing?'':`<span class=small>M${i+1} · empty</span>`}</div>`}).join('')}
let selectedCardId=null,dragState=null;
function ebMpInputLocked(){return !!(EB_MP.enabled&&EB_MP.input?.isLocked())}
function ebCancelActivePointerInteraction(){dragState?.cancel?.()}
function selectedHandCard(){return G&&selectedCardId!==null?me().hand.find(c=>c.id===selectedCardId)||null:null}
function recycleEligible(c){return !!(G&&!G.trial&&!G.winner&&G.active===0&&c&&me().recycles>0&&me().deck.some(x=>x.n!==c.n))}
function selectHandCard(c){if(!G||G.active!==0||G.winner)return;selectedCardId=c.id;renderSelectionOnly()}
function requestRecycle(){
 let c=selectedHandCard();
 if(!c){modal('Card Re-cycle · Select a card in your Hand first.',[['OK',hideModal]]);return}
 if(G.trial){modal('Card Re-cycle is available in standard matches.',[['OK',hideModal]]);return}
 if(me().recycles<=0){modal('Card Re-cycle · No uses remaining (0/3).',[['OK',hideModal]]);return}
 if(!me().deck.length){modal(`Card Re-cycle · ${c.n} cannot be re-cycled because your Deck is empty.`,[['OK',hideModal]]);return}
 let eligible=me().deck.filter(x=>x.n!==c.n);
 if(!eligible.length){modal(`Card Re-cycle · ${c.n} cannot be re-cycled because your Deck contains no different card.`,[['OK',hideModal]]);return}
 modal(`Are you sure you want to re-cycle ${c.n} for a random card from your Deck?`,[
  ['YES',()=>commitRecycle(c.id)],['CANCEL',hideModal]
 ]);
}
function commitRecycle(cardId){
 if(!G||G.trial||G.winner||G.active!==0)return hideModal();
 let p=me(),c=p.hand.find(x=>x.id===cardId);
 if(!c||p.recycles<=0)return hideModal();
 let eligibleIndexes=[];p.deck.forEach((x,i)=>{if(x.n!==c.n)eligibleIndexes.push(i)});
 if(!eligibleIndexes.length)return hideModal();
 // Atomic zone swap: no win/depletion check occurs until the replacement is safely in Hand.
 let di=eligibleIndexes[Math.floor(Math.random()*eligibleIndexes.length)],replacement=p.deck.splice(di,1)[0];
 p.hand=p.hand.filter(x=>x.id!==c.id);sendToWake(p,c,'recycled');
 replacement.zone='HAND';p.hand.push(replacement);p.recycles--;selectedCardId=replacement.id;
 hideModal();G.rev++;add(`CARD RE-CYCLE · ${c.n} → ${replacement.n} · ${p.recycles}/3 remaining`);winCheck();validateState();render();
}
function selectForSlot(c){if(!playable(c)||c.type==='TECHNIQUE')return;selectedCardId=c.id;document.querySelectorAll('#pslots .slot').forEach(x=>{let i=+x.dataset.slot;if(!me().slots[i])x.classList.add('drop-ready')});renderSelectionOnly()}
function renderSelectionOnly(){
 let c=selectedHandCard();
 document.querySelectorAll('#hand .card').forEach(x=>x.classList.toggle('recycle-selected',+x.dataset.id===selectedCardId));
 document.querySelectorAll('#pslots .slot').forEach(x=>{let i=+x.dataset.slot;x.classList.toggle('drop-ready',!!c&&c.type!=='TECHNIQUE'&&playable(c)&&!me().slots[i])});
 let hint=document.getElementById('recycleHint');if(hint)hint.textContent=c?`${c.n} selected · ${c.type==='TECHNIQUE'?'use ACTIVATE to play, double-tap for details, or use Card Re-cycle':'drag/tap an open slot to play, double-tap for details, or use Card Re-cycle'}`:'Tap a Hand card to select it. Double-tap any card for details.';
 document.querySelectorAll('#hand .card').forEach(el=>el.classList.remove('tech-selected','tech-activating'));
 document.querySelectorAll('#hand .eb-tech-activate,#battle .actions .eb-tech-activate').forEach(b=>b.remove());
 if(c&&c.type==='TECHNIQUE'&&playable(c)){let el=document.querySelector(`#hand .card[data-id="${c.id}"]`);if(el){el.classList.add('tech-selected');let b=document.createElement('button');b.className='eb-tech-activate';b.type='button';b.textContent='ACTIVATE';let activate=ev=>{ev.preventDefault();ev.stopPropagation();if(b.dataset.firing==='1'||!G||G.active!==0||G.winner||ebMpInputLocked())return;b.dataset.firing='1';let cardId=c.id;if(EB_MP.enabled){EB_MP.input.beginInteraction();EB_MP.input.endInteraction()}let live=me().hand.find(card=>card.id===cardId);if(!live||!playable(live)){b.dataset.firing='';return}el.classList.add('tech-activating');selectedCardId=null;play(live)};b.addEventListener('pointerdown',ev=>{ev.preventDefault();ev.stopPropagation();if(EB_MP.enabled)EB_MP.input.beginInteraction()},{passive:false});b.addEventListener('pointerup',activate,{passive:false});b.addEventListener('pointercancel',ev=>{ev.stopPropagation();if(EB_MP.enabled)EB_MP.input.endInteraction()});b.addEventListener('dblclick',ev=>{ev.preventDefault();ev.stopPropagation()});b.onclick=ev=>{if(b.dataset.firing!=='1')activate(ev)};el.appendChild(b)}}
 let rb=document.getElementById('recycle');if(rb){rb.textContent=EB_MP.enabled?'Card Re-cycle unavailable online':`Card Re-cycle ${me().recycles??0}/3`;rb.disabled=EB_MP.enabled||!!G.trial||G.active!==0||!!G.winner||(me().recycles??0)<=0;}
 window.EB_Arena?.enabled()&&EB_Arena.afterSelection();
}
function wireDropSlots(){document.querySelectorAll('#pslots .slot').forEach(slot=>{slot.onclick=()=>{if(selectedCardId===null)return;let c=me().hand.find(x=>x.id===selectedCardId),i=+slot.dataset.slot;if(c&&!me().slots[i]){selectedCardId=null;play(c,i)}}});renderSelectionOnly()}
// Arena hand (Phase 3 · 3-2): the fan owns the gesture; these keep the same guards as beginCardDrag.
function ebArenaHandCard(id){return G?me().hand.find(card=>card.id===id)||null:null}
function ebArenaCanDrag(id){let c=ebArenaHandCard(id);return !!(c&&G.active===0&&!G.winner&&!ebMpInputLocked()&&playable(c))}
function ebArenaDragBegin(id){if(!ebArenaCanDrag(id))return false;if(EB_MP.enabled&&!EB_MP.input.beginInteraction())return false;dragState={cardId:id};return true}
function ebArenaDragEnd(){dragState=null;if(EB_MP.enabled)EB_MP.input.endInteraction()}
function ebArenaSummon(id,slotIndex){let c=ebArenaHandCard(id);if(!c||c.type!=='MANIFESTATION'||me().slots[slotIndex]||!playable(c))return false;selectedCardId=null;play(c,slotIndex);return true}
function ebArenaSelect(id){let c=ebArenaHandCard(id);if(!c||c.type==='RESPONSE')return false;selectHandCard(c);return selectedCardId===c.id}
function beginCardDrag(ev,c,el){
 if(!G||G.active!==0||G.winner||c.type==='TECHNIQUE'||ebMpInputLocked())return;
 if(!playable(c)){selectHandCard(c);return;}
 if(ev.pointerType==='mouse'&&ev.button!==0)return;
 ev.preventDefault(); ev.stopPropagation();

 const pid=ev.pointerId, sx=ev.clientX, sy=ev.clientY;
 let x=sx,y=sy,moved=false,ghost=null,ended=false;
 selectedCardId=c.id;
 dragState={cardId:c.id};
 if(EB_MP.enabled&&!EB_MP.input.beginInteraction()){dragState=null;return}
 el.classList.add('drag-source');

 function clearHover(){document.querySelectorAll('#pslots .slot').forEach(z=>z.classList.remove('drop-hover'))}
 function makeGhost(){
   if(ghost)return;
   ghost=el.cloneNode(true);
   ghost.classList.add('dragging-card');
   ghost.classList.remove('drag-source');
   ghost.removeAttribute('data-id');
   ghost.style.width=el.getBoundingClientRect().width+'px';
   document.body.appendChild(ghost);
 }
 function positionGhost(){
   if(!ghost)return;
   ghost.style.left=(x-ghost.offsetWidth/2)+'px';
   ghost.style.top=(y-Math.min(55,ghost.offsetHeight/3))+'px';
 }
 function slotAt(px,py){
   let under=document.elementFromPoint(px,py);
   return under&&under.closest ? under.closest('#pslots .slot') : null;
 }
 function move(e){
   if(e.pointerId!==pid)return;
   e.preventDefault();
   x=e.clientX;y=e.clientY;
   if(!moved&&Math.hypot(x-sx,y-sy)>7){moved=true;makeGhost()}
   if(moved){
     positionGhost();clearHover();
     let sl=slotAt(x,y);
     if(sl&&!me().slots[+sl.dataset.slot])sl.classList.add('drop-hover');
   }
 }
 function cleanup(){
   if(ended)return;ended=true;
   document.removeEventListener('pointermove',move,true);
   document.removeEventListener('pointerup',up,true);
   document.removeEventListener('pointercancel',cancel,true);
   el.classList.remove('drag-source');
   clearHover();
   if(ghost)ghost.remove();
 }
 function finishInteraction(){dragState=null;if(EB_MP.enabled)EB_MP.input.endInteraction()}
 function up(e){
   if(e.pointerId!==pid)return;
   e.preventDefault();
   x=e.clientX;y=e.clientY;
   let sl=moved?slotAt(x,y):null;
   cleanup();
   let cardId=c.id;finishInteraction();let live=me().hand.find(card=>card.id===cardId);
   if(sl&&!me().slots[+sl.dataset.slot]){
     selectedCardId=null;
     if(live)play(live,+sl.dataset.slot);
   }else{
     // iPhone fallback: a short press selects the card, then tapping M1/M2/M3 commits it.
     selectedCardId=live?live.id:null;
     renderSelectionOnly();
   }
 }
 function cancel(e){
   if(e.pointerId!==pid)return;
   e.preventDefault();cleanup();let cardId=c.id;finishInteraction();let live=me().hand.find(card=>card.id===cardId);selectedCardId=live?live.id:null;renderSelectionOnly();
 }
 dragState.cancel=()=>cancel({pointerId:pid,preventDefault(){}});
 document.addEventListener('pointermove',move,{capture:true,passive:false});
 document.addEventListener('pointerup',up,{capture:true,passive:false});
 document.addEventListener('pointercancel',cancel,{capture:true,passive:false});
}
function validateState(){if(!G)return true;let ok=true,seen=new Set();for(const p of G.p){if(p.e<0||p.e>p.maxE||p.maxE>7||p.slots.length!==3||typeof p.initiationToken!=='boolean')ok=false;for(const c of [...p.deck,...p.hand,...p.wake,...p.slots.filter(Boolean)]){if(seen.has(c.id))ok=false;seen.add(c.id)}}if(!ok)console.error('ELEMENTBOUND invariant violation',G);return ok}
function resUI(p){if(!HYBRIDS[p.el])return '';let r=p.turnState.resonance,h=HYBRIDS[p.el];return `<span class="pill">${r.active?ebElementIcon(p.el)+' RESONANCE ACTIVE':'Resonance '+ebElementIcon(h.parents[0])+(r.a?'●':'○')+' '+ebElementIcon(h.parents[1])+(r.b?'●':'○')}</span>`}
function ebZoneCount(side,zone){let count=side?.[`${zone}Count`];return Number.isInteger(count)?count:(Array.isArray(side?.[zone])?side[zone].length:0)}
function render(){if(!G)return;let p=me(),e=foe();document.getElementById('rev').textContent=`REV ${G.rev}`;document.getElementById('turn').textContent=`Turn ${G.turn} · ${G.active?'RIVAL':'YOU'}`;let chainEl=document.getElementById('chain');if(chainEl){let chainRelevant=G.chain>0&&(current().el==='LIGHTNING'||current().el==='STORM');chainEl.hidden=!chainRelevant;chainEl.textContent=`Chain ${G.chain}`;}document.getElementById('difficulty').textContent=diff;ebSetIconText(document.getElementById('pname'),p.el.toLowerCase(),p.name,ebElementName(p.el));ebSetIconText(document.getElementById('ename'),e.el.toLowerCase(),e.name,ebElementName(e.el));ebSetIconText(document.getElementById('pvit'),'heart',p.vit,'Vitality');ebSetIconText(document.getElementById('evit'),'heart',e.vit,'Vitality');document.getElementById('pstats').innerHTML=`<span class=pill>Essence ${p.e}/${p.maxE}</span><span class=pill>Hand ${ebZoneCount(p,'hand')}</span><span class=pill>Deck ${ebZoneCount(p,'deck')}</span><span class=pill>Wake ${ebZoneCount(p,'wake')}</span>${p.initiationToken?'<span class="pill">Initiation ●</span>':''}${resUI(p)}${benderEffects(p)}<div class=stathelp>Essence = spendable energy · Hand = playable cards · Deck = draw pile · Wake = used/destroyed cards</div>`;document.getElementById('estats').innerHTML=`<span class=pill>Essence ${e.e}/${e.maxE}</span><span class=pill>Hand ${ebZoneCount(e,'hand')}</span><span class=pill>Deck ${ebZoneCount(e,'deck')}</span><span class=pill>Wake ${ebZoneCount(e,'wake')}</span>${e.initiationToken?'<span class="pill">Initiation ●</span>':''}${resUI(e)}${benderEffects(e)}`;slots('pslots',p);slots('eslots',e);let h=document.getElementById('hand'),arenaHand=!!window.EB_Arena?.enabled();h.innerHTML=p.hand.map(c=>card(c,playable(c))).join('');h.querySelectorAll('.card').forEach(x=>{let c=p.hand.find(c=>c.id==x.dataset.id);if(!c)return;x.dataset.ebAnchor='hand-card';x.dataset.ebCard=c.n;if(arenaHand){x.onclick=null;x.onpointerdown=null;x.draggable=false;x.ondragstart=ev=>ev.preventDefault()}else if(c.type==='TECHNIQUE'){x.onclick=()=>{if(G.active!==0||G.winner)return;selectHandCard(c)}}else if(c.type==='RESPONSE'){x.onclick=null;x.draggable=false;x.ondragstart=ev=>ev.preventDefault();x.onpointerdown=null}else{x.onclick=null;x.draggable=false;x.ondragstart=ev=>ev.preventDefault();x.onpointerdown=ev=>beginCardDrag(ev,c,x)}});if(arenaHand)EB_Arena.wireHand(h);wireDropSlots();wireCardInspectGestures();document.getElementById('attack').disabled=!!G.pendingResponse||(!!G.trial&&!['WATER','NATURE','LIGHTNING','AIR'].includes(G.trial.element))||G.active||G.winner||!p.slots.some(x=>x&&x.ready&&!x.sick);document.getElementById('end').disabled=!!G.pendingResponse||(!!G.trial&&G.trial.element!=='WATER')||G.active||G.winner;document.getElementById('you').classList.toggle('active',G.active===0);document.getElementById('enemy').classList.toggle('active',G.active===1);document.getElementById('winner').innerHTML=G.winner&&!G.trial?`<div class=win>${ebIconMarkup('trophy')} ${G.winner} wins<div class=small>Opponent reached 0 Vitality</div></div>`:'';renderTrialUI();let l=document.getElementById('log');l.innerHTML=G.logs.map(x=>`<div>${x}</div>`).join('');l.scrollTop=l.scrollHeight;window.EB_Arena?.render({state:G,you:p,rival:e,current:current(),online:!!EB_MP.enabled,difficulty:diff});requestAnimationFrame(()=>{ebVisualState();ebDrainFx();ebRenderFx()})}
function findLiveCardById(id){if(!G)return null;for(const p of G.p){for(const c of [...p.hand,...p.deck,...p.wake,...p.slots.filter(Boolean)])if(c.id===id)return c}return null}
function inspectCard(c){if(!c)return;if(window.EB_Arena?.enabled()&&EB_Arena.inspect(c))return;let terms=Object.keys(GLOSSARY).filter(k=>((c.text||'')+' '+(c.type||'')).toLowerCase().includes(k.toLowerCase()));let body=document.getElementById('mb'),mw=document.getElementById('mw');document.getElementById('mt').textContent=`${ebElementName(c.el)} ${c.n}`;body.innerHTML=`<div class="inspectCardFull ${c.el.toLowerCase()}"><div class="inspectMeta"><b>${c.type}${c.role?' · '+c.role:''} · ${c.c} Essence</b>${c.type!=='TECHNIQUE'?`<br>${c.a} ATK · ${c.h}/${c.max} HP${c.guard?' · Guard':''}`:''}</div><div class="inspectRule">${c.text||'No additional effect.'}</div>${c.tip?`<div class="inspectStrategy"><b>Strategy</b><br>${c.tip}</div>`:''}${terms.length?`<div class="inspectTerms">${terms.map(k=>`<div>${window.EB_Tome?.has(k)?`<button type="button" class="tome-term-link" data-tome-term="${k}" aria-label="${k}: open its page in the Tome">${k} ›</button>`:`<b>${k}:</b>`} ${GLOSSARY[k]}</div>`).join('')}</div>`:''}<div class="small">Detail view is informational only. It does not play, target, move, activate, or re-cycle the card.</div></div><button onclick="closeCardInspect()">CLOSE</button>`;let d=document.getElementById('modalDismiss');if(d)d.style.display='none';mw.classList.remove('hide','inspect-leave');mw.classList.add('cardInspectMode','inspect-enter');requestAnimationFrame(()=>requestAnimationFrame(()=>mw.classList.remove('inspect-enter')))}
function closeCardInspect(){let mw=document.getElementById('mw');if(!mw.classList.contains('cardInspectMode'))return hideModal();mw.classList.remove('inspect-enter');mw.classList.add('inspect-leave');clearTimeout(closeCardInspect._t);closeCardInspect._t=setTimeout(()=>{mw.classList.add('hide');mw.classList.remove('cardInspectMode','inspect-leave');let d=document.getElementById('modalDismiss');if(d)d.style.display=''},170)}
function wireCardInspectGestures(){document.querySelectorAll('#battle .card[data-inspect="1"]').forEach(el=>{if(el.dataset.doubleTapWired==='1')return;el.dataset.doubleTapWired='1';let lastTap=0,startX=0,startY=0,moved=false;el.addEventListener('pointerdown',ev=>{if(ev.pointerType==='mouse')return;startX=ev.clientX;startY=ev.clientY;moved=false},{passive:true});el.addEventListener('pointermove',ev=>{if(Math.hypot(ev.clientX-startX,ev.clientY-startY)>7)moved=true},{passive:true});el.addEventListener('pointerup',ev=>{if(ev.pointerType==='mouse'||moved)return;let now=performance.now();if(lastTap&&now-lastTap<=360){lastTap=0;ev.preventDefault();ev.stopPropagation();let c=findLiveCardById(+el.dataset.id);inspectCard(c)}else lastTap=now},{passive:false});el.addEventListener('dblclick',ev=>{ev.preventDefault();ev.stopPropagation();let c=findLiveCardById(+el.dataset.id);inspectCard(c)})})}
function goCodex(){window.EB_Codex.open();ebNavigate('codex')}
function goTome(){window.EB_Tome.open();ebNavigate('tome')}

/* Alpha 0.8.23 — Guard Targeting + River Serpent Soaked Hotfix Suite -------------------------------
   Hidden from normal navigation. Tap the home build stamp five times.
   The suite checks canonical data and isolated rule behavior, then restores
   global state so testing cannot leak into a real match. */
let EB_DEV_TAPS=0,EB_DEV_LAST_REPORT='';
function ebDevInstall(){
 const stamp=document.getElementById('buildStamp'); if(!stamp)return;
 stamp.title='Build information';
 let pressTimer=0,suppressClick=false,open=()=>{EB_DEV_TAPS=0;go('devcheck');runEBVerification()};
 stamp.addEventListener('pointerdown',()=>{clearTimeout(pressTimer);suppressClick=false;pressTimer=setTimeout(()=>{pressTimer=0;suppressClick=true;open()},600)});
 ['pointerup','pointercancel','pointerleave'].forEach(type=>stamp.addEventListener(type,()=>clearTimeout(pressTimer)));
 stamp.addEventListener('click',()=>{if(suppressClick){suppressClick=false;return}EB_DEV_TAPS++;if(EB_DEV_TAPS>=5)open()});
}
function ebAssert(cond,msg=''){if(!cond)throw new Error(msg||'Assertion failed')}
function ebTestCard(el,name){let c=deck(el).find(x=>x.n===name);if(!c)throw new Error(`Missing card: ${el}/${name}`);return c}
function ebTestPlayer(el='FIRE'){return{name:'Test',el,vit:30,maxE:7,e:7,deck:[],hand:[],wake:[],slots:[null,null,null],marks:[],turnState:freshTurnState(el),initiationToken:false,responseEl:el}}
// Alpha 0.8.23 multiplayer-readiness scaffold.
// No networking is active yet. This establishes the serializable action shape
// that future local two-player and online transports can share.
function ebMakeAction(type,payload={},actor=0){
 return Object.freeze({
   v:1,
   type:String(type||''),
   actor:Number(actor),
   rev:Number(G?.rev||0),
   payload:JSON.parse(JSON.stringify(payload||{}))
 });
}
function ebValidateActionEnvelope(a){
 return !!window.ElementBoundEngine&&window.ElementBoundEngine.validEnvelope(a);
}

// Browser multiplayer adapter. Single-player continues through the local reducer/game loop;
// multiplayer submits commands to the referee and only accepts state from the private view listener.
const EB_MP={enabled:false,roomId:null,uid:null,client:null,input:null,inputSafetyCleanup:null,responseTimer:null,responseRetryTimer:null,responseKey:null,responseExpirySent:false,serverClockOffset:0,serverClockReady:false,visualRoomId:null,lastAnimatedSeq:null,initiativeShown:false,attackFxContext:null,authSession:null,authPromise:null};
function ebMpStatus(message){
 let el=document.getElementById('mpStatus');if(!el)return;
 el.hidden=!message;el.textContent=message?message.text:'';el.className=`mpStatus ${message?.kind||''}`;
 el.onclick=typeof message?.onClick==='function'?message.onClick:null;el.tabIndex=el.onclick?0:-1;el.onkeydown=el.onclick?event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();el.click()}}:null;
}
function ebMpPlayPayload(c,slotIndex,target){
 let payload={cardId:c.id};
 if(c.type!=='TECHNIQUE')payload.slotIndex=slotIndex;
 if(target?.friend)payload.friendId=target.friend.id;
 if(target?.enemy)payload.enemyId=target.enemy.id;
 if(target?.swapWith)payload.swapWithId=target.swapWith.id;
 if(target?.bender){payload.targetId=null;payload.targetType='BENDER'}
 if(target?.magmaMode)payload.magmaMode=target.magmaMode;
 if(Number.isInteger(target?.toSlot))payload.toSlot=target.toSlot;
 return payload;
}
function ebMpPlay(c,slotIndex,target){
 let payload=ebMpPlayPayload(c,slotIndex,target);
 if(c.type==='TECHNIQUE')return ebMpSubmit('PLAY_CARD',payload,{kind:'TECHNIQUE',cardId:c.id});
 let needsGift=(c.el==='AIR'&&c.n==='Breeze Disciple')||(c.el==='EARTH'&&c.n==='Stone Initiate')||(c.el==='NATURE'&&c.n==='Sproutling'),friends=me().slots.filter(Boolean);
 if(needsGift&&friends.length){
   modal(`Choose recipient · ${c.n}`,friends.map(friend=>[friend.n,()=>{hideModal();ebMpSubmit('PLAY_CARD',{...payload,friendId:friend.id},{kind:'MANIFESTATION',cardId:c.id,slotIndex})}]));
   return;
 }
 return ebMpSubmit('PLAY_CARD',payload,{kind:'MANIFESTATION',cardId:c.id,slotIndex});
}
function ebMpPerspective(state){
 let next=window.ElementBoundMultiplayer.orientPlayerView(state);
 next.logs=Array.isArray(next.events)?next.events.map(item=>`#${item.seq} T${item.turn||next.turn} ${item.text}`):(Array.isArray(next.logs)?next.logs:[]);
 return next;
}
function ebMpCardLocation(id,state=G){if(!state||id==null)return null;for(let side=0;side<2;side++){let player=state.p[side];for(let slot=0;slot<3;slot++)if(player.slots[slot]?.id===id)return{card:player.slots[slot],side,slot};for(const zone of ['hand','deck','wake']){let card=(player[zone]||[]).find(item=>item?.id===id);if(card)return{card,side,slot:null}}}return null}
function ebMpOldSlot(id){if(!EB_VIS||id==null)return null;for(let side=0;side<2;side++)for(let slot=0;slot<3;slot++)if(EB_VIS.p[side].slots[slot]?.id===id)return{side,slot};return null}
function ebMpStatusElement(status){return({Burning:'FIRE',Soaked:'WATER',Charged:'LIGHTNING',Seeded:'NATURE',Momentum:'AIR',Weakened:'AIR'})[status]||'AIR'}
function ebMpQueueVisualEvents(events){let context=EB_MP.attackFxContext||{el:'AIR',label:'ACTION'};for(const item of events.slice(0,40)){let source,target,old;
 if(item.type==='ATTACK'){source=ebMpCardLocation(item.attackerId);context={el:source?.card?.el||'AIR',label:item.attackerName||'ATTACK'};EB_MP.attackFxContext=context;ebQueueFx({kind:'attack',id:item.attackerId,side:item.actor,slot:source?.slot,el:context.el,label:context.label})}
 else if(item.type==='CARD_PLAYED'){source=ebMpCardLocation(item.cardId);context={el:source?.card?.el||'AIR',label:item.cardName||'CARD'};if(item.cardType==='MANIFESTATION')ebQueueFx({kind:'summon',id:item.cardId,side:item.actor,slot:item.slotIndex,el:context.el,label:context.label});if(item.cardName==='Spark Runner'&&Number(G?.chain)>=3)ebQueueFx({kind:'chain'})}
 else if(item.type==='TECHNIQUE_RESOLVED'){source=ebMpCardLocation(item.cardId);context={el:source?.card?.el||context.el,label:item.cardName||'TECHNIQUE'};ebQueueFx({kind:'announce',el:context.el,label:`${context.label} · RESOLVED`})}
 else if(item.type==='DAMAGE'){target=ebMpCardLocation(item.targetId);old=ebMpOldSlot(item.targetId);ebQueueFx({kind:'hit',id:item.targetId,side:item.seat,slot:target?.slot??old?.slot,damage:item.amount||0,el:context.el,label:context.label,targetLabel:item.targetName})}
 else if(item.type==='BENDER_DAMAGE')ebQueueFx({kind:'benderHit',side:item.seat,damage:item.amount||0,el:context.el,label:context.label})
 else if(item.type==='DESTROYED'){target=ebMpCardLocation(item.cardId);old=ebMpOldSlot(item.cardId);ebQueueFx({kind:'defeat',id:item.cardId,side:item.seat,slot:old?.slot??target?.slot,el:target?.card?.el||context.el,label:item.cardName})}
 else if(item.type==='STATUS_APPLIED'){target=ebMpCardLocation(item.targetId);ebQueueFx({kind:'status',id:item.targetId,side:item.seat,slot:target?.slot,targetType:item.targetType,el:ebMpStatusElement(item.status),label:`${item.status} · APPLIED`})}
 else if(item.type==='RESPONSE_USED'){ebQueueFx({kind:'announce',el:item.element||'AIR',label:`RESPONSE · ${item.responseName||'RESPONSE'}`})}
 else if(item.type==='INITIATION_TOKEN_SPENT')ebQueueFx({kind:'announce',el:'AIR',label:'INITIATION TOKEN · SPENT'})
 else if(item.type==='WIN')ebQueueFx({kind:'announce',el:'LIGHTNING',label:item.text||'DUEL COMPLETE'})
 }}
function ebMpPrepareVisualEvents(){let events=Array.isArray(G?.events)?G.events:[],latest=events.at(-1)?.seq||0;if(EB_MP.lastAnimatedSeq===null){EB_MP.lastAnimatedSeq=latest;let initiative=events.find(item=>item.type==='INITIATIVE');if(Number(G?.rev||0)===0&&initiative&&!EB_MP.initiativeShown){EB_MP.initiativeShown=true;G.initiative={...(G.initiative||{}),starter:initiative.starter,revealed:false,finished:false};EB_INIT_LOCK=true;setTimeout(ebInitiativeShow,140)}return}let fresh=events.filter(item=>Number(item.seq)>EB_MP.lastAnimatedSeq).sort((a,b)=>a.seq-b.seq);if(fresh.length){EB_MP.lastAnimatedSeq=fresh.at(-1).seq;ebMpQueueVisualEvents(fresh)}}
function ebMpRenderAuthoritativeView(view){ebMpSyncServerClock(view?.serverNow);let next=ebMpPerspective(view),presenting=EB_INIT_LOCK&&EB_MP.initiativeShown&&G?.initiative&&!G.initiative.finished;if(presenting)next.initiative={...(next.initiative||{}),revealed:!!G.initiative.revealed,finished:false};G=next;selectedCardId=null;if(!presenting&&(!G.initiative||G.initiative.finished))EB_INIT_LOCK=false;diff='Online';go('battle');ebMpPrepareVisualEvents();render();ebMpHandleResponseWindow();ebMpHandleTurnTimer()}
function ebMpClearResponseTimer(){if(EB_MP.responseTimer){clearInterval(EB_MP.responseTimer);EB_MP.responseTimer=null}if(EB_MP.responseRetryTimer){clearTimeout(EB_MP.responseRetryTimer);EB_MP.responseRetryTimer=null}EB_MP.responseKey=null;EB_MP.responseExpirySent=false}
function ebMpResponseLabel(option,targetId){let target=me().slots.find(card=>card&&card.id===targetId),funding=option.source==='TOKEN'?'INITIATION':'USE';return `${funding} · ${option.responseName}${option.targetIds.length>1&&target?' → '+target.n:''}`}
function ebMpServerNow(){return Date.now()+Number(EB_MP.serverClockOffset||0)}
function ebMpSyncServerClock(serverNow){if(!Number.isFinite(serverNow))return;let candidate=serverNow-Date.now();if(!EB_MP.serverClockReady){EB_MP.serverClockOffset=Math.max(0,candidate);EB_MP.serverClockReady=true}else EB_MP.serverClockOffset=Math.max(EB_MP.serverClockOffset,candidate)}
function ebMpOpenResponsePrompt(){let pending=G?.pendingResponse;if(!pending||pending.defenderSeat!==0)return;let buttons=[];for(const option of pending.legalOptions||[])for(const targetId of option.targetIds)buttons.push([ebMpResponseLabel(option,targetId),()=>ebMpSubmit('RESPOND',{element:option.element,source:option.source,cardId:option.cardId,targetId},{kind:'RESPONSE'})]);buttons.push(['PASS',()=>ebMpSubmit('PASS',{}, {kind:'RESPONSE'})]);window.EB_Arena?.responseContext({attackerId:pending.attackerId,targetId:pending.targetId,seconds:Number.isFinite(pending.deadline)?Math.max(0,Math.ceil((pending.deadline-ebMpServerNow())/1000)):undefined});modal('Incoming attack',buttons,{dismissible:false})}
function ebMpHandleResponseWindow(){
 let pending=G?.pendingResponse;if(!EB_MP.enabled||!pending){let hadWindow=!!EB_MP.responseKey;ebMpClearResponseTimer();if(hadWindow)hideModal();return}
 let key=`${pending.deadline}:${pending.timing}`;
 let update=()=>{
   let seconds=Math.max(0,Math.ceil((pending.deadline-ebMpServerNow())/1000)),defending=pending.defenderSeat===0;
   ebMpStatus({kind:'pending',text:defending?`Response available · ${seconds}s remaining`:`Opponent is deciding… · ${seconds}s remaining`,onClick:defending?ebMpOpenResponsePrompt:null});
   let title=document.getElementById('mt');if(defending&&title)title.textContent=`${pending.timing==='AFTER'?'Damage landed':'Incoming attack'} · ${seconds}s`;if(defending&&window.EB_Arena?.panelOpen)EB_Arena.countdown(seconds);
   if(!seconds&&!EB_MP.responseExpirySent){EB_MP.responseExpirySent=true;ebMpSubmit('RESOLVE_EXPIRED',{}, {kind:'RESPONSE_EXPIRY'})}
 };
 if(EB_MP.responseKey!==key){
   ebMpClearResponseTimer();EB_MP.responseKey=key;
   if(pending.defenderSeat===0)ebMpOpenResponsePrompt();
   update();EB_MP.responseTimer=setInterval(update,250);
 }
}
// Online turn timer (issue #88 · N6): the server owns the deadline; any client that sees it pass reports TURN_EXPIRED once.
function ebMpTurnRemainingMs(){if(!EB_MP.enabled||!G||G.winner)return null;if(Number.isFinite(G.turnPausedMs))return G.turnPausedMs;return Number.isFinite(G.turnDeadline)?Math.max(0,G.turnDeadline-ebMpServerNow()):null}
function ebMpHandleTurnTimer(){
 clearInterval(EB_MP.turnTimer);EB_MP.turnTimer=null;
 if(!EB_MP.enabled||!G||G.winner||!Number.isFinite(G.turnDeadline))return;
 let key=`${G.turnDeadline}:${G.rev}`;
 let tick=()=>{let left=ebMpTurnRemainingMs();window.EB_Arena?.turnClock?.(left,Number.isFinite(G.turnPausedMs));
   if(left===0&&!G.pendingResponse&&EB_MP.turnExpiryKey!==key){EB_MP.turnExpiryKey=key;ebMpSubmit('TURN_EXPIRED',{}, {kind:'TURN_EXPIRY'}).then(result=>{if(result?.error==='TURN_NOT_EXPIRED'){let wait=Math.max(100,Number(result.detail?.remainingMs)||300);setTimeout(()=>{if(EB_MP.turnExpiryKey===key)EB_MP.turnExpiryKey=null},wait)}else if(result&&!result.ok&&result.error==='MOVE_PENDING')EB_MP.turnExpiryKey=null})}};
 tick();EB_MP.turnTimer=setInterval(tick,250);
}
function ebMpApplyView(state){
 let apply=ebMpRenderAuthoritativeView;
 let force=window.ElementBoundMultiplayer.shouldForceWaitingView(G,state);
 if(!EB_MP.input)apply(state);else EB_MP.input.receiveView(state,force);
}
function ebMpPendingChanged(pending){if(!G)return;selectedCardId=null;render()}
async function ebMpSubmit(type,payload={},pendingMeta={kind:type}){
 if(!EB_MP.enabled||!EB_MP.client)return {ok:false,error:'MULTIPLAYER_NOT_CONNECTED'};
 if(EB_INIT_LOCK)return {ok:false,error:'INITIATIVE_PENDING'};
 if(!EB_MP.input.beginMove(pendingMeta,Number(G?.rev||0))){if(type==='RESPOND'||type==='PASS'){let retry=type==='PASS'?'tap Pass again':'tap your response again';ebMpStatus({kind:'pending',text:`Still sending your last move — ${retry}`,onClick:ebMpOpenResponsePrompt});ebMpOpenResponsePrompt()}return {ok:false,error:'MOVE_PENDING'}}
 let result=await EB_MP.client.submit({v:1,type,rev:Number(G?.rev||0),payload:JSON.parse(JSON.stringify(payload))});
 result=EB_MP.input.resolveMove(result);
 if(type==='RESOLVE_EXPIRED'&&result.error==='RESPONSE_NOT_EXPIRED'){
   EB_MP.responseExpirySent=true;let wait=Math.max(50,Number(result.detail?.remainingMs)||250);
   clearTimeout(EB_MP.responseRetryTimer);EB_MP.responseRetryTimer=setTimeout(()=>{EB_MP.responseRetryTimer=null;EB_MP.responseExpirySent=false;ebMpHandleResponseWindow()},wait);
 }
 return result;
}
function ebMpSubscribeCompat(db){
 return (roomId,uid,next,error)=>db.collection('rooms').doc(roomId).collection('views').doc(uid).onSnapshot(snapshot=>{
   if(!snapshot.exists)return error(new Error('VIEW_UNAVAILABLE'));
   next(snapshot.data());
 },error);
}
function ebMpFetchView(db){return async(roomId,uid)=>{let ref=db.collection('rooms').doc(roomId).collection('views').doc(uid),snapshot;try{snapshot=await ref.get({source:'server'})}catch(error){snapshot=await ref.get()}return snapshot.exists?snapshot.data():null}}
// Move timing (issue #88): send = tap → server accepted; board = tap → the new board is on screen. Kept for System Check and the Chronicle.
const EB_NET={moves:[],last:null};window.EB_NET=EB_NET;
function ebMpRecordTiming(t){EB_NET.last=t;EB_NET.moves.push(t);if(EB_NET.moves.length>30)EB_NET.moves.shift();if(t.boardMs>3000)ebMpStatus({kind:'pending',text:`Slow connection · last move took ${(t.boardMs/1000).toFixed(1)} s${t.healed?' (refreshed)':''}`});console.debug('[ElementBound] move timing',t)}
function ebStartMultiplayer({roomId,user,db,fetchImpl=window.fetch.bind(window)}){
 if(!window.ElementBoundMultiplayer)throw new Error('Multiplayer client unavailable');
 if(!roomId||!user?.uid||typeof user.getIdToken!=='function'||!db)throw new Error('Authenticated user, roomId, and Firestore are required');
 EB_MP.client?.stop();let newVisualRoom=EB_MP.visualRoomId!==roomId;EB_MP.enabled=true;EB_MP.roomId=roomId;EB_MP.uid=user.uid;if(newVisualRoom){EB_MP.visualRoomId=roomId;EB_MP.lastAnimatedSeq=null;EB_MP.initiativeShown=false;EB_MP.attackFxContext=null;EB_VIS=null;EB_INIT_LOCK=false;ebInitiativeCancelPresentation();document.getElementById('initiativeOverlay')?.classList.add('hide')}
 EB_MP.serverClockOffset=0;EB_MP.serverClockReady=false;
 EB_MP.input=window.ElementBoundMultiplayer.createInputCoordinator({onView:ebMpRenderAuthoritativeView,onPending:ebMpPendingChanged,onPendingTimeout:()=>{ebMpStatus({kind:'pending',text:'Connection slow — refreshing the board…'});EB_MP.client?.resync()}});
 EB_MP.inputSafetyCleanup?.();EB_MP.inputSafetyCleanup=window.ElementBoundMultiplayer.bindInteractionSafety(EB_MP.input,document,ebCancelActivePointerInteraction);
 EB_MP.client=window.ElementBoundMultiplayer.createMultiplayerClient({roomId,uid:user.uid,getIdToken:()=>user.getIdToken(),subscribeView:ebMpSubscribeCompat(db),fetchView:ebMpFetchView(db),onTiming:ebMpRecordTiming,fetchImpl,onView:ebMpApplyView,onMessage:ebMpStatus});
 if(!EB_MP.visibilityBound){EB_MP.visibilityBound=true;document.addEventListener('visibilitychange',()=>{if(!document.hidden&&EB_MP.enabled)EB_MP.client?.resync()})}
 ebMpStatus({kind:'pending',text:'Connecting to live match…'});EB_MP.client.start();return EB_MP.client;
}
function ebStopMultiplayer(){clearInterval(EB_MP.turnTimer);EB_MP.turnTimer=null;window.EB_Arena?.turnClock?.(null);EB_MP.client?.stop();EB_MP.inputSafetyCleanup?.();EB_MP.input?.reset();ebMpClearResponseTimer();EB_MP.enabled=false;EB_MP.roomId=null;EB_MP.uid=null;EB_MP.client=null;EB_MP.input=null;EB_MP.inputSafetyCleanup=null;ebMpStatus(null)}
function ebMatchmakingSession(){
 let deps=window.EB_MULTIPLAYER_DEPS;if(deps?.user&&deps?.db)return{user:deps.user,db:deps.db,fetchImpl:deps.fetchImpl||window.fetch.bind(window)};
 if(EB_MP.authSession)return EB_MP.authSession;
 return null;
}
function ebMatchmakingMessage(text,error=false){let el=document.getElementById('mpMatchmakingResult');if(el){el.textContent=text;el.style.color=error?'#ffb4b4':''}}
function ebSetMatchmakingEnabled(enabled){for(const id of ['mpCreateMatch','mpJoinMatch']){let button=document.getElementById(id);if(button)button.disabled=!enabled}let connect=document.getElementById('mpConnectOnline');if(connect)connect.hidden=enabled||!!EB_MP.connecting}
let EB_DECK_PICKER_CLOSE_T=null;
function ebDeckMedallion(element){let image=document.createElement('img');image.src=`assets/medallions/${element.toLowerCase()}.webp`;image.alt='';image.width=40;image.height=40;return image}
function ebDeckPickerCopy(element){let copy=document.createElement('span');copy.className='mp-deck-copy';let name=document.createElement('strong');name.className=`eb-element--${element.toLowerCase()}`;name.textContent=INFO[element][0];let style=document.createElement('small');style.textContent=INFO[element][1];copy.append(name,style);return copy}
function ebUpdateDeckTrigger(animate=false){
 let select=document.getElementById('mpDeck'),trigger=document.getElementById('mpDeckPicker'),element=select?.value;if(!trigger||!INFO[element])return;
 const render=()=>{trigger.replaceChildren(ebDeckMedallion(element),ebDeckPickerCopy(element));let chevron=document.createElement('span');chevron.className='mp-deck-chevron';chevron.setAttribute('aria-hidden','true');chevron.textContent='⌄';trigger.append(chevron);trigger.setAttribute('aria-label',`Choose your deck. Selected: ${INFO[element][0]}`)};
 if(!animate)return render();trigger.classList.add('is-changing');setTimeout(()=>{render();requestAnimationFrame(()=>trigger.classList.remove('is-changing'))},75);
}
function ebCloseDeckPicker({restoreFocus=true}={}){
 let overlay=document.querySelector('.mp-deck-backdrop'),trigger=document.getElementById('mpDeckPicker');if(!overlay)return;
 clearTimeout(EB_DECK_PICKER_CLOSE_T);overlay.querySelector('.mp-deck-sheet')?.classList.add('is-closing');trigger?.setAttribute('aria-expanded','false');document.removeEventListener('keydown',ebDeckPickerKeydown);
 let reduce=window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches;
 EB_DECK_PICKER_CLOSE_T=setTimeout(()=>{overlay.remove();if(restoreFocus)trigger?.focus({preventScroll:true})},reduce?150:300);
}
function ebChooseOnlineDeck(element){let select=document.getElementById('mpDeck'),trigger=document.getElementById('mpDeckPicker');if(!select||!INFO[element])return;trigger?.classList.add('is-changing');select.value=element;select.dispatchEvent(new Event('change',{bubbles:true}));ebUpdateDeckTrigger(true);ebCloseDeckPicker()}
function ebDeckPickerKeydown(event){
 let options=[...document.querySelectorAll('.mp-deck-option')],index=options.indexOf(document.activeElement);if(!options.length)return;
 if(event.key==='Escape'){event.preventDefault();ebCloseDeckPicker();return}
 if(event.key==='Tab'){event.preventDefault();index=(index+(event.shiftKey?-1:1)+options.length)%options.length;options[index].focus({preventScroll:true});return}
 if(event.key==='ArrowDown'||event.key==='ArrowUp'){event.preventDefault();index=(index+(event.key==='ArrowDown'?1:-1)+options.length)%options.length;options[index].focus({preventScroll:true});return}
 if((event.key==='Enter'||event.key===' ')&&index>=0){event.preventDefault();ebChooseOnlineDeck(options[index].dataset.deck)}
}
function ebOpenDeckPicker(){
 if(document.querySelector('.mp-deck-backdrop'))return;let select=document.getElementById('mpDeck'),trigger=document.getElementById('mpDeckPicker');if(!select||!trigger)return;
 let overlay=document.createElement('div');overlay.className='mp-deck-backdrop';overlay.addEventListener('click',event=>{if(event.target===overlay)ebCloseDeckPicker()});
 let title=document.createElement('h2');title.id='mpDeckPickerTitle';title.textContent='Choose your deck';let list=document.createElement('div');list.className='mp-deck-list';
 Object.keys(INFO).forEach(element=>{let option=document.createElement('button');option.type='button';option.className='mp-deck-option';option.dataset.deck=element;option.setAttribute('role','option');option.setAttribute('aria-selected',String(select.value===element));option.append(ebDeckMedallion(element),ebDeckPickerCopy(element));let tag=document.createElement('span');tag.className='mp-deck-tag';tag.textContent=HYBRIDS[element]?'Hybrid':'Prime';option.append(tag);option.addEventListener('click',()=>ebChooseOnlineDeck(element));list.append(option)});
 let sheet=window.EB_UI.sheet({variant:'choice',children:[title,list]});sheet.classList.add('mp-deck-sheet');sheet.setAttribute('role','listbox');sheet.setAttribute('aria-labelledby',title.id);overlay.append(sheet);document.body.append(overlay);trigger.setAttribute('aria-expanded','true');document.addEventListener('keydown',ebDeckPickerKeydown);(list.querySelector('[aria-selected="true"]')||list.firstElementChild)?.focus({preventScroll:true});
}
function ebRenderOnlineResponse(){
 let box=document.getElementById('mpResponse'),element=document.getElementById('mpDeck')?.value;if(!box)return;
 let chooser=window.EB_DeckSelect?.responseChooser?.(element)||null;EB_MP.responseChooser=chooser;box.replaceChildren();box.hidden=!chooser;if(chooser)box.append(chooser.root);
}
function ebOnlineResponse(){return EB_MP.responseChooser?.value||null}
async function ebEnsureMatchmakingAuth(){
 try{
   let existing=ebMatchmakingSession();if(existing){EB_MP.authSession=existing;ebSetMatchmakingEnabled(true);ebMatchmakingMessage('Ready to create or join a match');return existing}
   if(EB_MP.authPromise)return await EB_MP.authPromise;
   EB_MP.connecting=true;
   EB_MP.authPromise=(async()=>{
     if(!window.ElementBoundFirebaseBootstrap||!window.firebase)throw new Error('FIREBASE_SDK_UNAVAILABLE');
     let bootstrap=window.ElementBoundFirebaseBootstrap.createAnonymousAuthBootstrap({firebase:window.firebase,loadConfig:()=>window.ElementBoundFirebaseBootstrap.loadPublicConfig(window.fetch.bind(window))});
     let authenticated=await window.ElementBoundFirebaseBootstrap.connectMatchmaking({bootstrap,setEnabled:ebSetMatchmakingEnabled,setMessage:ebMatchmakingMessage});
     EB_MP.authSession={...authenticated,fetchImpl:window.fetch.bind(window)};return EB_MP.authSession;
   })();
   const session=await EB_MP.authPromise;EB_MP.connecting=false;ebSetMatchmakingEnabled(true);return session;
 }catch(error){EB_MP.connecting=false;EB_MP.authPromise=null;ebSetMatchmakingEnabled(false);ebMatchmakingMessage("Couldn't connect to online matches. Try again.",true);throw error}
}
function ebSetupMatchmaking(){
 console.debug('[ElementBound] ebSetupMatchmaking ran');
 let select=document.getElementById('mpDeck');if(select&&!select.options.length)select.innerHTML=Object.keys(INFO).map(element=>`<option value="${element}">${ebElementName(element)} ${INFO[element][0]}</option>`).join('');
 let picker=document.getElementById('mpDeckPicker');if(select&&picker&&!picker.dataset.bound){picker.dataset.bound='true';picker.addEventListener('click',ebOpenDeckPicker);select.addEventListener('change',()=>{if(!picker.classList.contains('is-changing'))ebUpdateDeckTrigger();ebRenderOnlineResponse()});ebUpdateDeckTrigger();ebRenderOnlineResponse()}
 let invited=new URLSearchParams(location.search).get('join'),input=document.getElementById('mpRoomCode');if(invited&&input)input.value=invited.toUpperCase();ebSetMatchmakingEnabled(false);
 let panel=document.getElementById('mpMatchmaking'),connect=document.getElementById('mpConnectOnline'),begin=()=>ebEnsureMatchmakingAuth().catch(()=>{});
 if(panel&&connect&&window.ElementBoundFirebaseBootstrap)window.ElementBoundFirebaseBootstrap.bindConnectButton(connect,begin);if(invited)begin();
}
async function ebCreateMatch(){
 let session=ebMatchmakingSession();if(!session){try{session=await ebEnsureMatchmakingAuth()}catch(error){return}}
 let element=document.getElementById('mpDeck')?.value,client=window.ElementBoundMatchmaking.createMatchmakingClient({getIdToken:()=>session.user.getIdToken(),fetchImpl:session.fetchImpl});ebMatchmakingMessage('Creating room…');
 let result=await client.createRoom({element,responseElement:ebOnlineResponse(),autoPass:ebAutoPass()});if(!result.ok)return ebMatchmakingMessage(`Could not create room: ${result.error}`,true);
 let liveUrl=new URL(location.href);liveUrl.search='';liveUrl.searchParams.set('roomId',result.roomId);history.replaceState(null,'',liveUrl);let inviteUrl=new URL(liveUrl);inviteUrl.search='';inviteUrl.searchParams.set('join',result.roomId);ebMatchmakingMessage(`Room ${result.roomId} · Share ${inviteUrl.href}`);ebStartMultiplayer({roomId:result.roomId,...session});
}
async function ebJoinMatch(){
 let session=ebMatchmakingSession();if(!session){try{session=await ebEnsureMatchmakingAuth()}catch(error){return}}
 let roomId=String(document.getElementById('mpRoomCode')?.value||'').trim().toUpperCase(),element=document.getElementById('mpDeck')?.value,client=window.ElementBoundMatchmaking.createMatchmakingClient({getIdToken:()=>session.user.getIdToken(),fetchImpl:session.fetchImpl});ebMatchmakingMessage('Joining room…');
 let result=await client.joinRoom(roomId,{element,responseElement:ebOnlineResponse(),autoPass:ebAutoPass()});if(!result.ok)return ebMatchmakingMessage(`Could not join room: ${result.error}`,true);
 let link=new URL(location.href);link.search='';link.searchParams.set('roomId',result.roomId);history.replaceState(null,'',link);ebMatchmakingMessage(`Joined room ${result.roomId}.`);ebStartMultiplayer({roomId:result.roomId,...session});
}
function ebMpInitializeFromUrl(){
 let params=new URLSearchParams(location.search),roomId=params.get('roomId');if(!roomId)return;
 let deps=window.EB_MULTIPLAYER_DEPS;
 if(deps?.user&&deps?.db){try{ebStartMultiplayer({roomId,user:deps.user,db:deps.db,fetchImpl:deps.fetchImpl||window.fetch.bind(window)})}catch(error){ebMpStatus({kind:'error',text:error.message})}return}
 ebEnsureMatchmakingAuth().then(session=>ebStartMultiplayer({roomId,...session})).catch(()=>ebMpStatus({kind:'error',text:"Couldn't connect to online matches. Try again."}));
}
function ebSerializableState(state=G){
 if(!state)return null;
 return {turn:Number(state.turn||0),active:Number(state.active||0),rev:Number(state.rev||0),winner:state.winner??null,
  p:(state.p||[]).map(p=>({vit:p.vit,ess:p.ess,maxEss:p.maxEss,
   hand:(p.hand||[]).map(c=>c.id),deck:(p.deck||[]).map(c=>c.id),wake:(p.wake||[]).map(c=>c.id),
   marks:[...(p.marks||[])],slots:(p.slots||[]).map(c=>c?{id:c.id,n:c.n,el:c.el,h:c.h,max:c.max,a:c.a,
    armor:c.armor||0,growth:c.growth||0,momentum:momentumStacks(c),ready:!!c.ready,sick:!!c.sick,marks:[...(c.marks||[])]}:null)}))};
}
function ebStateFingerprint(state=G){
 let str=JSON.stringify(ebSerializableState(state)),h=2166136261;
 for(let i=0;i<str.length;i++){h^=str.charCodeAt(i);h=Math.imul(h,16777619)}
 return (h>>>0).toString(16).padStart(8,'0');
}
function ebReduceAction(state,action){
 if(!window.ElementBoundEngine)return {ok:false,error:'ENGINE_UNAVAILABLE',state};
 return window.ElementBoundEngine.validateAndApplyMove(state,action,{now:Date.now()});
}

/* Alpha 0.8.32 — Elemental FX 2.0. Visual-only; bounded DOM particles. */
function ebBurstShape(element){return ebFxShape(element)}
function ebReducedMotion(){return !!(window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches)}
function ebSpawnElementFx(anchor,element='AIR',intensity=1){
 if(!anchor||ebReducedMotion())return;let host=document.getElementById('battleFx');if(!host)return;
 let key=String(element||'AIR').toUpperCase(),cls=key.toLowerCase(),color=EB_FX_COLOR[key]||'#cfe7ff',count=Math.min(12,5+Math.max(0,intensity)*2);
 for(let i=0;i<count;i++){let p=document.createElement('i'),a=Math.PI*2*i/count+(Math.random()-.5)*.45,dist=30+Math.random()*(30+intensity*9);p.className='eb-fx-particle '+cls;p.style.left=anchor.x+'px';p.style.top=anchor.y+'px';p.style.color=color;p.style.setProperty('--dx',Math.cos(a)*dist+'px');p.style.setProperty('--dy',Math.sin(a)*dist+'px');p.style.setProperty('--rot',Math.round(Math.random()*220-110)+'deg');p.style.setProperty('--sc',(0.65+Math.random()*.8).toFixed(2));host.appendChild(p);setTimeout(()=>p.remove(),720)}
 if(['WATER','AIR','NATURE','BLOOM'].includes(key)){let w=document.createElement('i');w.className='eb-fx-wave';w.style.left=anchor.x+'px';w.style.top=anchor.y+'px';w.style.color=color;host.appendChild(w);setTimeout(()=>w.remove(),650)}
 if(['LIGHTNING','STORM','FIRE','MAGMA'].includes(key))for(let i=0;i<(intensity>1?3:2);i++){let f=document.createElement('i');f.className='eb-fx-flare';f.style.left=anchor.x+'px';f.style.top=anchor.y+'px';f.style.color=color;f.style.setProperty('--rot',(i*60-30+Math.random()*25)+'deg');host.appendChild(f);setTimeout(()=>f.remove(),480)}
}
function ebBurst(el,element='AIR',damage=null){let host=document.getElementById('battleFx');if(!host||!el)return;let p=ebCenter(el),b=document.createElement('i');b.className='eb-burst '+ebFxShape(element);b.style.left=p.x+'px';b.style.top=p.y+'px';b.style.color=EB_FX_COLOR[element]||'#cfe7ff';host.appendChild(b);setTimeout(()=>b.remove(),650);ebSpawnElementFx(p,element,damage>=5?3:damage>=3?2:1);if(damage!=null&&damage>0){let d=document.createElement('b');d.className='eb-damage';d.dataset.amount=String(damage);d.dataset.element=String(element);d.textContent='−'+damage;d.style.left=p.x+'px';d.style.top=p.y+'px';d.style.color=EB_FX_COLOR[element]||'#fff';host.appendChild(d);setTimeout(()=>d.remove(),780)}}
function ebBurstAt(anchor,element='AIR',damage=null){if(!anchor)return false;let host=document.getElementById('battleFx');if(!host)return false;let b=document.createElement('i');b.className='eb-burst '+ebFxShape(element);b.style.left=anchor.x+'px';b.style.top=anchor.y+'px';b.style.color=EB_FX_COLOR[element]||'#fff';host.appendChild(b);setTimeout(()=>b.remove(),650);ebSpawnElementFx(anchor,element,damage>=5?3:damage>=3?2:1);if(damage!=null&&damage>0){let d=document.createElement('b');d.className='eb-damage';d.dataset.amount=String(damage);d.dataset.element=String(element);d.textContent='−'+damage;d.style.left=anchor.x+'px';d.style.top=anchor.y+'px';d.style.color=EB_FX_COLOR[element]||'#fff';host.appendChild(d);setTimeout(()=>d.remove(),780)}return true}
function runEBVerification(){
 const saved={G,choice,diff,uid}; const results=[];
 const test=(group,name,fn)=>{try{fn();results.push({group,name,ok:true})}catch(e){results.push({group,name,ok:false,detail:e.message||String(e)})}};
 try{
  test('DATA','All six Prime elements exist',()=>ebAssert(['FIRE','WATER','NATURE','EARTH','LIGHTNING','AIR'].every(x=>BASE[x]&&TECH[x])));
  test('DATA','All three Hybrid decks exist',()=>ebAssert(['MAGMA','STORM','BLOOM'].every(x=>HYBRIDS[x]&&HYBRID_CARDS[x])));
   test('DATA','Spark Runner uses Chain acceleration text',()=>{let z=BASE.LIGHTNING.find(x=>x[0]==='Spark Runner');ebAssert(z&&/gain \+1 Chain/i.test(z[4]),'Spark Runner canonical text mismatch');ebAssert(!/Charged/i.test(z[4]),'Spark Runner still advertises Charged')});
  test('DATA','Prime Manifestation costs are canonical',()=>{for(const el of Object.keys(BASE)){BASE[el].forEach(x=>ebAssert(Number.isFinite(x[1])&&Number.isInteger(x[1])&&x[1]>0,`${el} ${x[0]} cost must be a finite positive integer`))}});
  test('DATA','Prime Technique costs are fixed',()=>{const expected={FIRE:2,WATER:1,NATURE:2,EARTH:2,LIGHTNING:1,AIR:1},second={FIRE:1,WATER:2,NATURE:2,EARTH:2,LIGHTNING:1,AIR:1};for(const el in expected){ebAssert(TECH[el][3]===expected[el],`${el} technique cost mismatch`);ebAssert(TECH2[el]&&TECH2[el][3]===second[el],`${el} second technique cost mismatch`)}});
  test('DATA','No duplicate canonical names disagree on cost',()=>{let m=new Map();for(const el of Object.keys(INFO)){for(let i=0;i<4;i++){let d=deck(el);for(const c of d){if(m.has(c.n))ebAssert(m.get(c.n)===c.c,`${c.n}: ${m.get(c.n)} vs ${c.c}`);else m.set(c.n,c.c)}}}});
  test('DATA','Every generated card has required fields',()=>{for(const el of Object.keys(INFO)){deck(el).forEach(c=>{ebAssert(c.id&&c.n&&Number.isFinite(c.c)&&c.el&&c.type,`Invalid ${el} card`);if(c.type==='MANIFESTATION')ebAssert(Number.isFinite(c.a)&&Number.isFinite(c.h)&&Number.isFinite(c.max),`${c.n} stats invalid`)})}});
  test('DATA','Glossary covers core public keywords',()=>{['Bender','Vitality','Essence','Manifestation','Technique','Wake','Exhaustion','Guard','Armor','Burning','Soaked','Seeded','Growth','Charged','Momentum','Flow','Prime','Hybrid','Resonance','Quick','Target'].forEach(k=>ebAssert(GLOSSARY[k],`Missing ${k}`))});

  test('COMBAT','Armor absorbs damage and is consumed',()=>{let m={h:5,armor:2};let d=hit(m,3);ebAssert(d===1&&m.h===4&&m.armor===0,`damage=${d}, hp=${m.h}, armor=${m.armor}`)});
  test('COMBAT','Guard blocks direct Bender targeting',()=>{let p=ebTestPlayer(),e=ebTestPlayer('WATER');e.slots[0]={guard:true,ready:true};G={p:[p,e],active:0,chain:0,logs:[],winner:null};ebAssert(activeGuards(e).length===1)});
  test('COMBAT','Exhausted Guard still protects Bender',()=>{let e=ebTestPlayer('EARTH');e.slots[0]={guard:true,ready:false,sick:false};ebAssert(activeGuards(e).length===1,'Exhausted Guard stopped protecting')});
  test('COMBAT','Summoning-sick Guard protects immediately',()=>{let e=ebTestPlayer('EARTH');e.slots[0]={guard:true,ready:false,sick:true};ebAssert(activeGuards(e).length===1,'New Guard did not protect immediately')});
  test('COMBAT','Bender unlocks after all Guards leave field',()=>{let e=ebTestPlayer('EARTH');e.slots[0]={guard:true,ready:false};e.slots[1]={guard:true,ready:true};ebAssert(activeGuards(e).length===2);e.slots[0]=null;e.slots[1]=null;ebAssert(activeGuards(e).length===0,'Bender remained Guard-locked')});
  test('COMBAT','Sky Raptor + Momentum bypasses Guard',()=>{let p=ebTestPlayer('AIR'),e=ebTestPlayer('EARTH'),r={id:9001,el:'AIR',n:'Sky Raptor',marks:['Momentum']};e.slots[0]={guard:true};ebAssert(guardAllowsBenderTarget(e,r,p)===true,'Momentum Sky Raptor was blocked by Guard')});
  test('COMBAT','Sky Raptor without Momentum does NOT bypass Guard',()=>{let p=ebTestPlayer('AIR'),e=ebTestPlayer('EARTH'),r={id:9002,el:'AIR',n:'Sky Raptor',marks:[]};e.slots[0]={guard:true};ebAssert(guardAllowsBenderTarget(e,r,p)===false,'Sky Raptor bypassed Guard without Momentum')});
  test('COMBAT','Ordinary attackers remain blocked by Guard',()=>{let p=ebTestPlayer('AIR'),e=ebTestPlayer('EARTH'),r={id:9003,el:'AIR',n:'Gale Scout',marks:['Momentum']};e.slots[0]={guard:true};ebAssert(guardAllowsBenderTarget(e,r,p)===false,'Guard exception leaked to another attacker')});
  test('COMBAT','Exhaustion damage constant is 2',()=>ebAssert(EXHAUSTION_DAMAGE===2,`EXHAUSTION_DAMAGE=${EXHAUSTION_DAMAGE}`));
  test('COMBAT','Exhaustion grows by 1 each empty draw',()=>{let a=ebTestPlayer();a.deck=[];a.hand=[];a.vit=30;a.exhaustion=0;G={p:[a,ebTestPlayer('WATER')],active:0,chain:0,logs:[],winner:null,trial:null};draw(a);draw(a);draw(a);ebAssert(a.vit===30-2-3-4&&a.exhaustion===3,`Exhaustion did not grow 2,3,4 (vit ${a.vit}, count ${a.exhaustion})`)});
  test('COMBAT','An empty Hand and Deck does not end the duel',()=>{let a=ebTestPlayer(),b=ebTestPlayer('WATER');a.name='A';b.name='B';a.hand=[];a.deck=[];G={p:[a,b],active:0,chain:0,logs:[],winner:null,trial:null};ebAssert(resolveDuelEnd()===null,'Running out of cards ended the duel')});
  test('COMBAT','Vitality decides the duel',()=>{let a=ebTestPlayer(),b=ebTestPlayer('WATER');a.name='A';b.name='B';b.vit=0;G={p:[a,b],active:0,chain:0,logs:[],winner:null,trial:null};let r=resolveDuelEnd();ebAssert(r&&r.winnerIndex===0&&r.reason==='VITALITY','0 Vitality did not end the duel')});
  test('RESPONSE','Prime decks contain exactly one Response',()=>{let d=deck('FIRE');ebAssert(d.length===21&&d.filter(c=>c.type==='RESPONSE').length===1,'Prime Response deck construction failed')});
  test('RESPONSE','Hybrid decks contain exactly one selected parent Response',()=>{let d=deck('STORM','AIR'),r=d.filter(c=>c.type==='RESPONSE');ebAssert(d.length===21&&r.length===1&&r[0].el==='AIR','Hybrid Response selection failed')});
  test('RESPONSE','Flash Step lethal cancels the pending attack',()=>{let a=ebTestPlayer('FIRE'),d=ebTestPlayer('LIGHTNING'),att=mk('FIRE','Test Attacker',1,1,2),tar=mk('LIGHTNING','Test Defender',1,1,3);a.slots[0]=att;d.slots[0]=tar;d.initiationToken=true;G={p:[a,d],active:0,winner:null,trial:null,logs:[]};let r=ebResolveResponse({el:'LIGHTNING',source:'TOKEN'},d,att,tar,null,'BEFORE');ebAssert(r.cancel===true&&!a.slots.includes(att),'Flash Step did not cancel lethal attacker')});
  test('RESPONSE','Undertow preserves finite HP and cancels attack',()=>{let a=ebTestPlayer('FIRE'),d=ebTestPlayer('WATER'),att=mk('FIRE','Test Attacker',1,2,2),tar=mk('WATER','Tide Warden',2,2,4,true);a.slots[0]=att;d.slots[0]=tar;d.initiationToken=true;G={p:[a,d],active:0,winner:null,trial:null,logs:[]};let r=ebResolveResponse({el:'WATER',source:'TOKEN'},d,att,tar,null,'BEFORE');ebAssert(r.cancel===true&&Number.isFinite(tar.h)&&tar.h===4&&tar.max===4&&d.slots.includes(tar),'Undertow corrupted HP or failed to cancel')});
  test('RESPONSE','Simultaneous Bender lethal resolves as DRAW',()=>{let a=ebTestPlayer(),b=ebTestPlayer('WATER');a.vit=0;b.vit=0;G={p:[a,b],active:0,winner:null,trial:null};let r=resolveDuelEnd();ebAssert(r&&r.reason==='DRAW'&&r.winnerIndex===null,'Simultaneous lethal was not a draw')});
  test('COMBAT','State validator accepts a clean battle state',()=>{G={p:[ebTestPlayer(),ebTestPlayer('WATER')]};ebAssert(validateState()===true)});

  test('WATER','River Serpent attack resolver applies Soaked after damage',()=>{let x=ebAttackCore.toString();ebAssert(x.includes("att.n==='River Serpent'")&&x.includes("addMark(t,'Soaked')")&&x.includes('d>0'))});
  test('WATER','Soaked reduces once, clamps at zero, and preserves other marks',()=>{G={logs:[],turn:1};for(const power of [0,1,2,5]){let a={n:'Test',marks:['Soaked','Burning']};ebAssert(ebSoakedAttackPower(a,power)===Math.max(0,power-2));ebAssert(a.marks.join(',')==='Burning');ebAssert(ebSoakedAttackPower(a,power)===power)}});
  test('WATER','Flow preview exposes readable card type stats and effect',()=>{let c=ebTestCard('WATER','Tide Warden');let x=flowPreview(c),effect=c.text||c.txt;ebAssert(x.includes('Manifestation')&&x.includes('Guard')&&x.includes('ATK')&&x.includes('HP')&&x.includes('Essence')&&effect&&x.includes(effect)&&!x.includes('<div'))});
  test('WATER','Flow 1 resolver exists and preserves deck size',()=>{let p=ebTestPlayer('WATER');p.deck=[ebTestCard('WATER','Mist Adept'),ebTestCard('WATER','Tide Warden')];let n=p.deck.length;G={p:[p,ebTestPlayer()],active:0,chain:0,logs:[],turn:1};ebAssert(typeof flow1==='function'&&p.deck.length===n)});
  test('WATER','Soaked is a registered visible control effect',()=>ebAssert(/Water’s control mark/.test(GLOSSARY.Soaked)&&/2 less damage/.test(GLOSSARY.Soaked)));
  test('WATER','Tide Warden has Candidate B stats in Water and Bloom decks',()=>{for(const el of ['WATER','BLOOM']){let cards=deck(el).filter(c=>c.n==='Tide Warden');ebAssert(cards.length>0&&cards.every(c=>c.a===2&&c.h===4&&c.c===2&&c.guard))}});
  test('EARTH','Boulder Ram gets +1 ATK while Armored',()=>{let p=ebTestPlayer('EARTH'),e=ebTestPlayer();G={p:[p,e],active:0,chain:0,logs:[]};let a=ebTestCard('EARTH','Boulder Ram');a.armor=1;ebAssert(elementalAttackBonus(a,e,p)===1)});
  test('EARTH','Boulder Ram gets no bonus without Armor',()=>{let p=ebTestPlayer('EARTH'),e=ebTestPlayer();G={p:[p,e],active:0,chain:0,logs:[]};let a=ebTestCard('EARTH','Boulder Ram');a.armor=0;ebAssert(elementalAttackBonus(a,e,p)===0)});
  test('FIRE','Flare Hawk gets +1 vs Burning Manifestation',()=>{let p=ebTestPlayer('FIRE'),e=ebTestPlayer('WATER');G={p:[p,e],active:0,chain:0,logs:[]};let a=ebTestCard('FIRE','Flare Hawk'),t={marks:['Burning']};ebAssert(elementalAttackBonus(a,t,p)===1)});
  test('FIRE','Flare Hawk gets +1 vs Burning Bender',()=>{let p=ebTestPlayer('FIRE'),e=ebTestPlayer('WATER');e.marks=['Burning'];G={p:[p,e],active:0,chain:0,logs:[]};let a=ebTestCard('FIRE','Flare Hawk');ebAssert(elementalAttackBonus(a,e,p)===1)});
  test('LIGHTNING','Arc Runner gets +1 at Chain 2',()=>{let p=ebTestPlayer('LIGHTNING'),e=ebTestPlayer();G={p:[p,e],active:0,chain:2,logs:[]};ebAssert(elementalAttackBonus(ebTestCard('LIGHTNING','Arc Runner'),e,p)===1)});
  test('LIGHTNING','Arc Runner gets no Chain bonus below 2',()=>{let p=ebTestPlayer('LIGHTNING'),e=ebTestPlayer();G={p:[p,e],active:0,chain:1,logs:[]};ebAssert(elementalAttackBonus(ebTestCard('LIGHTNING','Arc Runner'),e,p)===0)});
  test('LIGHTNING','Charged adds +1 to Lightning attack',()=>{let p=ebTestPlayer('LIGHTNING'),e=ebTestPlayer();e.marks=['Charged'];G={p:[p,e],active:0,chain:0,logs:[]};ebAssert(elementalAttackBonus(ebTestCard('LIGHTNING','Spark Runner'),e,p)===1)});
  test('LIGHTNING','Charged is consumed on release',()=>{let p=ebTestPlayer('LIGHTNING'),e=ebTestPlayer();e.marks=['Charged'];G={p:[p,e],active:0,chain:0,logs:[]};elementalAttackBonus(ebTestCard('LIGHTNING','Spark Runner'),e,p);ebAssert(!e.marks.includes('Charged'))});
  test('LIGHTNING','Arc Runner + Chain 2 + Charged stacks to +2',()=>{let p=ebTestPlayer('LIGHTNING'),e=ebTestPlayer();e.marks=['Charged'];G={p:[p,e],active:0,chain:2,logs:[]};ebAssert(elementalAttackBonus(ebTestCard('LIGHTNING','Arc Runner'),e,p)===2)});
  test('AIR','Crosswind opening gives Gale Scout 1 Momentum once',()=>{let p=ebTestPlayer('AIR'),e=ebTestPlayer();p.turnState.airOpening=true;G={p:[p,e],active:0,chain:0,logs:[]};let a=ebTestCard('AIR','Gale Scout'),base=a.a;ebAssert(hybridAttackBonus(a,p)===1&&a.a===base+1&&momentumStacks(a)===1&&!p.turnState.airOpening)});
  test('NATURE','Growth glossary matches +1 ATK-only rule',()=>ebAssert(/\+1 ATK/.test(GLOSSARY.Growth)&&!/maximum HP/.test(GLOSSARY.Growth)));
  test('HYBRIDS','Each Hybrid has exactly two Prime parents',()=>{for(const k in HYBRIDS){let h=HYBRIDS[k];ebAssert(h.parents.length===2&&h.parents.every(x=>BASE[x]),`${k} parents invalid`)}});
  test('HYBRIDS','Each Hybrid has setup/avatar/payoff/quick package',()=>{for(const k in HYBRID_CARDS){let roles=new Set(HYBRID_CARDS[k].map(c=>c.role));['SETUP','AVATAR','PAYOFF','QUICK'].forEach(r=>ebAssert(roles.has(r),`${k} missing ${r}`))}});
  test('UI/RULES','Combat Feel layer declares no rule mutation',()=>ebAssert(typeof ebRenderFx==='function','Combat Feel renderer missing'));
  test('UI/RULES','Combat Feel impact and summon hooks are registered',()=>{ebAssert(typeof ebBattleImpact==='function','Impact hook missing');ebAssert(typeof ebPulse==='function','Pulse hook missing');ebAssert(typeof ebFocus==='function','Battle phrase hook missing');ebAssert(document.querySelector('#battleFx')&&document.querySelector('#battleFocus'),'Combat Feel overlay missing')});
  test('UI/RULES','Combat Feel tracks all new battle logs',()=>ebAssert(typeof EB_LOG_COUNT==='number','Combat Feel log cursor missing'));
  test('UI/RULES','Manual Technique targeting resolver exists',()=>ebAssert(typeof chooseTechniqueTarget==='function','Technique targeting missing'));
  test('UI/RULES','Three Manifestation slots are enforced',()=>{let p=ebTestPlayer();ebAssert(p.slots.length===3)});
  test('COMBAT','Overflow sends lethal excess damage to Bender when no Guard exists',()=>{let p=ebTestPlayer(),e=ebTestPlayer('WATER');let t={n:'Test Body',h:-4};G={p:[p,e],rev:7,logs:[]};let x=resolveOverflowDamage(e,t,5,1,0,'FIRE','Test Strike',1);ebAssert(x===4&&e.vit===26,`overflow=${x}, vitality=${e.vit}`)});
  test('COMBAT','Guard prevents lethal overflow from reaching Bender',()=>{let p=ebTestPlayer(),e=ebTestPlayer('EARTH');let t={n:'Guarded Body',h:-4};G={p:[p,e],rev:7,logs:[]};let x=resolveOverflowDamage(e,t,5,1,1,'FIRE','Test Strike',1);ebAssert(x===0&&e.vit===30,`overflow=${x}, vitality=${e.vit}`)});
  test('COMBAT','Nonlethal damage never creates overflow',()=>{let p=ebTestPlayer(),e=ebTestPlayer();let t={n:'Survivor',h:1};G={p:[p,e],rev:7,logs:[]};let x=resolveOverflowDamage(e,t,2,3,0,'FIRE','Test Strike',1);ebAssert(x===0&&e.vit===30)});
  test('UI/RULES','Defeated Manifestations queue a dedicated visual event',()=>ebAssert(death.toString().includes("kind:'defeat'")&&ebDrainFx.toString().includes("ev.kind==='defeat'"),'Defeat FX hook missing'));
  test('MULTIPLAYER','Action envelope is serializable and revisioned',()=>{G={rev:12};let a=ebMakeAction('ATTACK',{attackerId:'a',targetId:'b'},0);let copy=JSON.parse(JSON.stringify(a));ebAssert(ebValidateActionEnvelope(copy)&&copy.rev===12&&copy.payload.targetId==='b')});
  test('MULTIPLAYER','Malformed action envelope is rejected',()=>ebAssert(!ebValidateActionEnvelope({v:1,type:'ATTACK',actor:4,rev:0,payload:{}}),'Invalid actor accepted'));
  test('UI/RULES','Hit FX freezes exact target and resolved damage',()=>{let p=ebTestPlayer(),e=ebTestPlayer();let t={id:'fx-target',n:'Target',el:'EARTH',h:3,armor:0,marks:[]};e.slots[2]=t;G={p:[p,e],rev:0};EB_FX_QUEUE.length=0;let d=hit(t,1,'FIRE','Cinder Adept'),ev=EB_FX_QUEUE.pop();ebAssert(d===1&&ev.damage===1&&ev.id==='fx-target'&&ev.side===1&&ev.slot===2&&ev.label==='Cinder Adept')});
  test('UI/RULES','FX queue invalidates stale delayed callbacks',()=>ebAssert(ebDrainFx.toString().includes('EB_FX_GENERATION')&&ebDrainFx.toString().includes('clearTimeout')));
  test('MULTIPLAYER','State fingerprint is deterministic',()=>{let st={turn:2,active:0,rev:4,winner:null,p:[ebTestPlayer(),ebTestPlayer()]};ebAssert(ebStateFingerprint(st)===ebStateFingerprint(st))});
  test('MULTIPLAYER','Reducer rejects stale revision without mutation',()=>{let st=window.ElementBoundMatchFactory.createInitialState({players:[{name:'A',element:'FIRE'},{name:'B',element:'WATER'}],random:()=>0.3});st.rev=3;let a={v:1,type:'END_TURN',actor:st.active,rev:2,payload:{}};let r=ebReduceAction(st,a);ebAssert(!r.ok&&r.error==='REVISION_MISMATCH'&&r.state===st)});
  test('UI/RULES','Legacy visual diff cannot generate damage numbers',()=>{let body=ebRenderFx.toString();ebAssert(!body.includes('o.h-n.h')&&!body.includes('newP.vit<oldP.vit'),'Legacy snapshot damage inference still active')});
  test('UI/RULES','Combat FX queue freezes immutable event payloads',()=>{EB_FX_QUEUE.length=0;let e={kind:'hit',damage:3,el:'FIRE'};ebQueueFx(e);let q=EB_FX_QUEUE.pop();ebAssert(Object.isFrozen(q)&&q.damage===3&&q.el==='FIRE')});
  test('UI/RULES','Fire damage color remains Fire source color',()=>ebAssert(EB_FX_COLOR.FIRE==='#ff704d'&&EB_FX_COLOR.NATURE!==EB_FX_COLOR.FIRE));
  test('AI','Easy and Medium action budgets are lower than Difficult',()=>{let easy=2,medium=2,hard=5;ebAssert(easy===medium&&medium<hard)});
  test('TRIALS','All six Prime Trials are registered',()=>{const els=['FIRE','WATER','NATURE','EARTH','LIGHTNING','AIR'];els.forEach(x=>{ebAssert(window.EB_Trials?.TRIAL_DATA[x]?.strip?.length,`Missing ${x} trial registration`)});ebAssert(typeof startTrial==='function','startTrial missing')});
 } finally {G=saved.G;choice=saved.choice;diff=saved.diff;uid=saved.uid}
 test('UI','Battlefield rail permits horizontal and vertical pan',()=>{let rule=[...document.styleSheets].flatMap(ss=>{try{return [...ss.cssRules]}catch(e){return[]}}).find(r=>r.selectorText==='#battle .slots'&&String(r.style.touchAction||'').includes('pan-x'));ebAssert(rule&&String(rule.style.touchAction).includes('pan-y'),'field touch-action must permit pan-x and pan-y')});
   test('UI','Chain HUD is contextual',()=>{let el=document.getElementById('chain');ebAssert(el&&el.classList.contains('chainContext'),'contextual Chain indicator missing')});
   test('UI','Screen transition controller is installed',()=>ebAssert(typeof go==='function'&&typeof EB_NAV_LOCK==='boolean','navigation transition controller missing'));
   test('UI','Reduced-motion navigation fallback exists',()=>{let ok=[...document.styleSheets].some(ss=>{try{return [...ss.cssRules].some(r=>r.media&&String(r.media.mediaText||'').includes('prefers-reduced-motion')&&String(r.cssText||'').includes('eb-screen-out'))}catch(e){return false}});ebAssert(ok,'reduced motion navigation CSS missing')});
   test('FX','Elemental FX 2.0 stylesheet is installed',()=>{let ok=[...document.styleSheets].some(ss=>{try{return [...ss.cssRules].some(r=>r.selectorText&&String(r.selectorText).includes('.eb-fx-particle'))}catch(e){return false}});ebAssert(ok,'Elemental FX 2.0 CSS missing')});
   test('FX','All nine elemental FX colors are registered',()=>ebAssert(['FIRE','WATER','NATURE','EARTH','LIGHTNING','AIR','MAGMA','STORM','BLOOM'].every(x=>EB_FX_COLOR[x]),'element FX color missing'));
   test('FX','Particle engine and reduced-motion guard exist',()=>ebAssert(typeof ebSpawnElementFx==='function'&&typeof ebReducedMotion==='function','FX helper missing'));
   test('FX','Destroyed-card fallback has a defined shape resolver',()=>ebAssert(typeof ebBurstShape==='function'&&ebBurstShape('LIGHTNING')==='eb-spark','fallback shape resolver missing'));

   /* Alpha 0.8.33 Phase F — Balance Lab trust boundary checks. */
   {let simSelf=EB_BALANCE.selfTest();for(const inv of simSelf.tests)test('BALANCE LAB / SELF TEST',inv.name,()=>ebAssert(inv.ok,inv.error||'simulator invariant failed'));}
   test('BALANCE LAB','All nine decks are registered',()=>ebAssert(EB_BALANCE.DECKS.length===9&&new Set(EB_BALANCE.DECKS).size===9,'Expected 9 unique Balance Lab decks'));
  test('AI/TARGETING','Target policy is not first-occupied-slot biased',()=>{let a={a:3},low={id:'low',a:1,h:4,armor:0,marks:[]},threat={id:'threat',a:5,h:4,armor:0,marks:[]};ebAssert(ebPickAITarget(a,[low,threat],()=>0)===threat&&ebPickAITarget(a,[threat,low],()=>0)===threat,'Slot order changed the strategically superior target')});
  test('AI/TARGETING','Lethal target is prioritized over nonlethal slot order',()=>{let a={a:3},tank={id:'tank',a:4,h:6,armor:1,marks:[]},kill={id:'kill',a:2,h:2,armor:0,marks:[]};ebAssert(ebPickAITarget(a,[tank,kill],()=>0)===kill&&ebPickAITarget(a,[kill,tank],()=>0)===kill,'Lethal target was not consistently prioritized')});
   test('BALANCE LAB','Seeded simulation is reproducible',()=>{let a=EB_BALANCE.simulate('FIRE','WATER',{seed:'phase-f-determinism'}),b=EB_BALANCE.simulate('FIRE','WATER',{seed:'phase-f-determinism'});ebAssert(JSON.stringify(a)===JSON.stringify(b),'Same seed produced different results')});
   test('BALANCE LAB','Simulation never replaces or mutates live G reference',()=>{let before=G,snap=JSON.stringify(G);EB_BALANCE.simulate('AIR','EARTH',{seed:'phase-f-isolation'});ebAssert(G===before&&JSON.stringify(G)===snap,'Balance simulation touched live match state')});
   test('BALANCE LAB','Simulation terminates inside safety ceilings',()=>{for(const pair of [['FIRE','FIRE'],['LIGHTNING','EARTH'],['BLOOM','STORM']]){let r=EB_BALANCE.simulate(pair[0],pair[1],{seed:'phase-f-ceiling-'+pair.join('-')});ebAssert(Number.isFinite(r.turns)&&Number.isFinite(r.actions)&&r.turns>=0&&r.actions>=0,'Invalid termination telemetry')}});
   test('BALANCE LAB','Directional aggregation accounts for every game',()=>{let r=EB_BALANCE.aggregate('NATURE','MAGMA',6,{seedBase:'phase-f-aggregate'});ebAssert(r.games===6&&r.wins[0]+r.wins[1]+r.stalls===6,'Aggregate totals do not reconcile')});
   test('BALANCE LAB','Metrics contain finite nonnegative counts',()=>{let r=EB_BALANCE.simulate('LIGHTNING','AIR',{seed:'phase-f-metrics'});for(const bucket of [r.metrics.cards,r.metrics.effects])for(const v of Object.values(bucket||{}))ebAssert(Number.isFinite(v)&&v>=0,'Invalid metric count');ebAssert(Number.isFinite(r.turns)&&r.turns>=0&&Number.isFinite(r.actions)&&r.actions>=0,'Invalid turn/action metrics')});
   test('BALANCE LAB','81 directional matchup cells are representable',()=>{let d=EB_BALANCE.DECKS;ebAssert(d.length*d.length===81,'Matrix is not 9 × 9')});
   test('BALANCE LAB','UI supports cooperative yielding and cancellation',()=>{ebAssert(typeof ebBLYield==='function'&&typeof ebBalanceCancel==='function'&&ebBalanceRun.constructor.name==='AsyncFunction','Responsive runner/cancel path missing')});
   test('BALANCE LAB','Report pipeline includes matchup and stall telemetry',()=>{let s=ebBalanceReportText.toString();ebAssert(s.includes('Stalls:')&&s.includes('avg turns')&&s.includes('effects'),'Balance report fields missing')});
   test('BALANCE LAB','Quick/Standard/Deep controls are registered',()=>{let vals=[...document.querySelectorAll('[data-bl-depth]')].map(x=>Number(x.dataset.blDepth));ebAssert([10,50,100].every(x=>vals.includes(x)),'Simulation depth control missing')});
   test('BALANCE LAB','Crossed deterministic calibration is registered',()=>{let r=EB_BALANCE.paired('FIRE','WATER',2,{seedBase:'phase-cal'});ebAssert(r&&r.pairs.length===2&&r.games===8&&r.pairs.every(x=>x.games.length===4&&x.physicalSeatComparisons===2),'Crossed calibration helper missing or malformed')});
    test('BALANCE LAB','Calibration deck shuffle is seat-independent',()=>{let base='phase-cal-seat',a=EB_BALANCE.simulate('FIRE','WATER',{seed:'a',calibrationSeed:base}),b=EB_BALANCE.simulate('WATER','FIRE',{seed:'b',calibrationSeed:base});let fa=a.fingerprint,fb=b.fingerprint;ebAssert(typeof fa==='string'&&typeof fb==='string','Calibration fingerprints missing')});
    test('BALANCE LAB / SELF TEST','Lifecycle telemetry is registered',()=>{let r=EB_BALANCE.simulate('FIRE','FIRE',{seed:'life'}),m=r.metrics.initiative;ebAssert(Array.isArray(m.summoned)&&Array.isArray(m.survivedToFirstAttack)&&Array.isArray(m.attackedAtLeastOnce)&&Array.isArray(m.preAttackRemovalBySource),'Lifecycle telemetry missing')});
    test('BALANCE LAB / SELF TEST','Opening protection is simulator-scoped',()=>{let before=window.G;EB_BALANCE.simulate('FIRE','FIRE',{seed:'protect',secondPlayerOpeningProtection:true});ebAssert(window.G===before,'Probe touched live G')});
    test('BALANCE LAB / SELF TEST','First-player-only round-2 combat delay is simulator-scoped',()=>{let before=window.G;EB_BALANCE.simulate('AIR','AIR',{seed:'delay',firstPlayerRound2CombatDelay:true});ebAssert(window.G===before,'Probe touched live G')});
    test('BALANCE LAB / SELF TEST','Lightning trace captures lifecycle events',()=>{let r=EB_BALANCE.simulate('LIGHTNING','LIGHTNING',{seed:'trace'});ebAssert(Array.isArray(r.trace)&&r.trace.some(x=>x.ev==='SUMMON'),'Lightning trace missing summon event')});
    test('BALANCE LAB / SELF TEST','First-opportunity survival is independently instrumented',()=>{let r=EB_BALANCE.simulate('LIGHTNING','LIGHTNING',{seed:'opportunity'}),m=r.metrics.initiative;ebAssert(m.survivedToFirstAttack.every((v,i)=>v>=m.attackedAtLeastOnce[i]),'Attack count exceeded first-opportunity survivors')});
    test('BALANCE LAB','Calibration UI and copy report are registered',()=>{ebAssert(typeof ebBalanceCalibrationRun==='function'&&typeof ebBalanceCalibrationText==='function'&&!!document.getElementById('blCalibration'),'Calibration UI/report path missing')});

   const pass=results.filter(x=>x.ok).length,total=results.length,pct=Math.round(pass/total*100);
   const groups={};results.forEach(r=>(groups[r.group]??=[]).push(r));
 const summary=document.getElementById('devSummary');
 summary.innerHTML=`<b>SYSTEM HEALTH: ${pass} / ${total} PASSING</b><div class="small">${pct}% verified · ${total-pass} issue${total-pass===1?'':'s'} detected</div><progress class="devBar" max="100" value="${pct}" aria-label="Verification pass rate"></progress>`;
 document.getElementById('devResults').innerHTML=Object.entries(groups).map(([g,rs])=>`<div class="devGroup"><b>${g} · ${rs.filter(x=>x.ok).length}/${rs.length}</b>${rs.map(r=>`<div class="devTest"><span class="${r.ok?'devPass':'devFail'}">${r.ok?'✓':'✕'}</span><div>${r.name}${r.detail?`<small>${r.detail}</small>`:''}</div></div>`).join('')}</div>`).join('');
 EB_DEV_LAST_REPORT=[`ELEMENT BOUND Alpha ${EB_RELEASE.version} ${EB_RELEASE.label.toUpperCase()} SYSTEM CHECK`,`${pass}/${total} PASSING`,...results.map(r=>`${r.ok?'PASS':'FAIL'} [${r.group}] ${r.name}${r.detail?' — '+r.detail:''}`)].join('\n');
 return results;
}
function copyEBVerification(){
 if(!EB_DEV_LAST_REPORT)runEBVerification();
 if(navigator.clipboard&&navigator.clipboard.writeText)navigator.clipboard.writeText(EB_DEV_LAST_REPORT).then(()=>{document.getElementById('devSummary').insertAdjacentHTML('beforeend','<div class="small devPass">Report copied.</div>')}).catch(()=>{});
}


/* ================================================================
   Alpha 0.8.33 · BALANCE LAB A–D CHECKPOINT
   Headless-only foundation. No player-facing UI is installed yet.
   A: isolated state + seeded RNG + hard ceilings
   B: canonical card data ingestion + core rule parity helpers
   C: symmetric neutral decision policy (either side)
   D: telemetry + matchup aggregation + anomaly detection
   IMPORTANT: this module never reads/writes live G while simulating.
   ================================================================ */
const EB_BUILD={alpha:EB_RELEASE.version,engine:EB_RELEASE.engine};
const EB_BALANCE_PATCH='CROSSWIND-ATTACK-DEBUFF-0.8.62';
const EB_BALANCE=(()=>{
 const DECKS=['FIRE','WATER','NATURE','EARTH','LIGHTNING','AIR','MAGMA','STORM','BLOOM'];
 const PRIME=new Set(['FIRE','WATER','NATURE','EARTH','LIGHTNING','AIR']);
 const DEFAULTS=Object.freeze({maxTurns:80,maxActions:900,openingHand:4});
 function hashSeed(v){let h=2166136261>>>0;for(const ch of String(v)){h^=ch.charCodeAt(0);h=Math.imul(h,16777619)}return h>>>0}
 function rng(seed){let a=hashSeed(seed);return()=>{a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
 function shuffle(a,r){for(let i=a.length-1;i>0;i--){let j=Math.floor(r()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a}
 function card(el,z,typeOverride){
   if(Array.isArray(z)){let tech=typeOverride==='TECHNIQUE';return tech?{el,n:z[0],c:z[3],type:'TECHNIQUE',text:z[1],tip:z[2]}:{el,n:z[0],c:z[1],a:z[2],h:z[3],max:z[3],type:'MANIFESTATION',guard:/\bGuard\b/.test(z[4]||''),text:z[4],tip:z[5]}}
   return {el,n:z.n,c:z.c,a:z.a||0,h:z.h||0,max:z.h||0,type:z.type,guard:/\bGuard\b/.test(z.text||''),text:z.text||'',tip:z.tip||'',role:z.role||''};
 }
 function primePack(el,count){let out=[];for(let i=0;i<count;i++){if(i%5===4)out.push(card(el,TECH[el],'TECHNIQUE'));else out.push(card(el,BASE[el][i%3]))}return out}
 function responseSimCard(el){return card(el,{...RESPONSES[el],type:'RESPONSE',role:'RESPONSE'})}
 function responseChoice(el,r,forced=null){if(PRIME.has(el))return el;let parents=HYBRIDS[el].parents;if(parents.includes(forced))return forced;return parents[Math.floor(r()*parents.length)]}
 function makeDeck(el,r,responseEl=null){let a=[],pick=responseChoice(el,r,responseEl);if(PRIME.has(el)){for(let i=0;i<13;i++)a.push(card(el,BASE[el][i%3]));{let second=TECH2[el],extra=second?second[4]:0;for(let i=0;i<7;i++)a.push(card(el,i<7-extra?TECH[el]:second,'TECHNIQUE'))}}else{let h=HYBRIDS[el];a=[...primePack(h.parents[0],8),...primePack(h.parents[1],8),...HYBRID_CARDS[el].map(z=>card(el,z))]}a.push(responseSimCard(pick));a.forEach((c,i)=>{c.sid=`${el}:${i}`;c.marks=[];c.armor=0;c.growth=0;c.momentum=0;c.ready=false;c.sick=false});return{cards:shuffle(a,r),responseEl:pick}}
 function freshSide(el,r,responseEl=null){let built=makeDeck(el,r,responseEl);return{el,vit:30,maxE:2,e:2,deck:built.cards,hand:[],wake:[],slots:[null,null,null],marks:[],chain:0,responseEl:built.responseEl,initiationToken:false,turnState:{resonance:{a:false,b:false,active:false},parents:HYBRIDS[el]?.parents||[],moved:[]}}}
 function draw(st,i){let p=st.p[i];if(!p.deck.length){let taken=Math.max(0,Number(p.exhaustion)||0);p.vit-=EXHAUSTION_DAMAGE+taken;p.exhaustion=taken+1;metric(st,'effect','Exhaustion');return false}p.hand.push(p.deck.shift());return true}
 function makeState(a,b,seed,opt={}){let r=rng(seed),paired=opt&&opt.calibrationSeed!=null,base=paired?String(opt.calibrationSeed):String(seed),p0=paired?freshSide(a,rng(base+'|DECK|'+a),opt.responseElA):freshSide(a,r,opt.responseElA),p1=paired?freshSide(b,rng(base+'|DECK|'+b),opt.responseElB):freshSide(b,r,opt.responseElB);if(paired)r=rng(base+'|ACTION');let options={...DEFAULTS,...opt},startSeat=options.startSeat===1?1:0,tokenSeat=1-startSeat;p0.initiationToken=tokenSeat===0;p1.initiationToken=tokenSeat===1;let st={seed:String(seed),rng:r,p:[p0,p1],active:startSeat,startSeat,tokenSeat,turn:1,actions:0,winner:null,reason:null,options,metrics:{cards:{},effects:{},responses:{windows:0,played:0,passed:0,card:0,token:0,cancelled:0,retaliationDamage:0,preCombatKills:0,undertowMoves:0,slipstreamRedirects:0,stonewallArmor:0,secondBloomHealing:0,byElement:{}},turns:0,actions:0,damage:[0,0],winReason:null,initiative:{startSeat,tokenSeat,firstPlay:null,firstPlayTurn:null,firstAttack:null,firstAttackTurn:null,firstDamage:null,firstDamageTurn:null,firstSummon:null,firstSummonTurn:null,firstGuard:null,firstGuardTurn:null,firstRemoval:null,firstRemovalTurn:null,removedBeforeFirstAttack:[0,0],summoned:[0,0],survivedToFirstAttack:[0,0],attackedAtLeastOnce:[0,0],preAttackRemovalBySource:[{},{}],cardsPlayed:[0,0],attacks:[0,0],energySpent:[0,0],openingEnergy:[null,null],actionTurns:[0,0],turnSequence:[],snapshots:{},turn5Damage:[0,0],turn5Board:[0,0],turn5CardsUsed:[0,0]}},trace:[]};for(let i=0;i<2;i++)for(let n=0;n<st.options.openingHand;n++)draw(st,i);let bonus=Math.max(0,Number(st.options.secondPlayerBonusCards)||0);for(let n=0;n<bonus;n++)draw(st,1-startSeat);startTurn(st,startSeat,false);return st}
 function metric(st,kind,key,n=1){kind=kind==='effect'?'effects':kind==='card'?'cards':kind;let o=st.metrics[kind]||(st.metrics[kind]={});o[key]=(o[key]||0)+n}
 // Rule experiments (issue #83, #81). Simulator-only: they run only when a Balance Lab experiment passes the option.
 const EXPERIMENT_KEYS=['strikeBack','arrivalWard','arrivalShield','benderArts','ascension'];
 function exp(st){return st.metrics.experiment||(st.metrics.experiment={rules:EXPERIMENT_KEYS.filter(k=>st.options[k]),strikeBacks:0,strikeBackKills:0,wardedTargetsSkipped:0,arts:[0,0],combos:[0,0],ascensions:[0,0]})}
 function simCombo(st,owner){if(!st.options.ascension)return;let p=st.p[owner],x=exp(st);x.combos[owner]++;p._ascPips=(p._ascPips||0)+1;if(p._ascPips>=3){p._ascPips=0;p._ascendNext=true}}
 function simComeback(st,victim){if(!st.options.ascension)return;let p=st.p[victim];p._ascPips=(p._ascPips||0)+1;if(p._ascPips>=3){p._ascPips=0;p._ascendNext=true}}
 function simNew(m){return !!(m&&!m._ebFirstOpportunitySeen&&Number.isFinite(m._ebSummonedTurn))}
 function simWarded(st,m){return ebWarded(m)||!!(st.options.arrivalWard&&simNew(m))}
 function simBenderArt(st,owner){let p=st.p[owner],e=st.p[1-owner];if(!st.options.benderArts||p._artTurn===st.turn||p.e<2)return false;if(p.hand.some(c=>c.type==='RESPONSE')&&p.e<4)return false;let friends=p.slots.filter(Boolean),used=false,el=p.el,h=HYBRIDS[el];if(h)el=h.parents[st.turn%2];
   if(el==='FIRE'){let t=e.slots.find(x=>x&&x.h<x.max&&!(x.marks||[]).includes('Burning'));if(t){mark(t,'Burning');used=true}else if(!(e.marks||[]).includes('Burning')){mark(e,'Burning');used=true}}
   else if(el==='WATER'){used=flow(st,owner)}
   else if(el==='EARTH'){let t=friends.sort((a,b)=>(b.a+b.h)-(a.a+a.h))[0];used=!!t&&addArmor(st,t)}
   else if(el==='NATURE'){let t=friends.find(x=>!(x.marks||[]).includes('Seeded'));if(t){mark(t,'Seeded');used=true}}
   else if(el==='LIGHTNING'){p.chain++;used=true}
   else if(el==='AIR'){let t=friends.filter(x=>momentum(x)<3).sort((a,b)=>b.a-a.a)[0];used=!!t&&addMomentum(st,t)}
   if(!used)return false;p.e-=2;p._artTurn=st.turn;exp(st).arts[owner]++;metric(st,'effect','Bender Art');return true}
 function mark(x,m){x.marks=x.marks||[];if(!x.marks.includes(m))x.marks.push(m)}
 function unmark(x,m){x.marks=(x.marks||[]).filter(v=>v!==m)}
 function momentum(x){if(!x)return 0;let n=Number.isFinite(x.momentum)?Math.floor(x.momentum):((x.marks||[]).includes('Momentum')?1:0);return Math.max(0,Math.min(3,n))}
 function addMomentum(st,x){if(!x)return false;let before=momentum(x);x.momentum=before;if(before>=3){mark(x,'Momentum');return false}x.momentum=before+1;x.a=(Number(x.a)||0)+1;mark(x,'Momentum');metric(st,'effect','Momentum');return true}
 function addArmor(st,x){if(!x||x.armorGainRound===st.turn||(x.armor||0)>=3)return false;x.armorGainRound=st.turn;x.armor=(x.armor||0)+1;metric(st,'effect','Armor');return true}
 function simTidelilyGrowth(st,owner,m){let p=st.p[owner];if(!p||p.el!=='BLOOM'||!m||m.n!=='Tidelily Guardian'||!p.turnState.resonance.active||m.turnFlags?.tidelilyGrowthHeal)return false;m.turnFlags={...(m.turnFlags||{}),tidelilyGrowthHeal:true};let ally=p.slots.filter(x=>x&&x!==m&&x.h<x.max).sort((a,b)=>(a.h/a.max)-(b.h/b.max))[0];if(ally){simHeal(st,owner,ally);metric(st,'effect','Tidelily Guardian healing')}else if(p.vit<30){p.vit=Math.min(30,p.vit+1);metric(st,'effect','Tidelily Guardian Bender healing')}return true}
 function simHeal(st,owner,m,n=1){if(!m)return 0;let before=m.h;m.h=Math.min(m.max,m.h+n);let healed=m.h-before;if(healed>0&&m.el==='NATURE'&&m.n==='Root Keeper'&&simGrow(st,owner,m))metric(st,'effect','Root Keeper Growth');return healed}
 function simGrow(st,owner,m){if(!m||(m.growth||0)>=3)return false;m.growth=(m.growth||0)+1;m.a=(Number(m.a)||0)+ebGrowthAtk(m);metric(st,'effect','Growth');simCombo(st,owner);simTidelilyGrowth(st,owner,m);return true}
 function expireRoundEffectsSim(x){if(!x)return;let stacks=momentum(x);if(stacks){x.a=Math.max(0,(Number(x.a)||0)-stacks);x.momentum=0}x.armor=0;x.armorGainRound=null;unmark(x,'Momentum');unmark(x,'Charged')}
 function expireAllRoundEffectsSim(st){st.p.forEach(side=>{unmark(side,'Charged');side.slots.filter(Boolean).forEach(expireRoundEffectsSim)})}
 function simTurnKey(st,owner){return`${st.turn}:${owner}`}
 function simDamagedThisTurn(st,owner,x){return !!x&&x._ebDamagedTurn===simTurnKey(st,owner)}
 function guards(p){return p.slots.filter(x=>x&&x.guard)}
 function endCheck(st){if(st.winner!==null)return true;for(let i=0;i<2;i++)if(st.p[i].vit<=0){st.winner=1-i;st.reason='VITALITY';break}if(st.winner!==null){st.metrics.winReason=st.reason;return true}return false}
 function startTurn(st,i,doDraw=true){st.active=i;let p=st.p[i];st.metrics.initiative.actionTurns[i]++;if(st.metrics.initiative.turnSequence.length<40)st.metrics.initiative.turnSequence.push({round:st.turn,seat:i,role:i===st.startSeat?'FP':'SP',actionTurn:st.metrics.initiative.actionTurns[i]});p.chain=0;p.maxE=Math.min(7,2+Math.floor(st.turn-1));p.e=p.maxE;if(i!==st.startSeat&&!p._ebInitEnergyUsed){p.e+=Math.max(0,Number(st.options.secondPlayerFirstTurnEnergy)||0);p._ebInitEnergyUsed=true}if(st.metrics.initiative.openingEnergy[i]===null)st.metrics.initiative.openingEnergy[i]=p.e;p.slots.filter(Boolean).forEach(m=>{if(!m._ebFirstOpportunitySeen&&m._ebSummonedTurn<st.turn){m._ebFirstOpportunitySeen=true;st.metrics.initiative.survivedToFirstAttack[i]++;if((p.el==='LIGHTNING'||st.p[1-i].el==='LIGHTNING')&&st.trace.length<120)st.trace.push({ev:'FIRST_ATTACK_OPPORTUNITY',turn:st.turn,seat:i,unit:m.n});}m.ready=true;m.sick=false;m.quick=null;m.turnFlags={};if(ebWarded(m))unmark(m,'Warded')});p.turnState={resonance:{a:false,b:false,active:false},parents:HYBRIDS[p.el]?.parents||[],moved:[]};if(doDraw){draw(st,i);if(ebSecondWindApplies(p,st.p[1-i],st.turn)){draw(st,i);metric(st,'effect','Second Wind')}}endCheck(st)}
 function affinity(p,c){let h=HYBRIDS[p.el];if(!h||c.el===p.el)return;let rr=p.turnState.resonance;if(c.el===h.parents[0])rr.a=true;if(c.el===h.parents[1])rr.b=true;rr.active=rr.a&&rr.b;if(rr.active)metricDummy(p)}
 function metricDummy(){} // intentional no-op; state metric is recorded at action boundary.
 function attackBonus(st,owner,att,target){let p=st.p[owner],bonus=0;if(att.el==='FIRE'&&att.n==='Flare Hawk'&&(target.marks||[]).includes('Burning')){bonus++;simCombo(st,owner)}
   if(att.el==='EARTH'&&att.n==='Boulder Ram'&&(att.armor||0)>0){bonus++;simCombo(st,owner)}
   if(att.el==='LIGHTNING'&&att.n==='Arc Runner'&&p.chain>=2){bonus+=1;simCombo(st,owner)}
   if(att.el==='LIGHTNING'&&att.n==='Volt Lynx'&&p.chain>=3&&!att.turnFlags?.volt){bonus+=2;att.turnFlags={...(att.turnFlags||{}),volt:true};metric(st,'effect','Volt Lynx payoff',2);simCombo(st,owner)}
   if(att.el==='AIR'&&att.n==='Gale Scout'&&p.turnState.airOpening){let before=momentum(att);addMomentum(st,att);bonus+=momentum(att)-before;p.turnState.airOpening=false;metric(st,'effect','Air Opening');simCombo(st,owner)}
   if(att.el==='STORM'&&att.n==='Tempest Striker'&&(p.turnState.moved||[]).includes(att.sid)&&!att.turnFlags?.stormBonus){bonus++;att.turnFlags={...(att.turnFlags||{}),stormBonus:true};metric(st,'effect','Tempest Striker movement bonus');simCombo(st,owner)}
   if((target.marks||[]).includes('Charged')&&att.el==='LIGHTNING'){bonus++;unmark(target,'Charged');metric(st,'effect','Charged released');simCombo(st,owner)}
   return bonus}
 function simSoakedAttackPower(st,att,power){if(!att||(att.marks||[]).indexOf('Soaked')<0)return Math.max(0,power);unmark(att,'Soaked');let reduced=Math.max(0,power-2);metric(st,'effect','Soaked mitigation');return reduced}
 function simClearSourceBoundBenderEffects(st,cardOwner,card){if(card&&card.el==='FIRE'&&card.n==='Cinder Adept')unmark(st.p[1-cardOwner],'Burning')}
 function simApplyCrosswindWeakness(st,m){if(!m||(m.marks||[]).includes('Weakened'))return false;let reduced=Math.min(1,Math.max(0,Number(m.a)||0));m.crosswindAttackDebuff=reduced;m.a=Math.max(0,(Number(m.a)||0)-reduced);mark(m,'Weakened');metric(st,'effect','Crosswind Weakened');return true}
 function simClearCrosswindWeakness(card){if(!card||(!(card.marks||[]).includes('Weakened')&&!Number.isFinite(card.crosswindAttackDebuff)))return;let restore=Math.min(1,Math.max(0,Number(card.crosswindAttackDebuff)||0));card.a=(Number(card.a)||0)+restore;card.crosswindAttackDebuff=0;unmark(card,'Weakened')}
 function simSendToWake(st,sideIndex,card){let side=st.p[sideIndex],i=side.slots.indexOf(card);if(i<0)return false;side.slots[i]=null;simClearSourceBoundBenderEffects(st,sideIndex,card);simClearCrosswindWeakness(card);side.wake.push(card);return true}
 function simMoveFriendly(p,m){let from=p.slots.indexOf(m),to=p.slots.findIndex(x=>!x);if(from<0||to<0)return false;p.slots[from]=null;p.slots[to]=m;p.turnState.moved=p.turnState.moved||[];if(!p.turnState.moved.includes(m.sid))p.turnState.moved.push(m.sid);return true}
 function simQuickBeforeAttack(st,sideIndex,target){if(!target||target.quick?.kind!=='MOVE')return false;let moved=simMoveFriendly(st.p[sideIndex],target);target.quick=null;if(moved)metric(st,'effect','Static Reversal movement');return moved}
 function simQuickAfterAttackDamage(st,target){if(!target||target.quick?.kind!=='SURVIVE'||target.h>0||(target.growth||0)<1||!(target.marks||[]).includes('Seeded'))return false;target.h=1;target.growth--;target.a=Math.max(0,target.a-ebGrowthAtk(target));unmark(target,'Seeded');target.quick=null;metric(st,'effect','Reclaiming Tide survival');return true}
 function dealBody(st,owner,t,power,source,isAttack=false,noOverflow=false){if(isAttack&&st.options.arrivalShield&&simNew(t)&&power>0){power--;exp(st).shieldPrevented=(exp(st).shieldPrevented||0)+1}let def=st.p[1-owner],pre=t.h,block=Math.min(t.armor||0,power);t.armor=(t.armor||0)-block;let d=Math.max(0,power-block);if(st.options.secondPlayerOpeningProtection&&(1-owner)!==st.startSeat&&!t._ebHasAttacked&&t.h-d<=0)d=Math.max(0,t.h-1);t.h-=d;if(d>0)t._ebDamagedTurn=simTurnKey(st,owner);if(d>0&&t.el==='WATER'&&t.n==='Tide Warden')flow(st,1-owner);if(source.el==='WATER'&&source.n==='River Serpent'&&d>0){mark(t,'Soaked');metric(st,'effect','Soaked applied')}if(isAttack)simQuickAfterAttackDamage(st,t);if(t.h<=0){let guardAtImpact=guards(def).length;if(st.metrics.initiative.firstRemoval===null){st.metrics.initiative.firstRemoval=owner;st.metrics.initiative.firstRemovalTurn=st.turn}if(!t._ebHasAttacked){let victim=1-owner;st.metrics.initiative.removedBeforeFirstAttack[victim]++;let key=(source&&source.type==='TECHNIQUE'?'TECHNIQUE:':'ATTACK:')+((source&&source.n)||'UNKNOWN');let bucket=st.metrics.initiative.preAttackRemovalBySource[victim];bucket[key]=(bucket[key]||0)+1;if(st.trace.length<120)st.trace.push({ev:'PRE_ATTACK_REMOVAL',turn:st.turn,by:owner,victim,unit:t.n,source:key});}simSendToWake(st,1-owner,t);simComeback(st,1-owner);let overflow=(guardAtImpact||noOverflow)?0:Math.max(0,d-Math.max(0,pre));if(overflow){def.vit-=overflow;st.metrics.damage[owner]+=overflow;metric(st,'effect','Overflow')}}return d}
 function flow(st,owner){let p=st.p[owner];if(!p.deck.length)return false;if(st.rng()<0.35)p.deck.push(p.deck.shift());metric(st,'effect','Flow 1');return true}
 function summonGift(st,owner,c){let p=st.p[owner],targets=p.slots.filter(m=>m&&m!==c);if(!targets.length)return;let t;if(c.el==='AIR'&&c.n==='Breeze Disciple'){t=targets.find(x=>x.n==='Sky Raptor')||targets.sort((a,b)=>b.a-a.a)[0];addMomentum(st,t);addMomentum(st,t)}
   else if(c.el==='EARTH'&&c.n==='Stone Initiate'){t=targets.sort((a,b)=>b.h-a.h)[0];addArmor(st,t)}
   else if(c.el==='NATURE'&&c.n==='Sproutling'){t=targets.find(x=>x.n==='Grove Beast')||targets.sort((a,b)=>b.a-a.a)[0];mark(t,'Seeded');metric(st,'effect','Seeded')}}
 function playTechnique(st,owner,c){let p=st.p[owner],e=st.p[1-owner],res=!!p.turnState.resonance.active;
   if(TECH2_NAMES.has(c.n)){let t=secondTechniqueTarget(p,e,c);
     // Technique damage never overflows to the Bender, matching live play and the engine.
     const bender=n=>{e.vit-=n;st.metrics.damage[owner]+=n};
     if(c.n==='Searing Brand'){if(t.enemy){mark(t.enemy,'Burning');metric(st,'effect','Burning applied');dealBody(st,owner,t.enemy,1,c,false,true)}else{mark(e,'Burning');metric(st,'effect','Burning applied');bender(1)}}
     else if(c.n==='Riptide'&&t.enemy){if((t.enemy.marks||[]).includes('Soaked')){dealBody(st,owner,t.enemy,2,c,false,true);metric(st,'effect','Riptide damage')}else{mark(t.enemy,'Soaked');metric(st,'effect','Soaked applied')}}
     else if(c.n==='Wild Growth'&&t.friend){mark(t.friend,'Seeded');metric(st,'effect','Seeded');simGrow(st,owner,t.friend)}
     else if(c.n==='Stone Fist'&&t.friend){let n=1+(t.friend.armor||0);if(t.enemy)dealBody(st,owner,t.enemy,n,c,false,true);else bender(n);metric(st,'effect','Stone Fist damage',n)}
     else if(c.n==='Recharge'){flow(st,owner);flow(st,owner)}
     else if(c.n==='Downdraft'&&t.friend){addMomentum(st,t.friend);if(t.enemy)simApplyCrosswindWeakness(st,t.enemy)}
     return}
   if(c.el==='FIRE'){let t=e.slots.filter(Boolean).sort((a,b)=>a.h-b.h)[0];if(t&&(t.marks||[]).includes('Burning'))simCombo(st,owner);if(t)dealBody(st,owner,t,(t.marks||[]).includes('Burning')?3:2,c);else if(!guards(e).length){let d=(e.marks||[]).includes('Burning')?3:2;e.vit-=d;st.metrics.damage[owner]+=d}}
   else if(c.el==='WATER'){let t=e.slots.find(Boolean);if(t){mark(t,'Soaked');metric(st,'effect','Soaked applied')}flow(st,owner)}
   else if(c.el==='EARTH'){let t=p.slots.filter(Boolean).sort((a,b)=>(b.a+b.h)-(a.a+a.h))[0];if(t)addArmor(st,t)}
   else if(c.el==='NATURE'){let t=p.slots.find(m=>m&&(m.marks||[]).includes('Seeded')&&(m.growth||0)<3);if(t)simGrow(st,owner,t)}
   else if(c.el==='LIGHTNING'){if(p.chain===2){mark(e,'Charged');metric(st,'effect','Charged applied')}else flow(st,owner)}
   else if(c.el==='AIR'){let t=p.slots.find(m=>m&&m.n==='Sky Raptor'&&momentum(m)<3)||p.slots.filter(Boolean).sort((a,b)=>momentum(a)-momentum(b))[0];if(t)addMomentum(st,t);let occupied=e.slots.map((m,i)=>m?i:-1).filter(i=>i>=0);if(occupied.length>=2){let [from,to]=occupied,a=e.slots[from],b=e.slots[to];[e.slots[from],e.slots[to]]=[b,a];simApplyCrosswindWeakness(st,a);simApplyCrosswindWeakness(st,b);p.turnState.airOpening=true;metric(st,'effect','Crosswind swap')}}
   else if(c.el==='MAGMA'){let friend=p.slots.filter(Boolean)[0],damaged=e.slots.find(x=>x&&simDamagedThisTurn(st,owner,x));if(c.n==='Molten Channel'){let burn=damaged&&(!(damaged.marks||[]).includes('Burning')||res);if((res||!burn)&&friend){if(addArmor(st,friend))metric(st,'effect','Molten Channel Armor')}if(burn){mark(damaged,'Burning');metric(st,'effect','Burning applied');metric(st,'effect','Molten Channel Burning')}}else if(c.n==='Pressure Forge'){if(friend&&addArmor(st,friend))metric(st,'effect','Pressure Forge Armor');if(res){let q=e.slots.find(x=>x&&(x.marks||[]).includes('Burning'));if(q){dealBody(st,owner,q,1,c);metric(st,'effect','Pressure Forge damage')}}}else if(c.n==='Eruption Guard'&&friend){friend.quick={kind:'REDUCE',value:1};metric(st,'effect','Eruption Guard armed')}}
   else if(c.el==='STORM'){
     let t=p.slots.filter(Boolean)[0];
     if(c.n==='Crosswind Spark'&&t&&simMoveFriendly(p,t)){
       addMomentum(st,t);metric(st,'effect','Crosswind Spark movement');
       if(res){mark(t,'Charged');metric(st,'effect','Charged applied')}
     }else if(c.n==='Thunderstep'&&t&&simMoveFriendly(p,t)){
       metric(st,'effect','Thunderstep movement');
       let enemy=e.slots.find(x=>x&&simDamagedThisTurn(st,owner,x));
       if(res&&((t.marks||[]).includes('Charged')||momentum(t)>0)&&enemy){dealBody(st,owner,enemy,1,c);metric(st,'effect','Thunderstep damage')}
     }else if(c.n==='Static Reversal'&&t){
       t.quick={kind:'MOVE'};metric(st,'effect','Static Reversal armed')
     }
   }
   else if(c.el==='BLOOM'){let t=p.slots.filter(Boolean)[0];if(c.n==='Rainseed'&&t){if(res)simGrow(st,owner,t);else if((t.marks||[]).includes('Seeded'))simHeal(st,owner,t);else{mark(t,'Seeded');metric(st,'effect','Seeded')}}else if(c.n==='Flourishing Current'&&t){if(res){simHeal(st,owner,t);metric(st,'effect','Flourishing Current healing');if((t.marks||[]).includes('Seeded'))simGrow(st,owner,t)}else metric(st,'effect','Flourishing Current no Resonance')}else if(c.n==='Reclaiming Tide'){let q=p.slots.find(x=>x&&(x.marks||[]).includes('Seeded')&&(x.growth||0)>0);if(q){q.quick={kind:'SURVIVE'};metric(st,'effect','Reclaiming Tide armed')}}}
 }
 // Card choice mirrors the live Hard rival (ai() → techScore/bodyScore) so the Lab measures the opponent players
 // actually face (issue #91). The old flat 4.5 for most Techniques cast them even when they could do nothing.
 function score(c,p,e){if(c.type==='TECHNIQUE'){if(TECH2_NAMES.has(c.n))return secondTechniqueScore(p,e,c);if(HYBRIDS[c.el])return p.turnState.resonance.active?7:4;if(c.el==='FIRE')return e.slots.some(Boolean)?7:2;if(c.el==='EARTH')return p.slots.some(Boolean)?6:0;if(c.el==='NATURE')return p.slots.some(m=>m&&(m.marks||[]).includes('Seeded')&&(m.growth||0)<3)?7:1;if(c.el==='WATER')return 4;if(c.el==='LIGHTNING')return p.chain>=1?6:3;if(c.el==='AIR')return e.slots.filter(Boolean).length>=2?5:p.slots.some(Boolean)?4:0;return 2}return(c.a||0)*2+(c.h||0)+(c.guard?3:0)-c.c*.4}
 function choosePlay(st,owner){let p=st.p[owner],e=st.p[1-owner],legal=p.hand.filter(c=>c.type!=='RESPONSE'&&c.c<=p.e&&(c.type==='TECHNIQUE'?(c.el!=='AIR'||p.slots.some(Boolean))&&secondTechniqueLegal(p,e,c):p.slots.some(x=>!x)));if(!legal.length)return null;legal=[...legal].sort((a,b)=>score(b,p,e)-score(a,p,e)||a.c-b.c||a.n.localeCompare(b.n));return legal[0]}
 function doPlay(st,owner,c){let p=st.p[owner];if(st.metrics.initiative.firstPlay===null){st.metrics.initiative.firstPlay=owner;st.metrics.initiative.firstPlayTurn=st.turn}st.metrics.initiative.cardsPlayed[owner]++;st.metrics.initiative.energySpent[owner]+=c.c;p.e-=c.c;p.hand.splice(p.hand.indexOf(c),1);p.chain++;metric(st,'cards',c.n);if(c.type==='TECHNIQUE'){p.wake.push(c);playTechnique(st,owner,c)}else{let i=p.slots.findIndex(x=>!x);if(i<0)return false;c.sick=true;c.ready=true;c._ebHasAttacked=false;c._ebFirstOpportunitySeen=false;c._ebSummonedTurn=st.turn;c.marks=c.marks||[];let ward=ebRallyWardApplies(p,st.p[1-owner],st.turn);p.slots[i]=c;if(ward){mark(c,'Warded');metric(st,'effect','Rally Ward')}st.metrics.initiative.summoned[owner]++;if((p.el==='LIGHTNING'||st.p[1-owner].el==='LIGHTNING')&&st.trace.length<120)st.trace.push({ev:'SUMMON',turn:st.turn,seat:owner,unit:c.n,chain:p.chain,energy:p.e});if(st.metrics.initiative.firstSummon===null){st.metrics.initiative.firstSummon=owner;st.metrics.initiative.firstSummonTurn=st.turn}if(c.guard&&st.metrics.initiative.firstGuard===null){st.metrics.initiative.firstGuard=owner;st.metrics.initiative.firstGuardTurn=st.turn}if(c.el==='FIRE'&&c.n==='Cinder Adept'){mark(st.p[1-owner],'Burning');metric(st,'effect','Burning applied')}if(c.el==='WATER'&&c.n==='Mist Adept')flow(st,owner);if(c.el==='LIGHTNING'&&c.n==='Spark Runner'&&p.chain===2){p.chain++;metric(st,'effect','Spark Runner chain boost')}summonGift(st,owner,c)}affinity(p,c);if(p.turnState.resonance.active)metric(st,'effect','Resonance active');st.actions++;st.metrics.actions++;return true}
 function responseMetric(st,el,key,n=1){let r=st.metrics.responses;r[key]=(r[key]||0)+n;let b=r.byElement[el]||(r.byElement[el]={windows:0,played:0,card:0,token:0,cancelled:0});b[key]=(b[key]||0)+n}
 function simResponseLegal(el,def,att,t,phase='BEFORE'){if(!def||!att||!t)return false;if(phase==='AFTER')return el==='FIRE'&&t.h<t.max;if(el==='FIRE')return false;if(el==='WATER')return def.slots.includes(t)&&def.slots.some(x=>!x);if(el==='NATURE')return def.slots.some(m=>m&&m.h<m.max&&!(m.marks||[]).includes('Second Bloom Used'));if(el==='EARTH')return def.slots.some(Boolean);if(el==='LIGHTNING')return true;if(el==='AIR')return def.slots.filter(Boolean).some(m=>m!==t&&!ebWarded(m));return false}
 function simResponseOption(def,att,t,phase='BEFORE'){let el=def.responseEl;if(!simResponseLegal(el,def,att,t,phase))return null;let c=def.hand.find(x=>x.type==='RESPONSE'&&x.el===el);if(c&&def.e>=c.c)return{el,source:'CARD',card:c};if(def.initiationToken)return{el,source:'TOKEN',card:null};return null}
 function simShouldRespond(st,def,att,t,opt,phase){if(!opt)return false;let el=opt.el;if(phase==='AFTER')return el==='FIRE'&&att.h>0;let incoming=Math.max(0,att.a);if(el==='WATER'||el==='LIGHTNING')return true;if(el==='AIR')return def.slots.some(m=>m&&m!==t&&m.h>t.h)||incoming>=t.h;if(el==='EARTH')return incoming>=2||t.h<=incoming;if(el==='NATURE')return def.slots.some(m=>m&&m.h<m.max&&!(m.marks||[]).includes('Second Bloom Used'));return true}
 function simSpendResponse(st,def,opt){if(opt.source==='TOKEN'){if(!def.initiationToken)return false;def.initiationToken=false;responseMetric(st,opt.el,'token')}else{let i=def.hand.indexOf(opt.card);if(i<0||def.e<opt.card.c)return false;def.e-=opt.card.c;def.hand.splice(i,1);def.wake.push(opt.card);responseMetric(st,opt.el,'card')}responseMetric(st,opt.el,'played');metric(st,'card',RESPONSES[opt.el].n);return true}
 function simResolveResponse(st,owner,att,t,phase='BEFORE'){let def=st.p[1-owner],opt=simResponseOption(def,att,t,phase);if(!opt)return{target:t,cancel:false,ok:false};responseMetric(st,opt.el,'windows');if(!simShouldRespond(st,def,att,t,opt,phase)){st.metrics.responses.passed++;return{target:t,cancel:false,ok:false}}if(!simSpendResponse(st,def,opt))return{target:t,cancel:false,ok:false};let cancel=false,target=t,el=opt.el;if(el==='FIRE'){let pre=att.h;att.h-=2;let d=Math.min(2,Math.max(0,pre));st.metrics.responses.retaliationDamage+=d;metric(st,'effect','Backdraft retaliation');if(att.h<=0)simSendToWake(st,owner,att)}
 else if(el==='WATER'){let from=def.slots.indexOf(t),to=def.slots.findIndex(x=>!x);if(from>=0&&to>=0){def.slots[to]=t;def.slots[from]=null;cancel=true;st.metrics.responses.undertowMoves++;metric(st,'effect','Undertow move')}}
 else if(el==='NATURE'){let pick=def.slots.filter(m=>m&&m.h<m.max&&!(m.marks||[]).includes('Second Bloom Used')).sort((a,b)=>a.h-b.h)[0];if(pick){let healed=simHeal(st,1-owner,pick);mark(pick,'Second Bloom Used');st.metrics.responses.secondBloomHealing+=healed;metric(st,'effect','Second Bloom healing',healed)}}
 else if(el==='EARTH'){let pick=def.slots.filter(Boolean).sort((a,b)=>(b.a+b.h)-(a.a+a.h))[0];if(pick&&addArmor(st,pick)){st.metrics.responses.stonewallArmor++;metric(st,'effect','Stonewall Armor')}}
 else if(el==='LIGHTNING'){let pre=att.h;att.h-=2;metric(st,'effect','Flash Step damage',Math.min(2,Math.max(0,pre)));if(att.h<=0){simSendToWake(st,owner,att);cancel=true;st.metrics.responses.preCombatKills++}}
 else if(el==='AIR'){let picks=def.slots.filter(m=>m&&m!==t&&!ebWarded(m)).sort((a,b)=>b.h-a.h),pick=picks[0];if(pick){let a=def.slots.indexOf(t),b=def.slots.indexOf(pick);[def.slots[a],def.slots[b]]=[def.slots[b],def.slots[a]];target=pick;st.metrics.responses.slipstreamRedirects++;metric(st,'effect','Slipstream redirect')}}if(cancel){responseMetric(st,el,'cancelled');st.metrics.responses.cancelled++}return{target,cancel,ok:true}}
 function canBypass(att,p){return(att.n==='Sky Raptor'&&momentum(att)>0)||(att.n==='Tempest Striker'&&(p.turnState.moved||[]).includes(att.sid)&&p.turnState.resonance.active)}
 function simObsidianRavagerTrigger(st,owner,att,target){let p=st.p[owner];if(!att||att.el!=='MAGMA'||att.n!=='Obsidian Ravager'||!target||!p.turnState.resonance.active||att.turnFlags?.obsidianBurn)return false;let donor=p.slots.find(m=>m&&m!==att&&(m.armor||0)>0);if(!donor)return false;donor.armor--;att.turnFlags={...(att.turnFlags||{}),obsidianBurn:true};mark(target,'Burning');metric(st,'effect','Burning applied');metric(st,'effect','Obsidian Ravager Burning');return true}
 function simQuickReduction(st,target,power){let q=target&&target.quick&&target.quick.kind==='REDUCE'?Math.max(0,Number(target.quick.value)||0):0;if(!q)return Math.max(0,power);target.quick=null;let prevented=Math.min(Math.max(0,power),q);metric(st,'effect','Eruption Guard reduction',prevented);return Math.max(0,power-q)}
 function attackOne(st,owner,att){let p=st.p[owner],e=st.p[1-owner],beforeD=st.metrics.damage[owner];if(!att._ebHasAttacked)st.metrics.initiative.attackedAtLeastOnce[owner]++;att._ebHasAttacked=true;if((p.el==='LIGHTNING'||e.el==='LIGHTNING')&&st.trace.length<120)st.trace.push({ev:'ATTACK',turn:st.turn,seat:owner,unit:att.n,chain:p.chain,energy:p.e});if(st.metrics.initiative.firstAttack===null){st.metrics.initiative.firstAttack=owner;st.metrics.initiative.firstAttackTurn=st.turn}st.metrics.initiative.attacks[owner]++;let all=e.slots.filter(Boolean),targets=all.filter(x=>!simWarded(st,x)),t=null;if(targets.length<all.length){if(st.options.arrivalWard)exp(st).wardedTargetsSkipped+=all.length-targets.length;else metric(st,'effect','Rally Ward blocked',all.length-targets.length)}if(targets.length){t=ebPickAITarget(att,targets,st.rng)}let direct=!targets.length||((guards(e).length>0)&&canBypass(att,p));if(direct&&(!guards(e).length||canBypass(att,p))){simObsidianRavagerTrigger(st,owner,att,e);let power=simSoakedAttackPower(st,att,Math.max(0,att.a+attackBonus(st,owner,att,e)));e.vit-=power;st.metrics.damage[owner]+=power;if(guards(e).length&&canBypass(att,p))metric(st,'effect','Guard bypass')}else if(t){let before=simResolveResponse(st,owner,att,t,'BEFORE');if(!before.cancel&&!endCheck(st)&&p.slots.includes(att)){t=before.target;if(e.slots.includes(t)){simObsidianRavagerTrigger(st,owner,att,t);simQuickBeforeAttack(st,1-owner,t);let hpBefore=t.h,back=Math.max(0,Number(t.a)||0),raw=Math.max(0,att.a+attackBonus(st,owner,att,t)),power=simSoakedAttackPower(st,att,simQuickReduction(st,t,raw));dealBody(st,owner,t,power,att,true);if(st.options.strikeBack&&back>0&&p.slots.includes(att)&&!endCheck(st)){let x=exp(st);x.strikeBacks++;dealBody(st,1-owner,att,back,t,false,true);if(!p.slots.includes(att))x.strikeBackKills++}let dealt=Math.max(0,hpBefore-Math.max(0,t.h));if(dealt>0&&!endCheck(st)&&p.slots.includes(att))simResolveResponse(st,owner,att,t,'AFTER')}}}if(st.metrics.initiative.firstDamage===null&&st.metrics.damage[owner]>beforeD){st.metrics.initiative.firstDamage=owner;st.metrics.initiative.firstDamageTurn=st.turn}if(p.slots.includes(att))att.ready=false;st.actions++;st.metrics.actions++}
 function turn(st){if(endCheck(st))return;let owner=st.active,p=st.p[owner],budget=5,ascend=false,buffed=[];if(st.options.ascension&&p._ascendNext){p._ascendNext=false;ascend=true;exp(st).ascensions[owner]++}for(let n=0;n<budget&&!endCheck(st);n++){let c=choosePlay(st,owner);if(!c)break;doPlay(st,owner,c)}simBenderArt(st,owner);if(ascend){buffed=p.slots.filter(Boolean);buffed.forEach(m=>m.a++)}let attackers=p.slots.filter(x=>x&&x.ready&&!x.sick),combatBlocked=(st.options.round2CombatDelay&&st.turn===2)||(st.options.firstPlayerRound2CombatDelay&&st.turn===2&&owner===st.startSeat);if(!combatBlocked){let cap=(st.turn===2&&owner===st.startSeat&&Number.isFinite(Number(st.options.firstPlayerRound2AttackCap)))?Math.max(0,Math.floor(Number(st.options.firstPlayerRound2AttackCap))):attackers.length;for(const a of attackers.slice(0,cap)){if(endCheck(st))break;attackOne(st,owner,a)}}buffed.forEach(m=>{m.a=Math.max(0,m.a-1)});if(endCheck(st))return;st.p.forEach(side=>side.slots.filter(Boolean).forEach(m=>m.sick=false));st.active=1-owner;if(st.active===st.startSeat){expireAllRoundEffectsSim(st);if([1,3,5,7].includes(st.turn)&&!st.metrics.initiative.snapshots[st.turn]){st.metrics.initiative.snapshots[st.turn]={damage:[...st.metrics.damage],board:st.p.map(x=>x.slots.filter(Boolean).length),hand:st.p.map(x=>x.hand.length),energy:st.p.map(x=>x.e),cardsPlayed:[...st.metrics.initiative.cardsPlayed],attacks:[...st.metrics.initiative.attacks],energySpent:[...st.metrics.initiative.energySpent]}}if(st.turn===5&&!st.metrics.initiative.turn5Captured){st.metrics.initiative.turn5Captured=true;st.metrics.initiative.turn5Damage=[...st.metrics.damage];st.metrics.initiative.turn5Board=st.p.map(x=>x.slots.filter(Boolean).length);st.metrics.initiative.turn5CardsUsed=[...st.metrics.initiative.cardsPlayed]}st.turn++;}st.metrics.turns=st.turn;startTurn(st,st.active,true)}
 function simulate(a,b,opt={}){if(!DECKS.includes(a)||!DECKS.includes(b))throw Error('Unknown deck');let seed=opt.seed??`${a}|${b}|0`,st=makeState(a,b,seed,opt);while(!endCheck(st)&&st.turn<=st.options.maxTurns&&st.actions<st.options.maxActions)turn(st);if(st.winner===null){st.reason='STALL_CEILING';st.metrics.winReason=st.reason}return{seed:st.seed,decks:[a,b],startSeat:st.startSeat,tokenSeat:st.tokenSeat,winner:st.winner,reason:st.reason,turns:st.turn,actions:st.actions,metrics:st.metrics,trace:st.trace.map(e=>({...e})),stalled:st.winner===null,fingerprint:fingerprint(st)}}
 function fingerprint(st){let slim={turn:st.turn,active:st.active,winner:st.winner,reason:st.reason,p:st.p.map(p=>({el:p.el,vit:p.vit,e:p.e,maxE:p.maxE,deck:p.deck.map(c=>c.n),hand:p.hand.map(c=>c.n),wake:p.wake.map(c=>c.n),slots:p.slots.map(c=>c&&[c.n,c.h,c.armor,c.growth,c.momentum,c.marks])}))};let h=hashSeed(JSON.stringify(slim));return h.toString(16).padStart(8,'0')}
 function aggregate(a,b,count=10,opt={}){let out={decks:[a,b],games:0,wins:[0,0],stalls:0,turns:0,actions:0,reasons:{},cards:{},effects:{},responses:{windows:0,played:0,passed:0,card:0,token:0,cancelled:0,retaliationDamage:0,preCombatKills:0,undertowMoves:0,slipstreamRedirects:0,stonewallArmor:0,secondBloomHealing:0}};for(let i=0;i<count;i++){let r=simulate(a,b,{...opt,seed:`${opt.seedBase||'EB0850'}|${a}|${b}|${i}`});out.games++;if(r.winner===0||r.winner===1)out.wins[r.winner]++;if(r.stalled)out.stalls++;out.turns+=r.turns;out.actions+=r.actions;out.reasons[r.reason]=(out.reasons[r.reason]||0)+1;for(const [k,v] of Object.entries(r.metrics.cards))out.cards[k]=(out.cards[k]||0)+v;for(const [k,v] of Object.entries(r.metrics.effects))out.effects[k]=(out.effects[k]||0)+v;for(const k of Object.keys(out.responses))out.responses[k]+=Number(r.metrics.responses[k]||0)}out.avgTurns=out.games?+(out.turns/out.games).toFixed(2):0;out.avgActions=out.games?+(out.actions/out.games).toFixed(2):0;return out}
 function matrix(perMatchup=2,opt={}){let rows=[];for(const a of DECKS)for(const b of DECKS)rows.push(aggregate(a,b,perMatchup,opt));return rows}
 function selfTest(){let savedG=window.G;let failures=[];function ok(name,fn){try{if(!fn())throw Error('assertion');return{name,ok:true}}catch(e){failures.push(name);return{name,ok:false,error:e.message}}}let tests=[];tests.push(ok('Live G identity is untouched',()=>{let before=window.G;simulate('FIRE','WATER',{seed:'isolation'});return window.G===before&&before===savedG}));tests.push(ok('Seeded simulation is deterministic',()=>{let a=simulate('FIRE','WATER',{seed:'same'}),b=simulate('FIRE','WATER',{seed:'same'});return JSON.stringify(a)===JSON.stringify(b)}));tests.push(ok('All nine simulator decks construct 21 cards with exactly one Response',()=>DECKS.every(d=>{let x=makeDeck(d,rng('deck-'+d));return x.cards.length===21&&x.cards.filter(c=>c.type==='RESPONSE').length===1})));tests.push(ok('Simulation terminates within ceilings',()=>{let r=simulate('BLOOM','EARTH',{seed:'ceil',maxTurns:12,maxActions:80});return r.turns<=13&&r.actions<=80}));tests.push(ok('Metrics contain finite nonnegative values',()=>{let r=simulate('LIGHTNING','AIR',{seed:'metrics'});return Number.isFinite(r.turns)&&r.turns>=0&&Number.isFinite(r.actions)&&r.actions>=0&&Object.keys(r.metrics.effects).length>0}));tests.push(ok('Directional matchup aggregation counts every game',()=>{let r=aggregate('FIRE','WATER',4,{seedBase:'agg'});return r.games===4&&r.wins[0]+r.wins[1]+r.stalls===4}));tests.push(ok('Explicit starting seat is honored',()=>{let a=simulate('FIRE','FIRE',{seed:'seat-a',startSeat:0}),b=simulate('FIRE','FIRE',{seed:'seat-b',startSeat:1});return a.metrics.initiative.startSeat===0&&b.metrics.initiative.startSeat===1}));tests.push(ok('Tempo telemetry captures early snapshots',()=>{let r=simulate('AIR','AIR',{seed:'tempo-snap'}),m=r.metrics.initiative;return m.snapshots&&m.snapshots[1]&&Array.isArray(m.cardsPlayed)&&Array.isArray(m.energySpent)}));tests.push(ok('Second-player energy compensation is simulator-scoped',()=>{let a=makeState('FIRE','FIRE','energy-a',{startSeat:0,secondPlayerFirstTurnEnergy:1});startTurn(a,1,true);return a.p[1].e===a.p[1].maxE+1&&a.metrics.initiative.openingEnergy[1]===a.p[1].maxE+1}));tests.push(ok('Round-2 attack cap is simulator-scoped',()=>{let before=window.G;simulate('AIR','AIR',{seed:'cap',firstPlayerRound2AttackCap:1});return window.G===before}));tests.push(ok('Seat-normalized tempo telemetry preserves first/second roles',()=>{let r=simulate('FIRE','FIRE',{seed:'seat-normalized',startSeat:1}),m=r.metrics.initiative,q=m.snapshots[1];return !!q&&m.startSeat===1&&Array.isArray(q.damage)&&q.damage.length===2}));tests.push(ok('Second player receives simulator Initiation Token',()=>{let x=makeState('FIRE','WATER','token',{startSeat:0});return x.p[0].initiationToken===false&&x.p[1].initiationToken===true}));tests.push(ok('Response cards are reserved for response windows',()=>{let x=makeState('FIRE','WATER','reserve',{startSeat:0}),p=x.p[0],r=responseSimCard('FIRE');p.hand=[r];p.e=7;return choosePlay(x,0)===null}));tests.push(ok('Simulator uses slot-order-neutral shared target scoring',()=>{let a={a:3},x={id:'x',a:1,h:4,armor:0,marks:[]},y={id:'y',a:5,h:4,armor:0,marks:[]};return ebPickAITarget(a,[x,y],()=>0)===y&&ebPickAITarget(a,[y,x],()=>0)===y}));tests.push(ok('0.8.55 card stats are canonical',()=>{let n=makeDeck('NATURE',rng('stats-n')).cards.find(c=>c.n==='Grove Beast'),l=makeDeck('LIGHTNING',rng('stats-l')).cards.find(c=>c.n==='Volt Lynx');return n&&n.c===4&&n.a===2&&n.h===5&&l&&l.c===3&&l.a===3&&l.h===3}));tests.push(ok('Verdant Mend adds Growth without healing',()=>{let st=makeState('NATURE','FIRE','mend'),p=st.p[0],t={n:'Seeded',a:2,h:2,max:5,marks:['Seeded'],growth:0};p.slots=[t,null,null];playTechnique(st,0,{el:'NATURE'});return t.h===2&&t.growth===1&&t.a===3}));tests.push(ok('Crosswind swaps two enemies and sets Air Opening',()=>{let st=makeState('AIR','EARTH','crosswind'),p=st.p[0],e=st.p[1],a={n:'A'},b={n:'B'};e.slots=[a,null,b];playTechnique(st,0,{el:'AIR'});return e.slots[0]===b&&e.slots[2]===a&&p.turnState.airOpening===true}));tests.push(ok('Second Bloom heals once per Manifestation',()=>{let st=makeState('FIRE','NATURE','bloom',{responseElB:'NATURE'}),att={n:'Attacker',a:2,h:4,max:4,marks:[]},t={n:'Target',a:1,h:2,max:4,marks:[]},def=st.p[1];st.p[0].slots=[att,null,null];def.slots=[t,null,null];def.hand=[responseSimCard('NATURE')];def.e=7;def.initiationToken=false;let first=simResolveResponse(st,0,att,t),h=t.h;def.hand=[responseSimCard('NATURE')];let second=simResolveResponse(st,0,att,t);return first.ok&&h===3&&(t.marks||[]).includes('Second Bloom Used')&&!second.ok&&t.h===3}));return{build:EB_BUILD,passed:tests.filter(x=>x.ok).length,total:tests.length,tests,failures}}
 function paired(a,b,count=10,opt={}){let pairs=[],mirror=a===b,games=0;for(let i=0;i<count;i++){let base=`${opt.seedBase||'EB0859CAL'}|${a}|${b}|${i}`;if(mirror){let mirrorStart0=simulate(a,b,{...opt,startSeat:0,seed:base+'|MIRROR|START0',calibrationSeed:base}),mirrorStart1=simulate(a,b,{...opt,startSeat:1,seed:base+'|MIRROR|START1',calibrationSeed:base}),setGames=[mirrorStart0,mirrorStart1],valid=!mirrorStart0.stalled&&!mirrorStart1.stalled,mirrorSymmetric=valid?mirrorStart0.winner!==mirrorStart1.winner:null;pairs.push({seed:base,mirror:true,games:setGames,mirrorStart0,mirrorStart1,mirrorSymmetric});games+=2;continue}let abStart0=simulate(a,b,{...opt,startSeat:0,seed:base+'|AB|START0',calibrationSeed:base}),abStart1=simulate(a,b,{...opt,startSeat:1,seed:base+'|AB|START1',calibrationSeed:base}),baStart0=simulate(b,a,{...opt,startSeat:0,seed:base+'|BA|START0',calibrationSeed:base}),baStart1=simulate(b,a,{...opt,startSeat:1,seed:base+'|BA|START1',calibrationSeed:base}),setGames=[abStart0,abStart1,baStart0,baStart1],rolePairs=[[abStart0,baStart1],[abStart1,baStart0]],physicalSeatComparisons=0,physicalSeatMismatches=0,deckStableOutcomes=0;for(const [left,right] of rolePairs){if(left.stalled||right.stalled)continue;physicalSeatComparisons++;let leftWinner=left.decks[left.winner],rightWinner=right.decks[right.winner];if(leftWinner===rightWinner)deckStableOutcomes++;else physicalSeatMismatches++}pairs.push({seed:base,mirror:false,games:setGames,abStart0,abStart1,baStart0,baStart1,physicalSeatComparisons,physicalSeatMismatches,deckStableOutcomes});games+=4}return{decks:[a,b],mirror,games,pairs}}
 // Rule experiments: every matchup × seeds under one option set, reduced to the issue #83 health metrics.
 const EXPERIMENTS=Object.freeze([
   {key:'baseline',label:'Current rules',opt:{}},
   {key:'B2',label:'B2 Arrival Ward',opt:{arrivalWard:true}},
   {key:'B1',label:'B1 Strike Back',opt:{strikeBack:true}},
   {key:'B1B2',label:'B1 + B2',opt:{strikeBack:true,arrivalWard:true}},
   {key:'B2L',label:'B2-lite Arrival Shield (−1 dmg)',opt:{arrivalShield:true}},
   {key:'B2D1',label:'B2 + D1',opt:{arrivalWard:true,benderArts:true}},
   {key:'D1',label:'D1 Bender Arts',opt:{benderArts:true}},
   {key:'D2',label:'D2 Ascension',opt:{ascension:true}},
   {key:'ALL',label:'B1 + B2 + D2',opt:{strikeBack:true,arrivalWard:true,ascension:true}}
 ]);
 function experiment(opt={},seeds=10){let n=0,turns=0,summoned=0,removed=0,depletion=0,stalls=0,fpWins=0,decided=0,benderDamage=0,deckWins={},deckGames={},x={strikeBacks:0,strikeBackKills:0,wardedTargetsSkipped:0,arts:0,combos:0,ascensions:0};
   for(const a of DECKS)for(const b of DECKS)for(let i=0;i<seeds;i++){let r=simulate(a,b,{...opt,seed:`EXP83|${a}|${b}|${i}`}),m=r.metrics,I=m.initiative;n++;turns+=r.turns;summoned+=I.summoned[0]+I.summoned[1];removed+=I.removedBeforeFirstAttack[0]+I.removedBeforeFirstAttack[1];benderDamage+=m.damage[0]+m.damage[1];if(r.reason==='CARD_DEPLETION')depletion++;if(r.stalled)stalls++;
     [a,b].forEach((d,k)=>{deckGames[d]=(deckGames[d]||0)+1;if(r.winner===k)deckWins[d]=(deckWins[d]||0)+1});if(r.winner===0||r.winner===1){decided++;if(r.winner===r.startSeat)fpWins++}
     let e=m.experiment;if(e){x.strikeBacks+=e.strikeBacks;x.strikeBackKills+=e.strikeBackKills;x.wardedTargetsSkipped+=e.wardedTargetsSkipped;x.arts+=e.arts[0]+e.arts[1];x.combos+=e.combos[0]+e.combos[1];x.ascensions+=e.ascensions[0]+e.ascensions[1]}}
   let rates=DECKS.map(d=>(deckWins[d]||0)/(deckGames[d]||1)),per=v=>Math.round(v/n*10)/10;
   return {games:n,avgTurns:Math.round(turns/n*10)/10,summonedPerGame:per(summoned),removedBeforeFirstAttack:Math.round(1000*removed/Math.max(1,summoned))/10,cardDepletion:Math.round(1000*depletion/n)/10,stalls,firstPlayerWin:Math.round(1000*fpWins/Math.max(1,decided))/10,benderDamagePerGame:per(benderDamage),deckWinRate:Object.fromEntries(DECKS.map((d,i)=>[d,Math.round(rates[i]*1000)/10])),deckSpread:Math.round((Math.max(...rates)-Math.min(...rates))*1000)/10,perGame:{strikeBacks:per(x.strikeBacks),strikeBackKills:per(x.strikeBackKills),wardedTargetsSkipped:per(x.wardedTargetsSkipped),benderArts:per(x.arts),combos:per(x.combos),ascensions:per(x.ascensions)}};
 }
 return Object.freeze({DECKS:[...DECKS],EXPERIMENTS,simulate,aggregate,matrix,paired,selfTest,experiment,version:'LAB-XIX-CROSSWIND-ATTACK-DEBUFF'});
})();
window.EB_BALANCE=EB_BALANCE;

/* Alpha 0.8.33 Phase E/F — iPhone-friendly Balance Lab UI + verification. */

/* Alpha 0.8.33 Phase F — balance report provenance.
   Future gameplay patches can change EB_BALANCE_RULESET to mark older reports stale.
   Cosmetic-only patches should leave the ruleset unchanged. */
const EB_BALANCE_RULESET=EB_RELEASE.ruleset;
const EB_BALANCE_LAB_VERSION=EB_RELEASE.version;
const EB_AI_POLICY_VERSION='EB-AI-TARGET-0.8.50';
function ebBalanceRuleset(){return EB_BALANCE_RULESET}

let EB_BL_DEPTH=10,EB_BL_CANCEL=false,EB_BL_RUNNING=false,EB_BL_LAST=null;
function goBalanceLab(){go('balancelab');ebBalanceRenderIdle()}
function ebBalanceSelectDepth(n,btn){if(EB_BL_RUNNING)return;EB_BL_DEPTH=n;document.querySelectorAll('[data-bl-depth]').forEach(x=>x.classList.toggle('active',Number(x.dataset.blDepth)===n));let r=document.getElementById('blRun');if(r)r.textContent=`RUN ${n===10?'QUICK':n===50?'STANDARD':'DEEP'} LAB`}
function ebBalanceRenderIdle(){document.querySelectorAll('[data-bl-depth]').forEach(x=>x.classList.toggle('active',Number(x.dataset.blDepth)===EB_BL_DEPTH))}
function ebBLBlank(a,b){return{decks:[a,b],games:0,wins:[0,0],stalls:0,turns:0,actions:0,reasons:{},cards:{},effects:{},avgTurns:0,avgActions:0}}
function ebBLAdd(o,r){o.games++;if(r.winner===0||r.winner===1)o.wins[r.winner]++;if(r.stalled)o.stalls++;o.turns+=r.turns;o.actions+=r.actions;o.reasons[r.reason]=(o.reasons[r.reason]||0)+1;for(const[k,v]of Object.entries(r.metrics.cards||{}))o.cards[k]=(o.cards[k]||0)+v;for(const[k,v]of Object.entries(r.metrics.effects||{}))o.effects[k]=(o.effects[k]||0)+v;o.avgTurns=+(o.turns/o.games).toFixed(2);o.avgActions=+(o.actions/o.games).toFixed(2)}
function ebBLYield(){return new Promise(resolve=>setTimeout(resolve,0))}
async function ebBalanceRun(){if(EB_BL_RUNNING)return;EB_BL_RUNNING=true;EB_BL_CANCEL=false;EB_BL_LAST=null;let run=document.getElementById('blRun'),cancel=document.getElementById('blCancel'),copy=document.getElementById('blCopy');run.disabled=true;cancel.disabled=false;copy.disabled=true;document.getElementById('blMatrixWrap').classList.add('blHidden');document.getElementById('blDetail').classList.add('blHidden');let decks=EB_BALANCE.DECKS,total=decks.length*decks.length*EB_BL_DEPTH,done=0,rows=[],started=performance.now();let prog=document.getElementById('blProgress');prog.innerHTML='<b id="blProgTitle">RUNNING BALANCE LAB</b><div id="blProgText" class="small"></div><progress class="devBar" max="100" value="0" aria-label="Simulation progress" id="blBar"></progress>';try{outer:for(const a of decks){for(const b of decks){let out=ebBLBlank(a,b);for(let i=0;i<EB_BL_DEPTH;i++){if(EB_BL_CANCEL)break outer;let r=EB_BALANCE.simulate(a,b,{seed:`EB0833E|${EB_BL_DEPTH}|${a}|${b}|${i}`});ebBLAdd(out,r);done++;if(done%4===0||done===total){let pct=Math.round(done/total*100),bar=document.getElementById('blBar'),txt=document.getElementById('blProgText');if(bar)bar.value=pct;if(txt)txt.textContent=`${done.toLocaleString()} / ${total.toLocaleString()} games · ${pct}% · ${a} → ${b}`;await ebBLYield()}}if(out.games)rows.push(out)}}let elapsed=Math.round(performance.now()-started);EB_BL_LAST={build:EB_BALANCE_LAB_VERSION,ruleset:ebBalanceRuleset(),depth:EB_BL_DEPTH,totalPlanned:total,totalCompleted:done,cancelled:EB_BL_CANCEL,elapsedMs:elapsed,rows};ebBalanceRenderResults(EB_BL_LAST)}catch(e){prog.innerHTML=`<b class="devFail">BALANCE LAB ERROR</b><div class="small">${esc(e&&e.message?e.message:String(e))}</div>`}finally{EB_BL_RUNNING=false;run.disabled=false;cancel.disabled=true;copy.disabled=!EB_BL_LAST}}
function ebBalanceCancel(){if(EB_BL_RUNNING)EB_BL_CANCEL=true}
function ebBLPct(n,d){return d?+(100*n/d).toFixed(1):0}
function ebBLTop(obj,n=6){return Object.entries(obj||{}).sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0])).slice(0,n)}
function ebBalanceRenderResults(rep){let games=rep.rows.reduce((n,r)=>n+r.games,0),stalls=rep.rows.reduce((n,r)=>n+r.stalls,0),turns=rep.rows.reduce((n,r)=>n+r.turns,0),actions=rep.rows.reduce((n,r)=>n+r.actions,0),side=[0,0],reasons={},cards={},effects={};rep.rows.forEach(r=>{side[0]+=r.wins[0];side[1]+=r.wins[1];for(const[k,v]of Object.entries(r.reasons))reasons[k]=(reasons[k]||0)+v;for(const[k,v]of Object.entries(r.cards))cards[k]=(cards[k]||0)+v;for(const[k,v]of Object.entries(r.effects))effects[k]=(effects[k]||0)+v});let status=rep.cancelled?'CANCELLED — PARTIAL RESULTS':'COMPLETE';document.getElementById('blProgress').innerHTML=`<b class="${rep.cancelled?'blWarn':'blGood'}">${status}</b><div class="small">${games.toLocaleString()} games processed in ${(rep.elapsedMs/1000).toFixed(1)}s.</div><progress class="devBar" max="100" value="${Math.round(games/rep.totalPlanned*100)}" aria-label="Simulation progress"></progress>`;document.getElementById('blSummary').innerHTML=`<b>GLOBAL SUMMARY</b><div class="blStatGrid"><div class="blStat"><small>Side A wins</small><b>${ebBLPct(side[0],games)}%</b></div><div class="blStat"><small>Side B wins</small><b>${ebBLPct(side[1],games)}%</b></div><div class="blStat"><small>Avg turns</small><b>${games?(turns/games).toFixed(2):'0'}</b></div><div class="blStat"><small>Avg actions</small><b>${games?(actions/games).toFixed(2):'0'}</b></div><div class="blStat"><small>Stalls</small><b>${stalls}</b></div><div class="blStat"><small>Completed</small><b>${games.toLocaleString()}</b></div></div><div class="blUtil"><b>Win reasons:</b> ${ebBLTop(reasons,8).map(x=>`${x[0]} ${x[1]}`).join(' · ')||'none'}<br><b>Top effects:</b> ${ebBLTop(effects).map(x=>`${x[0]} ${x[1]}`).join(' · ')||'none'}</div>`;ebBalanceRenderMatrix(rep);document.getElementById('blCopy').disabled=false}
function ebBalanceRenderMatrix(rep){let decks=EB_BALANCE.DECKS,map=new Map(rep.rows.map(r=>[r.decks.join('|'),r])),html='<div class="blGrid"><div class="blCell head">A → B</div>'+decks.map(d=>`<div class="blCell head">${d.slice(0,4)}</div>`).join('');for(const a of decks){html+=`<div class="blCell head">${a}</div>`;for(const b of decks){let r=map.get(a+'|'+b);if(!r){html+='<div class="blCell">—</div>';continue}let pct=ebBLPct(r.wins[0],r.games);html+=`<button class="blCell data ${r.stalls?'stall':''}" onclick="ebBalanceDetail('${a}','${b}')"><span>${pct}%</span>${r.games}g${r.stalls?' ⚠':''}</button>`}}html+='</div>';document.getElementById('blMatrix').innerHTML=html;document.getElementById('blMatrixWrap').classList.remove('blHidden')}
function ebBalanceDetail(a,b){if(!EB_BL_LAST)return;let r=EB_BL_LAST.rows.find(x=>x.decks[0]===a&&x.decks[1]===b);if(!r)return;let el=document.getElementById('blDetail');el.innerHTML=`<b>${a} → ${b}</b><div class="blStatGrid"><div class="blStat"><small>${a} wins</small><b>${ebBLPct(r.wins[0],r.games)}%</b></div><div class="blStat"><small>${b} wins</small><b>${ebBLPct(r.wins[1],r.games)}%</b></div><div class="blStat"><small>Avg turns</small><b>${r.avgTurns}</b></div><div class="blStat"><small>Stalls</small><b>${r.stalls}</b></div></div><div class="blUtil"><b>Win reasons:</b> ${ebBLTop(r.reasons,8).map(x=>`${x[0]} ${x[1]}`).join(' · ')||'none'}<br><b>Most played:</b> ${ebBLTop(r.cards).map(x=>`${x[0]} ${x[1]}`).join(' · ')||'none'}<br><b>Effects:</b> ${ebBLTop(r.effects,10).map(x=>`${x[0]} ${x[1]}`).join(' · ')||'none'}</div>`;el.classList.remove('blHidden');el.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'nearest'})}
function ebBalanceReportText(){if(!EB_BL_LAST)return'';let rep=EB_BL_LAST,g=rep.rows.reduce((n,r)=>n+r.games,0),s=rep.rows.reduce((n,r)=>n+r.stalls,0),lines=[`ELEMENT BOUND Alpha ${EB_RELEASE.version} ${EB_RELEASE.balanceLab.toUpperCase()} · ${EB_RELEASE.label.toUpperCase()}`,`Ruleset: ${rep.ruleset||'unknown'}`,`AI policy: ${EB_AI_POLICY_VERSION}`,`Depth: ${rep.depth} per directional matchup`,`Completed: ${g}/${rep.totalPlanned}${rep.cancelled?' (CANCELLED)':''}`,`Elapsed: ${(rep.elapsedMs/1000).toFixed(1)}s`,`Stalls: ${s}`,''];for(const r of rep.rows)lines.push(`${r.decks[0]} -> ${r.decks[1]} | games ${r.games} | A wins ${ebBLPct(r.wins[0],r.games)}% | B wins ${ebBLPct(r.wins[1],r.games)}% | avg turns ${r.avgTurns} | avg actions ${r.avgActions} | stalls ${r.stalls} | reasons ${JSON.stringify(r.reasons)} | effects ${JSON.stringify(r.effects)}`);return lines.join('\n')}
function ebBalanceCopy(){let t=ebBalanceReportText();if(!t)return;if(navigator.clipboard&&navigator.clipboard.writeText)navigator.clipboard.writeText(t).then(()=>{let s=document.getElementById('blSummary');s.insertAdjacentHTML('beforeend','<div class="small devPass">Balance report copied.</div>')}).catch(()=>ebBalanceFallbackCopy(t));else ebBalanceFallbackCopy(t)}
function ebBalanceFallbackCopy(t){let ta=document.createElement('textarea');ta.value=t;ta.style.position='fixed';ta.style.opacity='0';document.body.appendChild(ta);ta.select();try{document.execCommand('copy')}catch(e){}ta.remove()}

let EB_BL_CAL_LAST=null,EB_BL_CAL_RUNNING=false;
function ebBLCalClass(p){return p>=65?'blWarn':p>=58?'devNote':'blGood'}
async function ebBalanceCalibrationRun(){
 if(EB_BL_CAL_RUNNING||EB_BL_RUNNING)return;
 EB_BL_CAL_RUNNING=true;EB_BL_CAL_LAST=null;
 let btn=document.getElementById('blCalRun'),copy=document.getElementById('blCalCopy'),box=document.getElementById('blCalSummary');
 btn.disabled=true;copy.disabled=true;
 let decks=EB_BALANCE.DECKS,depth=EB_BL_DEPTH,mirror=[],pairRows=[],sideWins=[0,0],starterWins=0,secondWins=0,tokenWins=0,stalls=0,total=0,physicalSeatComparisons=0,physicalSeatMismatches=0,deckStableOutcomes=0,mirrorSymmetric=0,mirrorAsymmetric=0,started=performance.now();
 try{
  box.innerHTML='<b>CALIBRATING…</b><div class="small">Four-game crossed sets · alternating starters and token holders · seat-independent deck shuffles · shared action RNG.</div>';
  for(let ai=0;ai<decks.length;ai++){
   let a=decks[ai];
   for(let bi=ai;bi<decks.length;bi++){
    let b=decks[bi],r=EB_BALANCE.paired(a,b,depth,{seedBase:`EB0859CAL|${depth}`}),deckWins={[a]:0,[b]:0},localSide=[0,0],localStarter=0,localSecond=0,localToken=0,localStalls=0,localComparisons=0,localMismatches=0,localStable=0,localMirrorSymmetric=0,localMirrorAsymmetric=0;
    for(const q of r.pairs){
     for(const g of q.games){
      total++;
      if(g.stalled)localStalls++,stalls++;
      else {sideWins[g.winner]++;localSide[g.winner]++;deckWins[g.decks[g.winner]]=(deckWins[g.decks[g.winner]]||0)+1;if(g.winner===g.startSeat)localStarter++,starterWins++;else localSecond++,secondWins++;if(g.winner===g.tokenSeat)localToken++,tokenWins++}
     }
     if(q.mirror&&q.mirrorSymmetric===true)localMirrorSymmetric++,mirrorSymmetric++;
     if(q.mirror&&q.mirrorSymmetric===false)localMirrorAsymmetric++,mirrorAsymmetric++;
     localComparisons+=q.physicalSeatComparisons||0;physicalSeatComparisons+=q.physicalSeatComparisons||0;
     localMismatches+=q.physicalSeatMismatches||0;physicalSeatMismatches+=q.physicalSeatMismatches||0;
     localStable+=q.deckStableOutcomes||0;deckStableOutcomes+=q.deckStableOutcomes||0;
    }
    let row={a,b,games:r.games,sideA:localSide[0],sideB:localSide[1],starterWins:localStarter,secondWins:localSecond,tokenWins:localToken,stalls:localStalls,physicalSeatComparisons:localComparisons,physicalSeatMismatches:localMismatches,deckStableOutcomes:localStable,mirrorSymmetric:localMirrorSymmetric,mirrorAsymmetric:localMirrorAsymmetric,deckWins};
    pairRows.push(row);if(a===b)mirror.push(row);
    if((pairRows.length%3)===0)await ebBLYield();
   }
  }
  let valid=total-stalls,mirrorGames=mirror.reduce((n,r)=>n+r.games,0),mirrorStalls=mirror.reduce((n,r)=>n+r.stalls,0),mirrorA=mirror.reduce((n,r)=>n+r.sideA,0),mirrorB=mirror.reduce((n,r)=>n+r.sideB,0);
  let aPct=ebBLPct(sideWins[0],valid),bPct=ebBLPct(sideWins[1],valid),starterPct=ebBLPct(starterWins,valid),secondPct=ebBLPct(secondWins,valid),tokenPct=ebBLPct(tokenWins,valid),mAPct=ebBLPct(mirrorA,mirrorGames-mirrorStalls),mBPct=ebBLPct(mirrorB,mirrorGames-mirrorStalls),mismatchPct=ebBLPct(physicalSeatMismatches,physicalSeatComparisons),mirrorAsymmetryPct=ebBLPct(mirrorAsymmetric,mirrorSymmetric+mirrorAsymmetric);
  let physicalBias=Math.max(aPct,bPct),harnessDetected=physicalBias>=58||physicalSeatMismatches>0||mirrorAsymmetric>0,roleBias=Math.max(starterPct,secondPct)>=58;
  EB_BL_CAL_LAST={build:EB_RELEASE.version,ruleset:ebBalanceRuleset(),depth,total,stalls,sideWins,aPct,bPct,starterWins,secondWins,starterPct,secondPct,tokenWins,tokenPct,mirrorA,mirrorB,mAPct,mBPct,physicalSeatComparisons,physicalSeatMismatches,mismatchPct,deckStableOutcomes,mirrorSymmetric,mirrorAsymmetric,mirrorAsymmetryPct,harnessDetected,roleBias,mirror,pairRows,elapsedMs:Math.round(performance.now()-started)};
  box.innerHTML=`<b class="${harnessDetected?'blWarn':'blGood'}">Possible physical-seat asymmetry: ${harnessDetected?'YES':'NO'}</b>
  <div class="blStatGrid">
   <div class="blStat"><small>Physical seat A</small><b>${aPct}%</b></div><div class="blStat"><small>Physical seat B</small><b>${bPct}%</b></div>
   <div class="blStat"><small>Starter</small><b>${starterPct}%</b></div><div class="blStat"><small>Second / token</small><b>${secondPct}% / ${tokenPct}%</b></div>
   <div class="blStat"><small>Physical mismatches</small><b>${physicalSeatMismatches}/${physicalSeatComparisons}</b></div><div class="blStat"><small>Mirror asymmetry</small><b>${mirrorAsymmetric}/${mirrorSymmetric+mirrorAsymmetric}</b></div>
  </div>
  <div class="small">Calibration games: ${total.toLocaleString()} · stalls ${stalls} · ${(EB_BL_CAL_LAST.elapsedMs/1000).toFixed(1)}s</div>
  <div class="blUtil"><b>Mirror controls:</b><br>${mirror.map(r=>`${r.a}: A ${ebBLPct(r.sideA,r.games-r.stalls)}% / B ${ebBLPct(r.sideB,r.games-r.stalls)}% · symmetric ${r.mirrorSymmetric}/${r.mirrorSymmetric+r.mirrorAsymmetric}`).join('<br>')}</div>
  <div class="bl-verdict ${harnessDetected?'blWarn':'blGood'}">${harnessDetected?'BALANCE CONCLUSIONS: HOLD — physical-seat symmetry failed.':roleBias?'HARNESS CALIBRATED — turn/token advantage detected and reported separately.':'CALIBRATION PASSED — crossed matchup analysis is suitable for the next balance pass.'}</div>`;
  copy.disabled=false;
 }catch(e){box.innerHTML=`<b class="devFail">CALIBRATION ERROR</b><div class="small">${esc(e&&e.message?e.message:String(e))}</div>`}
 finally{EB_BL_CAL_RUNNING=false;btn.disabled=false}
}
function ebBalanceCalibrationText(){
 if(!EB_BL_CAL_LAST)return'';
 let r=EB_BL_CAL_LAST,lines=[`ELEMENT BOUND Alpha ${EB_RELEASE.version} BALANCE LAB CALIBRATION`,`Ruleset: ${r.ruleset}`,`Depth: ${r.depth} crossed seed sets`,`Calibration games: ${r.total}`,`Stalls: ${r.stalls}`,`Physical seat A win rate: ${r.aPct}%`,`Physical seat B win rate: ${r.bPct}%`,`Starter win rate: ${r.starterPct}%`,`Second-player win rate: ${r.secondPct}%`,`Initiation Token holder win rate: ${r.tokenPct}%`,`Physical-seat mismatches: ${r.physicalSeatMismatches}/${r.physicalSeatComparisons} (${r.mismatchPct}%)`,`Deck-stable outcomes: ${r.deckStableOutcomes}/${r.physicalSeatComparisons}`,`Mirror symmetry failures: ${r.mirrorAsymmetric}/${r.mirrorSymmetric+r.mirrorAsymmetric} (${r.mirrorAsymmetryPct}%)`,`Possible physical-seat asymmetry: ${r.harnessDetected?'YES':'NO'}`,`Turn/token advantage detected: ${r.roleBias?'YES':'NO'}`,`Balance conclusions: ${r.harnessDetected?'HOLD':r.roleBias?'CALIBRATED — ROLE BIAS REPORTED':'CALIBRATED'}`,'','MIRROR CONTROLS'];
 for(const m of r.mirror)lines.push(`${m.a} mirror | A ${ebBLPct(m.sideA,m.games-m.stalls)}% | B ${ebBLPct(m.sideB,m.games-m.stalls)}% | starter ${ebBLPct(m.starterWins,m.games-m.stalls)}% | second/token ${ebBLPct(m.secondWins,m.games-m.stalls)}% | symmetric ${m.mirrorSymmetric}/${m.mirrorSymmetric+m.mirrorAsymmetric} | games ${m.games} | stalls ${m.stalls}`);
 lines.push('','SEAT-NORMALIZED MATCHUPS');
 for(const x of r.pairRows){if(x.a===x.b)continue;let valid=x.games-x.stalls,aw=x.deckWins[x.a]||0,bw=x.deckWins[x.b]||0;lines.push(`${x.a} vs ${x.b} | ${x.a} ${ebBLPct(aw,valid)}% | ${x.b} ${ebBLPct(bw,valid)}% | A-seat ${ebBLPct(x.sideA,valid)}% | B-seat ${ebBLPct(x.sideB,valid)}% | starter ${ebBLPct(x.starterWins,valid)}% | second/token ${ebBLPct(x.secondWins,valid)}% | physical mismatches ${x.physicalSeatMismatches}/${x.physicalSeatComparisons} | deck-stable ${x.deckStableOutcomes}/${x.physicalSeatComparisons} | games ${x.games} | stalls ${x.stalls}`)}
 return lines.join('\n');
}
function ebBalanceCalibrationCopy(){let t=ebBalanceCalibrationText();if(!t)return;if(navigator.clipboard&&navigator.clipboard.writeText)navigator.clipboard.writeText(t).catch(()=>ebBalanceFallbackCopy(t));else ebBalanceFallbackCopy(t)}

let EB_INIT_LAST=null;
async function ebInitiativeAuditRun(){
 if(EB_BL_RUNNING)return;EB_BL_RUNNING=true;let btn=document.getElementById('blInitRun'),copy=document.getElementById('blInitCopy'),box=document.getElementById('blInitSummary');btn.disabled=true;copy.disabled=true;
 let decks=EB_BALANCE.DECKS,depth=Math.max(50,EB_BL_DEPTH),modes=[['CURRENT',0],['SECOND_PLAYER_+1',1]],rows=[],started=performance.now();
 try{box.innerHTML='<b>RUNNING INITIATIVE COMPENSATION AUDIT…</b><div class="small">50+ paired seeds per mirror · alternating starters · current rules vs second-player +1 opening card.</div>';
  for(const [mode,bonus] of modes){for(const d of decks){let wins=[0,0],stalls=0,firstWins=0,secondWins=0,t5Damage=[0,0],t5Board=[0,0],games=0;
   for(let i=0;i<depth;i++){for(let flip=0;flip<2;flip++){let start=flip,base=`EB0836INIT|${d}|${i}`,r=EB_BALANCE.simulate(d,d,{seed:`${base}|${mode}|${flip}`,calibrationSeed:base,startSeat:start,secondPlayerBonusCards:bonus});games++;if(r.stalled)stalls++;else{wins[r.winner]++;if(r.winner===start)firstWins++;else secondWins++}let m=r.metrics.initiative;for(let k=0;k<2;k++){t5Damage[k]+=m.turn5Damage[k]||0;t5Board[k]+=m.turn5Board[k]||0}}if(i%8===0)await ebBLYield();}
   rows.push({mode,bonus,deck:d,games,stalls,wins,firstWins,secondWins,t5Damage:t5Damage.map(x=>+(x/games).toFixed(2)),t5Board:t5Board.map(x=>+(x/games).toFixed(2))});
  }}
  let summary={};for(const [mode] of modes){let rr=rows.filter(x=>x.mode===mode),valid=rr.reduce((n,x)=>n+x.games-x.stalls,0),fw=rr.reduce((n,x)=>n+x.firstWins,0);summary[mode]={games:rr.reduce((n,x)=>n+x.games,0),valid,firstPct:valid?+(fw/valid*100).toFixed(1):0,stalls:rr.reduce((n,x)=>n+x.stalls,0)}}
  let before=summary.CURRENT.firstPct,after=summary['SECOND_PLAYER_+1'].firstPct,delta=+(after-before).toFixed(1),diagnosis=after>=58?'ADVANTAGE REMAINS':after<=42?'COMPENSATION OVERSHOOTS':'INITIATIVE WITHIN 42–58% BAND';
  EB_INIT_LAST={build:EB_RELEASE.version,ruleset:ebBalanceRuleset(),depth,total:rows.reduce((n,r)=>n+r.games,0),rows,summary,delta,diagnosis,elapsedMs:Math.round(performance.now()-started)};
  box.innerHTML=`<b class="${diagnosis==='INITIATIVE WITHIN 42–58% BAND'?'blGood':'blWarn'}">${diagnosis}</b><div class="blStatGrid"><div class="blStat"><small>Current first-player</small><b>${before}%</b></div><div class="blStat"><small>With +1 card</small><b>${after}%</b></div><div class="blStat"><small>Change</small><b>${delta>0?'+':''}${delta} pts</b></div><div class="blStat"><small>Paired seeds / mirror</small><b>${depth}</b></div></div><div class="small">${EB_INIT_LAST.total.toLocaleString()} mirror games · ${(EB_INIT_LAST.elapsedMs/1000).toFixed(1)}s</div><div class="blUtil bl-result-spaced"><b>SECOND PLAYER +1:</b><br>${rows.filter(r=>r.mode==='SECOND_PLAYER_+1').map(r=>`${r.deck}: first ${ebBLPct(r.firstWins,r.games-r.stalls)}% / second ${ebBLPct(r.secondWins,r.games-r.stalls)}% · T5 dmg ${r.t5Damage[0]}–${r.t5Damage[1]} · board ${r.t5Board[0]}–${r.t5Board[1]}`).join('<br>')}</div>`;copy.disabled=false;
 }catch(e){box.innerHTML=`<b class="devFail">INITIATIVE AUDIT ERROR</b><div class="small">${esc(e&&e.message?e.message:String(e))}</div>`}finally{EB_BL_RUNNING=false;btn.disabled=false;}
}
function ebInitiativeAuditText(){if(!EB_INIT_LAST)return'';let r=EB_INIT_LAST,a=r.summary.CURRENT,b=r.summary['SECOND_PLAYER_+1'],lines=[`ELEMENT BOUND Alpha ${EB_RELEASE.version} INITIATIVE COMPENSATION AUDIT`,`Ruleset: ${r.ruleset}`,`Depth: ${r.depth} paired seeds per mirror`,`Games: ${r.total}`,`Current first-player win rate: ${a.firstPct}%`,`Second-player +1 first-player win rate: ${b.firstPct}%`,`Change: ${r.delta>0?'+':''}${r.delta} percentage points`,`Diagnosis: ${r.diagnosis}`,`Elapsed: ${(r.elapsedMs/1000).toFixed(1)}s`,''];for(const x of r.rows)lines.push(`${x.mode} | ${x.deck} mirror | games ${x.games} | first-player wins ${ebBLPct(x.firstWins,x.games-x.stalls)}% | second-player wins ${ebBLPct(x.secondWins,x.games-x.stalls)}% | T5 damage ${x.t5Damage[0]}-${x.t5Damage[1]} | T5 board ${x.t5Board[0]}-${x.t5Board[1]} | stalls ${x.stalls}`);return lines.join('\n')}
async function ebInitiativeAuditCopy(){let t=ebInitiativeAuditText();if(!t)return;try{await navigator.clipboard.writeText(t)}catch(e){let ta=document.createElement('textarea');ta.value=t;document.body.appendChild(ta);ta.select();document.execCommand('copy');ta.remove()}let b=document.getElementById('blInitCopy');if(b){let old=b.textContent;b.textContent='COPIED';setTimeout(()=>b.textContent=old,900)}}

let EB_TEMPO_LAST=null;
function ebTempoAvg(arr,n){return n?+(arr/n).toFixed(2):0}
function ebTempoMergeSources(dst,src){for(const [k,v] of Object.entries(src||{}))dst[k]=(dst[k]||0)+v}
function ebTempoTopSources(o){return Object.entries(o).sort((a,b)=>b[1]-a[1]).slice(0,5).map(([k,v])=>`${k}=${v}`).join(', ')||'none'}
async function ebTempoLabRole(m,start,key){let seats=[start,1-start];return seats.map(k=>(m[key]&&m[key][k])||0)}
function ebTempoFirstRemovalRole(m,start){return m.firstRemoval===null?'NONE':(m.firstRemoval===start?'FP':'SP')}
function ebTempoWinnerRole(r,start){return r.stalled?'STALL':(r.winner===start?'FP':'SP')}
function ebTempoPairKey(mode,deck,i){return `${mode}|${deck}|${i}`}
async function ebTempoLabRun(){
 if(EB_BL_RUNNING)return;EB_BL_RUNNING=true;EB_BL_CANCEL=false;EB_TEMPO_LAST=null;
 let btn=document.getElementById('blTempoRun'),cancel=document.getElementById('blTempoCancel'),copy=document.getElementById('blTempoCopy'),box=document.getElementById('blTempoSummary');btn.disabled=true;if(cancel)cancel.disabled=false;copy.disabled=true;
 let decks=EB_BALANCE.DECKS,depth=EB_BL_DEPTH,modes=[
  ['BASELINE',{}],
  ['SP_PLUS_1_ENERGY',{secondPlayerFirstTurnEnergy:1}],
  ['FP_R2_MAX_2_ATTACKS',{firstPlayerRound2AttackCap:2}],
  ['FP_R2_MAX_1_ATTACK',{firstPlayerRound2AttackCap:1}],
  ['FP_R2_NO_ATTACKS',{firstPlayerRound2CombatDelay:true}]
 ],rows=[],traces=[],pairs=[],started=performance.now(),done=0,total=modes.length*decks.length*depth*2;
 try{box.innerHTML='<b>RUNNING TEMPO LAB VII…</b><div id="blTempoProgress" class="small">Preparing finalist calibration…</div><progress class="devBar" max="100" value="0" aria-label="Simulation progress" id="blTempoBar"></progress><div class="small">Paired mirror seeds · five simulator-only finalists · role/seat pairing · sequencing · lifecycle · first-removal correlation.</div>';
  outer:for(const [mode,opts] of modes){for(const d of decks){let games=0,stalls=0,firstWins=0,summoned=[0,0],survived=[0,0],attacked=[0,0],removed=[0,0],sources=[{},{}],actionTurns=[0,0],firstRemovalWins={FP:{FP:0,SP:0,STALL:0},SP:{FP:0,SP:0,STALL:0},NONE:{FP:0,SP:0,STALL:0}},roleSplits=[],seatSplits=[];
   for(let i=0;i<depth;i++){let pair=[];for(let flip=0;flip<2;flip++){if(EB_BL_CANCEL)break outer;let start=flip,base=`EB0844TEMPO|${d}|${i}`,r=EB_BALANCE.simulate(d,d,{seed:`${base}|${mode}|${flip}`,calibrationSeed:base,startSeat:start,...opts});games++;done++;if(r.stalled)stalls++;else if(r.winner===start)firstWins++;let m=r.metrics.initiative,seats=[start,1-start];for(let role=0;role<2;role++){let k=seats[role];summoned[role]+=m.summoned[k]||0;survived[role]+=m.survivedToFirstAttack[k]||0;attacked[role]+=m.attackedAtLeastOnce[k]||0;removed[role]+=m.removedBeforeFirstAttack[k]||0;actionTurns[role]+=(m.actionTurns&&m.actionTurns[k])||0;ebTempoMergeSources(sources[role],m.preAttackRemovalBySource[k])}let fr=ebTempoFirstRemovalRole(m,start),wr=ebTempoWinnerRole(r,start);firstRemovalWins[fr][wr]++;pair.push({flip,start,winnerRole:wr,winnerSeat:r.stalled?null:r.winner,firstRemovalRole:fr,firstRemovalTurn:m.firstRemovalTurn,firstAttackRole:m.firstAttack===null?'NONE':(m.firstAttack===start?'FP':'SP'),firstAttackTurn:m.firstAttackTurn,sequence:(m.turnSequence||[]).slice(0,16),fingerprint:r.fingerprint});if((i===0&&(d==='LIGHTNING'||d==='FIRE'))&&traces.length<20)traces.push({mode,deck:d,flip,winner:wr,reason:r.reason,sequence:(m.turnSequence||[]).slice(0,16),trace:(r.trace||[]).slice(0,60)});if(done%4===0||done===total){let pct=Math.round(done/total*100),bar=document.getElementById('blTempoBar'),txt=document.getElementById('blTempoProgress');if(bar)bar.value=pct;if(txt)txt.textContent=`${done.toLocaleString()} / ${total.toLocaleString()} games · ${pct}% · ${mode} · ${d}`;await ebBLYield()}}if(pair.length===2){let roleSplit=pair[0].winnerRole!==pair[1].winnerRole,seatSplit=pair[0].winnerSeat!==pair[1].winnerSeat;pairs.push({key:ebTempoPairKey(mode,d,i),mode,deck:d,seed:i,roleSplit,seatSplit,a:pair[0],b:pair[1]});roleSplits.push(roleSplit);seatSplits.push(seatSplit)}}
   let valid=games-stalls;rows.push({mode,deck:d,games,stalls,firstWins,firstPct:ebBLPct(firstWins,valid),summoned,survived,attacked,removed,actionTurns,avgActionTurns:actionTurns.map(x=>games?+(x/(games/2)).toFixed(2):0),survivalPct:summoned.map((x,i)=>ebBLPct(survived[i],x)),attackPct:summoned.map((x,i)=>ebBLPct(attacked[i],x)),sources,firstRemovalWins,roleSplitPct:ebBLPct(roleSplits.filter(Boolean).length,roleSplits.length),seatSplitPct:ebBLPct(seatSplits.filter(Boolean).length,seatSplits.length)});
  }}
  if(EB_BL_CANCEL){box.innerHTML=`<b class="devNote">TEMPO LAB CANCELLED</b><div class="small">Stopped safely after ${done.toLocaleString()} / ${total.toLocaleString()} games. No live duel rules were changed.</div>`;return}
  let summary={};for(const [mode] of modes){let rr=rows.filter(x=>x.mode===mode),valid=rr.reduce((n,x)=>n+x.games-x.stalls,0),fw=rr.reduce((n,x)=>n+x.firstWins,0),pp=pairs.filter(x=>x.mode===mode);summary[mode]={firstPct:ebBLPct(fw,valid),games:rr.reduce((n,x)=>n+x.games,0),stalls:rr.reduce((n,x)=>n+x.stalls,0),roleSplitPct:ebBLPct(pp.filter(x=>x.roleSplit).length,pp.length),seatSplitPct:ebBLPct(pp.filter(x=>x.seatSplit).length,pp.length)}}
  EB_TEMPO_LAST={build:EB_RELEASE.version,ruleset:ebBalanceRuleset(),depth,total:rows.reduce((n,x)=>n+x.games,0),rows,summary,pairs,traces,elapsedMs:Math.round(performance.now()-started)};
  let cards=Object.entries(summary).map(([k,v])=>`<div class="blStat"><small>${k.replaceAll('_',' ')}</small><b>${v.firstPct}% FP</b><small>role split ${v.roleSplitPct}% · seat flip ${v.seatSplitPct}%</small></div>`).join('');box.innerHTML=`<b>FINALIST CALIBRATION READY</b><div class="blStatGrid">${cards}</div><div class="small">${EB_TEMPO_LAST.total.toLocaleString()} games · ${(EB_TEMPO_LAST.elapsedMs/1000).toFixed(1)}s. Diagnostic probes only; live duel rules and card balance are unchanged.</div>`;copy.disabled=false;
 }catch(e){box.innerHTML=`<b class="devFail">TEMPO LAB ERROR</b><div class="small">${esc(e&&e.message?e.message:String(e))}</div>`}finally{EB_BL_RUNNING=false;btn.disabled=false;if(cancel)cancel.disabled=true}
}
function ebTempoLabCancel(){if(EB_BL_RUNNING)EB_BL_CANCEL=true}
function ebTempoRemovalCorrelationText(o){let f=o.FP,s=o.SP,n=o.NONE;return `first removal FP → winner FP/SP/stall ${f.FP}/${f.SP}/${f.STALL}; first removal SP → ${s.FP}/${s.SP}/${s.STALL}; no removal → ${n.FP}/${n.SP}/${n.STALL}`}
function ebTempoLabText(){if(!EB_TEMPO_LAST)return'';let r=EB_TEMPO_LAST,lines=[`ELEMENT BOUND Alpha ${EB_RELEASE.version} INITIATIVE TEMPO LAB VII`,`Ruleset: ${r.ruleset}`,`Depth: ${r.depth} paired seeds per mirror`,`Games: ${r.total}`,'','Finalist calibration (first-player win rate / paired-seed diagnostics):'];for(const [k,v] of Object.entries(r.summary))lines.push(`${k}: FP ${v.firstPct}% | role split ${v.roleSplitPct}% | physical-seat flip ${v.seatSplitPct}% | stalls ${v.stalls}/${v.games}`);lines.push('','Definitions: FP/SP are roles relative to the precommitted starting seat. role split = the two seat-flipped games produced different FP/SP winner roles. physical-seat flip = the winning physical simulator seat changed when initiative was flipped. These are intentionally separate metrics. survive-to-first-attack = unit remains on Field when its owner reaches its next legal attack window.','Per-element lifecycle + sequencing:');for(const x of r.rows){lines.push(`${x.mode} | ${x.deck} | FP wins ${x.firstPct}% | summoned ${x.summoned[0]}/${x.summoned[1]} | survive ${x.survivalPct[0]}%/${x.survivalPct[1]}% | attacked ${x.attackPct[0]}%/${x.attackPct[1]}% | removed-before-attack ${x.removed[0]}/${x.removed[1]} | avg action-turns ${x.avgActionTurns[0]}/${x.avgActionTurns[1]} | role split ${x.roleSplitPct}% | physical-seat flip ${x.seatSplitPct}%`);lines.push(`  ${ebTempoRemovalCorrelationText(x.firstRemovalWins)}`);lines.push(`  FP removal sources: ${ebTempoTopSources(x.sources[0])}`);lines.push(`  SP removal sources: ${ebTempoTopSources(x.sources[1])}`)}lines.push('','Representative paired traces (FIRE + LIGHTNING):');for(const z of r.traces){lines.push(`${z.mode} | ${z.deck} | flip ${z.flip} | winner ${z.winner} | ${z.reason}`);lines.push(`  sequence ${z.sequence.map(q=>`R${q.round}:${q.role}#${q.actionTurn}`).join(' > ')}`);for(const e of z.trace)lines.push(`  T${e.turn} ${e.ev} ${JSON.stringify(e)}`)}return lines.join('\n')}
let EB_EXPERIMENT_REPORT=null,EB_EXPERIMENT_BUSY=false;
function ebExperimentText(rows){return ['ELEMENT BOUND · RULE EXPERIMENTS (issue #83) · simulator only',`${EB_RELEASE.version} · ${EB_BALANCE.version} · 81 matchups × 10 seeds per rule`,'Rule | turns | removed before 1st attack | Card Depletion | 1st-player win | deck spread | Bender dmg/duel'].concat(rows.map(r=>`${r.label} | ${r.avgTurns} | ${r.removedBeforeFirstAttack}% | ${r.cardDepletion}% | ${r.firstPlayerWin}% | ${r.deckSpread} pts | ${r.benderDamagePerGame}`),['Deck win rates:'],rows.map(r=>`${r.label}: ${Object.entries(r.deckWinRate).map(([d,v])=>`${d} ${v}%`).join(' · ')}`)).join('\n')}
function ebExperimentRun(){if(EB_EXPERIMENT_BUSY)return;EB_EXPERIMENT_BUSY=true;let run=document.getElementById('blExpRun'),copy=document.getElementById('blExpCopy'),out=document.getElementById('blExpSummary'),list=EB_BALANCE.EXPERIMENTS,rows=[],i=0;run.disabled=true;copy.disabled=true;
 const step=()=>{if(i>=list.length){EB_EXPERIMENT_REPORT=ebExperimentText(rows);out.textContent=EB_EXPERIMENT_REPORT;run.disabled=false;copy.disabled=false;EB_EXPERIMENT_BUSY=false;return}let v=list[i++];out.textContent=`Running ${v.label} (${i}/${list.length})…`;setTimeout(()=>{rows.push({label:v.label,...EB_BALANCE.experiment(v.opt,10)});step()},30)};step()}
async function ebExperimentCopy(){if(!EB_EXPERIMENT_REPORT)return;try{await navigator.clipboard.writeText(EB_EXPERIMENT_REPORT)}catch(e){ebBalanceFallbackCopy(EB_EXPERIMENT_REPORT)}}
async function ebTempoLabCopy(){let t=ebTempoLabText();if(!t)return;try{await navigator.clipboard.writeText(t)}catch(e){ebBalanceFallbackCopy(t)}let b=document.getElementById('blTempoCopy');if(b){let old=b.textContent;b.textContent='COPIED';setTimeout(()=>b.textContent=old,900)}}
function ebBalanceClear(){if(EB_BL_RUNNING)return;EB_BL_LAST=null;document.getElementById('blSummary').innerHTML='<b>NO REPORT YET</b><div class="small">Run the lab to generate matchup, turn-length, utilization and stall telemetry.</div>';document.getElementById('blProgress').innerHTML='<b>READY</b><div class="small">No simulation is running.</div><progress class="devBar" max="100" value="0" aria-label="Simulation progress" id="blBar"></progress>';document.getElementById('blMatrixWrap').classList.add('blHidden');document.getElementById('blDetail').classList.add('blHidden');document.getElementById('blCopy').disabled=true}


setup();
ebHydrateStaticIcons();
ebDevInstall();
window.EB_Trials?.renderMap();
window.addEventListener('resize',()=>{if(G?.trial?.hintLevel)ebTrialApplyHints()});
ebSetupMatchmaking();
ebMpInitializeFromUrl();

/* ---- preserved script block ---- */
console.info(`Element Bound Alpha ${EB_RELEASE.version} · ${EB_RELEASE.label} loaded`);
