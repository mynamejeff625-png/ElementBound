'use strict';

function publicFirebaseConfig(env=process.env){
  const projectId=env.FIREBASE_PROJECT_ID;
  const apiKey=env.FIREBASE_WEB_API_KEY;
  if(!projectId||!apiKey)return null;
  return {
    apiKey,
    authDomain:env.FIREBASE_AUTH_DOMAIN||`${projectId}.firebaseapp.com`,
    projectId,
    storageBucket:env.FIREBASE_STORAGE_BUCKET||`${projectId}.appspot.com`,
    messagingSenderId:env.FIREBASE_MESSAGING_SENDER_ID||undefined,
    appId:env.FIREBASE_APP_ID||undefined
  };
}

function createFirebaseConfigHandler({env=process.env}={}){
  return function firebaseConfigHandler(req,res){
    res.setHeader('Cache-Control','public, max-age=300, s-maxage=300');
    const config=publicFirebaseConfig(env);
    if(!config)return res.status(503).json({ok:false,error:'FIREBASE_WEB_CONFIG_MISSING'});
    return res.status(200).json({ok:true,config:Object.fromEntries(Object.entries(config).filter(([,value])=>value!=null))});
  };
}

module.exports=createFirebaseConfigHandler();
module.exports.createFirebaseConfigHandler=createFirebaseConfigHandler;
module.exports.publicFirebaseConfig=publicFirebaseConfig;
