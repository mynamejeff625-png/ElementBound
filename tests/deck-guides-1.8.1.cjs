'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const ROOT=path.resolve(__dirname,'..');
const catalog=require('../lib/cardCatalog.js');
global.ElementBoundCards=catalog;
const browser=require('../js/cardBrowser.js');
const guides=require('../js/deckGuides.js');
const doc=fs.readFileSync(path.join(ROOT,'docs/DECK_GUIDES.md'),'utf8');
let checks=0;
function check(value,message){assert.ok(value,message);checks++}
function equal(actual,expected,message){assert.deepEqual(actual,expected,message);checks++}

function parse(markdown){const out={};for(const block of markdown.split(/^## /m).slice(1)){const [key,...rest]=block.split('\n');const text=rest.join('\n');const field=label=>{const match=text.match(new RegExp(`- \\*\\*${label}:\\*\\* (.+)`));return match?match[1].trim():null};
  const plan=[...text.matchAll(/^  \d\. (.+)$/gm)].map(match=>match[1].trim());
  out[key.trim()]={archivist:field('Archivist'),plan,key:field('Key cards').split(', '),combo:field('Combo').split(' → '),watch:field('Watch out')}}return out}
const fromDoc=parse(doc);
equal(Object.keys(fromDoc).sort(),[...browser.DECKS].sort(),'docs/DECK_GUIDES.md covers all nine decks');
equal(JSON.parse(JSON.stringify(guides)),fromDoc,'js/deckGuides.js matches docs/DECK_GUIDES.md word for word');

const deckNames=key=>{const own=browser.deckCards(key,catalog).map(card=>card.n);const parents=catalog.HYBRIDS[key]?.parents||[];return new Set([...own,...parents.flatMap(parent=>browser.deckCards(parent,catalog).map(card=>card.n))])};
for(const key of browser.DECKS){const guide=guides[key],names=deckNames(key);
  check(/^".+"$/.test(guide.archivist)&&guide.archivist.split(/\s+/).length<=25,`${key} Archivist line is quoted and at most 25 words`);
  equal(guide.plan.length,3,`${key} plan has three steps`);
  equal(guide.key.length,3,`${key} has three key cards`);
  for(const name of guide.key)check(names.has(name),`${key} key card ${name} is in that deck`);
  check(guide.combo.length>=3,`${key} combo has at least three steps`);
  check(guide.watch&&guide.watch.length>20,`${key} has a warning`);}
const browserSource=fs.readFileSync(path.join(ROOT,'js/cardBrowser.js'),'utf8'),html=fs.readFileSync(path.join(ROOT,'index.html'),'utf8');
check(html.indexOf('js/deckGuides.js')>-1&&html.indexOf('js/deckGuides.js')<html.indexOf('js/cardBrowser.js'),'deck guides load before the card browser');
check(/openGuide/.test(browserSource)&&/How this deck wins/.test(browserSource)&&/guide:true/.test(fs.readFileSync(path.join(ROOT,"js/codex.js"),"utf8"))&&/guide:.header./.test(fs.readFileSync(path.join(ROOT,"js/deckSelect.js"),"utf8")),'card browser offers the deck guide');
console.log(`Deck guides 1.8.1: ${checks} checks passed`);
