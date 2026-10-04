(function(root,factory){
  const api=factory(root,root&&root.document,root&&root.EB_UI,root&&root.ElementBoundCards);
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.EB_Trials=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(root,document,UI,cards){
  'use strict';
  const STORAGE_KEY='ebTrialProgress';
  const PRIME_ORDER=['FIRE','WATER','EARTH','NATURE','LIGHTNING','AIR'];
  const CHAPTER_ORDER=['FIRE','WATER','EARTH','NATURE','LIGHTNING','AIR','MAGMA','BLOOM','STORM'];
  const PARENTS={MAGMA:['FIRE','EARTH'],BLOOM:['WATER','NATURE'],STORM:['LIGHTNING','AIR']};
  const TRIAL_DATA=Object.freeze({
    FIRE:{title:'Trial of Flame',strip:[{kind:'card',name:'Cinder Adept'},{kind:'status',name:'Burning'},{kind:'card',name:'Flame Burst'},{kind:'hit',value:3}],goals:[{kind:'turns',value:1},{kind:'hit',value:3},{kind:'essence',value:3}]},
    WATER:{title:'Trial of Tides',strip:[{kind:'card',name:'Current Shift'},{kind:'status',name:'Soaked'},{kind:'card',name:'River Serpent'},{kind:'hit',value:2}],goals:[{kind:'turns',value:1},{kind:'hit',value:2},{kind:'essence',value:1}]},
    EARTH:{title:'Trial of Stone',strip:[{kind:'card',name:'Fortify'},{kind:'status',name:'Armor'},{kind:'card',name:'Earthen Guard'},{kind:'shield'}],goals:[{kind:'turns',value:1},{kind:'shield'},{kind:'essence',value:1}]},
    NATURE:{title:'Trial of Roots',strip:[{kind:'card',name:'Verdant Mend'},{kind:'status',name:'Growth'},{kind:'card',name:'Grove Beast'},{kind:'hit',value:4}],goals:[{kind:'turns',value:1},{kind:'hit',value:4},{kind:'essence',value:3}]},
    LIGHTNING:{title:'Trial of Storms',strip:[{kind:'card',name:'Static Step'},{kind:'status',name:'Charged'},{kind:'card',name:'Spark Runner'},{kind:'hit',value:1}],goals:[{kind:'turns',value:1},{kind:'hit',value:1},{kind:'essence',value:1}]},
    AIR:{title:'Trial of Winds',strip:[{kind:'card',name:'Crosswind'},{kind:'status',name:'Momentum'},{kind:'status',name:'Weakened'},{kind:'card',name:'Gale Scout'},{kind:'hit',value:3}],goals:[{kind:'turns',value:1},{kind:'hit',value:3},{kind:'essence',value:1}]}
  });
  function cleanProgress(value){const out={};if(value&&typeof value==='object')for(const key of CHAPTER_ORDER){const stars=Number(value[key]);if(Number.isInteger(stars)&&stars>=0&&stars<=3)out[key]=stars}return out}
  function loadProgress(storage){try{return cleanProgress(JSON.parse(storage&&storage.getItem(STORAGE_KEY)||'{}'))}catch(_error){return{}}}
  function saveProgress(progress,storage){try{if(storage)storage.setItem(STORAGE_KEY,JSON.stringify(cleanProgress(progress)));return true}catch(_error){return false}}
  function mergeBest(progress,element,stars){return{...cleanProgress(progress),[element]:Math.max(Number(progress&&progress[element])||0,Math.max(0,Math.min(3,Number(stars)||0)))}}
  function starsForRun({completed=false,rewound=false,hintLevel=0}={}){return completed?1+Number(!rewound)+Number(hintLevel<1):0}
  function isUnlocked(element,progress){const parents=PARENTS[element];return !parents||parents.every(parent=>(progress&&progress[parent]||0)>=1)}
  function tokenDone(token,state={}){if(token.kind==='card')return(state.played||[]).includes(token.name);if(token.kind==='status')return(state.statuses||[]).includes(token.name)||!!state.progress?.[token.name.toLowerCase()];if(token.kind==='hit')return Number(state.hit||0)>=token.value||!!state.completed;if(token.kind==='shield')return!!state.progress?.survived||!!state.completed;return false}
  function completedTokens(strip,state){let count=0;for(const token of strip||[]){if(!tokenDone(token,state))break;count++}return count}
  function masteredCards(progress){const names=new Set;for(const element of PRIME_ORDER)if((progress&&progress[element]||0)>0)for(const token of TRIAL_DATA[element].strip)if(token.kind==='card')names.add(token.name);return names}
  if(!document||!UI)return{STORAGE_KEY,PRIME_ORDER,CHAPTER_ORDER,PARENTS,TRIAL_DATA,loadProgress,saveProgress,mergeBest,starsForRun,isUnlocked,tokenDone,completedTokens,masteredCards};
  let progress=loadProgress(root.localStorage),overlay=null;
  function medallion(element,className=''){const image=document.createElement('img');image.className=className;image.src=`assets/medallions/${element.toLowerCase()}.webp`;image.alt='';return image}
  function starPips(stars){const pips=document.createElement('span');pips.className='trial-star-pips';pips.setAttribute('aria-label',`${stars} of 3 stars`);for(let index=1;index<=3;index++){const pip=UI.icon('star');if(index<=stars)pip.classList.add('is-earned');pips.append(pip)}return pips}
  function stripMini(element){const strip=document.createElement('span');strip.className='trial-mini-strip';for(const [index,token] of (TRIAL_DATA[element]?.strip||[]).entries()){if(index){const arrow=document.createElement('span');arrow.textContent='→';strip.append(arrow)}const item=document.createElement('span');if(token.kind==='hit'){item.append(UI.icon('sword'),document.createTextNode(String(token.value)))}else if(token.kind==='shield')item.append(UI.icon('shield'));else item.textContent=token.name;strip.append(item)}return strip}
  function closeChapter({restore=true}={}){if(!overlay)return;const opener=overlay._opener;overlay.remove();overlay=null;document.removeEventListener('keydown',chapterKeydown);if(restore)opener?.focus({preventScroll:true})}
  function chapterKeydown(event){if(event.key==='Escape'){event.preventDefault();closeChapter()}}
  function openChapter(element,opener){
    if(!isUnlocked(element,progress))return;closeChapter({restore:false});overlay=document.createElement('div');overlay.className='trial-chapter-backdrop';overlay._opener=opener;overlay.addEventListener('click',event=>{if(event.target===overlay)closeChapter()});
    const title=document.createElement('h2');title.id='trialChapterTitle';title.textContent=TRIAL_DATA[element]?.title||`${element[0]+element.slice(1).toLowerCase()} Chapter`;const head=document.createElement('div');head.className='trial-chapter-head';head.append(medallion(element),title);const deck=document.createElement('p');deck.className=`trial-chapter-deck eb-element--${element.toLowerCase()}`;deck.textContent=cards.INFO[element][0];
    const steps=document.createElement('div');steps.className='trial-chapter-steps';['① Set up','② Cash in','③ Full combo'].forEach((label,index)=>{const row=document.createElement(index===2&&TRIAL_DATA[element]?'button':'div');row.className=`trial-chapter-step${index<2||!TRIAL_DATA[element]?' is-coming':''}`;const name=document.createElement('strong');name.textContent=label;row.append(name,TRIAL_DATA[element]?stripMini(element):document.createTextNode(''));const state=document.createElement('span');state.textContent=index===2&&TRIAL_DATA[element]?'PLAY':'Coming soon';row.append(state);if(index===2&&TRIAL_DATA[element]){row.type='button';row.append(starPips(progress[element]||0));row.addEventListener('click',()=>{closeChapter({restore:false});root.startTrial(element)})}steps.append(row)});
    const sheet=UI.sheet({variant:'choice',children:[head,deck,steps]});sheet.classList.add('trial-chapter-sheet');sheet.setAttribute('role','dialog');sheet.setAttribute('aria-modal','true');sheet.setAttribute('aria-labelledby',title.id);overlay.append(sheet);document.body.append(overlay);document.addEventListener('keydown',chapterKeydown);sheet.querySelector('button')?.focus({preventScroll:true});
  }
  function renderMap(){
    const host=document.getElementById('trialMap');if(!host)return;progress=loadProgress(root.localStorage);host.textContent='';const total=Object.values(progress).reduce((sum,value)=>sum+value,0),counter=document.getElementById('trialStars');if(counter)counter.textContent=`${total} / 27 stars`;
    const current=PRIME_ORDER.find(element=>!(progress[element]>0));for(const [index,element] of CHAPTER_ORDER.entries()){const hybrid=!!PARENTS[element],locked=!isUnlocked(element,progress),node=document.createElement('button');node.type='button';node.className=`trial-map-node ${hybrid?'is-hybrid':'is-prime'}${locked?' is-locked':''}${element===current?' is-current':''}`;node.dataset.element=element;node.disabled=locked;node.setAttribute('aria-label',`${cards.INFO[element][0]}, ${progress[element]||0} of 3 stars${locked?', locked':''}`);const art=document.createElement('span');art.className='trial-node-art';art.append(medallion(element));if(locked){const lock=document.createElement('span');lock.className='trial-node-lock';lock.append(UI.icon('lock',{label:'Locked'}));art.append(lock);const parents=document.createElement('span');parents.className='trial-node-parents';PARENTS[element].forEach(parent=>parents.append(medallion(parent)));art.append(parents)}node.append(art);const name=document.createElement('strong');name.className=`eb-element--${element.toLowerCase()}`;name.textContent=element[0]+element.slice(1).toLowerCase();node.append(name,starPips(progress[element]||0));node.addEventListener('click',()=>openChapter(element,node));host.append(node)}
  }
  function record(element,stars){progress=mergeBest(progress,element,stars);saveProgress(progress,root.localStorage);return progress[element]}
  function getProgress(){return{...progress}}
  return{STORAGE_KEY,PRIME_ORDER,CHAPTER_ORDER,PARENTS,TRIAL_DATA,loadProgress,saveProgress,mergeBest,starsForRun,isUnlocked,tokenDone,completedTokens,masteredCards,renderMap,openChapter,closeChapter,record,getProgress};
});
