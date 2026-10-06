'use strict';
const assert=require('node:assert/strict');
const {difficultyKey,difficultyLabel,loadDifficulty,saveDifficulty,transitionState}=require('../js/deckSelect.js');
let checks=0;
function equal(actual,expected,message){assert.equal(actual,expected,message);checks++}
function check(value,message){assert.ok(value,message);checks++}

equal(difficultyKey('Easy'),'Easy','Easy maps to the existing Easy key');
equal(difficultyKey('Medium'),'Medium','Medium maps to the existing Medium key');
equal(difficultyKey('Hard'),'Difficult','Hard maps to the existing Difficult key');
equal(difficultyLabel('Difficult'),'Hard','Difficult displays as Hard');
equal(loadDifficulty({getItem:()=>null}),'Medium','missing saved difficulty defaults to Medium');
equal(loadDifficulty({getItem:()=> 'Difficult'}),'Hard','saved Difficult key restores the Hard label');
const values={};equal(saveDifficulty('Hard',{setItem:(key,value)=>{values[key]=value}}),'Difficult','saving Hard returns the internal key');equal(values.ebDifficulty,'Difficult','saving Hard persists the internal key');
equal(loadDifficulty({getItem(){throw new Error('blocked')}}),'Medium','blocked storage falls back to Medium');
equal(transitionState({locked:false},'SELECT').locked,true,'Select locks the deck browser');
equal(transitionState({locked:true},'CHANGE_DECK').locked,false,'Change deck unlocks the deck browser');
{const {loadResponse,saveResponse,RESPONSE_KEY}=require('../js/deckSelect.js');const H={MAGMA:{parents:['FIRE','EARTH']}},store=new Map(),storage={getItem:key=>store.has(key)?store.get(key):null,setItem:(key,value)=>store.set(key,value)};
equal(loadResponse('MAGMA',storage,H),'FIRE','a Hybrid starts on its first parent\'s Response');
equal(saveResponse('MAGMA','EARTH',storage,H),'EARTH','choosing the other parent is saved');
equal(loadResponse('MAGMA',storage,H),'EARTH','each Hybrid remembers its last Response');
equal(JSON.parse(store.get(RESPONSE_KEY)).MAGMA,'EARTH','Responses persist under ebHybridResponse per deck');
equal(saveResponse('MAGMA','WATER',storage,H),'EARTH','a Response from a non-parent element is rejected');
equal(loadResponse('FIRE',storage,H),null,'Prime decks have no Response choice');
equal(loadResponse('MAGMA',{getItem(){throw new Error('blocked')}},H),'FIRE','blocked storage falls back to the first parent');
const game=require('node:fs').readFileSync(require('node:path').join(__dirname,'..','js/game.js'),'utf8'),select=require('node:fs').readFileSync(require('node:path').join(__dirname,'..','js/deckSelect.js'),'utf8');
check(/function startSelectedMatch\(deckKey,difficultyKey,responseElement=null\)\{[^}]*EB_HYBRID_RESPONSE_CHOICE=responseElement/.test(game),'Start Duel passes the chosen Response into the match');
check(!/Choose your Hybrid Response card/.test(game),'the old Hybrid Response pop-up is retired');
check(/startSelectedMatch\(browser\.key,difficultyKey\(state\.difficulty\),state\.response\)/.test(select),'deck select sends its Response choice');}
{const game=require('node:fs').readFileSync(require('node:path').join(__dirname,'..','js/game.js'),'utf8');
check(/createRoom\(\{element,responseElement:ebOnlineResponse\(\)\}\)/.test(game)&&/joinRoom\(roomId,\{element,responseElement:ebOnlineResponse\(\)\}\)/.test(game),'online Create and Join send the Hybrid Response choice');
check(/window\.EB_DeckSelect\?\.responseChooser\?\.\(element\)/.test(game),'Play with Friends reuses the deck-select Response chooser');}
console.log(`Deck select 1.4.0: ${checks} checks passed`);
