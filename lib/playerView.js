'use strict';

function publicSide(side,isViewer){
  const view=structuredClone(side);
  view.deckCount=Array.isArray(view.deck)?view.deck.length:0;
  view.deck=[];
  if(!isViewer){
    view.handCount=Array.isArray(view.hand)?view.hand.length:0;
    view.hand=[];
  }
  return view;
}

function filterEvent(event,seat){
  const view=structuredClone(event);
  if(view.privateTo!=null&&view.privateTo!==seat){
    delete view.cardId;delete view.cardName;delete view.privateTo;
    view.text=`${view.actorName||`Player ${Number(view.actor)+1}`} draws a card`;
  }
  return view;
}

function buildPlayerView(state,seat,events=[],serverNow){
  const view=structuredClone(state);
  view.viewerSeat=seat;
  view.p=view.p.map((side,index)=>publicSide(side,index===seat));
  if(view.pendingResponse&&view.pendingResponse.defenderSeat!==seat){
    delete view.pendingResponse.legalOptions;
    view.pendingResponse.waiting=true;
  }
  view.events=(events||[]).map(item=>filterEvent(item,seat));
  if(Number.isFinite(serverNow))view.serverNow=serverNow;
  return view;
}

module.exports={buildPlayerView,filterEvent};
