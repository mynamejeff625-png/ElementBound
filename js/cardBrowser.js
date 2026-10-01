(function(root,factory){
  const api=factory(root&&root.document,root&&root.EB_UI,root&&root.ElementBoundCards);
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.EB_CardBrowser=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(document,UI,catalog){
  'use strict';

  const DECKS=['FIRE','WATER','NATURE','EARTH','LIGHTNING','AIR','MAGMA','STORM','BLOOM'];
  const KEYWORDS=['Burning','Guard','Flow','Soaked','Seeded','Growth','Armor','Chain','Charged','Momentum','Weakened','Resonance'];
  const DIAL_POINTS=[
    {at:0,x:0,scale:1,opacity:1},
    {at:1,x:74,scale:.667,opacity:.85},
    {at:2,x:128,scale:.472,opacity:.45},
    {at:3,x:168,scale:.4,opacity:0},
    {at:4.5,x:196,scale:.35,opacity:0}
  ];

  function circularOffset(index,position,count=9){
    let offset=((index-position)%count+count)%count;
    if(offset>count/2)offset-=count;
    return offset;
  }
  function interpolate(a,b,t){return a+(b-a)*t}
  function dialInterpolation(offset){
    const distance=Math.abs(offset),sign=offset<0?-1:1;
    let left=DIAL_POINTS[0],right=DIAL_POINTS[DIAL_POINTS.length-1];
    for(let i=1;i<DIAL_POINTS.length;i++)if(distance<=DIAL_POINTS[i].at){right=DIAL_POINTS[i];left=DIAL_POINTS[i-1];break}
    const range=right.at-left.at||1,t=Math.max(0,Math.min(1,(distance-left.at)/range));
    const opacity=distance<=2
      ? interpolate(left.opacity,right.opacity,t)
      : distance<2.6?interpolate(.45,0,(distance-2)/.6):0;
    return{x:sign*interpolate(left.x,right.x,t),scale:interpolate(left.scale,right.scale,t),opacity};
  }
  function normalizeCard(key,data,type){
    const card={el:key,type,n:data.n,c:data.c,text:data.text||'',tip:data.tip||'',role:data.role||null};
    if(type==='MANIFESTATION'){card.a=data.a;card.h=data.h}
    return card;
  }
  function deckCards(key,source=catalog){
    if(!source)return[];
    if(source.HYBRID_CARDS[key])return source.HYBRID_CARDS[key].map(card=>normalizeCard(key,card,card.type));
    const units=(source.BASE[key]||[]).map(card=>normalizeCard(key,{n:card[0],c:card[1],a:card[2],h:card[3],text:card[4],tip:card[5]},'MANIFESTATION'));
    const technique=source.TECH[key],response=source.RESPONSES[key];
    if(technique)units.push(normalizeCard(key,{n:technique[0],c:technique[3],text:technique[1],tip:technique[2]},'TECHNIQUE'));
    if(response)units.push(normalizeCard(key,response,'RESPONSE'));
    return units;
  }
  function extractKeywords(card,shortMap=(catalog&&catalog.SHORT)||{}){
    const haystack=`${card&&card.text||''} ${card&&shortMap[card.n]||''}`.toLowerCase();
    return KEYWORDS.filter(keyword=>new RegExp(`\\b${keyword.toLowerCase()}\\b`).test(haystack));
  }
  function resolveSwipe({dx=0,velocity=0,unit,current=0,count,wrap=false,clamp=false}){
    let steps=Math.round(-dx/unit);
    if(steps===0&&(Math.abs(velocity)>.3||Math.abs(dx)>=unit*.25))steps=dx<0?1:-1;
    let target=current+steps;
    if(wrap)target=((target%count)+count)%count;
    if(clamp)target=Math.max(0,Math.min(count-1,target));
    return target;
  }

  if(!document||!UI||!catalog)return{DECKS,KEYWORDS,circularOffset,dialInterpolation,deckCards,extractKeywords,resolveSwipe};

  function create(options={}){
  const state={position:0,current:0,root:null,dial:null,labels:[],medallions:[],grids:[],zoom:null,reduce:false,locked:false};
  function node(tag,className,text){const el=document.createElement(tag);if(className)el.className=className;if(text!==undefined)el.textContent=text;return el}
  function medallion(key,sizeClass=''){const img=node('img',`codex-medallion ${sizeClass}`);img.src=`assets/medallions/${key.toLowerCase()}.webp`;img.alt='';return img}
  function elementColor(key){return getComputedStyle(document.documentElement).getPropertyValue(`--eb-el-${key.toLowerCase()}`).trim()||'#eef1f7'}
  function shortFor(card){return catalog.SHORT[card.n]||card.text||''}
  function typeLabel(card,short=false){if(card.type==='MANIFESTATION')return short?'UNIT':'Manifestation';if(card.type==='TECHNIQUE')return short?'TECH':'Technique';return short?'RESP':'Response'}
  function stat(iconName,value,label){const box=node('span','codex-card-stat');box.append(UI.icon(iconName,{label}));box.append(document.createTextNode(String(value)));return box}
  function costGem(card,large=false){const gem=node('span',`codex-cost${large?' codex-cost--large':''}`);const value=node('span','',card.c);gem.append(value);return gem}
  function smallCard(card,index,key){
    const button=node('button',`codex-card codex-card--s ${options.smallCardClass||''} eb-card eb-element--${key.toLowerCase()}`);button.type='button';button.dataset.deck=key;button.dataset.cardIndex=String(index);button.dataset.cardName=card.n;button.setAttribute('aria-label',`${card.n}, ${typeLabel(card)}, ${shortFor(card)}`);
    const top=node('span','codex-card-top');top.append(costGem(card));top.append(node('span',`codex-card-type codex-card-type--${card.type.toLowerCase()}`,typeLabel(card,true)));button.append(top);
    button.append(medallion(key,'codex-card-medallion--s'));
    button.append(node('span','codex-card-name',card.n));button.append(node('span','codex-card-short',shortFor(card)));
    if(card.type==='MANIFESTATION'){const stats=node('span','codex-card-stats');stats.append(stat('sword',card.a,'Attack'));stats.append(stat('heart',card.h,'Health'));button.append(stats)}
    button.addEventListener('click',()=>openZoom(key,index,button));
    return button;
  }
  function makeGrid(key,deckIndex){
    const wrap=node('div','codex-grid-wrap');wrap.dataset.deck=key;const grid=node('div','codex-card-grid');
    const cards=deckCards(key);cards.forEach((card,index)=>grid.append(smallCard(card,index,key)));wrap.append(grid);state.grids[deckIndex]=wrap;return wrap;
  }
  function makeDots(className,count,current){const dots=node('div',className);for(let i=0;i<count;i++){const dot=node('span',`codex-dot${i===current?' is-current':''}`);dot.setAttribute('aria-hidden','true');dots.append(dot)}return dots}

  function renderPosition(position,{animate=false}={}){
    state.position=position;
    state.root.classList.toggle('is-animating',animate&&!state.reduce);
    state.medallions.forEach((button,index)=>{
      const offset=circularOffset(index,position),view=dialInterpolation(offset),centered=Math.abs(offset)<.5;
      button.style.transform=`translateX(${view.x}px) scale(${view.scale})`;
      button.style.opacity=String(view.opacity);button.style.zIndex=String(20-Math.round(Math.abs(offset)*2));button.style.pointerEvents=view.opacity<=.2?'none':'';
      button.style.boxShadow=centered?`0 0 0 2px #05070d,0 0 26px ${elementColor(DECKS[index])}bb`:'';
      button.setAttribute('aria-selected',String(centered));button.tabIndex=centered?0:-1;
    });
    state.labels.forEach((label,index)=>{const offset=circularOffset(index,position);label.style.transform=`translateX(${offset*70}px)`;label.style.opacity=String(Math.max(0,1-Math.abs(offset)*1.6))});
    state.grids.forEach((grid,index)=>{const offset=circularOffset(index,position);grid.style.transform=`translateX(${offset*390}px)`;grid.style.opacity=String(Math.max(0,1-Math.abs(offset)*.9));const active=Math.abs(offset)<.5;grid.style.pointerEvents=active?'':'none';grid.inert=!active;grid.setAttribute('aria-hidden',String(!active))});
  }
  function settle(target,animate=true){
    state.current=((Math.round(target)%DECKS.length)+DECKS.length)%DECKS.length;renderPosition(state.current,{animate});
    state.root.dataset.currentDeck=DECKS[state.current];if(state.root.parentElement)state.root.parentElement.dataset.currentDeck=DECKS[state.current];if(state.count)state.count.textContent=`${deckCards(DECKS[state.current]).length} cards`;if(options.onDeckChange)options.onDeckChange(DECKS[state.current],state.current);
    [...state.dots.children].forEach((dot,index)=>{dot.classList.toggle('is-current',index===state.current);dot.style.color=index===state.current?elementColor(DECKS[index]):''});
    clearTimeout(settle.timer);settle.timer=setTimeout(()=>state.root&&state.root.classList.remove('is-animating'),state.reduce?150:320);
  }
  function bindSwipe(target,unit,onMove,onRelease,getPosition=()=>state.position){
    let drag=null;
    target.addEventListener('click',event=>{if(!target._ebSuppressClick)return;event.preventDefault();event.stopPropagation()},true);
    target.addEventListener('pointerdown',event=>{if(event.button!==undefined&&event.button!==0)return;state.root.classList.remove('is-animating');drag={id:event.pointerId,x:event.clientX,lastX:event.clientX,time:event.timeStamp,lastTime:event.timeStamp,moved:false,start:getPosition()}});
    target.addEventListener('pointermove',event=>{if(!drag||event.pointerId!==drag.id)return;const dx=event.clientX-drag.x;if(!drag.moved&&Math.abs(dx)>8){drag.moved=true;target.setPointerCapture(event.pointerId)}if(!drag.moved)return;event.preventDefault();drag.lastX=event.clientX;drag.lastTime=event.timeStamp;onMove(drag.start-dx/unit)});
    const finish=event=>{if(!drag||event.pointerId!==drag.id)return;const dx=event.clientX-drag.x,elapsed=Math.max(1,event.timeStamp-drag.time),velocity=dx/elapsed,moved=drag.moved;drag=null;if(moved){target._ebSuppressClick=true;setTimeout(()=>{target._ebSuppressClick=false},350);event.preventDefault();onRelease({dx,velocity,unit})}};
    target.addEventListener('pointerup',finish);target.addEventListener('pointercancel',finish);
  }
  function build(){
    const host=options.host||document.getElementById(options.hostId||'codex');if(!host||state.root)return;
    state.reduce=!!(window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches);host.textContent='';const root=node('div',`card-browser ${options.rootClass||'codex-shell'}`);state.root=root;
    if(options.header!==false){const header=node('header','codex-header');const back=UI.iconButton({icon:'back',label:options.backLabel||'Back to Home',framed:true,onClick:options.onBack||(()=>window.go('home'))});back.classList.add('codex-back');header.append(back);header.append(node('h1','codex-title',options.title||'Codex'));if(options.showCount!==false){state.count=node('span','codex-count','5 cards');header.append(state.count)}else header.append(node('span','codex-header-spacer'));root.append(header)}
    const dial=node('div','codex-dial');dial.tabIndex=0;dial.setAttribute('role','listbox');dial.setAttribute('aria-label','Choose element deck');state.dial=dial;
    DECKS.forEach((key,index)=>{const button=node('button','codex-dial-option');button.type='button';button.setAttribute('role','option');button.setAttribute('aria-label',catalog.INFO[key][0]);button.append(medallion(key));button.addEventListener('click',()=>{if(state.locked)return;const offset=circularOffset(index,state.current);settle(state.current+offset)});dial.append(button);state.medallions.push(button)});root.append(dial);
    const labels=node('div','codex-labels');DECKS.forEach(key=>{const label=node('div','codex-deck-label');label.append(node('strong',`eb-element--${key.toLowerCase()}`,catalog.INFO[key][0]));label.append(node('span','',catalog.INFO[key][1]));labels.append(label);state.labels.push(label)});root.append(labels);
    state.dots=makeDots('codex-dots',DECKS.length,0);root.append(state.dots);
    const grids=node('div','codex-grids');DECKS.forEach((key,index)=>grids.append(makeGrid(key,index)));root.append(grids);if(options.hint!==false)root.append(node('p','codex-hint',options.hint||'Swipe to change deck · tap a card to zoom'));host.append(root);
    bindSwipe(dial,74,position=>renderPosition(position),gesture=>settle(resolveSwipe({...gesture,current:state.current,count:DECKS.length})));
    bindSwipe(grids,390,position=>renderPosition(position),gesture=>settle(resolveSwipe({...gesture,current:state.current,count:DECKS.length,wrap:true})));
    dial.addEventListener('keydown',event=>{if(event.key!=='ArrowLeft'&&event.key!=='ArrowRight')return;event.preventDefault();settle(state.current+(event.key==='ArrowRight'?1:-1))});settle(0,false);
  }

  function largeCard(card,key){
    const cardNode=node('article',`codex-card codex-card--l eb-card eb-element--${key.toLowerCase()}`);const top=node('div','codex-card-top');top.append(costGem(card,true));top.append(node('span',`codex-card-type codex-card-type--${card.type.toLowerCase()}`,typeLabel(card)));cardNode.append(top);
    cardNode.append(medallion(key,'codex-card-medallion--l'));cardNode.append(node('h2','codex-card-name',card.n));cardNode.append(node('div','codex-card-deck',catalog.INFO[key][0]));cardNode.append(node('div','codex-card-short',shortFor(card)));
    if(card.type==='MANIFESTATION'){const stats=node('div','codex-card-stats');stats.append(stat('sword',card.a,'Attack'));stats.append(stat('heart',card.h,'Health'));cardNode.append(stats)}return cardNode;
  }
  function infoPanel(card){const panel=node('section','codex-info');panel.append(node('p','',card.text||'No additional effect.'));const tip=node('p');tip.append(node('strong','','How to use it: '));tip.append(document.createTextNode(card.tip||'No additional guidance.'));panel.append(tip);const words=extractKeywords(card);if(words.length){const chips=node('div','codex-keywords');words.forEach(word=>chips.append(node('span','eb-chip',word)));panel.append(chips)}return panel}
  function renderZoom(position,animate=false){
    const zoom=state.zoom;if(!zoom)return;zoom.position=position;zoom.root.classList.toggle('is-sliding',animate&&!state.reduce);
    zoom.slides.forEach((slide,index)=>{const distance=index-position,abs=Math.abs(distance),scale=interpolate(1,.9,Math.min(1,abs)),opacity=interpolate(1,.45,Math.min(1,abs));slide.style.transform=`translateX(${distance*300}px) scale(${scale})`;slide.style.opacity=String(opacity);slide.style.pointerEvents=abs<.5?'':'none';slide.setAttribute('aria-hidden',String(abs>=.5))});
    [...zoom.dots.children].forEach((dot,index)=>dot.classList.toggle('is-current',index===Math.round(position)));
  }
  function settleZoom(target,animate=true){const zoom=state.zoom;if(!zoom)return;zoom.current=Math.max(0,Math.min(zoom.cards.length-1,Math.round(target)));renderZoom(zoom.current,animate);zoom.prev.disabled=zoom.current===0;zoom.next.disabled=zoom.current===zoom.cards.length-1;clearTimeout(zoom.timer);zoom.timer=setTimeout(()=>zoom.root&&zoom.root.classList.remove('is-sliding'),state.reduce?150:320)}
  function focusables(root){return[...root.querySelectorAll('button:not([disabled]),[href],[tabindex]:not([tabindex="-1"])')]}
  function closeZoom(){
    const zoom=state.zoom;if(!zoom||zoom.closing)return;zoom.closing=true;const source=state.root.querySelector(`[data-deck="${zoom.key}"][data-card-index="${zoom.current}"]`);if(source)source.classList.add('is-zoom-source');const sourceRect=source&&source.getBoundingClientRect(),cardRect=zoom.slides[zoom.current].querySelector('.codex-card--l').getBoundingClientRect();
    if(sourceRect&&!state.reduce){const dx=sourceRect.left+sourceRect.width/2-(cardRect.left+cardRect.width/2),dy=sourceRect.top+sourceRect.height/2-(cardRect.top+cardRect.height/2);zoom.stage.style.transform=`translate(${dx}px,${dy}px) scale(${sourceRect.width/280})`}
    zoom.source.classList.remove('is-zoom-source');zoom.root.classList.remove('is-open');setTimeout(()=>{zoom.root.remove();document.removeEventListener('keydown',zoom.keydown);if(source){source.classList.remove('is-zoom-source');source.focus()}state.zoom=null},state.reduce?160:280);
  }
  function openZoom(key,index,source){
    if(state.zoom)return;const cards=deckCards(key),root=node('div','codex-zoom');root.setAttribute('role','dialog');root.setAttribute('aria-modal','true');root.setAttribute('aria-label',`${catalog.INFO[key][0]} card details`);const backdrop=node('button','codex-zoom-backdrop');backdrop.type='button';backdrop.setAttribute('aria-label','Close card details');backdrop.addEventListener('click',closeZoom);root.append(backdrop);
    const close=UI.iconButton({icon:'close',label:'Close card details',framed:true,onClick:closeZoom});close.classList.add('codex-zoom-close');root.append(close);const stage=node('div','codex-zoom-stage');const track=node('div','codex-zoom-track');stage.append(track);root.append(stage);const slides=[];cards.forEach(card=>{const slide=node('div','codex-zoom-slide');slide.append(largeCard(card,key));slide.append(infoPanel(card));track.append(slide);slides.push(slide)});
    const controls=node('div','codex-zoom-controls');const prev=UI.iconButton({icon:'back',label:'Previous card',framed:true,onClick:()=>settleZoom(state.zoom.current-1)});const dots=makeDots('codex-zoom-dots',cards.length,index);const next=UI.iconButton({icon:'back',label:'Next card',framed:true,onClick:()=>settleZoom(state.zoom.current+1)});next.classList.add('is-next');controls.append(prev,dots,next);root.append(controls);document.body.append(root);source.classList.add('is-zoom-source');
    const keydown=event=>{if(event.key==='Escape'){event.preventDefault();closeZoom();return}if(event.key==='ArrowLeft'||event.key==='ArrowRight'){event.preventDefault();settleZoom(state.zoom.current+(event.key==='ArrowRight'?1:-1));return}if(event.key==='Tab'){const items=focusables(root);if(!items.length)return;const first=items[0],last=items[items.length-1];if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus()}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus()}}};document.addEventListener('keydown',keydown);
    state.zoom={root,stage,track,slides,cards,key,current:index,position:index,prev,next,dots,keydown,source,closing:false};renderZoom(index);settleZoom(index,false);
    bindSwipe(stage,300,position=>renderZoom(Math.max(0,Math.min(cards.length-1,position))),gesture=>settleZoom(resolveSwipe({...gesture,current:state.zoom.current,count:cards.length,clamp:true})),()=>state.zoom.position);
    const sourceRect=source.getBoundingClientRect(),cardRect=slides[index].querySelector('.codex-card--l').getBoundingClientRect();if(!state.reduce){const dx=sourceRect.left+sourceRect.width/2-(cardRect.left+cardRect.width/2),dy=sourceRect.top+sourceRect.height/2-(cardRect.top+cardRect.height/2);stage.style.transform=`translate(${dx}px,${dy}px) scale(${sourceRect.width/280})`}
    requestAnimationFrame(()=>requestAnimationFrame(()=>{root.classList.add('is-open');stage.style.transform='none';close.focus()}));
  }
  function open(){build();settle(state.current,false);return api}
  function setLocked(locked){state.locked=!!locked;if(state.root)state.root.classList.toggle('is-deck-locked',state.locked);if(state.dial)state.dial.inert=state.locked}
  const api={open,closeZoom,setLocked,get current(){return state.current},get key(){return DECKS[state.current]},get root(){return state.root},get grids(){return state.grids},get dial(){return state.dial}};
  return api;
  }

  return{DECKS,KEYWORDS,circularOffset,dialInterpolation,deckCards,extractKeywords,resolveSwipe,create};
});
