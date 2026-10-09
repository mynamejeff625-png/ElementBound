// Issue #103 follow-up: the recommended package measured together (scratch, not in CI).
//   planner AI + Storm extras (STORM_EXTRA, default 2nd Tempest Striker + 2nd Crosswind Spark, each for a 1-cost unit) + C2 Charged + Spark Runner 2/1 + D2 second-player mulligan.
//   node tools/balance/package103.cjs 150 TAG
const {load,games,DECKS}=require('./harness.cjs');
const hf=require('./hybridfix.cjs'),pr=require('./proto103.cjs'),base=require('../../lib/cardCatalog.js');
function catalog(){const BASE=JSON.parse(JSON.stringify(base.BASE));BASE.LIGHTNING[0][3]=1;return{...base,BASE}}
function run(seeds,tag,opt={planner:true,c2:true,d2:true}){const B=load([...hf.BASE,...hf.extraCopies({STORM:(process.env.STORM_EXTRA||'Tempest Striker,Crosswind Spark').split(',')}),...pr.P],catalog()),w={},g={},c={},pct=(a,b)=>b?+(100*a/b).toFixed(1):0;let fp=0,dec=0,ch=[0,0],q={};
  for(const d of Object.keys(hf.SIG))c[d]={n:0,combo:0};
  for(const r of games(B,seeds,opt,tag)){if(r.winner===0||r.winner===1){dec++;if(r.winner===r.startSeat)fp++}const X=r.metrics._hx||{sig:[0,0],strk:[0,0]};
    ch[0]+=r.metrics.effects['Charged applied']||0;ch[1]+=r.metrics.effects['Charged released']||0;
    for(const s of [0,1]){const d=r.decks[s];g[d]=(g[d]||0)+1;if(r.winner===s)w[d]=(w[d]||0)+1;if(c[d]){c[d].n++;if((d==='STORM'?X.strk[s]:X.sig[s])>0)c[d].combo++}
      const k=Math.min(2,r.metrics['open'+s]),b=q[k]||(q[k]={g:0,w:0});b.g++;if(r.winner===s)b.w++}}
  const rate=Object.fromEntries(DECKS.map(d=>[d,pct(w[d]||0,g[d])])),v=Object.values(rate);
  return{spread:+(Math.max(...v)-Math.min(...v)).toFixed(1),inBand:v.filter(x=>x>=45&&x<=55).length,firstPlayer:pct(fp,dec),chargedReleased:pct(ch[1],ch[0]),
    combo:Object.fromEntries(Object.entries(c).map(([d,C])=>[d,pct(C.combo,C.n)])),openingBigUnits:Object.fromEntries(Object.entries(q).map(([k,b])=>[k,[pct(b.g,2*dec),pct(b.w,b.g)]])),rate}}
if(require.main===module){const [seeds='60',tag='PKG']=process.argv.slice(2);console.log(JSON.stringify(run(+seeds,tag)))}
