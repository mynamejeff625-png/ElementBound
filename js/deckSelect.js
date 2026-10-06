(function(root,factory){
  const shared=typeof module==='object'&&module.exports?require('./cardBrowser.js'):root&&root.EB_CardBrowser;
  const api=factory(root,shared);
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.EB_DeckSelect=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(root,shared){
  'use strict';
  const LABEL_TO_KEY=Object.freeze({Easy:'Easy',Medium:'Medium',Hard:'Difficult'});
  const KEY_TO_LABEL=Object.freeze({Easy:'Easy',Medium:'Medium',Difficult:'Hard'});
  const STORAGE_KEY='ebDifficulty';
  function difficultyKey(label){return LABEL_TO_KEY[label]||'Medium'}
  function difficultyLabel(key){return KEY_TO_LABEL[key]||'Medium'}
  function loadDifficulty(storage){try{return difficultyLabel(storage&&storage.getItem(STORAGE_KEY))}catch(_error){return'Medium'}}
  function saveDifficulty(label,storage){try{if(storage)storage.setItem(STORAGE_KEY,difficultyKey(label))}catch(_error){}return difficultyKey(label)}
  const RESPONSE_KEY='ebHybridResponse';
  function hybridParents(key,hybrids){return(hybrids||(root&&root.ElementBoundCards&&root.ElementBoundCards.HYBRIDS)||{})[key]?.parents||null}
  function loadResponse(key,storage,hybrids){const parents=hybridParents(key,hybrids);if(!parents)return null;try{const saved=JSON.parse((storage&&storage.getItem(RESPONSE_KEY))||'{}')[key];if(parents.includes(saved))return saved}catch(_error){}return parents[0]}
  function saveResponse(key,element,storage,hybrids){const parents=hybridParents(key,hybrids);if(!parents||!parents.includes(element))return loadResponse(key,storage,hybrids);try{if(storage){const all=JSON.parse(storage.getItem(RESPONSE_KEY)||'{}');all[key]=element;storage.setItem(RESPONSE_KEY,JSON.stringify(all))}}catch(_error){}return element}
  function transitionState(state,event){
    if(event==='SELECT')return{...state,locked:true};
    if(event==='CHANGE_DECK')return{...state,locked:false};
    return{...state};
  }
  if(!root||!root.document||!shared||!shared.create)return{LABEL_TO_KEY,KEY_TO_LABEL,RESPONSE_KEY,difficultyKey,difficultyLabel,loadDifficulty,saveDifficulty,loadResponse,saveResponse,transitionState};

  const document=root.document,UI=root.EB_UI,catalog=root.ElementBoundCards;
  let browser=null,state={locked:false,difficulty:loadDifficulty(root.localStorage),response:null};
  let panel,responseBox,mainButton,live,heading,selectLabel,startLabel,hint,focusTimer,interactionTimer;
  function node(tag,className,text){const el=document.createElement(tag);if(className)el.className=className;if(text!==undefined)el.textContent=text;return el}
  function setDifficulty(label){state.difficulty=LABEL_TO_KEY[label]?label:'Medium';saveDifficulty(state.difficulty,root.localStorage);if(!panel)return;panel.querySelectorAll('.deckselect-option[role="radio"]').forEach(button=>{const selected=button.dataset.difficulty===state.difficulty;button.setAttribute('aria-checked',String(selected));button.classList.toggle('is-selected',selected)})}
  function medallion(element){const image=node('img','deckselect-response-medallion');image.src=`assets/medallions/${element.toLowerCase()}.webp`;image.alt='';image.width=32;image.height=32;return image}
  function setResponse(element){const key=browser.key;state.response=saveResponse(key,element,root.localStorage);if(!responseBox)return;responseBox.querySelectorAll('[role="radio"]').forEach(button=>{const selected=button.dataset.response===state.response;button.setAttribute('aria-checked',String(selected));button.classList.toggle('is-selected',selected)})}
  function renderResponse(){const key=browser.key,parents=hybridParents(key);panel.classList.toggle('has-response',!!parents);responseBox.hidden=!parents;responseBox.replaceChildren();if(!parents){state.response=null;return}
    const label=node('p','deckselect-response-label');label.append(node('strong','','Your Response'),node('span','',` · ${parents.map(element=>element[0]+element.slice(1).toLowerCase()).join(' or ')}`));const group=node('div','deckselect-response-options');group.setAttribute('role','radiogroup');group.setAttribute('aria-label','Your Response card');
    for(const element of parents){const response=catalog.RESPONSES[element],item=node('div','deckselect-response-item'),button=node('button','deckselect-response-option');button.type='button';button.dataset.response=element;button.setAttribute('role','radio');const copy=node('span','deckselect-response-copy');copy.append(node('strong',`eb-element--${element.toLowerCase()}`,response.n),node('span','',catalog.SHORT[response.n]||''));button.append(medallion(element),copy);UI.fastTap(button,()=>setResponse(element));const info=UI.iconButton({icon:'help',label:`Show card: ${response.n}`,onClick:()=>root.EB_Tome?.peekCard?.(response.n,info)});info.classList.add('deckselect-response-info');item.append(button,info);group.append(item)}
    responseBox.append(label,group);setResponse(loadResponse(key,root.localStorage))}
  function selectDeck(){
    state=transitionState(state,'SELECT');browser.setLocked(true);browser.root.classList.add('is-choosing-difficulty');browser.root.classList.remove('is-difficulty-interactive');panel.setAttribute('aria-hidden','false');browser.grids.forEach(grid=>grid.inert=true);selectLabel.setAttribute('aria-hidden','true');startLabel.setAttribute('aria-hidden','false');mainButton.dataset.mode='start';renderResponse();hint.textContent=`${catalog.INFO[browser.key][0]} selected`;live.textContent=hint.textContent;setDifficulty(state.difficulty);heading.tabIndex=-1;clearTimeout(focusTimer);clearTimeout(interactionTimer);const reduce=root.matchMedia&&root.matchMedia('(prefers-reduced-motion: reduce)').matches;if(reduce)browser.root.classList.add('is-difficulty-interactive');else interactionTimer=setTimeout(()=>browser.root.classList.add('is-difficulty-interactive'),160);focusTimer=setTimeout(()=>heading.focus({preventScroll:true}),reduce?150:400);
  }
  function changeDeck(){
    clearTimeout(focusTimer);clearTimeout(interactionTimer);state=transitionState(state,'CHANGE_DECK');browser.setLocked(false);browser.root.classList.remove('is-choosing-difficulty','is-difficulty-interactive');panel.setAttribute('aria-hidden','true');browser.grids.forEach((grid,index)=>grid.inert=index!==browser.current);selectLabel.setAttribute('aria-hidden','false');startLabel.setAttribute('aria-hidden','true');mainButton.dataset.mode='select';hint.textContent='Swipe for all nine decks · tap a card for details';mainButton.focus({preventScroll:true});
  }
  function mainAction(){if(!state.locked)return selectDeck();root.startSelectedMatch(browser.key,difficultyKey(state.difficulty),state.response)}
  function buildPanel(){
    panel=node('section','deckselect-difficulty');panel.setAttribute('aria-hidden','true');const head=node('div','deckselect-difficulty-head');heading=node('h2','', 'Choose your opponent');const change=node('button','deckselect-change','Change deck');change.type='button';UI.fastTap(change,changeDeck);head.append(heading,change);responseBox=node('div','deckselect-response');responseBox.hidden=true;panel.append(responseBox,head);
    const group=node('div','deckselect-options');group.setAttribute('role','radiogroup');group.setAttribute('aria-label','Opponent difficulty');[['Easy','Makes mistakes · good for learning'],['Medium','Plays solid'],['Hard','Plays its best · bigger turns']].forEach(([label,note])=>{const button=node('button','deckselect-option');button.type='button';button.dataset.difficulty=label;button.setAttribute('role','radio');const copy=node('span','deckselect-option-copy');copy.append(node('strong','',label),node('span','',note));button.append(copy);UI.fastTap(button,()=>setDifficulty(label));group.append(button)});panel.append(group,node('p','deckselect-rival','Rival deck is random · revealed at the coin flip'));return panel;
  }
  function decorate(){
    if(browser.root.querySelector('.deckselect-actions'))return;
    const grids=browser.root.querySelector('.codex-grids'),stage=node('div','deckselect-stage'),gridStage=node('div','deckselect-grid-stage');grids.before(stage);gridStage.append(grids);stage.append(gridStage,buildPanel());
    const actions=node('div','deckselect-actions');mainButton=node('button','primary deckselect-main');mainButton.type='button';mainButton.dataset.mode='select';selectLabel=node('span','deckselect-button-label','SELECT');startLabel=node('span','deckselect-button-label','START DUEL');selectLabel.setAttribute('aria-hidden','false');startLabel.setAttribute('aria-hidden','true');mainButton.append(selectLabel,startLabel);UI.fastTap(mainButton,mainAction);hint=node('p','deckselect-hint','Swipe for all nine decks · tap a card for details');actions.append(mainButton,hint);browser.root.append(actions);live=node('div','deckselect-live');live.setAttribute('aria-live','polite');browser.root.append(live);setDifficulty(state.difficulty);
  }
  function open(){
    if(!browser)browser=shared.create({hostId:'setup',rootClass:'deckselect-shell',title:'Choose Your Deck',showCount:false,guide:'header',smallCardClass:'deckselect-card',hint:false,onBack:()=>root.goDeckSelectBack()});
    browser.open();decorate();return browser;
  }
  return{LABEL_TO_KEY,KEY_TO_LABEL,RESPONSE_KEY,difficultyKey,difficultyLabel,loadDifficulty,saveDifficulty,loadResponse,saveResponse,transitionState,open,selectDeck,changeDeck,get browser(){return browser}};
});
