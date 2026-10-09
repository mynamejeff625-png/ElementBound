const {load,games,DECKS}=require('./harness.cjs');
const PROTO=[
 ["function draw(st,i){let p=st.p[i];if(!p.deck.length){p.vit-=EXHAUSTION_DAMAGE;","function draw(st,i){let p=st.p[i];if(!p.deck.length){p.vit-=st.options.escalate?(p._exh=(p._exh||1)+1):EXHAUSTION_DAMAGE;"],
 ["dealBody(st,owner,t,power,att,true);if(st.options.strikeBack&&","dealBody(st,owner,t,power,att,true);if(st.options.strikeBackLive&&e.slots.includes(t)&&p.slots.includes(att)&&(t.a||0)>0&&!endCheck(st)){exp(st).strikeBacks++;dealBody(st,1-owner,att,Math.max(0,t.a),t,false,true)}if(st.options.strikeBack&&"],
 ["if(st.winner===null){let d=st.p.map(depleted);","if(st.winner===null&&!st.options.noDepletion){let d=st.p.map(depleted);"],
 // Rally Ward: a Manifestation summoned while you have fewer units than the rival can't be attacked until your next turn.
 ["c._half0=st._half||0;c._owner=owner;","c._half0=st._half||0;c._owner=owner;c._baseA=c._baseA??c.a;c._rallyWard=p.slots.filter(Boolean).length<st.p[1-owner].slots.filter(Boolean).length;c._emptyWard=!p.slots.some(Boolean)&&st.p[1-owner].slots.some(Boolean)&&(!st.options.wardAfterLoss||p.wake.some(x=>x.type==='MANIFESTATION'))&&(!st.options.wardRound2||st.turn>=2);"],
 ["function simWarded(st,m){return !!(st.options.arrivalWard&&simNew(m))}","function simWarded(st,m){return !!((st.options.arrivalWard||(st.options.wardBehind&&m._rallyWard)||(st.options.wardEmpty&&m._emptyWard))&&simNew(m))}"],
 // Rally Draw: begin your turn with an empty field → draw 1 extra card.
 ["if(doDraw)draw(st,i);endCheck(st)}","if(doDraw){draw(st,i);if(st.options.rallyDraw&&!p.slots.some(Boolean)&&st.p[1-i].slots.some(Boolean)&&st.turn>1)draw(st,i);if(st.options.rallyBehind&&p.slots.filter(Boolean).length<st.p[1-i].slots.filter(Boolean).length&&st.turn>1)draw(st,i)}if(st.options.wakeRally&&st.turn>1&&(st.options.wakeRally==='behind'?p.slots.filter(Boolean).length<st.p[1-i].slots.filter(Boolean).length:!p.slots.some(Boolean)&&st.p[1-i].slots.some(Boolean))&&p._rallyRound!==st.turn){let k=-1;for(let j=p.wake.length-1;j>=0;j--)if(p.wake[j].type==='MANIFESTATION'){k=j;break}if(k>=0){let c=p.wake.splice(k,1)[0];c.h=c.max;c.a=c._baseA??c.a;c.growth=0;c.armor=0;c.momentum=0;c.marks=[];c.quick=null;c.turnFlags={};c._ebHasAttacked=false;c._ebFirstOpportunitySeen=false;p.hand.push(c);p._rallyRound=st.turn;metric(st,'effect','Wake Rally')}}if(st.options.rallyEssence&&p.slots.filter(Boolean).length<st.p[1-i].slots.filter(Boolean).length)p.e+=1;endCheck(st)}"]
];
function analyze(opt={},seeds=60,tag='BP'){
  const B=load(PROTO);
  const R=12,byRound=Array.from({length:R+1},()=>({n:0,both:0,lock:0,none:0,board:0,hand:0}));
  const deck={};DECKS.forEach(d=>deck[d]={g:0,w:0,snaps:0,empty:0,contested:0,lives:0,never:0,halves:0});
  let G=0,firstWins=0,decided=0,rounds=0,contestedShares=[],lopsided=0,dep=0;
  const diffWin={};// board diff (seat view) at start of own turn, round>=3 -> [n, wins]
  let behind2=0,behind2Won=0,behind2Recovered=0,leadFlips=0,leadEvents=0;
  let handAtLock=[0,0],lockSnaps=0,faceWhenEmpty=0,faceTotal=0;
  for(const r of games(B,seeds,opt,tag)){
    G++;rounds+=r.turns;if(r.reason==='CARD_DEPLETION')dep++;
    if(r.winner===0||r.winner===1){decided++;if(r.winner===r.startSeat)firstWins++}
    r.decks.forEach((d,k)=>{deck[d].g++;if(r.winner===k)deck[d].w++});
    const log=r.boardLog;let late=0,cont=0,b2=[false,false],rec=[false,false];
    for(const s of log){
      const rr=Math.min(R,s.round),x=byRound[rr],both=s.board[0]>0&&s.board[1]>0,lock=(s.board[0]>0)!==(s.board[1]>0),none=!s.board[0]&&!s.board[1];
      x.n++;if(both)x.both++;if(lock)x.lock++;if(none)x.none++;x.board+=s.board[0]+s.board[1];x.hand+=s.hand[0]+s.hand[1];
      if(s.round>=3){late++;if(both)cont++;
        r.decks.forEach((d,k)=>{deck[d].snaps++;if(!s.board[k]&&s.board[1-k])deck[d].empty++;if(both)deck[d].contested++});
        const me=s.active,d=Math.max(-3,Math.min(3,s.board[me]-s.board[1-me])),key=String(d);(diffWin[key]||(diffWin[key]=[0,0]))[0]++;if(r.winner===me)diffWin[key][1]++;
        for(const k of [0,1]){const dk=s.board[k]-s.board[1-k];if(dk<=-2)b2[k]=true;if(b2[k]&&dk>=0)rec[k]=true}
        if(lock){lockSnaps++;const emptySide=s.board[0]?1:0;handAtLock[0]+=s.hand[emptySide];handAtLock[1]+=s.hand[1-emptySide]}
      }
    }
    if(late){const share=cont/late;contestedShares.push(share);if(share<0.5)lopsided++}
    for(const k of [0,1])if(b2[k]){behind2++;if(r.winner===k)behind2Won++;if(rec[k])behind2Recovered++}
    for(const L of r.lives){const D=deck[r.decks[L.seat]];if(L.alive)continue;D.lives++;D.halves+=L.halves;if(!L.attacked)D.never++}
  }
  const pct=(a,b)=>b?+(100*a/b).toFixed(1):0;
  const rate=Object.fromEntries(DECKS.map(d=>[d,pct(deck[d].w,deck[d].g)])),rv=Object.values(rate);
  contestedShares.sort((a,b)=>a-b);
  return{
    games:G,spread:+(Math.max(...rv)-Math.min(...rv)).toFixed(1),firstPlayer:pct(firstWins,decided),avgRounds:+(rounds/G).toFixed(2),depletion:pct(dep,G),
    contestedMedian:+(100*contestedShares[Math.floor(contestedShares.length/2)]).toFixed(1),contestedMean:pct(contestedShares.reduce((a,b)=>a+b,0),contestedShares.length),lopsidedDuels:pct(lopsided,contestedShares.length),
    comeback:{behindBy2:pct(behind2,2*G),wonAfter:pct(behind2Won,behind2),recoveredBoard:pct(behind2Recovered,behind2)},
    winByBoardDiff:Object.fromEntries(Object.entries(diffWin).sort((a,b)=>a[0]-b[0]).map(([k,[n,w]])=>[k,pct(w,n)])),
    lockout:{handOfEmptySide:+(handAtLock[0]/Math.max(1,lockSnaps)).toFixed(2),handOfFullSide:+(handAtLock[1]/Math.max(1,lockSnaps)).toFixed(2)},
    byRound:byRound.slice(1).filter(x=>x.n).map((x,i)=>({round:i+1,both:pct(x.both,x.n),lockout:pct(x.lock,x.n),empty:pct(x.none,x.n),avgUnits:+(x.board/x.n/2).toFixed(2),avgHand:+(x.hand/x.n/2).toFixed(2),share:pct(x.n,G*2)})),
    decks:Object.fromEntries(DECKS.map(d=>[d,{win:rate[d],contested:pct(deck[d].contested,deck[d].snaps),lockedOut:pct(deck[d].empty,deck[d].snaps),diedBeforeAttacking:pct(deck[d].never,deck[d].lives),avgLifeHalves:+(deck[d].halves/Math.max(1,deck[d].lives)).toFixed(2)}]))
  };
}
module.exports={analyze};
if(require.main===module){const opt=JSON.parse(process.argv[2]||'{}'),seeds=+process.argv[3]||60;console.log(JSON.stringify(analyze(opt,seeds),null,1))}
