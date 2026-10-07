'use strict';

const admin=require('firebase-admin');

function credentialFromEnvironment(){
  const projectId=process.env.FIREBASE_PROJECT_ID;
  const clientEmail=process.env.FIREBASE_CLIENT_EMAIL;
  const encodedPrivateKey=process.env.FIREBASE_PRIVATE_KEY_B64;
  const privateKey=encodedPrivateKey?
    Buffer.from(encodedPrivateKey,'base64').toString('utf8'):
    process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g,'\n');

  if(!projectId||!clientEmail||!privateKey){
    throw new Error('Missing Firebase Admin environment variables');
  }

  return admin.credential.cert({projectId,clientEmail,privateKey});
}

if(!admin.apps.length){
  admin.initializeApp({credential:credentialFromEnvironment()});
}

// Serverless cold starts (issue #88): REST transport skips the gRPC channel setup on every cold
// instance. Transactions and writes are unary calls, so nothing in the game needs gRPC streaming.
if(typeof admin.firestore==='function'&&!admin.__ebFirestoreConfigured){
  admin.firestore().settings({preferRest:true});
  admin.__ebFirestoreConfigured=true;
}

module.exports=admin;
