(function(root,factory){
  const api=factory(root&&root.document,root&&root.localStorage,root);
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.EB_MainMenu=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(document,storage,root){
  'use strict';
  const SEEN_KEY='ebSeenVersion';
  function isUnseen(store,version){try{return !store||store.getItem(SEEN_KEY)!==version}catch(_error){return true}}
  function markSeen(store,version){try{if(store)store.setItem(SEEN_KEY,version);return true}catch(_error){return false}}
  if(!document)return{SEEN_KEY,isUnseen,markSeen};
  let opener=null,overlay=null;
  function setUnread(unread){const button=document.getElementById('whatsNewButton');if(!button)return;button.classList.toggle('has-badge',unread);button.setAttribute('aria-label',unread?"What's New, 1 unread update":"What's New")}
  function close(){if(!overlay)return;const target=opener;document.removeEventListener('keydown',onKeydown);overlay.remove();overlay=null;opener=null;if(target)target.focus()}
  function onKeydown(event){if(event.key==='Escape'){event.preventDefault();close();return}if(event.key!=='Tab'||!overlay)return;const items=[...overlay.querySelectorAll('button,[href],[tabindex]:not([tabindex="-1"])')];if(!items.length)return;const first=items[0],last=items[items.length-1];if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus()}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus()}}
  function open(){
    if(overlay)return;opener=document.getElementById('whatsNewButton');markSeen(storage,root.EB_RELEASE.version);setUnread(false);
    overlay=document.createElement('div');overlay.className='whats-new-backdrop';overlay.addEventListener('click',event=>{if(event.target===overlay)close()});
    const title=document.createElement('h2');title.textContent="What's New";const release=document.createElement('p');release.className='whats-new-release';release.textContent=`Alpha ${root.EB_RELEASE.version} · ${root.EB_RELEASE.label}`;const list=document.createElement('ul');list.className='whats-new-list';root.EB_RELEASE.notes.forEach(note=>{const item=document.createElement('li');item.textContent=note;list.append(item)});const gotIt=root.EB_UI.button({variant:'primary',text:'Got it',onClick:close});gotIt.classList.add('primary','whats-new-got-it');const sheet=root.EB_UI.sheet({variant:'info',children:[title,release,list,gotIt]});sheet.classList.add('whats-new-sheet');sheet.setAttribute('role','dialog');sheet.setAttribute('aria-modal','true');sheet.setAttribute('aria-labelledby','whatsNewTitle');title.id='whatsNewTitle';overlay.append(sheet);document.body.append(overlay);document.addEventListener('keydown',onKeydown);gotIt.focus();
  }
  function init(){const home=document.getElementById('home'),button=document.getElementById('whatsNewButton');if(!home||!button)return;button.replaceChildren(root.EB_UI.icon('sparkle'));button.addEventListener('click',open);setUnread(isUnseen(storage,root.EB_RELEASE.version));const reduce=root.matchMedia&&root.matchMedia('(prefers-reduced-motion: reduce)').matches;if(reduce)home.classList.add('is-home-calm');else setTimeout(()=>home.classList.add('is-home-calm'),1200)}
  init();
  return{SEEN_KEY,isUnseen,markSeen,open,close};
});
