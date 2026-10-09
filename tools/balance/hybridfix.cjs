// Hybrid combo fixes (issue #103 follow-up; scratch, not in CI). Prototypes, all simulator-only:
//   planner  AI: play the missing parent cards first, hold Resonance payoffs until Resonance, and move Tempest Striker
//            (the live Hard rival plays the first card it scores highest and moves the first unit it finds);
//   carry    rule: Resonance lit this turn stays on through your next turn;
//   wild     rule: a Hybrid card counts as one missing parent (before it resolves);
//   s1       rule: Tempest Striker's +1 triggers after any friendly Manifestation moves this turn;
//   copies   deck: a second copy of the signature card (replaces the first parent's last 2-cost unit).
// Reports each Hybrid's guide-combo completion (share of duels with at least one), any-Resonance-payoff rate, and
// all nine decks' win rates.   node tools/balance/hybridfix.cjs 100 TAG [variant names…]
const {load,games,DECKS}=require('./harness.cjs');
const SIG={MAGMA:'Molten Channel',STORM:'Crosswind Spark',BLOOM:'Rainseed'};
const PAY={MAGMA:['Molten Channel','Pressure Forge'],STORM:['Crosswind Spark','Thunderstep'],BLOOM:['Rainseed','Flourishing Current']};
const HELP=`function simHx(st){return st.metrics._hx||(st.metrics._hx={sig:[0,0],pay:[0,0],strk:[0,0]})}
 function simPlan(st,owner){let p=st.p[owner],e=st.p[1-owner],h=HYBRIDS[p.el];if(!h||!st.options.planner)return undefined;
  const PAY=${JSON.stringify(PAY)},HOLD=new Set(PAY[p.el]),rr=p.turnState.resonance,free=p.slots.filter(x=>!x).length;
  let legal=p.hand.filter(c=>c.type!=='RESPONSE'&&c.c<=p.e&&(c.type==='TECHNIQUE'?(c.el!=='AIR'||p.slots.some(Boolean))&&secondTechniqueLegal(p,e,c):free>0));if(!legal.length)return null;
  let held=legal.filter(c=>HOLD.has(c.n)),best=a=>[...a].sort((x,y)=>score(y,p,e)-score(x,p,e)||x.c-y.c||x.n.localeCompare(y.n))[0];
  if(p.el==='STORM'){let s=p.slots.find(m=>m&&m.n==='Tempest Striker'&&!m.sick&&m.ready&&!(p.turnState.moved||[]).includes(m.sid));let mv=legal.find(c=>c.n==='Crosswind Spark'||c.n==='Thunderstep');if(s&&mv&&free>0)return mv}
  if(rr.active)return held.length?best(held):best(legal);
  if(held.length){let need=[];if(!rr.a)need.push(h.parents[0]);if(!rr.b)need.push(h.parents[1]);if(st.options.wild&&need.length)need=need.slice(1);
   let picks=[],cost=0,units=0;for(const el of need){let c=legal.filter(x=>x.el===el&&!picks.includes(x)).sort((a,b)=>(a.type==='MANIFESTATION')-(b.type==='MANIFESTATION')||a.c-b.c).find(x=>x.type!=='MANIFESTATION'||units<free);if(!c){picks=null;break}picks.push(c);cost+=c.c;if(c.type==='MANIFESTATION')units++}
   if(picks&&cost+Math.min(...held.map(c=>c.c))<=p.e)return picks.length?picks[0]:best(held)}
  let rest=legal.filter(c=>!HOLD.has(c.n));return rest.length?best(rest):null}
 function metric(st,kind,key,n=1){`;
const BASE=[
 ["function metric(st,kind,key,n=1){",HELP],
 ["function choosePlay(st,owner){","function choosePlay(st,owner){{let _pl=simPlan(st,owner);if(_pl!==undefined)return _pl}"],
 ["function playTechnique(st,owner,c){let p=st.p[owner],e=st.p[1-owner],res=!!p.turnState.resonance.active;",`function playTechnique(st,owner,c){let p=st.p[owner],e=st.p[1-owner],res=!!p.turnState.resonance.active;if(res&&HYBRIDS[c.el]){simHx(st).pay[owner]++;if(c.n===${JSON.stringify(SIG)}[p.el])simHx(st).sig[owner]++}`],
 ["if(att.el==='STORM'&&att.n==='Tempest Striker'&&(p.turnState.moved||[]).includes(att.sid)&&!att.turnFlags?.stormBonus){bonus++;","if(att.el==='STORM'&&att.n==='Tempest Striker'&&(p.turnState.moved||[]).includes(att.sid)&&!att.turnFlags?.stormBonus){bonus++;simHx(st).strk[owner]++;"],
 ["else if(c.el==='STORM'){\n     let t=p.slots.filter(Boolean)[0];","else if(c.el==='STORM'){\n     let t=(st.options.planner&&p.slots.find(m=>m&&m.n==='Tempest Striker'&&!m.sick&&!(p.turnState.moved||[]).includes(m.sid)))||p.slots.filter(Boolean)[0];"],
 ["p.chain++;metric(st,'cards',c.n);","p.chain++;metric(st,'cards',c.n);if(st.options.wild&&HYBRIDS[p.el]&&c.el===p.el){let rr=p.turnState.resonance;if(!rr.a)rr.a=true;else rr.b=true;rr.active=rr.active||(rr.a&&rr.b)}"],
 ["rr.active=rr.a&&rr.b;","rr.active=rr.active||(rr.a&&rr.b);"],
 // s1: Tempest Striker's bonus triggers after ANY friendly Manifestation changes slots this turn (not only itself).
 ["if(att.el==='STORM'&&att.n==='Tempest Striker'&&(p.turnState.moved||[]).includes(att.sid)&&","if(att.el==='STORM'&&att.n==='Tempest Striker'&&(st.options.s1?(p.turnState.moved||[]).length>0:(p.turnState.moved||[]).includes(att.sid))&&"],
 ["p.turnState={resonance:{a:false,b:false,active:false},parents:HYBRIDS[p.el]?.parents||[],moved:[]};if(doDraw)","{let _o=p.turnState&&p.turnState.resonance,_lit=!!(st.options.carry&&_o&&_o.a&&_o.b);p.turnState={resonance:{a:false,b:false,active:_lit},parents:HYBRIDS[p.el]?.parents||[],moved:[]}}if(doDraw)"]];
const COPIES=[["a=[...primePack(h.parents[0],8),...primePack(h.parents[1],8),...HYBRID_CARDS[el].map(z=>card(el,z))]",`a=[...primePack(h.parents[0],7),...primePack(h.parents[1],8),...HYBRID_CARDS[el].map(z=>card(el,z)),card(el,HYBRID_CARDS[el].find(z=>z.n===${JSON.stringify(SIG)}[el]))]`]];
// extra: {DECK:[card names]} — each extra Hybrid card replaces one 1-cost parent Manifestation (parents alternate).
const extraCopies=extra=>[["a=[...primePack(h.parents[0],8),...primePack(h.parents[1],8),...HYBRID_CARDS[el].map(z=>card(el,z))]",
 `{let X=${JSON.stringify(extra)}[el]||[],A=primePack(h.parents[0],8),B2=primePack(h.parents[1],8);X.forEach((n,k)=>{let L=k%2?B2:A,i=L.map(c=>c.type==='MANIFESTATION'&&c.c===1).lastIndexOf(true);if(i>=0)L.splice(i,1)});a=[...A,...B2,...HYBRID_CARDS[el].map(z=>card(el,z)),...X.map(n=>card(el,HYBRID_CARDS[el].find(z=>z.n===n)))]}`]];
const fs=require('node:fs'),RAW=fs.readFileSync(require('node:path').resolve(__dirname,'../../js/game.js'),'utf8');
for(const [a] of [...BASE,...COPIES])if(RAW.split(a).length!==2)throw Error('anchor not unique: '+a.slice(0,60));
const VARIANTS={base:[{},false],planner:[{planner:true},false],'planner+carry':[{planner:true,carry:true},false],'planner+wild':[{planner:true,wild:true},false],
 'planner+2 copies':[{planner:true},true],'planner+carry+2 copies':[{planner:true,carry:true},true],'planner+wild+2 copies':[{planner:true,wild:true},true],'planner+S1':[{planner:true,s1:true},false],'planner+2nd signature (for a 1-drop)':[{planner:true},{MAGMA:['Molten Channel'],STORM:['Crosswind Spark'],BLOOM:['Rainseed']}],
 'planner+Storm 2nd Striker':[{planner:true},{STORM:['Tempest Striker']}],
 'planner+Storm 2nd Striker+2nd Spark':[{planner:true},{STORM:['Tempest Striker','Crosswind Spark']}],
 'carry (no planner)':[{carry:true},false],'wild (no planner)':[{wild:true},false]};
function run(name,seeds,tag){const [opt,copies]=VARIANTS[name],B=load([...BASE,...(copies===true?COPIES:copies?extraCopies(copies):[])]),w={},g={},c={};
  for(const d of Object.keys(SIG))c[d]={n:0,combo:0,pay:0,payN:0};
  for(const r of games(B,seeds,opt,tag)){const X=r.metrics._hx||{sig:[0,0],pay:[0,0],strk:[0,0]};for(const s of [0,1]){const d=r.decks[s];g[d]=(g[d]||0)+1;if(r.winner===s)w[d]=(w[d]||0)+1;
    if(c[d]){const C=c[d];C.n++;if((d==='STORM'?X.strk[s]:X.sig[s])>0)C.combo++;if(X.pay[s]>0)C.pay++;C.payN+=X.pay[s]}}}
  const rate=Object.fromEntries(DECKS.map(d=>[d,+(100*(w[d]||0)/g[d]).toFixed(1)])),v=Object.values(rate);
  return{variant:name,spread:+(Math.max(...v)-Math.min(...v)).toFixed(1),inBand:v.filter(x=>x>=45&&x<=55).length,
    combo:Object.fromEntries(Object.entries(c).map(([d,C])=>[d,{guideCombo:+(100*C.combo/C.n).toFixed(1),anyPayoff:+(100*C.pay/C.n).toFixed(1),payoffsPerDuel:+(C.payN/C.n).toFixed(2)}])),rate}}
if(require.main===module){const [seeds='60',tag='HFX',...names]=process.argv.slice(2);for(const n of (names.length?names:Object.keys(VARIANTS)))console.log(JSON.stringify(run(n,+seeds,tag)))}
module.exports={run,VARIANTS,BASE,extraCopies,SIG};
