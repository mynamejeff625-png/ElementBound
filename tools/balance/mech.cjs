// Prototype mechanics for the anti-snowball round (scratch only). All run on top of the real 1.12.0 rules.
const {load,games,DECKS}=require('./harness.cjs');
const PATCHES=[
 // Lanes: an attacker faces the enemy slot across from it. open = empty lane lets it pick freely; strict = empty lane hits the Bender.
 ["let all=e.slots.filter(Boolean),targets=all.filter(x=>!simWarded(st,x)),t=null;",
  "let all=e.slots.filter(Boolean),targets=all.filter(x=>!simWarded(st,x)),t=null;if(st.options.lanes&&(st.options.reach||[]).includes(att.el)){}else if(st.options.lanes==='adjacent'){let li=p.slots.indexOf(att),near=[li-1,li,li+1].map(k=>e.slots[k]).filter(x=>x&&!simWarded(st,x));targets=near}else if(st.options.lanes){let li=p.slots.indexOf(att),opp=e.slots[li];if(opp&&!simWarded(st,opp))targets=[opp];else if(st.options.lanes==='strict')targets=[];else if(st.options.lanes==='guard'){let g=e.slots.filter(x=>x&&x.guard&&!simWarded(st,x));targets=g.length&&!canBypass(att,p)?g:[]}}if(st.options.taunt){let tg=targets.filter(x=>x.guard);if(tg.length)targets=tg}"],
 // Lane-aware placement for the simulated players.
 ["else{let i=p.slots.findIndex(x=>!x);if(i<0)return false;c.sick=true;",
  "else{let i=p.slots.findIndex(x=>!x);if(st.options.lanes){let foe=st.p[1-owner],best=-1,bi=-1;p.slots.forEach((x,k)=>{if(!x){let o=foe.slots[k],v=o?10+(o.a||0):0;if(v>best){best=v;bi=k}}});if(bi>=0)i=bi}if(i<0)return false;c.sick=true;"],
 // Exposed: a Manifestation that attacked takes +1 damage until its owner's next turn.
 ["if(p.slots.includes(att))att.ready=false;st.actions++;","if(p.slots.includes(att)){att.ready=false;if(st.options.exposed)mark(att,'Exposed')}st.actions++;"],
 ["function dealBody(st,owner,t,power,source,isAttack=false,noOverflow=false){","function dealBody(st,owner,t,power,source,isAttack=false,noOverflow=false){if(st.options.exposed&&power>0&&(t.marks||[]).includes('Exposed'))power+=st.options.exposed===2?2:1;"],
 ["if(ebWarded(m))unmark(m,'Warded')});","if(ebWarded(m))unmark(m,'Warded');unmark(m,'Exposed')});"],
 // Command limit: at most N attacks per turn.
 ["Math.max(0,Math.floor(Number(st.options.firstPlayerRound2AttackCap))):attackers.length;","Math.max(0,Math.floor(Number(st.options.firstPlayerRound2AttackCap))):(Number.isFinite(Number(st.options.attackCap))?Math.min(attackers.length,Number(st.options.attackCap)):attackers.length);"],
 // Underdog draw: start your turn with fewer Manifestations than the rival → draw 1 extra (only if your Deck has cards).
 ["if(doDraw)draw(st,i);endCheck(st)}","if(doDraw){draw(st,i);if(st.options.underdogDraw&&st.turn>=(st.options.swFrom||2)&&p.deck.length&&p.slots.filter(Boolean).length<=st.p[1-i].slots.filter(Boolean).length-(st.options.swGap||1)&&(!st.options.swHand||p.hand.filter(c=>c.type!=='RESPONSE').length<=st.options.swHand||(st.options.swOrGap2&&p.slots.filter(Boolean).length<=st.p[1-i].slots.filter(Boolean).length-2)))draw(st,i)}endCheck(st)}"],
 // Survivor strike-back (defender that survives hits back).
 ["dealBody(st,owner,t,power,att,true);if(st.options.strikeBack&&","dealBody(st,owner,t,power,att,true);if(st.options.strikeBackLive&&e.slots.includes(t)&&p.slots.includes(att)&&(t.a||0)>0&&!endCheck(st)){dealBody(st,1-owner,att,Math.max(0,t.a),t,false,true)}if(st.options.strikeBack&&"]
];
function measure(opt={},seeds=120,tag='MX',extra=[],cat){
  const B=load([...PATCHES,...extra],cat),pct=(a,b)=>b?+(100*a/b).toFixed(1):0;
  const deck={};DECKS.forEach(d=>deck[d]={g:0,w:0});let G=0,fp=0,dec=0,rounds=0,cont=0,late=0,lop=0,b2=0,b2w=0,f3=[0,0],diff={};
  for(const r of games(B,seeds,opt,tag)){G++;rounds+=r.turns;if(r.winner===0||r.winner===1){dec++;if(r.winner===r.startSeat)fp++}
    r.decks.forEach((d,k)=>{deck[d].g++;if(r.winner===k)deck[d].w++});
    let gl=0,gc=0,behind=[false,false],first3=null;
    for(const s of r.boardLog){if(first3===null){const h=[0,1].filter(k=>s.board[k]>=3);if(h.length===1)first3=h[0];else if(h.length===2)first3=-1}
      if(s.round<3)continue;gl++;if(s.board[0]&&s.board[1])gc++;
      const me=s.active,d=Math.max(-2,Math.min(2,s.board[me]-s.board[1-me]));(diff[d]||(diff[d]=[0,0]))[0]++;if(r.winner===me)diff[d][1]++;
      for(const k of [0,1])if(s.board[k]-s.board[1-k]<=-2)behind[k]=true}
    if(gl){late+=gl;cont+=gc;if(gc/gl<0.5)lop++}
    for(const k of [0,1])if(behind[k]){b2++;if(r.winner===k)b2w++}
    if(first3===0||first3===1){f3[0]++;if(r.winner===first3)f3[1]++}
  }
  const rate=Object.fromEntries(DECKS.map(d=>[d,pct(deck[d].w,deck[d].g)])),v=Object.values(rate);
  return{spread:+(Math.max(...v)-Math.min(...v)).toFixed(1),inBand:v.filter(x=>x>=45&&x<=55).length,firstPlayer:pct(fp,dec),firstTo3:pct(f3[1],f3[0]),winAtMinus1:pct(diff[-1]?.[1],diff[-1]?.[0]),winAtMinus2:pct(diff[-2]?.[1],diff[-2]?.[0]),winAtPlus1:pct(diff[1]?.[1],diff[1]?.[0]),comeback:pct(b2w,b2),contested:pct(cont,late),lopsided:pct(lop,G),rounds:+(rounds/G).toFixed(1),rate};
}
module.exports={measure,PATCHES};
