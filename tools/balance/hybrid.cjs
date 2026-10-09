// Hybrid combo diagnosis (issue #103 follow-up; scratch, not in CI). At the start of each Hybrid turn where the deck's
// signature Resonance card is in hand, it classifies why that turn can or cannot reach "parent A + parent B + signature":
// missing a parent card, no empty slots for the parent Manifestations, not enough Essence, or feasible. It also tracks
// whether the signature card really was cast under Resonance, and Storm's Tempest Striker set-up.
//   node tools/balance/hybrid.cjs 100 TAG
const {load,games}=require('./harness.cjs');
const SIG={MAGMA:'Molten Channel',STORM:'Crosswind Spark',BLOOM:'Rainseed'};
const HELP=`function simHybDiag(st,i){let p=st.p[i],h=HYBRIDS[p.el];if(!h)return;let D=st.metrics._hyb||(st.metrics._hyb={turns:[0,0],sigTurns:[0,0],cat:[{},{}],won:[0,0],striker:[{ready:0,mover:0,slot:0,both:0},{ready:0,mover:0,slot:0,both:0}]});D.turns[i]++;
  const SIG=${JSON.stringify(SIG)},sig=SIG[p.el],hand=p.hand.filter(c=>c.type!=='RESPONSE'),free=p.slots.filter(x=>!x).length;
  let sc=hand.filter(c=>c.n===sig);if(sc.length){D.sigTurns[i]++;let A=hand.filter(c=>c.el===h.parents[0]),B=hand.filter(c=>c.el===h.parents[1]),cat;
    if(!A.length||!B.length)cat=!A.length&&!B.length?'missing both parents':'missing one parent';
    else{let slotOK=false,eOK=false;for(const a of A)for(const b of B){let u=(a.type==='MANIFESTATION')+(b.type==='MANIFESTATION');if(u<=free){slotOK=true;if(a.c+b.c+sc[0].c<=p.e)eOK=true}}cat=!slotOK?'no empty slots':!eOK?'not enough Essence':'feasible'}
    (D.cat[i][cat]=D.cat[i][cat]||{n:0,done:0}).n++;st._hybCat=[i,cat]}else st._hybCat=null;
  if(p.el==='STORM'){let s=p.slots.find(m=>m&&m.n==='Tempest Striker');if(s){let S=D.striker[i];S.ready++;let mv=hand.some(c=>c.n==='Crosswind Spark'||c.n==='Thunderstep'),sl=free>0;if(mv)S.mover++;if(sl)S.slot++;if(mv&&sl)S.both++}}}
 function metric(st,kind,key,n=1){`;
const P=[["function metric(st,kind,key,n=1){",HELP],
 ["let owner=st.active,p=st.p[owner],budget=5,","simHybDiag(st,st.active);let owner=st.active,p=st.p[owner],budget=5,"],
 ["function playTechnique(st,owner,c){let p=st.p[owner],e=st.p[1-owner],res=!!p.turnState.resonance.active;",`function playTechnique(st,owner,c){let p=st.p[owner],e=st.p[1-owner],res=!!p.turnState.resonance.active;if(res&&st._hybCat&&st._hybCat[0]===owner&&c.n===${JSON.stringify(SIG)}[p.el]){st.metrics._hyb.cat[owner][st._hybCat[1]].done++;st._hybCat=null}`]];
const fs=require('node:fs'),RAW=fs.readFileSync(require('node:path').resolve(__dirname,'../../js/game.js'),'utf8');
for(const [a] of P)if(RAW.split(a).length!==2)throw Error('anchor not unique: '+a.slice(0,60));
function run(seeds,tag,extra=[],opt={}){const B=load([...P,...extra]),out={};
  for(const d of Object.keys(SIG))out[d]={duels:0,turns:0,sigTurns:0,cat:{},striker:{ready:0,mover:0,slot:0,both:0}};
  for(const r of games(B,seeds,opt,tag)){const H=r.metrics._hyb;if(!H)continue;for(const s of [0,1]){const d=r.decks[s];if(!SIG[d])continue;const o=out[d];o.duels++;o.turns+=H.turns[s];o.sigTurns+=H.sigTurns[s];
    for(const [k,v] of Object.entries(H.cat[s])){const c=o.cat[k]||(o.cat[k]={n:0,done:0});c.n+=v.n;c.done+=v.done}for(const k of Object.keys(o.striker))o.striker[k]+=H.striker[s][k]}}
  for(const o of Object.values(out)){const T=Object.values(o.cat).reduce((a,c)=>a+c.n,0);o.signatureInHand=+(100*o.sigTurns/o.turns).toFixed(1);
    o.cat=Object.fromEntries(Object.entries(o.cat).map(([k,c])=>[k,{share:+(100*c.n/T).toFixed(1),castUnderResonance:+(100*c.done/c.n).toFixed(1)}]))}
  return out}
if(require.main===module){const [seeds='60',tag='HYB']=process.argv.slice(2);console.log(JSON.stringify(run(+seeds,tag),null,1))}
module.exports={run,SIG,P};
