const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');

let source=fs.readFileSync('js/game.js','utf8');
source=source.slice(0,source.lastIndexOf('\nsetup();'));
source=source.replace(
  'return Object.freeze({DECKS:',
  'return Object.freeze({_makeState:makeState,DECKS:'
);
const ctx=vm.createContext({console,window:{},document:{getElementById:()=>null},setTimeout:()=>0,clearTimeout(){},requestAnimationFrame(){}});
vm.runInContext(source,ctx);

const result=vm.runInContext(`(()=>{
 const checks=[];
 const check=(value,message)=>{if(!value)throw Error(message);checks.push(message)};
 const state0=EB_BALANCE._makeState('FIRE','WATER','seat-0',{startSeat:0});
 const state1=EB_BALANCE._makeState('FIRE','WATER','seat-1',{startSeat:1});
 check(state0.startSeat===0&&state0.tokenSeat===1,'start 0 assigns token to seat 1');
 check(state1.startSeat===1&&state1.tokenSeat===0,'start 1 assigns token to seat 0');
 check(!state0.p[0].initiationToken&&state0.p[1].initiationToken,'state 0 token flags match metadata');
 check(state1.p[0].initiationToken&&!state1.p[1].initiationToken,'state 1 token flags match metadata');

 const crossed=EB_BALANCE.paired('FIRE','WATER',3,{seedBase:'cal-0859'});
 check(crossed.games===12&&crossed.pairs.length===3&&!crossed.mirror,'non-mirror seeds create four-game crossed sets');
 for(const set of crossed.pairs){
  check(set.games.length===4,'crossed set exposes four games');
  check(set.abStart0.startSeat===0&&set.abStart1.startSeat===1&&set.baStart0.startSeat===0&&set.baStart1.startSeat===1,'both deck orders alternate starters');
  check(set.games.every(g=>g.tokenSeat===1-g.startSeat),'every game gives the token to the nonstarter');
  check(set.physicalSeatComparisons+set.games.filter(g=>g.stalled).length>=2,'role-matched physical-seat comparisons account for valid games');
  check(set.physicalSeatMismatches+set.deckStableOutcomes===set.physicalSeatComparisons,'physical-seat comparison totals reconcile');
 }
 const starts=crossed.pairs.flatMap(set=>set.games).reduce((n,g)=>(n[g.startSeat]++,n),[0,0]);
 const tokens=crossed.pairs.flatMap(set=>set.games).reduce((n,g)=>(n[g.tokenSeat]++,n),[0,0]);
 check(starts[0]===starts[1]&&tokens[0]===tokens[1],'starter and token assignments are physically balanced');

 const mirror=EB_BALANCE.paired('NATURE','NATURE',3,{seedBase:'mirror-0859'});
 check(mirror.games===6&&mirror.pairs.length===3&&mirror.mirror,'mirror seeds create two-game starter-swapped controls');
 for(const set of mirror.pairs){
  check(set.games.length===2&&set.mirrorStart0.startSeat===0&&set.mirrorStart1.startSeat===1,'mirror controls run once per starting seat');
  check(typeof set.mirrorSymmetric==='boolean'||set.mirrorSymmetric===null,'mirror symmetry is explicit and stall-aware');
  check(!('seatFlip' in set)&&!('sameWinner' in set),'legacy duplicate-pair classifications are absent');
 }
 return checks.length;
})()`,ctx);

assert.equal(result,31);
assert.match(source,/physicalSeatMismatches/);
assert.match(source,/mirrorAsymmetric/);
assert.match(source,/starterPct/);
assert.match(source,/tokenPct/);
assert.doesNotMatch(source,/Seat-flip pairs/);

const version=fs.readFileSync('js/version.js','utf8');
assert.match(version,/version:'0\.8\.59'/);
assert.match(version,/balanceLab:'Balance Lab XVI'/);
console.log(`Calibration harness 0.8.59: ${result} focused checks passed`);
