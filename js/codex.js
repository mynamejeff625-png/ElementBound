(function(root,factory){
  const shared=typeof module==='object'&&module.exports?require('./cardBrowser.js'):root&&root.EB_CardBrowser;
  const api=factory(root,shared);
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.EB_Codex=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(root,shared){
  'use strict';
  if(!shared)return{};
  let browser=null;
  function open(){
    if(!browser)browser=shared.create({hostId:'codex',rootClass:'codex-shell',title:'Codex',showCount:true,search:true,onBack:()=>root.ebNavigate('home',{direction:'back'}),hint:'Swipe to change deck · tap a card to zoom'});
    return browser.open();
  }
  function closeZoom(){if(browser)browser.closeZoom()}
  function zoomTo(name){return browser?browser.zoomTo(name):false}
  return{...shared,open,closeZoom,zoomTo};
});
