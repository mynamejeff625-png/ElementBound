// Issue #99 · Balance gate: in a fixed-seed Balance Lab round robin (Hard-rival card choice), every deck's win rate
// stays inside 45–55%. Seeded, so the result is deterministic; a rules or stats change that pushes a deck out fails here.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const ElementBoundCards=require('../lib/cardCatalog.js');
const ElementBoundMatchFactory=require('../lib/matchFactory.js');
let source=fs.readFileSync('js/game.js','utf8');source=source.slice(0,source.lastIndexOf('\nsetup();'));
const ctx=vm.createContext({console:{log(){},error(){},warn(){},debug(){}},Math,window:{ElementBoundCards,ElementBoundMatchFactory},document:{getElementById:()=>null},setTimeout:()=>0,clearTimeout(){},requestAnimationFrame(){}});
vm.runInContext(source,ctx);
const B=vm.runInContext('EB_BALANCE',ctx),SEEDS=60,LO=45,HI=55;
const wins={},games={};for(const d of B.DECKS){wins[d]=0;games[d]=0}
let stalls=0;
for(const a of B.DECKS)for(const b of B.DECKS)for(let i=0;i<SEEDS;i++){const r=B.simulate(a,b,{seed:`DECK-BAND|${a}|${b}|${i}`});if(r.stalled)stalls++;games[a]++;games[b]++;if(r.winner===0)wins[a]++;if(r.winner===1)wins[b]++}
const rate=Object.fromEntries(B.DECKS.map(d=>[d,+(100*wins[d]/games[d]).toFixed(1)]));
let checks=0;
assert.equal(stalls,0,'no Balance Lab duel stalls');checks++;
for(const d of B.DECKS){assert.ok(rate[d]>=LO&&rate[d]<=HI,`${d} wins ${rate[d]}% — outside ${LO}–${HI}% (${JSON.stringify(rate)})`);checks++}
console.log(`Deck band 1.13.1: ${checks} checks passed · ${JSON.stringify(rate)}`);
