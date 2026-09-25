'use strict';

const admin=require('firebase-admin');

function credentialFromEnvironment(){
  const projectId=process.env.FIREBASE_PROJECT_ID;
  const clientEmail=process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey=process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g,'\n');

  if(!projectId||!clientEmail||!privateKey){
    throw new Error('Missing Firebase Admin environment variables');
  }

  return admin.credential.cert({projectId,clientEmail,privateKey});
}

if(!admin.apps.length){
  admin.initializeApp({credential:credentialFromEnvironment()});
}

module.exports=admin;
