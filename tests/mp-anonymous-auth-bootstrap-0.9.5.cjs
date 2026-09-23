const assert=require('node:assert/strict');
const fs=require('node:fs');
const {createAnonymousAuthBootstrap,connectMatchmaking,bindConnectButton}=require('../js/firebaseBootstrap.js');
const {publicFirebaseConfig}=require('../api/firebase-config.js');

(async()=>{
  let checks=0;const check=(value,message)=>{assert.ok(value,message);checks++};
  const user={uid:'anonymous-a',isAnonymous:true,async getIdToken(){return'id-token'}};

  {
    let signIns=0,initializations=0,tokens=0;
    const freshUser={...user,async getIdToken(){tokens++;return'id-token'}};
    const auth={currentUser:null,async signInAnonymously(){signIns++;this.currentUser=freshUser;return{user:freshUser}}};
    const firebase={apps:[],initializeApp(config){initializations++;this.apps.push(config)},auth:()=>auth,firestore:()=>({kind:'db'})};
    const bootstrap=createAnonymousAuthBootstrap({firebase,loadConfig:async()=>({apiKey:'public-key',projectId:'demo'})});
    const session=await bootstrap.connect();
    check(signIns===1,'a missing current user triggers anonymous sign-in');
    check(initializations===1&&session.user===freshUser&&session.db.kind==='db','Firebase initializes and returns an authenticated Firestore session');
    check(tokens===1,'the anonymous user can mint the ID token expected by multiplayer endpoints');
  }

  {
    let signIns=0,configLoads=0;
    const auth={currentUser:user,async signInAnonymously(){signIns++;return{user}}};
    const firebase={apps:[{}],initializeApp(){throw Error('must not initialize twice')},auth:()=>auth,firestore:()=>({})};
    const bootstrap=createAnonymousAuthBootstrap({firebase,loadConfig:async()=>{configLoads++;return{}}});
    const [first,second]=await Promise.all([bootstrap.connect(),bootstrap.connect()]);
    check(signIns===0&&configLoads===0,'an existing anonymous session is reused without signing in or reinitializing');
    check(first.user===user&&second.user===user,'concurrent connection requests share the authenticated session');
  }

  {
    let attempts=0;
    const auth={currentUser:null,async signInAnonymously(){attempts++;throw Error('provider disabled')}};
    const firebase={apps:[{}],initializeApp(){},auth:()=>auth,firestore:()=>({})};
    const bootstrap=createAnonymousAuthBootstrap({firebase,loadConfig:async()=>({})});
    await assert.rejects(bootstrap.connect(),/provider disabled/);await assert.rejects(bootstrap.connect(),/provider disabled/);
    check(attempts===2,'a failed sign-in can be retried instead of leaving a stuck promise');
  }

  {
    let resolveAuth,enabled=[],messages=[];
    const pending=new Promise(resolve=>{resolveAuth=resolve});
    const connection=connectMatchmaking({bootstrap:{connect:()=>pending},setEnabled:value=>enabled.push(value),setMessage:(text,error)=>messages.push({text,error})});
    check(enabled.length===1&&enabled[0]===false,'Create and Join remain disabled while anonymous auth is pending');
    check(messages[0].text==='Connecting to online services…','pending auth surfaces the connecting status');
    resolveAuth({user,db:{}});await connection;
    check(enabled.at(-1)===true&&messages.at(-1).text==='Ready to create or join a match','buttons enable only after auth resolves');
  }

  {
    let enabled=[],messages=[];
    await assert.rejects(connectMatchmaking({bootstrap:{connect:async()=>{throw Error('auth failed')}},setEnabled:value=>enabled.push(value),setMessage:(text,error)=>messages.push({text,error})}),/auth failed/);
    check(enabled.every(value=>value===false),'auth failure never leaves Create or Join enabled');
    check(messages.at(-1).error&&messages.at(-1).text==="Couldn't connect to online matches. Try again.",'auth failure surfaces the specified non-blocking status');
  }

  {
    let clickHandler,enabled=[],messages=[],connects=0;
    const button={addEventListener(type,handler){check(type==='click','explicit action binds directly to click');clickHandler=handler},removeEventListener(){}};
    const bootstrap={async connect(){connects++;return{user,db:{}}}};
    bindConnectButton(button,()=>connectMatchmaking({bootstrap,setEnabled:value=>enabled.push(value),setMessage:(text,error)=>messages.push({text,error})}));
    await clickHandler();
    check(connects===1,'a direct Connect Online click starts authentication without hover or focus');
    check(enabled[0]===false&&enabled.at(-1)===true,'the direct click completes through matchmaking enablement');
    check(messages[0].text==='Connecting to online services…'&&messages.at(-1).text==='Ready to create or join a match','the direct click runs the complete status sequence');
  }

  {
    const html=fs.readFileSync('index.html','utf8'),game=fs.readFileSync('js/game.js','utf8');
    check(/id="mpMatchmaking"/.test(html)&&/getElementById\('mpMatchmaking'\)/.test(game),'matchmaking panel ID exactly matches the setup lookup');
    check(!/addEventListener\('pointerenter'|addEventListener\('focusin'/.test(game),'auth no longer depends on ambient pointer or focus events');
  }

  {
    const config=publicFirebaseConfig({FIREBASE_PROJECT_ID:'element-bound',FIREBASE_WEB_API_KEY:'public-key'});
    check(config.apiKey==='public-key'&&config.authDomain==='element-bound.firebaseapp.com','public config derives the standard Auth domain');
    check(publicFirebaseConfig({FIREBASE_PROJECT_ID:'element-bound'})===null,'missing public API key fails closed');
  }

  console.log(`Multiplayer anonymous auth bootstrap 0.9.5: ${checks} checks passed`);
})().catch(error=>{console.error(error);process.exitCode=1});
