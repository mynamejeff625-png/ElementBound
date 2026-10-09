// Who gets ahead on the field first, and how much that decides the duel (1.12.0 rules unless options/patches given).
const {load,games,DECKS}=require('./harness.cjs');
function snowball(opt={},seeds=150,patches=[],tag='SB'){
  const B=load(patches);const pct=(a,b)=>b?+(100*a/b).toFixed(1):0;
  let G=0,firstTo={1:[0,0],2:[0,0],3:[0,0]},leadR3={},fp=0,dec=0,rounds=0;const deck={};DECKS.forEach(d=>deck[d]={g:0,w:0});
  for(const r of games(B,seeds,opt,tag)){G++;rounds+=r.turns;if(r.winner===0||r.winner===1){dec++;if(r.winner===r.startSeat)fp++}
    r.decks.forEach((d,k)=>{deck[d].g++;if(r.winner===k)deck[d].w++});
    const reached={1:null,2:null,3:null};
    for(const s of r.boardLog){for(const n of [1,2,3])if(reached[n]===null){const hit=[0,1].filter(k=>s.board[k]>=n);if(hit.length===1)reached[n]=hit[0];else if(hit.length===2)reached[n]=-1}
      if(s.round===3&&s.active===r.startSeat&&!s._done){const d=s.board[0]-s.board[1];for(const k of [0,1]){const dk=Math.max(-3,Math.min(3,k?-d:d));(leadR3[dk]||(leadR3[dk]=[0,0]))[0]++;if(r.winner===k)leadR3[dk][1]++}s._done=true}}
    for(const n of [1,2,3])if(reached[n]===0||reached[n]===1){firstTo[n][0]++;if(r.winner===reached[n])firstTo[n][1]++}
  }
  const rate=Object.fromEntries(DECKS.map(d=>[d,pct(deck[d].w,deck[d].g)])),v=Object.values(rate);
  return{games:G,firstPlayer:pct(fp,dec),rounds:+(rounds/G).toFixed(1),spread:+(Math.max(...v)-Math.min(...v)).toFixed(1),inBand:v.filter(x=>x>=45&&x<=55).length,
    firstTo1:pct(firstTo[1][1],firstTo[1][0]),firstTo2:pct(firstTo[2][1],firstTo[2][0]),firstTo3:pct(firstTo[3][1],firstTo[3][0]),
    winByLeadStartR3:Object.fromEntries(Object.entries(leadR3).sort((a,b)=>a[0]-b[0]).map(([k,[n,w]])=>[k,pct(w,n)])),rate};
}
module.exports={snowball};
if(require.main===module)console.log(JSON.stringify(snowball(JSON.parse(process.argv[2]||'{}'),+process.argv[3]||150),null,1));
