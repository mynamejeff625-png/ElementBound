(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root){
    root.ElementBoundHostRedirect=api;
    const target=api.ebHostRedirectTarget(root.location);
    if(target&&typeof root.location?.replace==='function')root.location.replace(target);
  }
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';

  function ebHostRedirectTarget(locationLike){
    if(locationLike?.hostname!=='mynamejeff625-png.github.io')return null;
    return `https://element-bound.vercel.app/${locationLike.search||''}${locationLike.hash||''}`;
  }

  return Object.freeze({ebHostRedirectTarget});
});
