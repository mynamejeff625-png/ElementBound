// Card, effect and combo audit (docs/handoff/04-next-steps.md step 1). Scratch-grade, not in CI.
// Instruments the Balance Lab through source patches (the game is not changed) and adds Easy and Medium
// card choosers that mirror the live rival, so a deck's Hard-vs-Easy gap measures how much piloting matters.
//   node tools/balance/audit.cjs cards 150 TAG     → per-card, effect and combo tables (Hard vs Hard), JSON on stdout
//   node tools/balance/audit.cjs skill 100 TAG     → per-deck win rate for Hard, Medium and Easy pilots against a Hard field
const fs=require('node:fs'),path=require('node:path');
const {load,games,DECKS}=require('./harness.cjs');
const cat=require('../../lib/cardCatalog.js');
const RAW=fs.readFileSync(path.resolve(__dirname,'../../js/game.js'),'utf8');

const SK="((st.options.skill||[])[%s]||'Hard')";
const sk=seat=>SK.replace('%s',seat);
const HELPERS=`const AUD_HOLD=new Set(['Molten Channel','Pressure Forge','Crosswind Spark','Thunderstep','Rainseed','Flourishing Current']);
 const AUD_DEF=new Set(['Soaked mitigation','Rally Ward blocked','Eruption Guard reduction','Static Reversal movement','Reclaiming Tide survival','Backdraft retaliation','Undertow move','Second Bloom healing','Stonewall Armor','Flash Step damage','Slipstream redirect','Armor blocked']);
 function simAud(st){return st.metrics._aud||(st.metrics._aud={drawn:[{},{}],early:[{},{}],played:[[],[]],fx:[{},{}],tech:[],dmg:{},resp:[{},{}]})}
 function simAudMetric(st,kind,key,n){if(kind!=='effect'&&kind!=='effects')return;let s=AUD_DEF.has(key)?1-st.active:st.active,fx=simAud(st).fx[s];fx[key]=(fx[key]||0)+n}
 function simAudDraw(st,i,c){let A=simAud(st);A.drawn[i][c.n]=(A.drawn[i][c.n]||0)+1;if(st.metrics.initiative.actionTurns[i]<=3)A.early[i][c.n]=(A.early[i][c.n]||0)+1}
 function simAudSnap(st){return JSON.stringify(st.p.map(x=>({v:x.vit,m:x.marks,s:x.slots.map(m=>m&&[m.sid,m.h,m.a,m.armor,m.growth,m.momentum,m.marks,m.quick]),ao:!!x.turnState.airOpening,mv:(x.turnState.moved||[]).length})))}
 function simAudTech(st,owner,c,before,flow0,res){let changed=simAudSnap(st)!==before,flowed=(st.metrics.effects['Flow 1']||0)>flow0;simAud(st).tech.push({seat:owner,n:c.n,res,out:changed?'effect':flowed?'flow':'none'})}
 function simAudDmg(st,owner,src,d){if(!src||!src.sid||!(d>0))return;let k=owner+'|'+src.sid,D=simAud(st).dmg;D[k]=(D[k]||0)+d}
 function simAudAttack(st,owner,att){let mo=momentum(att);if(mo>0){metric(st,'effect','Momentum attack');metric(st,'effect','Momentum bonus ATK',mo);if(att.n==='Sky Raptor')metric(st,'effect','Sky Raptor Momentum attack')}if((att.growth||0)>0){metric(st,'effect','Growth attack');if(att.n==='Grove Beast')metric(st,'effect','Grove Beast grown attack')}if((att.marks||[]).includes('Weakened'))metric(st,'effect','Weakened attack')}
`;
const PATCHES=[
 // Instrumentation.
 ["function metric(st,kind,key,n=1){",HELPERS+" function metric(st,kind,key,n=1){simAudMetric(st,kind,key,n);"],
 ["p.hand.push(p.deck.shift());return true}","let _c=p.deck.shift();p.hand.push(_c);simAudDraw(st,i,_c);return true}"],
 ["p.chain++;metric(st,'cards',c.n);if(c.type==='TECHNIQUE'){p.wake.push(c);playTechnique(st,owner,c)}",
  "p.chain++;metric(st,'cards',c.n);simAud(st).played[owner].push({n:c.n,t:st.turn,ty:c.type});if(c.type==='TECHNIQUE'){p.wake.push(c);let _b=simAudSnap(st),_f=st.metrics.effects['Flow 1']||0,_r=!!p.turnState.resonance.active;playTechnique(st,owner,c);simAudTech(st,owner,c,_b,_f,_r)}"],
 ["t.h-=d;if(d>0)t._ebDamagedTurn=simTurnKey(st,owner);","t.h-=d;simAudDmg(st,owner,source,Math.min(d,Math.max(0,pre)));if(d>0)t._ebDamagedTurn=simTurnKey(st,owner);"],
 ["if(overflow){def.vit-=overflow;","if(overflow){simAudDmg(st,owner,source,overflow);def.vit-=overflow;"],
 ["t.armor=(t.armor||0)-block;","t.armor=(t.armor||0)-block;if(block>0)metric(st,'effect','Armor blocked',block);"],
 ["e.vit-=power;st.metrics.damage[owner]+=power;if(guards(e).length&&canBypass(att,p))","simAudDmg(st,owner,att,power);e.vit-=power;st.metrics.damage[owner]+=power;if(guards(e).length&&canBypass(att,p))"],
 ["function responseMetric(st,el,key,n=1){","function responseMetric(st,el,key,n=1){{let A=simAud(st).resp[1-st.active];A[key]=(A[key]||0)+n}"],
 ["if(att.el==='FIRE'&&att.n==='Flare Hawk'&&(target.marks||[]).includes('Burning')){bonus++;simCombo(st,owner)}","if(att.el==='FIRE'&&att.n==='Flare Hawk'&&(target.marks||[]).includes('Burning')){bonus++;simCombo(st,owner);metric(st,'effect','Flare Hawk Burning bonus')}"],
 ["if(att.el==='EARTH'&&att.n==='Boulder Ram'&&(att.armor||0)>0){bonus++;simCombo(st,owner)}","if(att.el==='EARTH'&&att.n==='Boulder Ram'&&(att.armor||0)>0){bonus++;simCombo(st,owner);metric(st,'effect','Boulder Ram Armor bonus')}"],
 ["if(att.el==='LIGHTNING'&&att.n==='Arc Runner'&&p.chain>=2){bonus+=1;simCombo(st,owner)}","if(att.el==='LIGHTNING'&&att.n==='Arc Runner'&&p.chain>=2){bonus+=1;simCombo(st,owner);metric(st,'effect','Arc Runner Chain bonus')}"],
 ["if(c.el==='FIRE'){let t=e.slots.filter(Boolean).sort((a,b)=>a.h-b.h)[0];if(t&&(t.marks||[]).includes('Burning'))simCombo(st,owner);",
  "if(c.el==='FIRE'){let t=e.slots.filter(Boolean).sort((a,b)=>a.h-b.h)[0];{let _bt=t||(!guards(e).length?e:null);if(_bt&&(_bt.marks||[]).includes('Burning'))metric(st,'effect','Flame Burst Burning bonus')}if(t&&(t.marks||[]).includes('Burning'))simCombo(st,owner);"],
 ["else if(c.n==='Stone Fist'&&t.friend){let n=1+(t.friend.armor||0);","else if(c.n==='Stone Fist'&&t.friend){let n=1+(t.friend.armor||0);if(t.friend.armor>0)metric(st,'effect','Stone Fist Armor bonus',t.friend.armor);"],
 ["else if(c.el==='NATURE'){let t=p.slots.find(m=>m&&(m.marks||[]).includes('Seeded')&&(m.growth||0)<3);if(t)simGrow(st,owner,t)}","else if(c.el==='NATURE'){let t=p.slots.find(m=>m&&(m.marks||[]).includes('Seeded')&&(m.growth||0)<3);if(t&&simGrow(st,owner,t))metric(st,'effect','Verdant Mend Growth')}"],
 ["st.metrics.initiative.attacks[owner]++;","st.metrics.initiative.attacks[owner]++;simAudAttack(st,owner,att);"],
 ["affinity(p,c);if(p.turnState.resonance.active)metric(st,'effect','Resonance active');","{let _w=!!p.turnState.resonance.active;affinity(p,c);if(p.turnState.resonance.active&&!_w)metric(st,'effect','Resonance on')}if(p.turnState.resonance.active)metric(st,'effect','Resonance active');"],
 ["function playTechnique(st,owner,c){let p=st.p[owner],e=st.p[1-owner],res=!!p.turnState.resonance.active;","function playTechnique(st,owner,c){let p=st.p[owner],e=st.p[1-owner],res=!!p.turnState.resonance.active;if(HYBRIDS[c.el])metric(st,'effect',c.n+(res?' (Resonance)':' (no Resonance)'));"],
 // Skill choosers, per seat: st.options.skill=['Hard'|'Medium'|'Easy', …]. They mirror live ai(): Easy plays a random legal card,
 // makes 2 plays, attacks with 1 unit at a random target and passes Responses 55% of the time; Medium makes 2 plays and takes
 // the second-best card 40% of the time; only Hard sends a Guard-bypassing attacker at the Bender. Two audit-only pilots:
// Random keeps Hard's action budget (5 plays, every attacker) but picks cards and attack targets at random and passes
// Responses half the time, so Hard − Random isolates decision quality; Hold is Hard that keeps Hybrid payoff Techniques
// in hand until Resonance is on (a sequencing ceiling the live rival does not reach).
 ["legal=[...legal].sort((a,b)=>score(b,p,e)-score(a,p,e)||a.c-b.c||a.n.localeCompare(b.n));return legal[0]}",
  `let _sk=${sk('owner')};if(_sk==='Hold'&&!p.turnState.resonance.active)legal=legal.filter(c=>!AUD_HOLD.has(c.n));if(!legal.length)return null;if(_sk==='Easy'||_sk==='Random')return legal[Math.floor(st.rng()*legal.length)];legal=[...legal].sort((a,b)=>score(b,p,e)-score(a,p,e)||a.c-b.c||a.n.localeCompare(b.n));return(_sk==='Medium'&&legal.length>1&&st.rng()<0.4)?legal[1]:legal[0]}`],
 ["let owner=st.active,p=st.p[owner],budget=5,",`let owner=st.active,p=st.p[owner],budget=['Easy','Medium'].includes(${sk('st.active')})?2:5,`],
 ["for(const a of attackers.slice(0,cap)){",`for(const a of attackers.slice(0,${sk('owner')}==='Easy'?Math.min(cap,1):cap)){`],
 ["if(targets.length){t=ebPickAITarget(att,targets,st.rng)}",`if(targets.length){t=['Easy','Random'].includes(${sk('owner')})?targets[Math.floor(st.rng()*targets.length)]:ebPickAITarget(att,targets,st.rng)}`],
 ["let direct=!targets.length||((guards(e).length>0)&&canBypass(att,p));",`let direct=!targets.length||((guards(e).length>0)&&canBypass(att,p)&&['Hard','Hold'].includes(${sk('owner')}));`],
 ["if(!simShouldRespond(st,def,att,t,opt,phase)){",`if((${sk('1-owner')}==='Easy'&&st.rng()<0.55)||(${sk('1-owner')}==='Random'&&st.rng()<0.5)||!simShouldRespond(st,def,att,t,opt,phase)){`]
];
// Lives recorded by harness.cjs gain the card's sid so damage can be joined to each Manifestation.
const LIFE_PATCHES=[["(st._lives||(st._lives=[])).push({seat:sideIndex,el:card.el,","(st._lives||(st._lives=[])).push({seat:sideIndex,sid:card.sid,el:card.el,"],["(st._lives||(st._lives=[])).push({seat:side,el:m.el,","(st._lives||(st._lives=[])).push({seat:side,sid:m.sid,el:m.el,"]];
for(const [a] of PATCHES){const n=RAW.split(a).length-1;if(n!==1)throw Error(`audit anchor found ${n}×: ${a.slice(0,70)}`)}
function loadAudit(){return load([...LIFE_PATCHES,...PATCHES])}

// Deck lists: the same construction as makeDeck() in js/game.js.
function deckList(d){const out={},add=(n,k=1)=>out[n]=(out[n]||0)+k,H=cat.HYBRIDS[d];
  if(!H){for(let i=0;i<13;i++)add(cat.BASE[d][i%3][0]);const t2=cat.TECH2[d],x=t2?t2[4]:0;add(cat.TECH[d][0],7-x);if(t2)add(t2[0],x);add(cat.RESPONSES[d].n)}
  else{for(const el of H.parents)for(let i=0;i<8;i++)add(i%5===4?cat.TECH[el][0]:cat.BASE[el][i%3][0]);cat.HYBRID_CARDS[d].forEach(c=>add(c.n));H.parents.forEach(el=>add(cat.RESPONSES[el].n,0.5))}
  return out}
const COST={},TYPE={};
for(const el of Object.keys(cat.BASE))cat.BASE[el].forEach(z=>{COST[z[0]]=z[1];TYPE[z[0]]='UNIT'});
for(const el of Object.keys(cat.TECH)){COST[cat.TECH[el][0]]=cat.TECH[el][3];TYPE[cat.TECH[el][0]]='TECH'}
for(const el of Object.keys(cat.TECH2)){COST[cat.TECH2[el][0]]=cat.TECH2[el][3];TYPE[cat.TECH2[el][0]]='TECH'}
for(const el of Object.keys(cat.RESPONSES)){COST[cat.RESPONSES[el].n]=cat.RESPONSES[el].c;TYPE[cat.RESPONSES[el].n]='RESP'}
for(const d of Object.keys(cat.HYBRID_CARDS))cat.HYBRID_CARDS[d].forEach(c=>{COST[c.n]=c.c;TYPE[c.n]=c.type==='MANIFESTATION'?'UNIT':'TECH'});

// Each deck's combo (docs/DECK_GUIDES.md), measured by the payoff that completes it.
const COMBO={FIRE:['Flame Burst Burning bonus'],WATER:['Soaked mitigation'],EARTH:['Boulder Ram Armor bonus'],NATURE:['Verdant Mend Growth'],
  LIGHTNING:['Volt Lynx payoff'],AIR:['Sky Raptor Momentum attack'],MAGMA:['Molten Channel (Resonance)'],STORM:['Tempest Striker movement bonus'],BLOOM:['Rainseed (Resonance)']};
const pct=(a,b)=>b?+(100*a/b).toFixed(1):null;

function cards(seeds,tag){
  const B=loadAudit(),T={};DECKS.forEach(d=>T[d]={g:0,w:0,cards:{},fx:{},combo:{done:0,doneW:0,notW:0,len:{}},hand:{},exh:0,res:{on:0,turns:0},resp:{},respCard:{}});
  let G=0,sanity={lives:0,sid:0,dmg:0,draws:0,tech:0};
  for(const r of games(B,seeds,{},tag)){G++;const A=r.metrics._aud;sanity.draws+=Object.keys(A.drawn[0]).length;sanity.tech+=A.tech.length;sanity.dmg+=Object.keys(A.dmg).length;
    for(const s of [0,1]){const d=r.decks[s],D=T[d],won=r.winner===s;D.g++;if(won)D.w++;
      const names=new Set([...Object.keys(deckList(d))]);
      for(const n of names){const c=D.cards[n]||(D.cards[n]={drawnG:0,drawnW:0,notG:0,notW:0,earlyG:0,earlyW:0,lateG:0,lateW:0,drawnCopies:0,played:0,playTurn:0,playedG:0,playedW:0,tech:{effect:0,flow:0,none:0},units:0,diedBefore:0,halves:0,dmg:0});
        const dr=A.drawn[s][n]||0,ea=A.early[s][n]||0,pl=A.played[s].filter(x=>x.n===n);
        if(dr){c.drawnG++;if(won)c.drawnW++}else{c.notG++;if(won)c.notW++}
        if(ea){c.earlyG++;if(won)c.earlyW++}else{c.lateG++;if(won)c.lateW++}
        c.drawnCopies+=dr;c.played+=pl.length;pl.forEach(x=>c.playTurn+=x.t);if(pl.length){c.playedG++;if(won)c.playedW++}}
      for(const x of A.tech)if(x.seat===s){const c=D.cards[x.n];if(c)c.tech[x.out]++}
      for(const L of r.lives)if(L.seat===s){sanity.lives++;if(L.sid)sanity.sid++;const c=D.cards[L.n];if(!c)continue;c.units++;if(!L.attacked&&!L.alive)c.diedBefore++;c.halves+=L.halves;c.dmg+=A.dmg[s+'|'+L.sid]||0}
      for(const [k,v] of Object.entries(A.fx[s]))D.fx[k]=(D.fx[k]||0)+v;
      for(const [k,v] of Object.entries(A.resp[s]))D.resp[k]=(D.resp[k]||0)+v;
      for(const n of Object.keys(A.drawn[s]))if(TYPE[n]==='RESP')D.respCard[n]=(D.respCard[n]||0)+Math.min(A.drawn[s][n],A.resp[s].card||0);
      const done=COMBO[d].some(k=>A.fx[s][k]>0);if(done){D.combo.done++;if(won)D.combo.doneW++}else if(won)D.combo.notW++;
      {const L=r.turns<=12?'<=12':r.turns<=17?'13-17':'18+',b=D.combo.len[L]||(D.combo.len[L]={done:0,doneW:0,not:0,notW:0});if(done){b.done++;if(won)b.doneW++}else{b.not++;if(won)b.notW++}}
      {let k=0;for(const [n,v] of Object.entries(A.early[s]))if(TYPE[n]==='UNIT'&&COST[n]>=2)k+=v;k=Math.min(k,3);const h=D.hand[k]||(D.hand[k]={g:0,w:0});h.g++;if(won)h.w++}
      if(A.fx[s].Exhaustion)D.exh++;
      if(A.fx[s]['Resonance on']){D.res.on++;D.res.turns+=A.fx[s]['Resonance on']}
    }}
  if(!sanity.sid||sanity.sid!==sanity.lives||!sanity.dmg||!sanity.tech||!sanity.draws)throw Error('instrumentation missing: '+JSON.stringify(sanity));
  const out={games:G,seeds,tag,decks:{}};
  for(const d of DECKS){const D=T[d],list=deckList(d),base=pct(D.w,D.g),rows=[];
    for(const [n,copies] of Object.entries(list)){const c=D.cards[n],ty=TYPE[n],row={card:n,type:ty,cost:COST[n],copies,
        drawnPerDuel:+(c.drawnCopies/D.g).toFixed(2),playedOfDrawn:pct(c.played,c.drawnCopies),playTurn:c.played?+(c.playTurn/c.played).toFixed(1):null,
        wrDrawn:pct(c.drawnW,c.drawnG),wrNotDrawn:pct(c.notW,c.notG),gap:c.notG&&c.drawnG?+(pct(c.drawnW,c.drawnG)-pct(c.notW,c.notG)).toFixed(1):null,
        wrEarly:pct(c.earlyW,c.earlyG),wrNotEarly:pct(c.lateW,c.lateG),earlyGap:c.lateG&&c.earlyG?+(pct(c.earlyW,c.earlyG)-pct(c.lateW,c.lateG)).toFixed(1):null,
        wrPlayed:pct(c.playedW,c.playedG)};
      if(ty==='UNIT'){row.diedBeforeAttacking=pct(c.diedBefore,c.units);row.lifeTurns=c.units?+(c.halves/c.units/2).toFixed(2):null;row.dmgPerUnit=c.units?+(c.dmg/c.units).toFixed(2):null;row.dmgPerEssence=c.units?+(c.dmg/c.units/COST[n]).toFixed(2):null}
      if(ty==='RESP'){row.playedOfDrawn=pct(D.respCard[n]||0,c.drawnCopies)}
      if(ty==='TECH'){const t=c.tech,n2=t.effect+t.flow+t.none;row.casts=n2;row.fizzle=pct(t.none,n2);row.flowOnly=pct(t.flow,n2)}
      rows.push(row)}
    out.decks[d]={winRate:base,duels:D.g,cards:rows,effectsPerDuel:Object.fromEntries(Object.entries(D.fx).sort().map(([k,v])=>[k,+(v/D.g).toFixed(2)])),
      responses:Object.fromEntries(Object.entries(D.resp).map(([k,v])=>[k,+(v/D.g).toFixed(2)])),
      combo:{payoff:COMBO[d],completion:pct(D.combo.done,D.g),wrDone:pct(D.combo.doneW,D.combo.done),wrNot:pct(D.combo.notW,D.g-D.combo.done),
        byLength:Object.fromEntries(Object.entries(D.combo.len).map(([k,b])=>[k,{share:pct(b.done+b.not,D.g),completion:pct(b.done,b.done+b.not),wrDone:pct(b.doneW,b.done),wrNot:pct(b.notW,b.not)}]))},
      earlyBigUnits:Object.fromEntries(Object.entries(D.hand).sort().map(([k,h])=>[k==='3'?'3+':k,{share:pct(h.g,D.g),wr:pct(h.w,h.g)}])),
      exhaustionDuels:pct(D.exh,D.g),
      resonance:cat.HYBRIDS[d]?{duelsWithResonance:pct(D.res.on,D.g),turnsPerDuel:+(D.res.turns/D.g).toFixed(2)}:null}}
  return out}

// Skill expression: the deck in one seat is piloted at `pilot` skill, the field (all 9 decks) at Hard, both seat orders.
const PILOTS=(process.env.PILOTS||'Hard,Random,Medium,Easy,Hold').split(',');
function skill(seeds,tag){
  const B=loadAudit(),res={};
  for(const pilot of PILOTS){const w={},g={};
    for(const seat of [0,1]){const opt={skill:seat===0?[pilot,'Hard']:['Hard',pilot]};
      for(const r of games(B,seeds,opt,`${tag}|${pilot}|${seat}`)){const d=r.decks[seat];g[d]=(g[d]||0)+1;if(r.winner===seat)w[d]=(w[d]||0)+1}}
    res[pilot]=Object.fromEntries(DECKS.map(d=>[d,pct(w[d]||0,g[d])]))}
  for(const p of PILOTS)if(p!=='Hard')res['gapHard'+p]=Object.fromEntries(DECKS.map(d=>[d,+(res.Hard[d]-res[p][d]).toFixed(1)]));
  return res}

if(require.main===module){const [mode='cards',seeds='40',tag='AUD']=process.argv.slice(2);
  const t0=Date.now(),out=mode==='skill'?skill(+seeds,tag):cards(+seeds,tag);out.seconds=Math.round((Date.now()-t0)/1000);
  process.stdout.write(JSON.stringify(out,null,1)+'\n')}
module.exports={cards,skill,deckList,PATCHES};
