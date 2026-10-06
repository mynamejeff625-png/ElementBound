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

  // Activate on the finger lifting from the same control, so a tap still counts when a browser withholds the
  // synthetic click (seen after swipes: iOS stopping a coasting gesture, Chromium tap-gesture races). The click that
  // normally follows is swallowed once, so the action never runs twice; keyboard activation still uses click.
  function fastTap(element,handler){
    if(!element||typeof handler!=='function')return element;let start=null,swallowUntil=0;
    element.addEventListener('pointerdown',event=>{if(event.button!==undefined&&event.button!==0)return;start={id:event.pointerId,x:event.clientX,y:event.clientY,t:event.timeStamp}});
    element.addEventListener('pointercancel',()=>{start=null});
    element.addEventListener('pointerup',event=>{const s=start;start=null;if(!s||s.id!==event.pointerId||element.disabled)return;const r=element.getBoundingClientRect(),inside=event.clientX>=r.left&&event.clientX<=r.right&&event.clientY>=r.top&&event.clientY<=r.bottom;if(!inside||Math.hypot(event.clientX-s.x,event.clientY-s.y)>12||event.timeStamp-s.t>800)return;swallowUntil=event.timeStamp+700;handler(event)});
    element.addEventListener('click',event=>{if(event.timeStamp<swallowUntil){swallowUntil=0;event.preventDefault();event.stopImmediatePropagation();return}handler(event)});
    return element;
  }

  return {button,iconButton,icon,sheet,dialog,toast,fastTap};
});
