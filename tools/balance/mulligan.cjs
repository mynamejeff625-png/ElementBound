// Mulligan prototype for the card audit (scratch, not in CI). Rule tested: once, before the first turn, each Bender may
// shuffle any cards from the opening hand back into the Deck and draw that many. Simulated policy: keep Manifestations
// costing 2+, at most one 1-cost Manifestation, and the Response; send the rest back.
//   node tools/balance/mulligan.cjs 150 TAG   → baseline vs mulligan: deck win rates, spread, first player, hand-quality spread
const {load,games,DECKS}=require('./harness.cjs');
const {PATCHES}=require('./audit.cjs');
const MULL=[["for(let i=0;i<2;i++)for(let n=0;n<st.options.openingHand;n++)draw(st,i);",
 "for(let i=0;i<2;i++)for(let n=0;n<st.options.openingHand;n++)draw(st,i);for(let i=0;i<2;i++){let p=st.p[i];if(st.options.mulligan){let one=0,back=p.hand.filter(c=>{if(c.type==='RESPONSE')return false;if(c.type==='MANIFESTATION'&&c.c>=2)return false;if(c.type==='MANIFESTATION'&&c.c<=1&&!one){one=1;return false}return true});back.forEach(c=>p.hand.splice(p.hand.indexOf(c),1));p.deck.push(...back);shuffle(p.deck,st.rng);for(let k=0;k<back.length;k++)draw(st,i);st.metrics.mulligans=(st.metrics.mulligans||0)+back.length}st.metrics['open'+i]=p.hand.filter(c=>c.type==='MANIFESTATION'&&c.c>=2).length}"]];
function run(seeds,tag,opt){const B=load([...PATCHES,...MULL]),pct=(a,b)=>b?+(100*a/b).toFixed(1):0,w={},g={},q={};let fp=0,dec=0,G=0,back=0,rounds=0;
  for(const r of games(B,seeds,opt,tag)){G++;rounds+=r.turns;back+=r.metrics.mulligans||0;if(r.winner===0||r.winner===1){dec++;if(r.winner===r.startSeat)fp++}
    for(const s of [0,1]){const d=r.decks[s];g[d]=(g[d]||0)+1;if(r.winner===s)w[d]=(w[d]||0)+1;const k=Math.min(2,r.metrics['open'+s]),b=q[k]||(q[k]={g:0,w:0});b.g++;if(r.winner===s)b.w++}}
  const rate=Object.fromEntries(DECKS.map(d=>[d,pct(w[d]||0,g[d])])),v=Object.values(rate);
  return{spread:+(Math.max(...v)-Math.min(...v)).toFixed(1),inBand:v.filter(x=>x>=45&&x<=55).length,firstPlayer:pct(fp,dec),rounds:+(rounds/G).toFixed(1),cardsBackPerBender:+(back/G/2).toFixed(2),
    openingBigUnits:Object.fromEntries(Object.entries(q).map(([k,b])=>[k==='2'?'2+':k,{share:pct(b.g,2*G),wr:pct(b.w,b.g)}])),rate}}
if(require.main===module){const [seeds='60',tag='MUL']=process.argv.slice(2);
  console.log(JSON.stringify({baseline:run(+seeds,tag,{}),mulligan:run(+seeds,tag,{mulligan:true})},null,1))}
