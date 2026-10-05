'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const ElementBoundCards=require('../lib/cardCatalog.js');
const ElementBoundMatchFactory=require('../lib/matchFactory.js');
const EB_Trials=require('../js/trials.js');
assert.equal(EB_Trials.starsForRun({completed:true,rewound:false,wrongMoves:0}),3);
assert.equal(EB_Trials.starsForRun({completed:true,rewound:false,wrongMoves:1}),2);
assert.equal(EB_Trials.starsForRun({completed:true,rewound:true,wrongMoves:0}),2);
assert.deepEqual(EB_Trials.litSegments({FIRE:1,WATER:1,EARTH:0}),[true,true,false,false,false]);
assert.equal(EB_Trials.completedTokens(EB_Trials.TRIAL_DATA.WATER.strip,{played:['Current Shift'],statuses:['Soaked'],actions:['End Turn'],progress:{soaked:true,survived:true}}),4);
assert.equal(EB_Trials.completedTokens(EB_Trials.TRIAL_DATA.NATURE.strip,{played:['Sproutling','Verdant Mend','Grove Beast'],statuses:['Seeded','Growth'],progress:{seeded:true,grew:true},hit:3}),6);
assert.equal(EB_Trials.completedTokens(EB_Trials.TRIAL_DATA.AIR.strip,{played:['Crosswind','Sky Raptor'],statuses:['Momentum'],progress:{momentum:true},hit:4}),4);
assert.deepEqual(EB_Trials.MAP_POINTS,{FIRE:[108,96],WATER:[282,266],EARTH:[108,436],NATURE:[282,606],LIGHTNING:[108,776],AIR:[282,946],MAGMA:[56,632],BLOOM:[334,802],STORM:[108,1096]});
for(const [hybrid,parents] of Object.entries(EB_Trials.PARENTS))for(const parent of parents)assert.ok(EB_Trials.MAP_POINTS[hybrid][1]>EB_Trials.MAP_POINTS[parent][1],`${hybrid} follows ${parent}`);
assert.equal(EB_Trials.PATH_SEGMENTS[0],'M 142.0 96.0 C 238.0 96.0, 152.0 266.0, 248.0 266.0');
assert.equal(EB_Trials.BRANCHES.MAGMA,'M 197.4 551.0 C 202.5 590.7, 134.0 632.0, 84.0 632.0');
const trialCss=fs.readFileSync('css/trials.css','utf8'),trialSource=fs.readFileSync('js/trials.js','utf8'),versionSource=fs.readFileSync('js/version.js','utf8');
assert.match(trialCss,/\.trial-map\{[^}]*background:transparent/);
assert.match(trialCss,/\.trial-map\{[^}]*width:calc\(100% \+ 24px\)[^}]*margin:8px -12px 0/);
assert.match(trialCss,/#trials::after\{[^}]*position:fixed/);
assert.match(trialCss,/mask-image:linear-gradient\(to bottom/);
assert.match(trialCss,/\.trial-river path\{fill:none\}/);
assert.match(trialSource,/river-dim branch-dim trial-river-branch/);
assert.doesNotMatch(trialSource,/trial-node-lock/);
assert.match(versionSource,/version:'1\.6\.2'/);
assert.match(versionSource,/A new themed Trials map/);
assert.match(versionSource,/Locked Hybrids now show which elements to clear first/);
let source=fs.readFileSync('js/game.js','utf8');
source=source.slice(0,source.lastIndexOf('\nsetup();'));
const fake=()=>({textContent:'',innerHTML:'',offsetWidth:0,style:{},classList:{add(){},remove(){},contains(){return false}},appendChild(){}});
const nodes=new Map();const document={getElementById:id=>{if(!nodes.has(id))nodes.set(id,fake());return nodes.get(id)},querySelectorAll:()=>[],createElement:()=>fake()};
const ctx=vm.createContext({console,window:{ElementBoundCards,ElementBoundMatchFactory,EB_Trials},document,CSS:{escape:value=>value},setTimeout:()=>0,clearTimeout(){},requestAnimationFrame(){}});
vm.runInContext(source,ctx);
const result=vm.runInContext(`
render=()=>{};go=()=>{};hideModal=()=>{};ebQueueFx=()=>{};EB_INIT_LOCK=false;
let checks=0;function check(value,message){if(!value)throw Error(message);checks++}
function hand(name){return me().hand.find(card=>card.n===name)}
function unit(side,name){return side.slots.find(card=>card&&card.n===name)}
function won(){return G.winner==='Your Bender'}
function comboComplete(){return won()&&ebTrialCompletedCount()===G.trial.strip.length}
function notWon(message){check(!won(),message)}

startTrial('FIRE');play(hand('Cinder Adept'),0);play(hand('Flame Burst'),null,{bender:true});check(comboComplete(),'Fire combo wins with an honest strip');
startTrial('FIRE');play(hand('Flame Burst'),null,{bender:true});notWon('Fire payoff before Burning must fail');

startTrial('WATER');play(hand('Current Shift'),null,{enemy:unit(foe(),'Tide Brute')});endTurn();check(comboComplete()&&me().vit===1,'Water Soaked survival wins at 1 Vitality with an honest strip');
startTrial('WATER');attack(unit(me(),'River Serpent'),unit(foe(),'Tide Brute'));endTurn();check(comboComplete()&&me().vit===1,'Water River Serpent alternative also Soaks the threat');
startTrial('WATER');check(unit(foe(),'Tide Brute').text==='Guard.'&&!/Armor/.test(unit(foe(),'Tide Brute').text),'Tide Brute shows only its real Guard ability');endTurn();check(G.winner==='Trial Current'&&!G.trial.completionStored,'Water loss never stores completion progress');
startTrial('WATER');play(hand('Current Shift'),null,{enemy:unit(foe(),'Tide Brute')});attack(unit(me(),'River Serpent'),unit(foe(),'Tide Brute'));check(G.trial.wrongMoves===1,'redundant River Serpent attack after Current Shift counts as a wrong move');

startTrial('EARTH');play(hand('Fortify'),null,{friend:unit(me(),'Earthen Guard')});check(comboComplete(),'Earth Armor combo wins with an honest strip');
startTrial('EARTH');attack(unit(me(),'Earthen Guard'),unit(foe(),'Trial Colossus'));notWon('Earth attacking before Armor must fail');

startTrial('NATURE');{let sprout=hand('Sproutling');play(sprout,1);applyPrimeSummonGift(sprout,unit(me(),'Grove Beast'))}play(hand('Verdant Mend'),null,{friend:unit(me(),'Grove Beast')});attack(unit(me(),'Grove Beast'),null);check(comboComplete(),'Nature Seeded Growth combo wins with an honest strip');
startTrial('NATURE');attack(unit(me(),'Grove Beast'),null);notWon('Nature immediate attack must fail');
startTrial('NATURE');play(hand('Verdant Mend'),null,{friend:unit(me(),'Grove Beast')});{let sprout=hand('Sproutling');play(sprout,1);applyPrimeSummonGift(sprout,unit(me(),'Grove Beast'))}attack(unit(me(),'Grove Beast'),null);notWon('Nature Verdant Mend before Sproutling must fail');

startTrial('LIGHTNING');play(hand('Static Step'),null,{flowOnly:true});attack(unit(me(),'Spark Runner'),null);check(comboComplete(),'Lightning charge combo wins with an honest strip');
startTrial('LIGHTNING');attack(unit(me(),'Spark Runner'),null);notWon('Lightning immediate attack must fail');

startTrial('AIR');play(hand('Crosswind'),null,{friend:unit(me(),'Sky Raptor')});attack(unit(me(),'Sky Raptor'),null);check(comboComplete(),'Air Momentum bypass combo wins with an honest strip');
startTrial('AIR');attack(unit(me(),'Sky Raptor'),null);notWon('Air immediate attack must fail against Guard');
startTrial('AIR');play(hand('Crosswind'),null,{friend:unit(me(),'Gale Scout')});attack(unit(me(),'Sky Raptor'),null);notWon('Air Momentum on Gale Scout must fail');
({checks});
`,ctx);
assert.equal(result.checks,17);
console.log(`Trials polish 1.6.2: 25 unit checks and ${result.checks} real-duel checks passed`);
