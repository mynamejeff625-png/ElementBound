'use strict';
const assert=require('node:assert/strict');
const {difficultyKey,difficultyLabel,loadDifficulty,saveDifficulty,transitionState}=require('../js/deckSelect.js');
let checks=0;
function equal(actual,expected,message){assert.equal(actual,expected,message);checks++}

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
console.log(`Deck select 1.4.0: ${checks} checks passed`);
