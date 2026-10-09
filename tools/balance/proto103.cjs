// Issue #103 follow-up prototypes for Charged and draw variance (scratch, not in CI; simulator-only patches).
//   C1 Static Step Charges the enemy's highest-ATK Manifestation (or the Bender if none); a Lightning attack on it releases it.
//   C2 Charged on the enemy Bender is released by the next Lightning attack this turn against any target (+1).
//   D1 opening guarantee: an opening hand without a 2+ cost Manifestation swaps one card for the Deck's first one.
//   D2 second-player mulligan only (policy as mulligan.cjs).
//   D3 Sproutling, Stone Initiate and Breeze Disciple target themselves when no other ally is on the field.
//   node tools/balance/proto103.cjs 150 TAG [variants…]
const {load,games,DECKS}=require('./harness.cjs');
const OPEN="for(let i=0;i<2;i++)for(let n=0;n<st.options.openingHand;n++)draw(st,i);";
const P=[
 ["else if(c.el==='LIGHTNING'){if(p.chain===2){mark(e,'Charged');metric(st,'effect','Charged applied')}else flow(st,owner)}",
  "else if(c.el==='LIGHTNING'){if(p.chain===2){let _t=st.options.c1?e.slots.filter(Boolean).sort((a,b)=>(b.a||0)-(a.a||0))[0]:null;mark(_t||e,'Charged');metric(st,'effect','Charged applied')}else flow(st,owner)}"],
 ["if((target.marks||[]).includes('Charged')&&att.el==='LIGHTNING'){bonus++;unmark(target,'Charged');metric(st,'effect','Charged released');simCombo(st,owner)}",
  "if((target.marks||[]).includes('Charged')&&att.el==='LIGHTNING'){bonus++;unmark(target,'Charged');metric(st,'effect','Charged released');simCombo(st,owner)}else if(st.options.c2&&att.el==='LIGHTNING'&&(st.p[1-owner].marks||[]).includes('Charged')){bonus++;unmark(st.p[1-owner],'Charged');metric(st,'effect','Charged released')}"],
 ["function summonGift(st,owner,c){let p=st.p[owner],targets=p.slots.filter(m=>m&&m!==c);if(!targets.length)return;",
  "function summonGift(st,owner,c){let p=st.p[owner],targets=p.slots.filter(m=>m&&m!==c);if(!targets.length&&st.options.d3)targets=[c];if(!targets.length)return;"],
 [OPEN,OPEN+`for(let i=0;i<2;i++){let p=st.p[i],big=c=>c.type==='MANIFESTATION'&&c.c>=2;
   if(st.options.d1&&!p.hand.some(big)){let k=p.deck.findIndex(big);if(k>=0){let back=p.hand.filter(c=>c.type!=='RESPONSE').sort((a,b)=>a.c-b.c)[0]||p.hand[0],got=p.deck.splice(k,1)[0];p.hand.splice(p.hand.indexOf(back),1,got);p.deck.push(back);shuffle(p.deck,st.rng)}}
   if(st.options.d2&&i!==st.startSeat){let one=0,back=p.hand.filter(c=>{if(c.type==='RESPONSE'||big(c))return false;if(c.type==='MANIFESTATION'&&!one){one=1;return false}return true});back.forEach(c=>p.hand.splice(p.hand.indexOf(c),1));p.deck.push(...back);shuffle(p.deck,st.rng);for(let k=0;k<back.length;k++)draw(st,i)}
   st.metrics['open'+i]=p.hand.filter(big).length}`]];
const fs=require('node:fs'),RAW=fs.readFileSync(require('node:path').resolve(__dirname,'../../js/game.js'),'utf8');
for(const [a] of P)if(RAW.split(a).length!==2)throw Error('anchor not unique: '+a.slice(0,60));
const V={base:{},C1:{c1:true},C2:{c2:true},D1:{d1:true},D2:{d2:true},D3:{d3:true}};
function run(name,seeds,tag,cat){const B=load(P,cat),w={},g={},q={},pct=(a,b)=>b?+(100*a/b).toFixed(1):0;let fp=0,dec=0,ch=[0,0],ln=0;
  for(const r of games(B,seeds,V[name],tag)){if(r.winner===0||r.winner===1){dec++;if(r.winner===r.startSeat)fp++}
    for(const s of [0,1]){const d=r.decks[s];g[d]=(g[d]||0)+1;if(r.winner===s)w[d]=(w[d]||0)+1;const k=Math.min(2,r.metrics['open'+s]),b=q[k]||(q[k]={g:0,w:0});b.g++;if(r.winner===s)b.w++}
    if(r.decks.includes('LIGHTNING')){ln++;ch[0]+=r.metrics.effects['Charged applied']||0;ch[1]+=r.metrics.effects['Charged released']||0}}
  const rate=Object.fromEntries(DECKS.map(d=>[d,pct(w[d]||0,g[d])])),v=Object.values(rate);
  return{variant:name,spread:+(Math.max(...v)-Math.min(...v)).toFixed(1),inBand:v.filter(x=>x>=45&&x<=55).length,firstPlayer:pct(fp,dec),
   chargedReleased:pct(ch[1],ch[0]),openingBigUnits:Object.fromEntries(Object.entries(q).sort().map(([k,b])=>[k==='2'?'2+':k,[pct(b.g,2*(dec||1)),pct(b.w,b.g)]])),rate}}
if(require.main===module){const [seeds='60',tag='P103',...names]=process.argv.slice(2);for(const n of (names.length?names:Object.keys(V)))console.log(JSON.stringify(run(n,+seeds,tag)))}
module.exports={run,V,P};
