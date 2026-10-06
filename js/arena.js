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
    const guarded=(player.slots||[]).some(card=>card&&card.guard);
    if(guarded){const shield=node('span','arena-shield');shield.setAttribute('role','img');shield.setAttribute('aria-label','Protected by Guard');shield.append(icon('guard'));medal.append(shield)}
    target.classList.toggle('is-guarded',guarded);
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
    if(!enabled){endAim();return}
    wireField();
    const {state,you,rival,current}=context;
    plate(byId('eplate'),rival,'rival',state);
    plate(byId('pplate'),you,'you',state);
    rift(byId('rift'),state,current,you);
    const recycle=byId('recycle');if(recycle)recycle.hidden=!!context.online;
    if(aim.attackerId!=null||aim.choosing)decorateAim();
  }

  // ---------- 3-2 · Mini Codex cards (hand and field) ----------
  const ESC={'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'};
  function esc(value){return String(value).replace(/[&<>"]/g,ch=>ESC[ch])}
  function iconHtml(name,label){return icon(name,label).outerHTML}
  function typeShort(card){return card.type==='MANIFESTATION'?'UNIT':card.type==='TECHNIQUE'?'TECH':'RESP'}
  function typeLong(card){return card.type==='MANIFESTATION'?'Manifestation':card.type==='TECHNIQUE'?'Technique':'Response'}
  function cardMarkup(card,opts={}){
    const el=String(card.el||'').toLowerCase(),short=root.ElementBoundCards?.SHORT?.[card.n]||'',unit=card.type==='MANIFESTATION';
    const cls=['card','arena-card','codex-card','codex-card--s','eb-card',`eb-element--${el}`,el];
    if(opts.can)cls.push('play');if(opts.pending)cls.push('mp-pending');if(card.sick)cls.push('is-sick');
    const glyphs=[],words=[];
    (card.marks||[]).filter(mark=>mark!=='Momentum').forEach(mark=>{const key=String(mark).toLowerCase();words.push(mark);glyphs.push(STATUS_ICONS.has(key)?`<span class="arena-glyph">${iconHtml(key,mark)}</span>`:`<span class="arena-glyph arena-glyph--text">${esc(mark)}</span>`)});
    const counted=(name,label,value)=>{words.push(`${label} ${value}`);glyphs.push(`<span class="arena-glyph">${iconHtml(name,`${label} ${value}`)}<b aria-hidden="true">${value}</b></span>`)};
    if(opts.momentum>0)counted('momentum','Momentum',opts.momentum);
    if((card.growth||0)>0)counted('growth','Growth',card.growth);
    if((card.armor||0)>0)counted('armor','Armor',card.armor);
    if(card.quick){words.push('Response effect ready');glyphs.push(`<span class="arena-glyph">${iconHtml('sparkle','Response effect ready')}</span>`)}
    let stats='';
    if(unit){
      const hurt=Number(card.h)<Number(card.max),attack=opts.soakedPreview?`<span class="arena-soaked">${iconHtml('soaked','Soaked')}<s>${card.a}</s>→${Math.max(0,card.a-2)}</span>`:String(card.a);
      stats=`<span class="codex-card-stats"><span class="codex-card-stat">${iconHtml('sword','Attack')}${attack}</span>${card.guard?`<span class="codex-card-stat arena-stat-icon">${iconHtml('guard','Guard')}</span>`:''}${card.sick?`<span class="codex-card-stat arena-stat-icon arena-sick">${iconHtml('hourglass','Waiting a turn')}</span>`:''}<span class="codex-card-stat${hurt?' is-hurt':''}">${iconHtml('heart',`Health ${card.h} of ${card.max}`)}${card.h}</span></span>`;
    }
    const label=[card.n,typeLong(card),`cost ${card.c}`,short,unit?`${card.a} attack, ${card.h} of ${card.max} health`:'',card.guard?'Guard':'',card.sick?'waiting a turn':'',...words].filter(Boolean).join(', ');
    return `<div class="${cls.join(' ')}" data-id="${card.id}" data-inspect="1" role="group" aria-label="${esc(label)}"><span class="codex-card-top"><span class="codex-cost"><span>${card.c}</span></span><span class="codex-card-type codex-card-type--${card.type.toLowerCase()}">${typeShort(card)}</span></span><img class="codex-medallion codex-card-medallion--s" src="assets/medallions/${el}.webp" alt=""><span class="codex-card-name">${esc(card.n)}</span>${short?`<span class="codex-card-short">${esc(short)}</span>`:''}${glyphs.length?`<span class="arena-glyphs">${glyphs.join('')}</span>`:''}${stats}</div>`;
  }

  // ---------- 3-2 · The fanned hand ----------
  // One gesture on the hand: slide sideways to scrub (the card under the thumb rises),
  // slide up to pull a playable card onto the field, lift to select it.
  const SCRUB_LIFT=-30,DRAG_START=24,TAP_SLOP=10,DOUBLE_TAP_MS=360;
  const hand={el:null,focus:-1,gesture:null,lastTap:{id:null,at:0}};
  function handCards(){return hand.el?[...hand.el.querySelectorAll('.arena-card')]:[]}
  function selectedId(){return root.selectedHandCard?.()?.id??null}
  function layoutFan(focus=hand.focus){
    const cards=handCards(),n=cards.length;hand.focus=focus;if(!n||!hand.el)return;
    const width=hand.el.clientWidth||320,cardWidth=cards[0].offsetWidth||88;
    const step=n>1?Math.min(cardWidth*.86,(width-cardWidth-36)/(n-1)):0;
    cards.forEach((card,i)=>{
      const t=i-(n-1)/2;let x=t*step,y=Math.pow(Math.abs(t),1.6)*3.2,rot=Math.max(-10,Math.min(10,t*4.5)),scale=1;
      if(focus>=0&&i===focus){y=SCRUB_LIFT;rot=0;scale=1.16}
      else if(focus>=0)x+=(i<focus?-1:1)*Math.max(0,16-Math.abs(i-focus)*5);
      card.dataset.fanX=String(x);
      card.style.setProperty('--fan-x',`${x.toFixed(1)}px`);card.style.setProperty('--fan-y',`${y.toFixed(1)}px`);
      card.style.setProperty('--fan-r',`${rot.toFixed(1)}deg`);card.style.setProperty('--fan-s',String(scale));
      card.style.zIndex=String(i===focus?60:i+1);card.classList.toggle('is-focus',i===focus);
    });
  }
  function nearestCard(clientX){
    const cards=handCards();if(!cards.length)return -1;
    const rect=hand.el.getBoundingClientRect(),centre=rect.left+rect.width/2;let best=0,dist=Infinity;
    cards.forEach((card,i)=>{const d=Math.abs(centre+Number(card.dataset.fanX||0)-clientX);if(d<dist){dist=d;best=i}});
    return best;
  }
  function wireHand(handEl){
    hand.el=handEl;
    const cards=handCards(),chosen=selectedId();
    cards.forEach(card=>{card.dataset.doubleTapWired='1';card.setAttribute('role','button');card.tabIndex=0});
    if(!handEl._arenaWired){
      handEl._arenaWired=true;
      handEl.addEventListener('pointerdown',onHandDown,{passive:false});
      handEl.addEventListener('keydown',onHandKey);
      handEl.addEventListener('focusin',event=>{const i=handCards().indexOf(event.target);if(i>=0&&!hand.gesture)layoutFan(i)});
    }
    layoutFan(chosen==null?-1:cards.findIndex(card=>Number(card.dataset.id)===chosen));
  }
  function cardIdAt(i){const card=handCards()[i];return card?Number(card.dataset.id):null}
  function selectAt(i,{tap=false}={}){
    const id=cardIdAt(i);if(id==null)return;
    const now=performance.now();
    if(tap&&hand.lastTap.id===id&&now-hand.lastTap.at<=DOUBLE_TAP_MS){hand.lastTap={id:null,at:0};root.inspectCard?.(root.findLiveCardById?.(id));return}
    if(tap)hand.lastTap={id,at:now};
    root.ebArenaSelect?.(id);
    layoutFan(handCards().findIndex(card=>Number(card.dataset.id)===id));
    decorateSlots();
  }
  function onHandKey(event){
    const cards=handCards(),i=cards.indexOf(event.target);if(i<0)return;
    if(event.key==='Enter'||event.key===' '){event.preventDefault();selectAt(i);handCards()[i]?.focus({preventScroll:true})}
    else if(event.key==='ArrowRight'||event.key==='ArrowLeft'){event.preventDefault();cards[Math.max(0,Math.min(cards.length-1,i+(event.key==='ArrowRight'?1:-1)))].focus({preventScroll:true})}
  }
  function onHandDown(event){
    if(event.target.closest('.eb-tech-activate'))return;
    if(event.pointerType==='mouse'&&event.button!==0)return;
    if(hand.gesture||!handCards().length)return;
    event.preventDefault();
    const index=nearestCard(event.clientX);
    hand.gesture={id:event.pointerId,x0:event.clientX,y0:event.clientY,index,moved:false,mode:'scrub',ghost:null,slot:null,frame:0,x:event.clientX,y:event.clientY};
    layoutFan(index);
    document.addEventListener('pointermove',onHandMove,{capture:true,passive:false});
    document.addEventListener('pointerup',onHandUp,{capture:true,passive:false});
    document.addEventListener('pointercancel',onHandCancel,{capture:true,passive:false});
  }
  function onHandMove(event){
    const g=hand.gesture;if(!g||event.pointerId!==g.id)return;event.preventDefault();
    g.x=event.clientX;g.y=event.clientY;const dx=g.x-g.x0,dy=g.y-g.y0;
    if(Math.hypot(dx,dy)>TAP_SLOP)g.moved=true;
    if(g.mode==='scrub'){
      if(-dy>DRAG_START&&-dy>Math.abs(dx)*1.1&&startCardDrag(g))return;
      const index=nearestCard(g.x);if(index!==g.index){g.index=index;layoutFan(index)}
    }else if(g.mode==='drag'&&!g.frame)g.frame=requestAnimationFrame(()=>{g.frame=0;moveGhost(g)});
  }
  function startCardDrag(g){
    const id=cardIdAt(g.index),source=handCards()[g.index];
    if(id==null||!source||!root.ebArenaDragBegin?.(id))return false;
    g.mode='drag';g.cardId=id;g.isTechnique=root.ebArenaHandCard?.(id)?.type==='TECHNIQUE';
    const rect=source.getBoundingClientRect(),ghost=source.cloneNode(true);
    ghost.classList.remove('card','is-focus','recycle-selected','tech-selected');ghost.classList.add('arena-ghost');
    ghost.removeAttribute('data-id');ghost.removeAttribute('data-eb-anchor');ghost.removeAttribute('role');ghost.removeAttribute('tabindex');ghost.setAttribute('aria-hidden','true');
    ghost.querySelector('.eb-tech-activate')?.remove();
    ghost.style.setProperty('--ghost-w',`${source.offsetWidth}px`);ghost.style.setProperty('--ghost-h',`${source.offsetHeight}px`);
    g.offX=source.offsetWidth/2;g.offY=Math.min(source.offsetHeight*.45,g.y0-rect.top);
    document.body.append(ghost);g.ghost=ghost;source.classList.add('drag-source');
    if(!g.isTechnique)decorateSlots(id);
    moveGhost(g);
    return true;
  }
  function slotUnder(x,y){const under=document.elementFromPoint(x,y);const slot=under?.closest?.('#pslots .slot');return slot&&!slot.querySelector('.card')?slot:null}
  function castZone(y){const top=hand.el?.getBoundingClientRect().top??0;return y<top-24}
  function moveGhost(g){
    if(!g.ghost)return;
    g.ghost.style.setProperty('--gx',`${(g.x-g.offX).toFixed(1)}px`);g.ghost.style.setProperty('--gy',`${(g.y-g.offY).toFixed(1)}px`);
    g.ghost.style.setProperty('--gr',`${Math.max(-8,Math.min(8,(g.x-g.x0)/18)).toFixed(1)}deg`);
    const slot=g.isTechnique?null:slotUnder(g.x,g.y);
    if(slot!==g.slot){g.slot?.classList.remove('drop-hover');slot?.classList.add('drop-hover');g.slot=slot}
    g.ghost.classList.toggle('is-armed',g.isTechnique?castZone(g.y):!!slot);
  }
  function endHandGesture(){
    const g=hand.gesture;hand.gesture=null;
    document.removeEventListener('pointermove',onHandMove,true);document.removeEventListener('pointerup',onHandUp,true);document.removeEventListener('pointercancel',onHandCancel,true);
    if(g?.frame)cancelAnimationFrame(g.frame);
    if(g?.ghost)g.ghost.remove();g?.slot?.classList.remove('drop-hover');
    handCards().forEach(card=>card.classList.remove('drag-source'));
    return g;
  }
  function onHandUp(event){
    const g=hand.gesture;if(!g||event.pointerId!==g.id)return;event.preventDefault();
    g.x=event.clientX;g.y=event.clientY;
    if(g.mode==='drag'){
      const slot=g.isTechnique?null:slotUnder(g.x,g.y),cast=g.isTechnique&&castZone(g.y),id=g.cardId;
      endHandGesture();root.ebArenaDragEnd?.();
      if(slot&&root.ebArenaSummon?.(id,Number(slot.dataset.slot)))return;
      const index=handCards().findIndex(card=>Number(card.dataset.id)===id);
      if(index>=0)selectAt(index);
      if(cast)handCards()[index]?.querySelector('.eb-tech-activate')?.click();
      return;
    }
    endHandGesture();selectAt(g.index,{tap:!g.moved});
  }
  function onHandCancel(event){
    const g=hand.gesture;if(!g||event.pointerId!==g.id)return;
    const dragging=g.mode==='drag';endHandGesture();if(dragging)root.ebArenaDragEnd?.();
    const chosen=selectedId();layoutFan(chosen==null?-1:handCards().findIndex(card=>Number(card.dataset.id)===chosen));
  }
  // Empty slots become keyboard targets while a Manifestation is selected or dragged.
  function decorateSlots(draggingId=null){
    const card=draggingId!=null?root.ebArenaHandCard?.(draggingId):root.selectedHandCard?.();
    const summoning=!!card&&card.type==='MANIFESTATION'&&root.playable?.(card);
    document.querySelectorAll('#pslots .slot').forEach(slot=>{
      const empty=!slot.querySelector('.card'),on=summoning&&empty;
      slot.classList.toggle('drop-ready',on);
      if(on){slot.tabIndex=0;slot.setAttribute('role','button');slot.setAttribute('aria-label',`Summon ${card.n} to slot ${Number(slot.dataset.slot)+1}`);if(!slot._arenaKey){slot._arenaKey=true;slot.addEventListener('keydown',event=>{if((event.key==='Enter'||event.key===' ')&&slot.getAttribute('role')==='button'){event.preventDefault();slot.click()}})}}
      else{slot.removeAttribute('tabindex');slot.removeAttribute('role');slot.removeAttribute('aria-label')}
    });
  }

  // ---------- 3-3 · Attacking: aim arc, target rings, damage preview, Guard shield ----------
  const aim={attackerId:null,info:null,choosing:false,svg:null,path:null,tip:null,drag:null,downTarget:null,keyboard:false};
  function liveCard(id){return document.querySelector(`#pslots .card[data-id="${id}"]`)}
  function canAttackWith(id){if(byId('attack')?.disabled)return null;return root.ebArenaAttackTargets?.(id)||null}
  function beginAttack(readyIds){
    const ids=readyIds.filter(id=>canAttackWith(id));if(!ids.length)return false;
    if(ids.length===1){startAim(ids[0],{keyboard:true});return true}
    endAim();aim.choosing=true;decorateAim();
    liveCard(ids[0])?.focus({preventScroll:true});
    return true;
  }
  function startAim(id,{keyboard=false}={}){
    const info=canAttackWith(id);if(!info){endAim();return false}
    aim.attackerId=id;aim.info=info;aim.choosing=false;aim.keyboard=keyboard;
    document.addEventListener('pointerdown',onAimDown,true);document.addEventListener('pointerup',onAimUp,true);document.addEventListener('keydown',onAimKey,true);
    decorateAim();
    if(keyboard)document.querySelector('[data-arena-target]')?.focus({preventScroll:true});
    return true;
  }
  function endAim(){
    const wasAiming=aim.attackerId!=null||aim.choosing;
    aim.attackerId=null;aim.info=null;aim.choosing=false;aim.drag=null;aim.downTarget=null;
    document.removeEventListener('pointerdown',onAimDown,true);document.removeEventListener('pointerup',onAimUp,true);document.removeEventListener('keydown',onAimKey,true);
    hideArc();if(wasAiming)decorateAim();
  }
  function targetLabel(target){
    const dmg=target.preview?`, ${target.preview.damage} damage`:'';
    return target.id==null?`Attack the rival Bender${target.bypass?' past Guard':''}${dmg}`:`Attack ${target.name}${dmg}`;
  }
  function clearDecor(){
    document.querySelectorAll('[data-arena-target]').forEach(el=>{el.removeAttribute('data-arena-target');el.classList.remove('is-target','is-hover');el.removeAttribute('tabindex');if(el.id==='eplate')el.removeAttribute('role');el.removeAttribute('aria-label');el.querySelector(':scope > .arena-preview')?.remove()});
    document.querySelectorAll('#pslots .card.is-aiming,#pslots .card.is-attack-ready').forEach(el=>{el.classList.remove('is-aiming','is-attack-ready');el.removeAttribute('tabindex');el.setAttribute('role','group')});
    byId('battle')?.classList.remove('is-aiming');
  }
  function previewChip(target){
    const chip=node('span','arena-preview');chip.setAttribute('aria-hidden','true');
    if(target.preview){chip.append(icon('sword'),node('span','',`−${target.preview.damage}`));if(target.preview.power!==target.preview.base)chip.append(node('s','arena-preview-was',`−${target.preview.base}`))}
    if(target.bypass)chip.append(node('span','arena-preview-note','Past Guard'));
    return chip.childNodes.length?chip:null;
  }
  function decorateAim(){
    clearDecor();
    const battle=byId('battle');
    if(aim.choosing){
      document.querySelectorAll('#pslots .card').forEach(card=>{const id=Number(card.dataset.id);if(canAttackWith(id)){card.classList.add('is-attack-ready');card.tabIndex=0;card.setAttribute('role','button');card.setAttribute('aria-label',`Attack with ${root.findLiveCardById?.(id)?.n||'this card'}`)}});
      tick('Choose an attacker');return;
    }
    if(aim.attackerId==null)return;
    const info=canAttackWith(aim.attackerId);if(!info){endAim();return}
    aim.info=info;battle?.classList.add('is-aiming');
    liveCard(aim.attackerId)?.classList.add('is-aiming');
    info.targets.forEach(target=>{
      const el=target.id==null?byId('eplate'):document.querySelector(`#eslots .card[data-id="${target.id}"]`);if(!el)return;
      el.dataset.arenaTarget=target.id==null?'bender':String(target.id);el.classList.add('is-target');el.tabIndex=0;el.setAttribute('role','button');el.setAttribute('aria-label',targetLabel(target));
      const chip=previewChip(target);if(chip)el.append(chip);
    });
    byId('eplate')?.classList.toggle('is-guard-locked',!!info.guarded);
    tick(`${info.attacker.name}: choose a target`);
  }
  function tick(text){const t=byId('rift')?.querySelector('.rift-ticker');if(!t)return;t.textContent=text;t.classList.add('is-on');clearTimeout(tickerTimer);tickerTimer=setTimeout(()=>t.classList.remove('is-on'),2400)}
  function targetFrom(el){return el?.closest?.('[data-arena-target]')||null}
  function fire(targetEl){
    const attackerId=aim.attackerId,key=targetEl.dataset.arenaTarget,targetId=key==='bender'?null:Number(key);
    endAim();root.ebArenaAttack?.(attackerId,targetId);
  }
  function onAimDown(event){
    aim.downTarget=targetFrom(event.target);
    if(aim.downTarget){event.preventDefault();event.stopPropagation();return}
    const own=event.target.closest?.('#pslots .card');
    if(own&&Number(own.dataset.id)===aim.attackerId)return;
    if(own&&canAttackWith(Number(own.dataset.id)))return;
    if(event.target.closest?.('#attack'))return;
    endAim();
  }
  function onAimUp(event){
    const down=aim.downTarget;aim.downTarget=null;if(!down)return;
    event.preventDefault();event.stopPropagation();
    if(targetFrom(document.elementFromPoint(event.clientX,event.clientY))===down)fire(down);
  }
  function onAimKey(event){
    if(event.key==='Escape'){event.preventDefault();endAim();byId('attack')?.focus({preventScroll:true});return}
    if((event.key==='Enter'||event.key===' ')&&targetFrom(event.target)){event.preventDefault();fire(targetFrom(event.target))}
  }
  // Field gesture: tap a ready Manifestation to aim, or drag from it and the arc follows the finger.
  function onFieldDown(event){
    const own=event.target.closest?.('#pslots .card');if(!own||(event.pointerType==='mouse'&&event.button!==0))return;
    const id=Number(own.dataset.id);
    if(aim.choosing&&canAttackWith(id)){event.preventDefault();startAim(id);return}
    if(!canAttackWith(id))return;
    event.preventDefault();
    aim.drag={id,pointer:event.pointerId,x0:event.clientX,y0:event.clientY,moved:false,wasAiming:aim.attackerId===id,hover:null};
    document.addEventListener('pointermove',onFieldMove,{capture:true,passive:false});
    document.addEventListener('pointerup',onFieldUp,{capture:true,passive:false});
    document.addEventListener('pointercancel',onFieldUp,{capture:true,passive:false});
  }
  function onFieldMove(event){
    const d=aim.drag;if(!d||event.pointerId!==d.pointer)return;event.preventDefault();
    if(!d.moved&&Math.hypot(event.clientX-d.x0,event.clientY-d.y0)>TAP_SLOP){d.moved=true;if(aim.attackerId!==d.id)startAim(d.id)}
    if(!d.moved)return;
    drawArc(liveCard(d.id),event.clientX,event.clientY);
    const hover=targetFrom(document.elementFromPoint(event.clientX,event.clientY));
    if(hover!==d.hover){d.hover?.classList.remove('is-hover');hover?.classList.add('is-hover');d.hover=hover}
    byId('eplate')?.classList.toggle('is-deflecting',!hover&&!!aim.info?.guarded&&!!document.elementFromPoint(event.clientX,event.clientY)?.closest?.('#eplate'));
  }
  function onFieldUp(event){
    const d=aim.drag;if(!d||event.pointerId!==d.pointer)return;
    document.removeEventListener('pointermove',onFieldMove,true);document.removeEventListener('pointerup',onFieldUp,true);document.removeEventListener('pointercancel',onFieldUp,true);
    aim.drag=null;hideArc();byId('eplate')?.classList.remove('is-deflecting');
    if(event.type==='pointercancel')return;
    if(!d.moved){if(d.wasAiming)endAim();else startAim(d.id);return}
    const hover=targetFrom(document.elementFromPoint(event.clientX,event.clientY));
    if(hover&&aim.attackerId===d.id){event.preventDefault();fire(hover)}
  }
  function ensureArc(){
    if(aim.svg)return;
    const ns='http://www.w3.org/2000/svg',svg=document.createElementNS(ns,'svg');svg.setAttribute('class','arena-aim');svg.setAttribute('aria-hidden','true');
    const path=document.createElementNS(ns,'path'),tip=document.createElementNS(ns,'circle');tip.setAttribute('r','9');
    svg.append(path,tip);document.body.append(svg);aim.svg=svg;aim.path=path;aim.tip=tip;
  }
  function drawArc(fromEl,x,y){
    if(!fromEl)return;ensureArc();
    const r=fromEl.getBoundingClientRect(),ax=r.left+r.width/2,ay=r.top+r.height*.3,cx=(ax+x)/2,cy=Math.min(ay,y)-Math.max(40,Math.abs(ay-y)*.35);
    aim.path.setAttribute('d',`M${ax.toFixed(1)} ${ay.toFixed(1)} Q${cx.toFixed(1)} ${cy.toFixed(1)} ${x.toFixed(1)} ${y.toFixed(1)}`);
    aim.tip.setAttribute('cx',x.toFixed(1));aim.tip.setAttribute('cy',y.toFixed(1));
    aim.svg.style.setProperty('--aim',`var(--eb-el-${String(aim.info?.attacker.el||'fire').toLowerCase()})`);
    aim.svg.classList.add('is-on');
  }
  function hideArc(){aim.svg?.classList.remove('is-on')}
  function wireField(){const slots=byId('pslots');if(slots&&!slots._arenaAim){slots._arenaAim=true;slots.addEventListener('pointerdown',onFieldDown,{passive:false})}}

  root.EB_Arena=Object.freeze({enabled:()=>enabled,setEnabled,render,apply,cardMarkup,wireHand,beginAttack,endAim,get aiming(){return aim.attackerId}});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',apply,{once:true});else apply();
})(window);
