// Greedy ±1 stat pass (one stat, one point, per card at most) on the real rules, 2 evaluations in parallel.
const {execFile}=require('child_process'),base=require(require('path').resolve(__dirname,'../../lib/cardCatalog.js')),fs=require('fs');
const SEEDS=+process.argv[2]||150,LO=46,HI=54;
const ev=(delta,seeds=SEEDS,tag='SP')=>new Promise((res,rej)=>execFile('node',['evalworker.cjs',JSON.stringify(delta),String(seeds),tag],{maxBuffer:1e7},(e,out)=>e?rej(e):res(JSON.parse(out))));
const cards={};for(const [el,l] of Object.entries(base.BASE))l.forEach(c=>cards[`${el}:${c[0]}`]={el,a:c[2],h:c[3]});
for(const [el,l] of Object.entries(base.HYBRID_CARDS))l.forEach(c=>{if(c.type==='MANIFESTATION')cards[`${el}:${c.n}`]={el,a:c.a,h:c.h}});
const parents={MAGMA:['FIRE','EARTH'],STORM:['LIGHTNING','AIR'],BLOOM:['WATER','NATURE']};
const score=r=>Object.values(r.rate).reduce((s,x)=>s+(x<LO?(LO-x)**2:x>HI?(x-HI)**2:0),0)*10+Object.values(r.rate).reduce((s,x)=>s+(x-50)**2,0)*0.1;
const log=m=>{console.log(m);fs.appendFileSync('statpass.log',m+'\n')};
(async()=>{fs.writeFileSync('statpass.log','');let delta={},cur=await ev(delta),best=score(cur),tried=new Set();
 log(`start ${JSON.stringify(cur.rate)} spread ${cur.spread} score ${best.toFixed(1)}`);
 for(let it=0;it<10;it++){
  const out=Object.entries(cur.rate).filter(([,v])=>v<LO||v>HI).sort((a,b)=>Math.abs(b[1]-50)-Math.abs(a[1]-50));if(!out.length){log('all decks inside 46–54');break}
  const [deck,val]=out[0],dir=val<50?1:-1,pool=[deck,...(parents[deck]||[])];
  const cand=[];for(const [k,c] of Object.entries(cards)){if(!pool.includes(c.el)||delta[k])continue;for(const f of ['a','h']){if(c[f]+dir<1)continue;const key=`${k}|${f}|${dir}`;if(tried.has(key))continue;cand.push({k,f,dir,key})}}
  let pick=null;for(let i=0;i<cand.length;i+=2){const batch=cand.slice(i,i+2),res=await Promise.all(batch.map(c=>ev({...delta,[c.k]:{[c.f]:c.dir}})));
   batch.forEach((c,j)=>{const s=score(res[j]);log(`  try ${c.k} ${c.f}${c.dir>0?'+1':'-1'} → score ${s.toFixed(1)} spread ${res[j].spread}`);c.r=res[j];c.s=s;if(s<best&&(!pick||s<pick.s))pick=c})}
  if(!pick){log(`no improving move for ${deck}`);cand.forEach(c=>tried.add(c.key));continue}
  delta[pick.k]={[pick.f]:pick.dir};cur=pick.r;best=pick.s;log(`it${it} ACCEPT ${pick.k} ${pick.f}${pick.dir>0?'+1':'-1'} → ${JSON.stringify(cur.rate)} spread ${cur.spread} score ${best.toFixed(1)}`);
 }
 const verify=await Promise.all([ev(delta,200,'VERIFY-A'),ev(delta,200,'VERIFY-B')]);
 fs.writeFileSync('statpass.json',JSON.stringify({delta,cur,verify},null,1));
 for(const v of verify){const {rate,...x}=v;log(`VERIFY ${JSON.stringify(x)} ${JSON.stringify(rate)}`)}
 log(`DELTA ${JSON.stringify(delta)}`);
})().catch(e=>{log('ERR '+e.stack);process.exit(1)});
