(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.ElementBoundFirebaseBootstrap=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';

  function createAnonymousAuthBootstrap({firebase,loadConfig}){
    if(!firebase?.initializeApp||!firebase?.auth||!firebase?.firestore)throw new TypeError('Firebase app, auth, and Firestore compat SDKs are required');
    if(typeof loadConfig!=='function')throw new TypeError('loadConfig is required');
    let pending=null;
    async function connect(){
      if(pending)return pending;
      pending=(async()=>{
        if(!firebase.apps?.length){
          const config=await loadConfig();
          if(!config?.apiKey||!config?.projectId)throw new Error('FIREBASE_WEB_CONFIG_MISSING');
          firebase.initializeApp(config);
        }
        const auth=firebase.auth();
        let user=auth.currentUser;
        if(!user){
          const credential=await auth.signInAnonymously();
          user=credential?.user||auth.currentUser;
        }
        if(!user||typeof user.getIdToken!=='function')throw new Error('ANONYMOUS_AUTH_FAILED');
        await user.getIdToken();
        return {user,db:firebase.firestore()};
      })();
      try{return await pending}catch(error){pending=null;throw error}
    }
    return Object.freeze({connect});
  }

  async function loadPublicConfig(fetchImpl){
    const response=await fetchImpl('/api/firebase-config',{headers:{Accept:'application/json'}});
    const body=await response.json();
    if(!response.ok||!body?.ok)throw new Error(body?.error||`HTTP_${response.status}`);
    return body.config;
  }

  async function connectMatchmaking({bootstrap,setEnabled,setMessage}){
    setEnabled(false);setMessage('Connecting to online services…',false);
    try{
      const session=await bootstrap.connect();
      setEnabled(true);setMessage('Ready to create or join a match',false);
      return session;
    }catch(error){
      setEnabled(false);setMessage("Couldn't connect to online matches. Try again.",true);
      throw error;
    }
  }

  return Object.freeze({createAnonymousAuthBootstrap,loadPublicConfig,connectMatchmaking});
});
