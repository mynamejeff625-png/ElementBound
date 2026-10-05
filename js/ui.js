(function(root,factory){
  const api=factory(root&&root.document);
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.EB_UI=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(document){
  'use strict';

  function element(tag,className,text){
    if(!document)throw new Error('EB_UI DOM helpers require a document');
    const node=document.createElement(tag);
    if(className)node.className=className;
    if(text!==undefined)node.textContent=text;
    return node;
  }
  function applyCommon(node,opts={}){
    if(opts.id)node.id=opts.id;
    if(opts.disabled)node.disabled=true;
    if(opts.label)node.setAttribute('aria-label',opts.label);
    if(typeof opts.onClick==='function')node.addEventListener('click',opts.onClick);
    return node;
  }
  function icon(name,{label,size}={}){
    if(!document)throw new Error('EB_UI DOM helpers require a document');
    const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');
    svg.setAttribute('class',`eb-icon${size?` eb-icon--${size}`:''}`);
    const use=document.createElementNS('http://www.w3.org/2000/svg','use');
    use.setAttribute('href',`assets/icons.svg#${name}`);
    svg.appendChild(use);
    if(label){svg.setAttribute('role','img');svg.setAttribute('aria-label',label)}
    else svg.setAttribute('aria-hidden','true');
    return svg;
  }
  function button(opts={}){
    const node=element('button',`eb-btn eb-btn--${opts.variant||'secondary'}`);
    node.type=opts.type||'button';
    if(opts.icon)node.appendChild(icon(opts.icon,{size:opts.iconSize}));
    if(opts.text!==undefined)node.appendChild(document.createTextNode(opts.text));
    return applyCommon(node,opts);
  }
  function iconButton(opts={}){
    const node=element('button',`eb-icon-btn${opts.framed?' eb-icon-btn--framed':''}`);
    node.type=opts.type||'button';
    node.appendChild(icon(opts.icon,{size:opts.size}));
    return applyCommon(node,opts);
  }
  function container(type,opts={}){
    const node=element(opts.tag||'section',`eb-${type}${opts.variant?` eb-${type}--${opts.variant}`:''}`);
    if(opts.title)node.appendChild(element('h2','',opts.title));
    if(opts.text!==undefined)node.appendChild(element('div','',opts.text));
    for(const child of opts.children||[])node.appendChild(child);
    return applyCommon(node,opts);
  }
  function sheet(opts={}){return container('sheet',opts)}
  function dialog(opts={}){return container('dialog',{tag:'div',...opts})}
  function toast(text,opts={}){return container('toast',{...opts,text})}

  return {button,iconButton,icon,sheet,dialog,toast};
});
