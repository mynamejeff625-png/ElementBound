(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.ElementBoundMatchmaking=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  function createMatchmakingClient({getIdToken,fetchImpl}){
    if(typeof getIdToken!=='function'||typeof fetchImpl!=='function')throw new TypeError('getIdToken and fetchImpl are required');
    async function request(path,payload){
      try{
        const token=await getIdToken(),response=await fetchImpl(path,{method:'POST',headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},body:JSON.stringify(payload)});
        let body={};try{body=await response.json()}catch(error){body={ok:false,error:'INVALID_SERVER_RESPONSE'}}
        return response.ok&&body.ok?body:{ok:false,error:body.error||`HTTP_${response.status}`};
      }catch(error){return{ok:false,error:'NETWORK_ERROR'}}
    }
    return Object.freeze({createRoom:selection=>request('/api/create-room',selection),joinRoom:(roomId,selection)=>request('/api/join-room',{roomId,...selection})});
  }
  return Object.freeze({createMatchmakingClient});
});
