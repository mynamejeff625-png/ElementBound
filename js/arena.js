// Element Bound · Arena duel field (Phase 3, issue #81 · 3-1).
// A one-screen layout for the existing duel. It only re-arranges and re-draws
// what game.js already renders; it never changes duel state or rules.
// Enabled by ?arena=1 (remembered on the device); ?arena=0 turns it off.
(function(root){
  'use strict';
  const document=root.document,KEY='ebArena',MAX_VITALITY=30,LOW_VITALITY=10;
  const STATUS_ICONS=new Set(['burning','charged','soaked','seeded','momentum','weakened','guard','armor','growth']);
  let enabled=readFlag(),lastLogKey='',tickerTimer=0,lastRender=null;

  function readFlag(){
    try{
      const query=new URLSearchParams(root.location.search).get('arena');
      if(query==='1'||query==='0')root.localStorage.setItem(KEY,query);
      return root.localStorage.getItem(KEY)==='1';
    }catch(error){return false}
  }
  function byId(id){return document.getElementById(id)}
  function node(tag,className,text){const el=document.createElement(tag);if(className)el.className=className;if(text!=null)el.textContent=String(text);return el}
  function icon(name,label){return root.EB_UI.icon(name,label?{label}:{})}
  function counted(name,label,value){const el=node('span','arena-count');el.setAttribute('aria-label',`${label} ${value}`);el.append(icon(name),node('span','',value));return el}
  function reducedMotion(){return !!root.matchMedia?.('(prefers-reduced-motion: reduce)').matches}

  function setEnabled(on){
    enabled=!!on;
    try{root.localStorage.setItem(KEY,enabled?'1':'0')}catch(error){}
    apply();
    if(lastRender)render(lastRender);
  }

  // Move the field anchors (DESIGN.md §7 Field anchors) and shared controls
  // between the classic layout and the arena layout.
  function apply(){
    const battle=byId('battle');if(!battle)return;
    battle.classList.toggle('arena',enabled);
    [['enemy','eplate','rival'],['you','pplate','you']].forEach(([sideId,plateId,side])=>{
      const sideEl=byId(sideId),plate=byId(plateId);if(!sideEl||!plate)return;
      const from=enabled?sideEl:plate,to=enabled?plate:sideEl;
      from.removeAttribute('data-eb-anchor');from.removeAttribute('data-eb-side');
      to.dataset.ebAnchor='bender';to.dataset.ebSide=side;
    });
    const recycle=byId('recycle'),classicHome=byId('you')?.querySelector('.benderHeadRight'),arenaHome=battle.querySelector('[data-arena-tools="you"]');
    const home=enabled?arenaHome:classicHome;
    if(recycle&&home&&recycle.parentNode!==home)home.prepend(recycle);
    ensureTools(battle);
  }

  function ensureTools(battle){
    const rivalTools=battle.querySelector('[data-arena-tools="rival"]');
    if(rivalTools&&!rivalTools.firstChild){
      const exit=root.EB_UI.iconButton({icon:'back',label:'Leave duel',framed:true,onClick:()=>root.exitBattle?.()});
      exit.classList.add('arena-exit');rivalTools.append(exit);
    }
    const riftTools=battle.querySelector('[data-arena-tools="rift"]');
    if(riftTools&&!riftTools.firstChild){
      const chronicle=root.EB_UI.iconButton({icon:'log',label:'Open the Chronicle (duel log)',framed:true,onClick:event=>openChronicle(event.currentTarget)});
      chronicle.classList.add('arena-chronicle');riftTools.append(chronicle);
    }
  }

  // A2 · Bender plate: medallion inside a Vitality ring, Essence gems, zones, statuses.
  function plate(target,player,side,state){
    const body=target.querySelector('.arena-plate-body');if(!body)return;
    const vitality=Number(player.vit)||0,share=Math.max(0,Math.min(1,vitality/MAX_VITALITY));
    const medal=node('div','arena-medal'),img=node('img');img.src=`assets/medallions/${String(player.el).toLowerCase()}.webp`;img.alt='';img.width=40;img.height=40;
    medal.append(node('span','arena-ring'),img);
    const main=node('div','arena-plate-main'),name=node('div','arena-name',side==='you'?'You':(player.name||'Rival'));
    const meta=node('div','arena-meta');
    const vit=node('span','arena-vit');vit.setAttribute('aria-label',`Vitality ${vitality}`);vit.append(icon('heart'),node('span','eb-stat-number',vitality));
    const essence=node('span','arena-essence'),now=Number(player.e)||0,max=Math.max(Number(player.maxE)||0,now);
    essence.setAttribute('role','img');essence.setAttribute('aria-label',`Essence ${now} of ${Number(player.maxE)||0}`);
    for(let i=0;i<max;i++)essence.append(node('span',`arena-gem${i<now?' is-lit':''}`));
    essence.append(node('span','arena-essence-num',now));
    meta.append(vit,essence);main.append(name,meta);
    const zones=node('div','arena-zones'),count=zone=>root.ebZoneCount?root.ebZoneCount(player,zone):(player[zone]||[]).length;
    zones.append(counted('hand','Hand',count('hand')),counted('deck','Deck',count('deck')),counted('wake','Wake',count('wake')));
    if(player.initiationToken){const token=node('span','arena-count arena-token');token.setAttribute('aria-label','Initiation Token: one free Response');token.append(icon('token'));zones.append(token)}
    const marks=node('div','arena-marks');marks.setAttribute('aria-label','Bender effects');
    (player.marks||[]).forEach(mark=>{const key=String(mark).toLowerCase();if(STATUS_ICONS.has(key)){const badge=node('span','arena-mark');badge.append(icon(key,mark));marks.append(badge)}else marks.append(node('span','arena-mark arena-mark--text',mark))});
    if(player.turnState?.airOpening)marks.append(node('span','arena-mark arena-mark--text','Air Opening +1'));
    body.replaceChildren(medal,main,zones);if(marks.childNodes.length)body.append(marks);
    target.style.setProperty('--vit',share.toFixed(3));
    target.style.setProperty('--plate-el',`var(--eb-el-${String(player.el).toLowerCase()})`);
    target.classList.toggle('is-low',vitality<=LOW_VITALITY);
    target.classList.toggle('is-active',(side==='you')===(state.active===0)&&!state.winner);
  }

  // A4 · The Rift: whose turn it is, Chain pips, the Resonance ring and the latest action.
  function rift(target,state,current,you){
    const yourTurn=state.active===0;
    target.classList.toggle('rift--you',yourTurn&&!state.winner);target.classList.toggle('rift--rival',!yourTurn&&!state.winner);
    const turn=target.querySelector('.rift-turn');
    const label=state.winner?'Duel over':yourTurn?'Your turn':'Rival’s turn';
    const turnKey=`${label}|${state.turn}`;
    if(turn.dataset.key!==turnKey){turn.dataset.key=turnKey;turn.replaceChildren(node('span','rift-turn-label',label),node('span','rift-turn-round',`Turn ${state.turn}`))}
    const box=target.querySelector('.rift-state');box.replaceChildren();
    const el=String(current?.el||'');
    if((el==='LIGHTNING'||el==='STORM')&&(state.chain||0)>0){
      const chain=node('span','rift-chain');chain.setAttribute('role','img');chain.setAttribute('aria-label',`Chain ${state.chain}`);
      chain.append(icon('lightning'));for(let i=0;i<3;i++)chain.append(node('span',`rift-pip${i<state.chain?' is-on':''}`));
      if(state.chain>3)chain.append(node('span','rift-chain-more',`+${state.chain-3}`));
      box.append(chain);
    }
    const hybrid=root.ElementBoundCards?.HYBRIDS?.[el];
    if(hybrid){
      const res=current.turnState?.resonance||{},ring=node('span',`rift-res${res.active?' is-full':''}`);
      ring.setAttribute('role','img');
      ring.setAttribute('aria-label',res.active?`${current===you?'Your':'Rival'} Resonance active`:`Resonance: ${res.a?'':'no '}${hybrid.parents[0].toLowerCase()} card, ${res.b?'':'no '}${hybrid.parents[1].toLowerCase()} card yet`);
      const a=node('span',`rift-res-half rift-res-half--a${res.a||res.active?' is-on':''}`),b=node('span',`rift-res-half rift-res-half--b${res.b||res.active?' is-on':''}`);
      a.append(icon(hybrid.parents[0].toLowerCase()));b.append(icon(hybrid.parents[1].toLowerCase()));
      ring.append(a,b);if(res.active)ring.append(node('span','rift-res-label','Resonance'));
      box.append(ring);
    }
    ticker(target,state);
  }

  // A9 · The latest log line shows briefly in the Rift; the full log is the Chronicle.
  function cleanLog(line){return String(line||'').replace(/^T\d+\s+/,'')}
  function ticker(target,state){
    const logs=state.logs||[],key=`${logs.length}|${logs[logs.length-1]||''}`;
    if(key===lastLogKey)return;const first=!lastLogKey;lastLogKey=key;
    const tick=target.querySelector('.rift-ticker');if(!tick||first||!logs.length)return;
    tick.textContent=cleanLog(logs[logs.length-1]);tick.classList.remove('is-on');void tick.offsetWidth;tick.classList.add('is-on');
    clearTimeout(tickerTimer);tickerTimer=setTimeout(()=>tick.classList.remove('is-on'),reducedMotion()?2600:2400);
  }

  function openChronicle(opener){
    const tome=root.EB_Tome;if(!tome?.sheet||!lastRender)return;
    tome.sheet({label:'Chronicle',top:true,render:()=>{
      const wrap=node('section','arena-chronicle-sheet');
      const head=node('div','arena-chronicle-head');head.append(node('h2','arena-chronicle-title','Chronicle'));
      const info=[lastRender.online?'Online duel':lastRender.difficulty?`Rival: ${lastRender.difficulty}`:'',`Turn ${lastRender.state.turn}`].filter(Boolean).join(' · ');
      head.append(node('div','arena-chronicle-info',info));
      const list=node('ol','arena-chronicle-list');
      (lastRender.state.logs||[]).forEach(line=>list.append(node('li','',cleanLog(line))));
      wrap.append(head,list);
      requestAnimationFrame(()=>{const scroller=list.closest('.tome-peek-body')||list;scroller.scrollTop=scroller.scrollHeight});
      return wrap;
    }},opener);
  }

  function render(context){
    lastRender=context;
    const battle=byId('battle');if(!battle)return;
    if(battle.classList.contains('arena')!==enabled)apply();
    if(!enabled)return;
    const {state,you,rival,current}=context;
    plate(byId('eplate'),rival,'rival',state);
    plate(byId('pplate'),you,'you',state);
    rift(byId('rift'),state,current,you);
    const recycle=byId('recycle');if(recycle)recycle.hidden=!!context.online;
  }

  root.EB_Arena=Object.freeze({enabled:()=>enabled,setEnabled,render,apply});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',apply,{once:true});else apply();
})(window);
