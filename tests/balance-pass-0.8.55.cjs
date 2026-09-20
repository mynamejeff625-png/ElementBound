const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

let source = fs.readFileSync('js/game.js', 'utf8');
source = source.slice(0, source.lastIndexOf('\nsetup();'));
source = source.replace(
  'return Object.freeze({DECKS:',
  'return Object.freeze({_makeState:makeState,_playTechnique:playTechnique,_simResolveResponse:simResolveResponse,_responseSimCard:responseSimCard,DECKS:'
);

const ctx = vm.createContext({
  console,
  window: {},
  document: {getElementById: () => null},
  setTimeout: () => 0,
  clearTimeout() {},
  requestAnimationFrame() {}
});
vm.runInContext(source, ctx);

vm.runInContext(`
let checks=0;
function check(value,message){if(!value)throw Error(message);checks++}
hideModal=()=>{};render=()=>{};bump=()=>{};ebQueueFx=()=>{};turnStart=()=>{};

let grove=BASE.NATURE.find(x=>x[0]==='Grove Beast');
let lynx=BASE.LIGHTNING.find(x=>x[0]==='Volt Lynx');
check(grove[1]===4&&grove[2]===2&&grove[3]===5,'Grove Beast must be 4 cost / 2 ATK / 5 HP');
check(lynx[1]===3&&lynx[2]===4&&lynx[3]===3,'Volt Lynx must be 3 cost / 4 ATK / 3 HP');
check(/Chain 3\+/.test(lynx[4]),'Volt Lynx Chain 3+ trigger changed');
check(!/heal/i.test(TECH.NATURE[1])&&/Seeded/.test(TECH.NATURE[1]),'Verdant Mend text mismatch');
check(/heal.*1/i.test(RESPONSES.NATURE.text)&&/once per duel/i.test(RESPONSES.NATURE.text),'Second Bloom text mismatch');
check(/Swap/.test(TECH.AIR[1])&&/fewer than two/.test(TECH.AIR[1]),'Crosswind text mismatch');

function liveState(a='NATURE',b='FIRE'){
  let p=player('You',a),e=player('Rival',b);
  p.hand=[];p.deck=[];p.wake=[];p.slots=[null,null,null];p.e=10;
  e.hand=[];e.deck=[];e.wake=[];e.slots=[null,null,null];e.e=10;
  G={p:[p,e],active:0,turn:1,chain:0,logs:[],winner:null,trial:null,rev:0};
  EB_INIT_LOCK=false;diff='Difficult';return{p,e};
}
function liveTech(el){let t=TECH[el];return{id:++uid,el,n:t[0],c:t[3],type:'TECHNIQUE',zone:'HAND',text:t[1],tip:t[2]}}

{
  let {p}=liveState(),target=mk('NATURE','Target',1,2,5);target.h=2;p.slots[0]=target;
  let c=liveTech('NATURE');p.hand=[c];play(c,null,{friend:target});
  check(target.h===2&&(target.growth||0)===0&&target.a===2,'Unseeded Verdant Mend must have no effect');
  addMark(target,'Seeded');c=liveTech('NATURE');p.hand=[c];play(c,null,{friend:target});
  check(target.h===2&&target.growth===1&&target.a===3,'Seeded Verdant Mend must add only one Growth');
}

{
  let {p,e}=liveState('FIRE','NATURE'),att=mk('FIRE','Attacker',1,2,4),target=mk('NATURE','Bloom Target',1,1,4);
  target.h=2;p.slots[0]=att;e.slots[0]=target;e.responseEl='NATURE';
  let response=responseCard('NATURE');e.hand=[response];
  let out=ebResolveResponse({el:'NATURE',source:'CARD',card:response},e,att,target,target,'BEFORE');
  check(out.ok&&target.h===3&&(target.marks||[]).includes('Second Bloom Used'),'Second Bloom must heal 1 and record use');
  let second=responseCard('NATURE');e.hand=[second];
  check(!ebResponseLegal('NATURE',e,att,target,'BEFORE'),'Second Bloom must not target the same Manifestation twice');
}

{
  let {p,e}=liveState('AIR','EARTH'),left=mk('EARTH','Left',1,1,3),right=mk('EARTH','Right',1,1,3);
  e.slots=[left,null,right];let c=liveTech('AIR');p.hand=[c];play(c,null,{enemy:left,swapWith:right});
  check(e.slots[0]===right&&e.slots[2]===left&&p.turnState.airOpening===true,'Human Crosswind must swap two enemies and set Air Opening');
}

{
  let {p,e}=liveState('AIR','EARTH'),left=mk('EARTH','Left',1,1,3),right=mk('EARTH','Right',1,1,3),lastModal=null;
  e.slots=[left,null,right];let c=liveTech('AIR');p.hand=[c];let originalModal=modal;modal=(title,buttons)=>{lastModal={title,buttons}};
  chooseTechniqueTarget(c);check(lastModal&&lastModal.buttons.length===2,'Crosswind first-target chooser missing');
  lastModal.buttons[0][1]();check(lastModal&&/^Swap /.test(lastModal.title)&&lastModal.buttons.length===1,'Crosswind second-target chooser missing');
  lastModal.buttons[0][1]();modal=originalModal;
  check(e.slots[0]===right&&e.slots[2]===left,'Two-stage Crosswind targeting did not commit the swap');
}

{
  let {p,e}=liveState('AIR','EARTH'),only=mk('EARTH','Only',1,1,3),ally=mk('AIR','Ally',1,1,3),flows=0;
  e.slots=[only,null,null];p.slots=[ally,null,null];let c=liveTech('AIR');p.hand=[c];let originalFlow=flow1;flow1=()=>{flows++;return true};play(c,null,{friend:ally,momentumFallback:true});flow1=originalFlow;
  check(e.slots[0]===only&&flows===0&&ally.momentum===1&&ally.a===2&&!p.turnState.airOpening,'Crosswind fallback must grant Momentum without Flow');
}

{
  let st=EB_BALANCE._makeState('NATURE','FIRE','verdant-sim'),p=st.p[0],seeded={n:'Seeded',a:2,h:2,max:5,marks:['Seeded'],growth:0},plain={n:'Plain',a:2,h:1,max:5,marks:[],growth:0};
  p.slots=[plain,seeded,null];EB_BALANCE._playTechnique(st,0,{el:'NATURE',n:'Verdant Mend',type:'TECHNIQUE'});
  check(plain.h===1&&plain.growth===0&&seeded.h===2&&seeded.growth===1&&seeded.a===3,'Simulator Verdant Mend parity failed');
}

{
  let {p,e}=liveState('EARTH','AIR'),left=mk('EARTH','Left',1,1,3),right=mk('EARTH','Right',1,1,3),crosswind=liveTech('AIR');
  p.slots=[left,null,right];p.deck=[mk('EARTH','Filler',1,1,1)];e.hand=[crosswind];e.deck=[mk('AIR','Filler',1,1,1)];G.active=1;
  ai();check(p.slots[0]===right&&p.slots[2]===left&&G.logs.some(x=>/Rival Crosswind swaps/.test(x)),'Rival Crosswind branch failed to swap');
}

{
  let {p,e}=liveState('FIRE','NATURE'),seeded=mk('NATURE','Seeded Rival',1,2,4),mend=liveTech('NATURE');
  seeded.marks=['Seeded'];e.slots[0]=seeded;p.deck=[mk('FIRE','Filler',1,1,1)];e.hand=[mend];e.deck=[mk('NATURE','Filler',1,1,1)];G.active=1;
  ai();check(seeded.h===4&&seeded.growth===1&&seeded.a===3,'Rival Verdant Mend must add Growth without healing');
}

{
  let st=EB_BALANCE._makeState('AIR','EARTH','crosswind-sim'),p=st.p[0],e=st.p[1],left={n:'Left'},right={n:'Right'};
  e.slots=[left,null,right];EB_BALANCE._playTechnique(st,0,{el:'AIR',n:'Crosswind',type:'TECHNIQUE'});
  check(e.slots[0]===right&&e.slots[2]===left&&p.turnState.airOpening===true,'Simulator Crosswind parity failed');
}

{
  let st=EB_BALANCE._makeState('FIRE','NATURE','bloom-sim',{responseElB:'NATURE'}),att={n:'Attacker',a:2,h:4,max:4,marks:[]},target={n:'Target',a:1,h:2,max:4,marks:[]},def=st.p[1];
  st.p[0].slots=[att,null,null];def.slots=[target,null,null];def.hand=[EB_BALANCE._responseSimCard('NATURE')];def.e=10;def.initiationToken=false;
  let first=EB_BALANCE._simResolveResponse(st,0,att,target,'BEFORE');
  check(first.ok&&target.h===3&&target.marks.includes('Second Bloom Used'),'Simulator Second Bloom first use failed');
  def.hand=[EB_BALANCE._responseSimCard('NATURE')];
  let second=EB_BALANCE._simResolveResponse(st,0,att,target,'BEFORE');
  check(!second.ok&&target.h===3,'Simulator Second Bloom once-per-Manifestation limit failed');
}

let self=EB_BALANCE.selfTest();
check(self.passed===self.total&&self.failures.length===0,'Balance Lab self-test failed: '+self.failures.join(', '));
console.log('Balance Pass 0.8.55: '+checks+' focused checks passed; Balance Lab self-test '+self.passed+'/'+self.total);
`, ctx);

const versionSource = fs.readFileSync('js/version.js','utf8');
assert.match(versionSource,/version:'\d+\.\d+\.\d+'/);
assert.match(versionSource,/ruleset:'EB-RULES-\d+\.\d+\.\d+-BALANCE-PASS'/);
console.log('Release metadata checks passed');
