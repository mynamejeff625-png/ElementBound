const assert=require('node:assert/strict');
const Module=require('node:module');

const modulePath=require.resolve('../lib/firebaseAdmin.js');
const originalLoad=Module._load;
const originalEnvironment={
  FIREBASE_PROJECT_ID:process.env.FIREBASE_PROJECT_ID,
  FIREBASE_CLIENT_EMAIL:process.env.FIREBASE_CLIENT_EMAIL,
  FIREBASE_PRIVATE_KEY:process.env.FIREBASE_PRIVATE_KEY,
  FIREBASE_PRIVATE_KEY_B64:process.env.FIREBASE_PRIVATE_KEY_B64
};

function restoreEnvironment(){
  for(const [name,value] of Object.entries(originalEnvironment)){
    if(value===undefined)delete process.env[name];
    else process.env[name]=value;
  }
}

function loadCredential(environment){
  Object.assign(process.env,environment);
  for(const name of ['FIREBASE_PRIVATE_KEY','FIREBASE_PRIVATE_KEY_B64']){
    if(!(name in environment))delete process.env[name];
  }
  let certificate=null;
  const admin={
    apps:[],
    credential:{cert(value){certificate=value;return {certificate:value}}},
    initializeApp(){this.apps.push({})}
  };
  Module._load=function(request,parent,isMain){
    if(request==='firebase-admin')return admin;
    return originalLoad.call(this,request,parent,isMain);
  };
  delete require.cache[modulePath];
  require(modulePath);
  delete require.cache[modulePath];
  Module._load=originalLoad;
  return certificate;
}

try{
  const pem='-----BEGIN PRIVATE KEY-----\nline-one\nline-two\n-----END PRIVATE KEY-----\n';
  const base64=Buffer.from(pem,'utf8').toString('base64');
  const decoded=loadCredential({
    FIREBASE_PROJECT_ID:'demo-project',
    FIREBASE_CLIENT_EMAIL:'firebase-admin@example.test',
    FIREBASE_PRIVATE_KEY:'-----BEGIN PRIVATE KEY-----\\nwrong fallback\\n-----END PRIVATE KEY-----\\n',
    FIREBASE_PRIVATE_KEY_B64:base64
  });
  assert.equal(decoded.privateKey,pem,'base64 private key must decode without changing the PEM');
  assert.ok(decoded.privateKey.startsWith('-----BEGIN PRIVATE KEY-----'),'decoded key must have a PEM begin marker');
  assert.ok(decoded.privateKey.endsWith('-----END PRIVATE KEY-----\n'),'decoded key must retain its trailing newline');
  assert.ok(decoded.privateKey.includes('\nline-one\n'),'decoded key must contain real newlines');

  const fallback=loadCredential({
    FIREBASE_PROJECT_ID:'demo-project',
    FIREBASE_CLIENT_EMAIL:'firebase-admin@example.test',
    FIREBASE_PRIVATE_KEY:'-----BEGIN PRIVATE KEY-----\\nlegacy-key\\n-----END PRIVATE KEY-----\\n'
  });
  assert.equal(fallback.privateKey,'-----BEGIN PRIVATE KEY-----\nlegacy-key\n-----END PRIVATE KEY-----\n','legacy escaped-newline key must remain supported');

  console.log('Firebase Admin base64 private key: 5 checks passed');
}finally{
  Module._load=originalLoad;
  delete require.cache[modulePath];
  restoreEnvironment();
}
