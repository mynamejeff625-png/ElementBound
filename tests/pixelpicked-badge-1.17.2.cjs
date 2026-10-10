'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const html=fs.readFileSync('index.html','utf8');
const css=fs.readFileSync('css/menu.css','utf8');
let checks=0;
const href='https://pixelpicked.com/game/5d7EUHrfPlg/element-bound/';
const src='https://api.pixelpicked.com/api/badges/5d7EUHrfPlg/live.png?theme=dark';
assert.equal((html.match(new RegExp(href.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'),'g'))||[]).length,1,'exact PixelPicked href appears once');checks++;
assert.equal((html.match(new RegExp(src.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'),'g'))||[]).length,1,'exact PixelPicked badge source appears once');checks++;
assert.match(html,/<div class="pp-badge"><a class="pp-badge-link"[^>]+target="_blank" rel="noopener noreferrer"[^>]+><img [^>]+width="250" height="54"[^>]+referrerpolicy="no-referrer"[^>]+\/><\/a><\/div>/,'badge is static and keeps its security and fallback attributes');checks++;
const csp=html.match(/<meta http-equiv="Content-Security-Policy" content="([^"]+)"/)[1];
const directives=Object.fromEntries(csp.split(';').map(value=>value.trim()).filter(Boolean).map(value=>{const [name,...parts]=value.split(/\s+/);return[name,parts.join(' ')]}));
assert.deepEqual(directives,{
  'default-src':"'self' data:",
  'img-src':"'self' data: https://api.pixelpicked.com",
  'style-src':"'self'",
  'script-src':"'self' 'unsafe-inline' https://www.gstatic.com",
  'connect-src':"'self' https://*.googleapis.com https://*.firebaseio.com wss://*.firebaseio.com",
  'object-src':"'none'",
  'base-uri':"'none'",
  'form-action':"'none'"
},'only img-src gains the exact PixelPicked image host');checks++;
assert.match(css,/\.pp-badge\{[^}]*position:fixed[^}]*left:12px[^}]*height:48px/,'badge occupies the approved top-left position and height');checks++;
assert.match(css,/@media\(max-width:360px\)\{\.pp-badge-link\{[^}]*min-width:136px[^}]*\}\.pp-badge-link img\{height:26px/,'badge scales down on narrow phones');checks++;
assert.doesNotMatch(css,/\.pp-badge(?:-link)?\{[^}]*(?:display:none|visibility:hidden|opacity:0)/,'badge is never hidden by its own styles');checks++;
console.log(`PixelPicked badge 1.17.2: ${checks} checks passed`);
