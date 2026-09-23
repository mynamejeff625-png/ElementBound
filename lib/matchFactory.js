(function(root,factory){
  const catalog=typeof module==='object'&&module.exports?require('./cardCatalog.js'):root.ElementBoundCards;
  const api=factory(catalog);
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.ElementBoundMatchFactory=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(catalog){
  'use strict';

  const {HYBRIDS,INFO,BASE,RESPONSES,TECH,HYBRID_CARDS}=catalog;
  const ELEMENTS=Object.freeze(Object.keys(INFO));
  function validElement(element){return ELEMENTS.includes(element)}
  function responseElement(element,requested){
    if(!HYBRIDS[element])return element;
    return HYBRIDS[element].parents.includes(requested)?requested:HYBRIDS[element].parents[0];
  }
  function manifestation(nextId,el,n,c,a,h,guard=false,text='',tip=''){
    return {id:nextId(),el,n,c,type:'MANIFESTATION',a,h,max:h,armor:0,ready:true,sick:false,guard,zone:'DECK',text,tip,marks:[],growth:0,momentum:0,role:null,quick:null,turnFlags:{}};
  }
  function responseCard(nextId,el){const r=RESPONSES[el];return{id:nextId(),el,n:r.n,c:r.c,type:'RESPONSE',zone:'DECK',text:r.text,tip:r.tip,role:'RESPONSE'}}
  function primeCards(nextId,el,count){
    const base=BASE[el],cards=[];
    for(let i=0;i<count;i++){
      if(i%5===4){const t=TECH[el];cards.push({id:nextId(),el,n:t[0],c:t[3],type:'TECHNIQUE',zone:'DECK',text:t[1],tip:t[2],role:null})}
      else {const card=base[i%3];cards.push(manifestation(nextId,el,card[0],card[1],card[2],card[3],/\bGuard\b/.test(card[4]||''),card[4],card[5]))}
    }
    return cards;
  }
  function hybridCard(nextId,el,definition){
    if(definition.type==='MANIFESTATION'){
      const card=manifestation(nextId,el,definition.n,definition.c,definition.a,definition.h,false,definition.text,definition.tip);card.role=definition.role;return card;
    }
    return{id:nextId(),el,n:definition.n,c:definition.c,type:'TECHNIQUE',zone:'DECK',text:definition.text,tip:definition.tip,role:definition.role};
  }
  function createDeck(element,{responseElement:requested,nextId}={}){
    if(!validElement(element))throw new TypeError('Unsupported element');
    if(typeof nextId!=='function')throw new TypeError('nextId is required');
    if(!HYBRIDS[element]){
      const cards=[];
      for(let i=0;i<13;i++){const card=BASE[element][i%3];cards.push(manifestation(nextId,element,card[0],card[1],card[2],card[3],/\bGuard\b/.test(card[4]||''),card[4],card[5]))}
      for(let i=0;i<7;i++){const technique=TECH[element];cards.push({id:nextId(),el:element,n:technique[0],c:technique[3],type:'TECHNIQUE',zone:'DECK',text:technique[1],tip:technique[2]})}
      cards.push(responseCard(nextId,element));return cards;
    }
    const hybrid=HYBRIDS[element],cards=[...primeCards(nextId,hybrid.parents[0],8),...primeCards(nextId,hybrid.parents[1],8)];
    HYBRID_CARDS[element].forEach(definition=>cards.push(hybridCard(nextId,element,definition)));
    cards.push(responseCard(nextId,responseElement(element,requested)));return cards;
  }
  function shuffle(cards,random=Math.random){for(let i=cards.length-1;i;i--){const j=Math.floor(random()*(i+1));[cards[i],cards[j]]=[cards[j],cards[i]]}return cards}
  function freshTurnState(element){const hybrid=HYBRIDS[element];return{resonance:{a:false,b:false,active:false},resolved:[],moved:[],triggered:[],quick:[],parents:hybrid?hybrid.parents.slice():[]}}
  function createPlayer({name,element,responseElement:requested,nextId,random=Math.random}){
    const deck=shuffle(createDeck(element,{responseElement:requested,nextId}),random);
    return{name,el:element,vit:30,maxE:2,e:2,deck,hand:[],wake:[],slots:[null,null,null],marks:[],recycles:3,turnState:freshTurnState(element),responseEl:responseElement(element,requested),initiationToken:false};
  }
  function drawOpening(player,count=4){for(let i=0;i<count;i++){const card=player.deck.shift();card.zone='HAND';player.hand.push(card)}}
  function createInitialState({players,random=Math.random}){
    if(!Array.isArray(players)||players.length!==2||players.some(player=>!validElement(player.element)))throw new TypeError('Two valid player deck selections are required');
    let id=0;const nextId=()=>++id,starter=random()<.5?0:1;
    const sides=players.map((player,index)=>createPlayer({name:player.name||`Player ${index+1}`,element:player.element,responseElement:player.responseElement,nextId,random}));
    sides.forEach(side=>drawOpening(side));sides[1-starter].initiationToken=true;
    return {rev:0,turn:1,active:starter,startSeat:starter,chain:0,winner:null,p:sides,logs:[`T1 MATCH START · ${INFO[players[0].element][0]} vs ${INFO[players[1].element][0]}`,`T1 INITIATIVE · ${sides[starter].name} goes first · ${sides[1-starter].name} receives the Initiation Token`],initiative:{starter,revealed:true,finished:true,secondPlayerBonus:0}};
  }
  return Object.freeze({ELEMENTS,validElement,responseElement,manifestation,createResponseCard:responseCard,createDeck,shuffle,freshTurnState,createPlayer,createInitialState});
});
