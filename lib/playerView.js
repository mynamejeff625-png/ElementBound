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

function buildPlayerView(state,seat){
  const view=structuredClone(state);
  view.viewerSeat=seat;
  view.p=view.p.map((side,index)=>publicSide(side,index===seat));
  return view;
}

module.exports={buildPlayerView};
