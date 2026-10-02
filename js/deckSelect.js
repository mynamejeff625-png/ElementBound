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
  function transitionState(state,event){
    if(event==='SELECT')return{...state,locked:true};
    if(event==='CHANGE_DECK')return{...state,locked:false};
    return{...state};
  }
  if(!root||!root.document||!shared||!shared.create)return{LABEL_TO_KEY,KEY_TO_LABEL,difficultyKey,difficultyLabel,loadDifficulty,saveDifficulty,transitionState};

  const document=root.document,UI=root.EB_UI,catalog=root.ElementBoundCards;
  let browser=null,state={locked:false,difficulty:loadDifficulty(root.localStorage)};
  let panel,mainButton,live,heading,selectLabel,startLabel,hint;
  function node(tag,className,text){const el=document.createElement(tag);if(className)el.className=className;if(text!==undefined)el.textContent=text;return el}
  function setDifficulty(label){state.difficulty=LABEL_TO_KEY[label]?label:'Medium';saveDifficulty(state.difficulty,root.localStorage);if(!panel)return;panel.querySelectorAll('[role="radio"]').forEach(button=>{const selected=button.dataset.difficulty===state.difficulty;button.setAttribute('aria-checked',String(selected));button.classList.toggle('is-selected',selected);button.querySelector('.deckselect-check').hidden=!selected})}
  function selectDeck(){
    state=transitionState(state,'SELECT');browser.setLocked(true);browser.root.classList.add('is-choosing-difficulty');panel.setAttribute('aria-hidden','false');browser.grids.forEach(grid=>grid.inert=true);selectLabel.setAttribute('aria-hidden','true');startLabel.setAttribute('aria-hidden','false');mainButton.dataset.mode='start';hint.textContent=`${catalog.INFO[browser.key][0]} selected`;live.textContent=hint.textContent;setDifficulty(state.difficulty);heading.tabIndex=-1;heading.focus();
  }
  function changeDeck(){
    state=transitionState(state,'CHANGE_DECK');browser.setLocked(false);browser.root.classList.remove('is-choosing-difficulty');panel.setAttribute('aria-hidden','true');browser.grids.forEach((grid,index)=>grid.inert=index!==browser.current);selectLabel.setAttribute('aria-hidden','false');startLabel.setAttribute('aria-hidden','true');mainButton.dataset.mode='select';hint.textContent='Swipe for all nine decks · tap a card for details';mainButton.focus();
  }
  function mainAction(){if(!state.locked)return selectDeck();root.startSelectedMatch(browser.key,difficultyKey(state.difficulty))}
  function buildPanel(){
    panel=node('section','deckselect-difficulty');panel.setAttribute('aria-hidden','true');const head=node('div','deckselect-difficulty-head');heading=node('h2','', 'Choose your opponent');const change=node('button','deckselect-change','Change deck');change.type='button';change.addEventListener('click',changeDeck);head.append(heading,change);panel.append(head);
    const group=node('div','deckselect-options');group.setAttribute('role','radiogroup');group.setAttribute('aria-label','Opponent difficulty');[['Easy','Makes mistakes · good for learning'],['Medium','Plays solid'],['Hard','Plays its best · bigger turns']].forEach(([label,note])=>{const button=node('button','deckselect-option');button.type='button';button.dataset.difficulty=label;button.setAttribute('role','radio');const copy=node('span','deckselect-option-copy');copy.append(node('strong','',label),node('span','',note));const check=node('span','deckselect-check');check.append(UI.icon('check',{label:`${label} selected`}));button.append(copy,check);button.addEventListener('click',()=>setDifficulty(label));group.append(button)});panel.append(group,node('p','deckselect-rival','Rival deck is random · revealed at the coin flip'));return panel;
  }
  function decorate(){
    if(browser.root.querySelector('.deckselect-actions'))return;
    browser.root.querySelector('.codex-grids').after(buildPanel());
    const actions=node('div','deckselect-actions');mainButton=node('button','primary deckselect-main');mainButton.type='button';mainButton.dataset.mode='select';selectLabel=node('span','deckselect-button-label','SELECT');startLabel=node('span','deckselect-button-label','START DUEL');selectLabel.setAttribute('aria-hidden','false');startLabel.setAttribute('aria-hidden','true');mainButton.append(selectLabel,startLabel);mainButton.addEventListener('click',mainAction);hint=node('p','deckselect-hint','Swipe for all nine decks · tap a card for details');actions.append(mainButton,hint);browser.root.append(actions);live=node('div','deckselect-live');live.setAttribute('aria-live','polite');browser.root.append(live);setDifficulty(state.difficulty);
  }
  function open(){
    if(!browser)browser=shared.create({hostId:'setup',rootClass:'deckselect-shell',title:'Choose Your Deck',showCount:false,smallCardClass:'deckselect-card',hint:false,onBack:()=>root.goDeckSelectBack()});
    browser.open();decorate();return browser;
  }
  return{LABEL_TO_KEY,KEY_TO_LABEL,difficultyKey,difficultyLabel,loadDifficulty,saveDifficulty,transitionState,open,selectDeck,changeDeck,get browser(){return browser}};
});
