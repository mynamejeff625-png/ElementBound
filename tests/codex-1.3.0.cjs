'use strict';
const assert=require('node:assert/strict');
const catalog=require('../lib/cardCatalog.js');
const {DECKS,circularOffset,dialInterpolation,deckCards,extractKeywords,resolveSwipe}=require('../js/codex.js');

let checks=0;
function check(value,message){assert.ok(value,message);checks++}
function close(actual,expected,message){assert.ok(Math.abs(actual-expected)<.001,`${message}: expected ${expected}, got ${actual}`);checks++}

check(circularOffset(0,0)===0,'current deck has zero circular offset');
check(circularOffset(0,8)===1,'offset wraps forward from Bloom to Fire');
check(circularOffset(8,0)===-1,'offset wraps backward from Fire to Bloom');
check(circularOffset(5,0)===-4,'offset uses the shortest circular direction');
check(circularOffset(4.5,0)===4.5,'positive boundary is included');
check(circularOffset(0,4.5)===4.5,'negative boundary shifts into (-4.5, 4.5]');

for(const [offset,x,scale,opacity] of [[0,0,1,1],[1,74,.667,.85],[2,128,.472,.45],[3,168,.4,0]]){
  const value=dialInterpolation(offset);close(value.x,x,`dial x at ${offset}`);close(value.scale,scale,`dial scale at ${offset}`);close(value.opacity,opacity,`dial opacity at ${offset}`);
  const mirror=dialInterpolation(-offset);close(mirror.x,-x,`dial x is symmetric at ${offset}`);close(mirror.scale,scale,`dial scale is symmetric at ${offset}`);close(mirror.opacity,opacity,`dial opacity is symmetric at ${offset}`);
}

for(const key of DECKS.slice(0,6)){
  const cards=deckCards(key,catalog);check(cards.length===5,`${key} maps to five cards`);
  check(cards.slice(0,3).every(card=>card.type==='MANIFESTATION')&&cards[3].type==='TECHNIQUE'&&cards[4].type==='RESPONSE',`${key} preserves unit, Technique, Response order`);
}
for(const key of DECKS.slice(6)){
  const cards=deckCards(key,catalog);check(cards.length===4,`${key} maps to four cards`);
  check(cards.map(card=>card.n).join('|')===catalog.HYBRID_CARDS[key].map(card=>card.n).join('|'),`${key} preserves catalog order`);
}

check(extractKeywords({n:'Test',text:'Apply Burning, then gain Armor and Resonance.'},{Test:'Guard too'}).join('|')==='Burning|Guard|Armor|Resonance','keyword extraction checks rules and short text in canonical order');
check(extractKeywords({n:'Test',text:'Charged is not charge.'},{Test:''}).join('|')==='Charged','keyword extraction matches complete keywords');

check(resolveSwipe({dx:-160,velocity:0,unit:74,current:0,count:9})===2,'dial resolves rounded multi-step drags');
check(resolveSwipe({dx:-10,velocity:-.31,unit:74,current:0,count:9})===1,'quick flick advances one deck');
check(resolveSwipe({dx:19,velocity:0,unit:74,current:3,count:9})===2,'quarter-unit drag advances in its direction');
check(resolveSwipe({dx:10,velocity:0,unit:74,current:3,count:9})===3,'short slow drag stays put');
check(resolveSwipe({dx:100,velocity:0,unit:74,current:0,count:9,wrap:true})===8,'dial wrapping moves before Fire to Bloom');
check(resolveSwipe({dx:-500,velocity:0,unit:300,current:3,count:5,clamp:true})===4,'carousel clamps at its last card');
check(resolveSwipe({dx:500,velocity:0,unit:300,current:0,count:5,clamp:true})===0,'carousel clamps at its first card');

const browserSource=require('node:fs').readFileSync(require('node:path').join(__dirname,'..','js/cardBrowser.js'),'utf8');
check(/zoomTo,openFinder/.test(browserSource)&&/search:true/.test(require('node:fs').readFileSync(require('node:path').join(__dirname,'..','js/codex.js'),'utf8')),'Codex exposes the card finder and zoomTo');
check(/window\.EB_Tome\?\.sheet/.test(browserSource),'card finder reuses the shared Tome sheet');
console.log(`Codex 1.3.0: ${checks} checks passed`);
