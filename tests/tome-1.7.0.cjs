'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const ROOT=path.resolve(__dirname,'..');
const tome=require('../js/tomeData.js');
const source=fs.readFileSync(path.join(ROOT,'docs/TOME.md'),'utf8');
const game=fs.readFileSync(path.join(ROOT,'js/game.js'),'utf8');
const allJs=fs.readdirSync(path.join(ROOT,'js')).filter(name=>name.endsWith('.js')).map(name=>fs.readFileSync(path.join(ROOT,'js',name),'utf8')).join('\n');
const html=fs.readFileSync(path.join(ROOT,'index.html'),'utf8');
const css=fs.readFileSync(path.join(ROOT,'css/tome.css'),'utf8');
let checks=0;
function check(value,message){assert.ok(value,message);checks++}
function equal(actual,expected,message){assert.deepEqual(actual,expected,message);checks++}

// Every approved page appears exactly once, in source order.
const lessons=[...source.matchAll(/^### ([IVX]+) · (.+)$/gm)].map(match=>match[2]);
const entries=[...source.matchAll(/^#### (.+?)(?: \((?:symbol|term|element page)\))?$/gm)].map(match=>match[1]);
// 1.12.0 (issue #96) adds Warded and 1.13.0 (issue #99) adds Second Wind to Core Terms: 33 entries precede Effects at a Glance, 64 pages in all.
const expected=['Contents',...lessons,...entries.slice(0,33),'Effects at a Glance','The Nine Elements',...entries.slice(33)];
equal(tome.pages.map(page=>page.title),expected,'all 64 source pages retain their approved order');
equal(new Set(tome.pages.map(page=>page.id)).size,64,'page ids are unique');

// Approved content is preserved, including every Archivist line and Rules field.
for(const page of tome.pages.filter(page=>page.archivist))check(source.includes(`**Archivist:** ${page.archivist}`)||source.includes(`- **Archivist:** ${page.archivist}`),`${page.title}: Archivist text comes from TOME.md`);
for(const page of tome.pages.filter(page=>page.rule||page.rules)){const value=page.rule||page.rules;check(source.includes(value),`${page.title}: rule text comes from TOME.md`)}
for(const page of tome.pages.filter(page=>page.confuse))check(source.includes(page.confuse),`${page.title}: Don't-confuse text comes from TOME.md`);


// First Lessons preserve every approved Demo says line, including the Pass branch.
const lessonBlocks=[...source.matchAll(/^### ([IVX]+) · ([^\n]+)\n([\s\S]*?)(?=^### |^---$)/gm)];
for(const [,roman,title,block] of lessonBlocks){const page=tome.pages.find(item=>item.title===title),line=block.match(/^- \*\*Demo says:\*\* (.+)$/m)?.[1]||'',approved=[...line.matchAll(/"([^"]*)"/g)].map(match=>match[1]);equal(page.says.slice(0,approved.length),approved,`${roman}: Demo says lines match TOME.md`)}
const passLine=source.match(/^#### Pass[\s\S]*?- \*\*Archivist:\*\* "([^"]+)"/m)[1];
equal(tome.pages.find(page=>page.id==='lesson-v').says.at(-1),passLine,'Defense lesson Pass branch matches the Pass Archivist line');

// Links resolve, chapters follow the binding order, and each element tab has a destination.
const titles=new Set(tome.pages.map(page=>page.title));
const linked=[...JSON.stringify(tome.pages).matchAll(/\[\[([^\]]+)\]\]/g)].map(match=>match[1]);
equal([...new Set(linked.filter(title=>!titles.has(title)))],[],'every linked term resolves');
equal(tome.chapters.map(chapter=>chapter.id),['contents','core','FIRE','WATER','EARTH','NATURE','LIGHTNING','AIR','MAGMA','BLOOM','STORM'],'chapter order matches the approved Tome');
for(const chapter of tome.chapters)check(tome.pages.some(page=>page.chapter===chapter.id),`${chapter.label}: tab has a destination`);

// Quick facts and effects-at-a-glance use only the approved values.
const allowed={on:['Manifestation','Bender','Manifestation or Bender','Your turn','Your deck'],lasts:['Instant','Next attack','Until used','Until used or round end','Round end','Until your next turn','While on field','Until destroyed','Stays','This turn','Each draw'],stacks:['No','No (1 per round)','Up to 3','Counts up','3 uses']};
for(const page of tome.pages.filter(page=>page.facts))for(const key of Object.keys(allowed))check(allowed[key].includes(page.facts[key]),`${page.title}: ${key} uses an approved quick-fact value`);
const glance=tome.pages.find(page=>page.kind==='glance');equal(glance.table.length,10,'effects-at-a-glance has ten rows');

// The new full-screen Tome replaces only the old help entry points.
check(/<section id="tome" class="screen"/.test(html),'full-screen Tome exists');
check(/onclick="goTome\(\)"/.test(html),'How to Play opens the Tome');
check(/function goTome\(\)/.test(game),'game exposes Tome navigation');
check(!/HELP_SECTIONS|showHelpSection|showRules/.test(allJs),'legacy modal help code is removed from js/');
check(/const GLOSSARY=/.test(game),'card-inspection glossary remains');
check(/@media\(prefers-reduced-motion:reduce\)/.test(css),'Tome supplies reduced-motion behavior');
const tomeSource=fs.readFileSync(path.join(ROOT,'js/tome.js'),'utf8'),lessonSource=fs.readFileSync(path.join(ROOT,'js/tomeLessons.js'),'utf8');
check(html.includes('js/tomeLessons.js')&&/lessons\.mount\(page\.id,api\)/.test(tomeSource),'lesson module loads and mounts inside lesson pages');
check(/STORAGE_KEY='ebTomeOpened'/.test(lessonSource),'new-player nudge uses the approved storage key');
check(/Math\.abs\(dx\)>8/.test(tomeSource)&&/if\(!state\.drag\.moved\)return/.test(tomeSource),'Tome preserves taps until a swipe crosses its movement threshold');
const browserSource=fs.readFileSync(path.join(ROOT,'js/cardBrowser.js'),'utf8');
check(['peek','peekCard','closePeek','openSearch','sheet:','has:'].every(name=>new RegExp(`const api=\\{[^\\n]*\\b${name}`).test(tomeSource)),'Tome exposes peek, peekCard, closePeek, openSearch, sheet and has');
check(/\[data-tome-term\]/.test(tomeSource),'any element with data-tome-term opens a Tome peek');
check(/chip\.dataset\.tomeTerm=word/.test(browserSource)&&/cardDetail/.test(browserSource),'card keywords link to the Tome and cards can render alone');
check(/data-tome-term=/.test(game)&&/GLOSSARY\[k\]/.test(game),'duel card inspect links its terms while keeping the short glossary text');
for(const keyword of ['Burning','Guard','Flow','Soaked','Seeded','Growth','Armor','Chain','Charged','Momentum','Weakened','Resonance'])check(tome.pages.some(page=>page.title===keyword),`card keyword ${keyword} has a Tome page`);
const synonymTable=source.slice(source.indexOf('### 0.6 Search words from other games'),source.indexOf('## Part One')).split('\n').filter(line=>/^\| [^-|][^|]* \| [^|]+ \|$/.test(line)&&!line.startsWith('| Page |')).map(line=>line.split('|').slice(1,3).map(cell=>cell.trim()));
equal(Object.fromEntries(synonymTable.map(([title,words])=>[title,words.split(', ')])),JSON.parse(JSON.stringify(tome.synonyms)),'search synonyms in tomeData.js match TOME.md §0.6 exactly');
for(const title of Object.keys(tome.synonyms))check(tome.pages.some(page=>page.title===title),`search synonym target ${title} is a Tome page`);
check(/search:searchTome/.test(tomeSource)&&/icon:'search'/.test(tomeSource),'Tome header exposes search');
check(/\.tome-page-scroll\{[^}]*touch-action:pan-y/.test(css),'Tome pages only allow vertical panning, so a sideways swipe stays with the page on touch screens');
console.log(`Tome 1.7.0: ${checks} checks passed`);
