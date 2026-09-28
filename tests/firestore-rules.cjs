const fs=require('node:fs');
const assert=require('node:assert/strict');
const {initializeTestEnvironment,assertFails,assertSucceeds}=require('@firebase/rules-unit-testing');
const {doc,getDoc,setDoc}=require('firebase/firestore');

const PROJECT_ID='demo-element-bound';
const ROOM_ID='rules-room';
const PLAYER_A='player-a';
const PLAYER_B='player-b';

(async()=>{
  const testEnvironment=await initializeTestEnvironment({
    projectId:PROJECT_ID,
    firestore:{rules:fs.readFileSync('firestore.rules','utf8')}
  });

  let checks=0;
  async function denied(operation,message){await assertFails(operation);checks++;assert.ok(true,message)}
  async function allowed(operation,message){await assertSucceeds(operation);checks++;assert.ok(true,message)}

  try{
    await testEnvironment.withSecurityRulesDisabled(async context=>{
      const db=context.firestore();
      await setDoc(doc(db,'rooms',ROOM_ID),{players:[PLAYER_A,PLAYER_B],state:{rev:0}});
      await setDoc(doc(db,'rooms',ROOM_ID,'views',PLAYER_A),{state:{viewerSeat:0}});
      await setDoc(doc(db,'rooms',ROOM_ID,'views',PLAYER_B),{state:{viewerSeat:1}});
    });

    const playerDb=testEnvironment.authenticatedContext(PLAYER_A).firestore();
    const roomRef=doc(playerDb,'rooms',ROOM_ID);
    const ownViewRef=doc(playerDb,'rooms',ROOM_ID,'views',PLAYER_A);
    const otherViewRef=doc(playerDb,'rooms',ROOM_ID,'views',PLAYER_B);

    await denied(getDoc(roomRef),'authenticated clients cannot read authoritative rooms');
    await denied(setDoc(roomRef,{state:{rev:1}}),'authenticated clients cannot write authoritative rooms');
    await allowed(getDoc(ownViewRef),'players can read their own view');
    await denied(getDoc(otherViewRef),'players cannot read another player view');
    await denied(setDoc(ownViewRef,{state:{viewerSeat:0}}),'players cannot write their own view');

    const unauthenticatedDb=testEnvironment.unauthenticatedContext().firestore();
    const unauthenticatedRoom=doc(unauthenticatedDb,'rooms',ROOM_ID);
    const unauthenticatedViewA=doc(unauthenticatedDb,'rooms',ROOM_ID,'views',PLAYER_A);
    const unauthenticatedViewB=doc(unauthenticatedDb,'rooms',ROOM_ID,'views',PLAYER_B);

    await denied(getDoc(unauthenticatedRoom),'unauthenticated clients cannot read authoritative rooms');
    await denied(setDoc(unauthenticatedRoom,{state:{rev:1}}),'unauthenticated clients cannot write authoritative rooms');
    await denied(getDoc(unauthenticatedViewA),'unauthenticated clients cannot read player views');
    await denied(setDoc(unauthenticatedViewA,{state:{}}),'unauthenticated clients cannot write player views');
    await denied(getDoc(unauthenticatedViewB),'unauthenticated clients cannot read other views');
    await denied(setDoc(unauthenticatedViewB,{state:{}}),'unauthenticated clients cannot write other views');

    console.log(`Firestore rules: ${checks} emulator checks passed`);
  }finally{
    await testEnvironment.cleanup();
  }
})().catch(error=>{console.error(error);process.exitCode=1});
