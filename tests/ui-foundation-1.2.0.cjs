'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');

let checks=0;
function check(value,message){assert.ok(value,message);checks++}

const tokens=fs.readFileSync('css/tokens.css','utf8');
const tokenNames=[
  'ink','ink-quiet','plate','plate-edge','bronze-hi','bronze-lo','select','target','drop','danger',
  'hp-hi','hp-lo','essence-hi','essence-lo','el-fire','el-water','el-nature','el-earth',
  'el-lightning','el-air','el-magma','el-storm','el-bloom','font-display','font-ui','text-xs',
  'text-sm','text-md','text-lg','text-xl','text-3xl','space-1','space-2','space-3','space-4',
  'space-5','space-6','radius-sm','radius-md','radius-lg','dur-tap','dur-lift','dur-summon',
  'dur-attack','dur-float','dur-banner','ease'
];
for(const name of tokenNames)check(tokens.includes(`--eb-${name}:`),`tokens.css defines --eb-${name}`);
check(tokens.includes('@media (prefers-reduced-motion:reduce)'),'tokens.css defines reduced-motion overrides');

const components=fs.readFileSync('css/components.css','utf8');
check(!/#[\da-f]{3,8}\b|rgba?\(/i.test(components),'component CSS contains no raw hex or rgb colors');
for(const name of ['btn','icon-btn','chip','coin','tile','sheet','dialog','toast','icon'])check(components.includes(`.eb-${name}`),`component CSS defines .eb-${name}`);
check(components.includes(':focus-visible'),'interactive components define a visible keyboard-focus state');

const sprite=fs.readFileSync('assets/icons.svg','utf8');
const icons=['fire','water','nature','earth','lightning','air','magma','storm','bloom','burning','charged','guard','soaked','seeded','momentum','armor','growth','weakened','token','back','close','log','settings','hand','deck','wake','recycle','trophy','heart'];
for(const name of icons)check(new RegExp(`<symbol\\s+id=["']${name}["']`).test(sprite),`icon sprite defines ${name}`);
check(!/<(?:style|script|image|foreignObject)\b/i.test(sprite),'icon sprite contains no active or external content');

const html=fs.readFileSync('index.html','utf8');
const game=fs.readFileSync('js/game.js','utf8');
const trials=fs.readFileSync('js/trials.js','utf8');
check(!/style\s*=\s*["']/.test(html),'index.html contains no inline style attributes');
check(!/style\s*=\s*["']/.test(game),'game templates contain no inline style attributes');
check(!/\p{Extended_Pictographic}/u.test((html+game).replace(/[✓✕⚠]/gu,'')),'rendering sources contain no emoji');
check(html.indexOf('css/tokens.css')<html.indexOf('css/components.css')&&html.indexOf('css/components.css')<html.indexOf('css/game.css'),'stylesheets load tokens, components, then game CSS');
check(html.indexOf('js/ui.js')<html.indexOf('js/game.js'),'EB_UI loads before game.js');
check(/assets\/medallions\/\$\{element\.toLowerCase\(\)\}\.webp/.test(trials)&&/ebHydrateStaticIcons\(\)/.test(game),'Trial medallions and static icons use shared UI assets');
check(/class="eb-stat-number"/.test(game),'card ATK and HP numbers use the display-font hook');

const expected={FIRE:'#ff704d',WATER:'#55c7ff',NATURE:'#67d77a',EARTH:'#d0a25c',LIGHTNING:'#ffe45d',AIR:'#bdeaff',MAGMA:'#ff633f',STORM:'#aa91ff',BLOOM:'#6be8ae'};
for(const [element,value] of Object.entries(expected)){
  const token=value.toUpperCase();
  check(tokens.includes(`--eb-el-${element.toLowerCase()}:${token}`),`${element} token matches its FX color`);
  check(game.includes(`${element}:'${value}'`),`${element} FX fallback matches its token`);
}

class FakeNode{
  constructor(tag){this.tag=tag;this.attrs={};this.children=[];this.className='';this.textContent=''}
  setAttribute(name,value){this.attrs[name]=String(value)}
  appendChild(child){this.children.push(child);return child}
  addEventListener(){}
  get outerHTML(){
    const attrs={...this.attrs};if(this.className)attrs.class=this.className;
    const attrText=Object.entries(attrs).map(([key,value])=>` ${key}="${value}"`).join('');
    const content=this.textContent+this.children.map(child=>typeof child==='string'?child:child.outerHTML).join('');
    return `<${this.tag}${attrText}>${content}</${this.tag}>`;
  }
}
const document={createElement:tag=>new FakeNode(tag),createElementNS:(_namespace,tag)=>new FakeNode(tag),createTextNode:text=>String(text)};
const uiSource=fs.readFileSync('js/ui.js','utf8');
check(uiSource.includes("createElementNS('http://www.w3.org/2000/svg','svg')"),'EB_UI creates icons in the SVG namespace');
const uiContext=vm.createContext({document,module:{exports:{}},globalThis:null});
uiContext.globalThis=uiContext;
vm.runInContext(uiSource,uiContext);
const icon=uiContext.module.exports.icon('fire');
check(icon.outerHTML==='<svg class="eb-icon" aria-hidden="true"><use href="assets/icons.svg#fire"></use></svg>','EB_UI.icon creates the expected accessible sprite markup');

{
  const start=game.indexOf('function ebInitiativeFinish()');
  const end=game.indexOf('function startMatch()',start);
  const overlay={hidden:false,classList:{add(name){if(name==='hide')overlay.hidden=true},remove(){}}};
  const context=vm.createContext({
    G:{active:0,winner:null,initiative:{finished:false,revealed:false}},EB_INIT_LOCK:true,EB_INIT_T:0,
    EB_INIT_RAF1:0,EB_INIT_RAF2:0,EB_INIT_RUN:0,EB_MP:{enabled:true},
    clearTimeout(){},setTimeout(){},cancelAnimationFrame(){},requestAnimationFrame(){},render(){},ai(){},
    document:{getElementById:id=>id==='initiativeOverlay'?overlay:null}
  });
  vm.runInContext(game.slice(start,end),context);
  vm.runInContext('ebInitiativeFinish();ebInitiativeShow()',context);
  check(context.G.initiative.finished&&overlay.hidden,'finishing initiative before show keeps the overlay hidden');
}

console.log(`UI foundation 1.2.0: ${checks} checks passed`);
