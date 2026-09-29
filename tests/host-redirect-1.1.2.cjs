const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const {ebHostRedirectTarget}=require('../js/hostRedirect.js');

let checks=0;
function check(value,message){assert.ok(value,message);checks++}

check(
  ebHostRedirectTarget({hostname:'mynamejeff625-png.github.io',search:'?join=ABC123',hash:'#hash'})===
    'https://element-bound.vercel.app/?join=ABC123#hash',
  'GitHub Pages redirects to Vercel while preserving invite query and hash'
);

for(const hostname of [
  'element-bound.vercel.app',
  'element-bound-git-x-real-games.vercel.app',
  'localhost',
  ''
])check(ebHostRedirectTarget({hostname,search:'?join=ABC123',hash:'#hash'})===null,`${hostname||'file://'} does not redirect`);

{
  const source=fs.readFileSync('js/hostRedirect.js','utf8');
  let replaced=null;
  const location={hostname:'mynamejeff625-png.github.io',search:'?roomId=ROOM42',hash:'',replace:value=>{replaced=value}};
  const context={location};
  vm.runInNewContext(source,context);
  check(replaced==='https://element-bound.vercel.app/?roomId=ROOM42','browser entry point performs the computed redirect');
  check(typeof context.ElementBoundHostRedirect.ebHostRedirectTarget==='function','browser global exposes the redirect helper');
}

{
  const html=fs.readFileSync('index.html','utf8');
  const head=html.slice(0,html.indexOf('</head>'));
  check(head.indexOf('<script src="js/hostRedirect.js"></script>')>=0,'redirect script is loaded in the document head');
  check(head.indexOf('<script')===head.indexOf('<script src="js/hostRedirect.js"></script>'),'redirect is the first script in the document head');
  check(html.indexOf('js/hostRedirect.js')<html.indexOf('js/version.js'),'redirect loads before release initialization');
}

{
  const version=fs.readFileSync('js/version.js','utf8');
  const match=version.match(/version:'(\d+)\.(\d+)\.(\d+)'/);
  check(match,'player-facing version is X.Y.Z');
  const [major,minor,patch]=match.slice(1).map(Number);
  check(major>1||(major===1&&(minor>1||(minor===1&&patch>=2))),'player-facing version is at least 1.1.2');
  check(/document\.title=`Element Bound Alpha/.test(version),'generated browser title uses the two-word product name');
}

console.log(`Host redirect 1.1.2: ${checks} checks passed`);
