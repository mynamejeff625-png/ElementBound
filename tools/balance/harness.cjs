// Board-presence instrumentation for the Balance Lab simulator (scratch only, not in the repo).
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const ROOT=path.resolve(__dirname,'../..');
const catalog=require(path.join(ROOT,'lib/cardCatalog.js')),factory=require(path.join(ROOT,'lib/matchFactory.js'));
const DECKS=['FIRE','WATER','NATURE','EARTH','LIGHTNING','AIR','MAGMA','STORM','BLOOM'];
function patch(src,a,b){if(!src.includes(a))throw Error('patch anchor missing: '+a.slice(0,60));return src.replace(a,b)}
function load(extraPatches=[],cat=catalog){
  let src=fs.readFileSync(path.join(ROOT,'js/game.js'),'utf8');src=src.slice(0,src.lastIndexOf('\nsetup();'));
  const snap=`function simBoardSnap(st){(st._log||(st._log=[])).push({half:st._half||0,round:st.turn,active:st.active,board:st.p.map(x=>x.slots.filter(Boolean).length),atk:st.p.map(x=>x.slots.filter(Boolean).reduce((s,m)=>s+Math.max(0,m.a||0),0)),hp:st.p.map(x=>x.slots.filter(Boolean).reduce((s,m)=>s+Math.max(0,m.h||0),0)),hand:st.p.map(x=>x.hand.filter(c=>c.type!=='RESPONSE').length),deck:st.p.map(x=>x.deck.length),vit:st.p.map(x=>x.vit),e:st.p.map(x=>x.maxE)})}`;
  src=patch(src,'function turn(st){if(endCheck(st))return;',snap+'\n function turn(st){if(endCheck(st))return;simBoardSnap(st);st._half=(st._half||0)+1;');
  src=patch(src,'c._ebSummonedTurn=st.turn;','c._ebSummonedTurn=st.turn;c._half0=st._half||0;c._owner=owner;');
  src=patch(src,'function simSendToWake(st,sideIndex,card){let side=st.p[sideIndex],i=side.slots.indexOf(card);if(i<0)return false;',
    'function simSendToWake(st,sideIndex,card){let side=st.p[sideIndex],i=side.slots.indexOf(card);if(i<0)return false;(st._lives||(st._lives=[])).push({seat:sideIndex,el:card.el,n:card.n,c:card.c,halves:(st._half||0)-(card._half0||0),attacked:!!card._ebHasAttacked,round:st.turn});');
  src=patch(src,"return{seed:st.seed,decks:[a,b],","simBoardSnap(st);for(const side of [0,1])for(const m of st.p[side].slots.filter(Boolean))(st._lives||(st._lives=[])).push({seat:side,el:m.el,n:m.n,c:m.c,halves:(st._half||0)-(m._half0||0),attacked:!!m._ebHasAttacked,alive:true,round:st.turn});return{boardLog:st._log,lives:st._lives||[],seed:st.seed,decks:[a,b],");
  for(const [a,b] of extraPatches)if(src.includes(a))src=src.replace(a,b);
  const ctx=vm.createContext({console:{log(){},error(){},debug(){},warn(){}},window:{ElementBoundCards:cat,ElementBoundMatchFactory:factory},document:{getElementById:()=>null},setTimeout:()=>0,clearTimeout(){},requestAnimationFrame(){}});
  vm.runInContext(src,ctx);return vm.runInContext('EB_BALANCE',ctx);
}
function* games(B,seeds,opt={},tag='BP'){for(const a of DECKS)for(const b of DECKS)for(let i=0;i<seeds;i++)yield B.simulate(a,b,{...opt,seed:`${tag}|${a}|${b}|${i}`})}
module.exports={load,games,DECKS};
