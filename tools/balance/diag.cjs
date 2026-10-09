const {load,games}=require('./harness.cjs');
const B=load();let face={lock:0,cont:0},kills={active:0,lost:0,halves:0},lockRuns=[],lockLost=0,lockN=0,lens={},firstLockRound=[],G=0,lockGames=0,lossAfterFirstLock=0;
for(const r of games(B,120,{},'DG')){
  G++;const L=r.boardLog;lens[Math.min(20,r.turns)]=(lens[Math.min(20,r.turns)]||0)+1;
  let run=[0,0],firstLock=null;
  for(let i=0;i+1<L.length;i++){const s=L[i],n=L[i+1],a=s.active,d=1-a;
    const vitLoss=Math.max(0,s.vit[d]-n.vit[d]);if(s.board[d]===0&&s.round>=2)face.lock+=vitLoss;else face.cont+=vitLoss;
    kills.halves++;kills.active+=Math.max(0,s.board[d]-n.board[d]);
    // A side whose field is empty at the start of its own turn while the rival has units.
    for(const k of [0,1]){const locked=s.active===k&&!s.board[k]&&s.board[1-k]&&s.round>=3;if(locked){if(firstLock===null)firstLock={k,round:s.round};run[k]++}else if(s.active===k&&run[k]){lockRuns.push(run[k]);run[k]=0}}
  }
  if(firstLock){lockGames++;firstLockRound.push(firstLock.round);if(r.winner!==firstLock.k)lossAfterFirstLock++}
}
const avg=a=>a.reduce((x,y)=>x+y,0)/a.length;
console.log(JSON.stringify({games:G,
 faceDamageShareWhileDefenderEmpty:+(100*face.lock/(face.lock+face.cont)).toFixed(1),
 gamesWithALockout:+(100*lockGames/G).toFixed(1),firstLockRoundAvg:+avg(firstLockRound).toFixed(2),
 lockedSideLoses:+(100*lossAfterFirstLock/lockGames).toFixed(1),
 lockStreakAvgOwnTurns:+avg(lockRuns).toFixed(2),
 roundsHistogram:lens},null,1));
