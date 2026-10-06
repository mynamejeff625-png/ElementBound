'use strict';
/*
 * Browser smoke test: opens the real game in headless Chromium at two phone
 * sizes, visits the main screens, and fails on any page error.
 * Screenshots are written to test-results/screenshots/ (uploaded by CI).
 *
 * Single-player only: it never clicks Online Match, so it makes no Firebase,
 * /api, or network calls beyond loading the page itself.
 *
 * Run locally:  node tests/e2e/smoke.cjs   (needs the `playwright` package)
 */
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { chromium } = require('playwright');

const ROOT = path.resolve(__dirname, '..', '..');
const OUT = path.join(ROOT, 'test-results', 'screenshots');
const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css',
  '.png': 'image/png', '.svg': 'image/svg+xml', '.json': 'application/json',
  '.woff': 'font/woff', '.woff2': 'font/woff2', '.txt': 'text/plain'
};
const MAX_BLOCKED_INLINE_STYLES = Number(process.env.EB_MAX_BLOCKED_INLINE_STYLES ?? 0);
const VIEWPORTS = [
  { name: 'iphone-se', width: 375, height: 667 },
  { name: 'iphone-14', width: 390, height: 844 }
];

function serve() {
  const server = http.createServer((req, res) => {
    const url = new URL(req.url, 'http://localhost');
    const rel = decodeURIComponent(url.pathname === '/' ? '/index.html' : url.pathname);
    const file = path.resolve(ROOT, '.' + rel);
    if (!file.startsWith(ROOT + path.sep) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
      res.writeHead(404); return res.end('not found');
    }
    res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream' });
    fs.createReadStream(file).pipe(res);
  });
  return new Promise(resolve => server.listen(0, '127.0.0.1', () => resolve(server)));
}

async function run() {
  fs.mkdirSync(OUT, { recursive: true });
  const server = await serve();
  const base = `http://127.0.0.1:${server.address().port}/`;
  const browser = await chromium.launch();
  let checks = 0;
  try {
    for (const vp of VIEWPORTS) {
      const context = await browser.newContext({
        viewport: { width: vp.width, height: vp.height }, deviceScaleFactor: 2,
        isMobile: true, hasTouch: true, reducedMotion: 'no-preference'
      });
      // The static smoke server has no /api endpoints. Answer the public Firebase config request with a
      // controlled "offline" reply so Play with Friends exercises its connection-failure path on every machine.
      await context.route('**/api/firebase-config',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({ok:false,error:'SMOKE_OFFLINE'})}));
      const page = await context.newPage();
      // Record when the home art starts to calm, measured from page start, so the "holds" check is independent of machine speed.
      await page.addInitScript(()=>{window.__ebHomeCalmAt=null;document.addEventListener('DOMContentLoaded',()=>{const home=document.getElementById('home');if(!home)return;new MutationObserver(()=>{if(window.__ebHomeCalmAt===null&&home.classList.contains('is-home-calm'))window.__ebHomeCalmAt=performance.now()}).observe(home,{attributes:true,attributeFilter:['class']})})});
      const cdp = await context.newCDPSession(page);
      const swipe = async (startX,startY,endX,endY) => {
        await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:startX,y:startY}]});
        for(let step=1;step<=8;step++){const t=step/8;await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:startX+(endX-startX)*t,y:startY+(endY-startY)*t}]})}
        await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
      };
      const errors = [];
      const blockedStyles = new Set();
      page.on('pageerror', e => errors.push(`pageerror: ${e.message}`));
      page.on('console', m => {
        if (m.type() !== 'error') return;
        const text = m.text();
        const csp = text.match(/Refused to apply inline style.*?'(sha256-[^']+)'/);
        if (csp) return void blockedStyles.add(csp[1]);
        // Resource failures are checked precisely below (local files must load;
        // third-party CDNs such as the Firebase SDK depend on the network).
        if (/^Failed to load resource/.test(text)) return;
        errors.push(`console: ${text}`);
      });
      page.on('requestfailed', r => {
        if (r.url().startsWith(base)) errors.push(`requestfailed: ${r.url()}`);
      });
      page.on('response', r => {
        if (r.url().startsWith(base) && r.status() >= 400) errors.push(`HTTP ${r.status()}: ${r.url()}`);
      });
      const shot = name => page.screenshot({ path: path.join(OUT, `${vp.name}-${name}.png`) });
      const visible = async (selector, label) => {
        await page.locator(selector).first().waitFor({ state: 'visible', timeout: 5000 });
        checks++;
        return label;
      };
      const assertCardChrome = async (selector,frameWidth,label) => {
        const result=await page.evaluate(({selector,inset})=>{
          const cards=[...document.querySelectorAll(selector)].filter(card=>{
            const style=getComputedStyle(card),rect=card.getBoundingClientRect();
            return style.visibility!=='hidden'&&style.display!=='none'&&rect.width>0&&rect.height>0;
          });
          const outside=[];
          cards.forEach(card=>{
            const cardRect=card.getBoundingClientRect();
            card.querySelectorAll('.codex-cost,.codex-card-stat').forEach(part=>{
              const rect=part.getBoundingClientRect();
              if(rect.left<cardRect.left+inset-.5||rect.top<cardRect.top+inset-.5||rect.right>cardRect.right-inset+.5||rect.bottom>cardRect.bottom-inset+.5)outside.push(`${card.dataset.cardName||card.querySelector('.codex-card-name')?.textContent}: ${part.className}`);
            });
          });
          return{count:cards.length,outside,radii:cards.map(card=>getComputedStyle(card).borderTopLeftRadius),liftInsets:cards.map(card=>{const style=getComputedStyle(card,'::after');return[style.top,style.right,style.bottom,style.left].map(Number.parseFloat)})};
        },{selector,inset:frameWidth*.9});
        assert.ok(result.count>0,`${label}: found visible cards`);checks++;
        assert.deepEqual(result.outside,[],`${label}: cost and stat plates stay inside the frame opening`);checks++;
        assert.ok(result.radii.every(radius=>radius!=='0px'),`${label}: cards have rounded corners`);checks++;
        assert.ok(result.liftInsets.every(insets=>insets.every(inset=>Math.abs(inset+frameWidth)<.01)),`${label}: lift shadow reaches the outer card edge`);checks++;
      };
      // go() ignores calls while a screen transition holds EB_NAV_LOCK, so wait
      // for the lock to clear before and after every navigation.
      const navUnlocked = () => page.waitForFunction(
        () => typeof EB_NAV_LOCK === 'undefined' || !EB_NAV_LOCK, null, { timeout: 5000 });
      const navigate = async (fn, selector) => {
        await navUnlocked();
        await page.evaluate(fn);
        await visible(selector);
        await navUnlocked();
      };
      const menuPush = async ({trigger,from,to,direction='forward',label}) => {
        await navUnlocked();
        // Freeze both screen animations at their halfway point in the same task as the tap, measure, then let them run.
        // This makes the symmetry check independent of machine speed (no frame timing involved).
        const middle=await page.evaluate(({trigger,from,to,direction})=>{
          const fromEl=document.querySelector(from),toEl=document.querySelector(to),toStart=direction==='forward'?innerWidth:-innerWidth;
          document.querySelector(trigger).click();
          const animations=[...fromEl.getAnimations(),...toEl.getAnimations()].filter(animation=>animation.effect?.getTiming);
          if(animations.length<2)return{separate:false,difference:Infinity,reason:`expected two screen animations, found ${animations.length}`};
          const half=Math.max(...animations.map(animation=>Number(animation.effect.getTiming().duration)||0))/2;
          animations.forEach(animation=>{animation.pause();animation.currentTime=half});
          const fromRect=fromEl.getBoundingClientRect(),toRect=toEl.getBoundingClientRect();
          animations.forEach(animation=>animation.play());
          return{separate:direction==='forward'?fromRect.right<=toRect.left+1:toRect.right<=fromRect.left+1,difference:Math.abs(Math.abs(fromRect.x)-Math.abs(toRect.x-toStart)),fromX:fromRect.x,toX:toRect.x,width:innerWidth,half};
        },{trigger,from,to,direction});
        assert.equal(middle.separate,true,`${label}: screens do not overlap halfway through (${JSON.stringify(middle)})`);checks++;
        assert.ok(middle.difference<=2,`${label}: both screens move an equal distance (${JSON.stringify(middle)})`);checks++;
        await navUnlocked();
        assert.deepEqual(await page.evaluate(to=>({on:[...document.querySelectorAll('.screen.on')].map(screen=>screen.id),scrollY,focused:document.querySelector(to).contains(document.activeElement)}),to),{on:[to.slice(1)],scrollY:0,focused:true},`${label}: transition leaves one focused active screen at scroll zero`);checks++;
      };
      const foundation = async label => {
        const result=await page.evaluate(async()=>{
          await Promise.all([
            document.fonts.load('700 16px Cinzel'),
            document.fonts.load('400 16px "Nunito Sans"')
          ]);
          const text=document.body.innerText.replace(/[✓✕⚠]/gu,'');
          const icons=await fetch('assets/icons.svg');
          return{
            emoji:text.match(/\p{Extended_Pictographic}/gu)||[],
            displayFont:document.fonts.check('700 16px Cinzel'),
            uiFont:document.fonts.check('400 16px "Nunito Sans"'),
            hasUI:!!window.EB_UI,
            iconsStatus:icons.status
          };
        });
        assert.deepEqual(result.emoji,[],`${label}: rendered text contains no emoji`);checks++;
        assert.equal(result.displayFont,true,`${label}: Cinzel is available`);checks++;
        assert.equal(result.uiFont,true,`${label}: Nunito Sans is available`);checks++;
        assert.equal(result.hasUI,true,`${label}: EB_UI exists`);checks++;
        assert.equal(result.iconsStatus,200,`${label}: icon sprite loads`);checks++;
      };
      const carouselStyles = selector => page.locator(selector).evaluate(element=>{
        const style=getComputedStyle(element),properties=['height','transitionProperty','transitionDuration','overflow','touchAction','willChange'];
        return Object.fromEntries(properties.map(property=>[property,style[property]]));
      });
      const tomeSettled = () => page.waitForFunction(()=>!document.querySelector('#tome .tome-book.is-flipping'),null,{timeout:5000});
      const settleStyles = root => page.evaluate(root=>{
        const grid=document.querySelector(`${root} .codex-grid-wrap[aria-hidden="false"]`),dial=document.querySelector(`${root} .codex-dial-option[aria-selected="true"]`);
        return{grid:getComputedStyle(grid).transitionDuration,dial:getComputedStyle(dial).transitionDuration};
      },root);
      const assertSmallCardLayout = async (root,label) => {
        const problems=await page.locator(`${root} .codex-card--s`).evaluateAll(cards=>cards.flatMap(card=>{
          const name=card.querySelector('.codex-card-name'),short=card.querySelector('.codex-card-short'),stats=card.querySelector('.codex-card-stats');
          const nameBox=name.getBoundingClientRect(),shortBox=short.getBoundingClientRect(),statsBox=stats&&stats.getBoundingClientRect(),issues=[];
          if(nameBox.bottom+2>shortBox.top)issues.push(`${card.dataset.cardName}: name/short overlap`);
          if(statsBox&&shortBox.bottom+2>statsBox.top)issues.push(`${card.dataset.cardName}: short/stats overlap`);
          if(short.scrollHeight>short.clientHeight+1)issues.push(`${card.dataset.cardName}: short text clipped`);
          return issues;
        }));
        assert.deepEqual(problems,[],`${label}: all S-card text clears stats without clipping`);checks++;
      };
      const assertInfoOnTop = async label => {
        const result=await page.locator('.codex-zoom-slide[aria-hidden="false"] .codex-info').evaluate(info=>{
          const rect=info.getBoundingClientRect(),hit=document.elementFromPoint(rect.left+rect.width/2,rect.top+6);
          return hit===info||info.contains(hit);
        });
        assert.equal(result,true,`${label}: description paints above the lift shadow`);checks++;
      };
      const calmBackground = async label => {
        const filter=await page.evaluate(()=>getComputedStyle(document.body,'::before').filter);
        assert.match(filter,/blur\(/,`${label}: calm background uses blur`);checks++;
      };

      await page.goto(base, { waitUntil: 'load' });
      await visible('#home.on', 'home screen');
      const homeLayout=await page.evaluate(()=>{
        const logo=document.querySelector('.main-logo'),canvas=document.createElement('canvas');
        canvas.width=logo.naturalWidth;canvas.height=logo.naturalHeight;
        const context=canvas.getContext('2d');context.drawImage(logo,0,0);
        const edgeHasArt=(x,y,width,height)=>{
          const pixels=context.getImageData(x,y,width,height).data;
          for(let index=3;index<pixels.length;index+=4)if(pixels[index]>0)return true;
          return false;
        };
        const edgeWidth=Math.ceil(canvas.width*.03),edgeHeight=Math.ceil(canvas.height*.03);
        return {
          vertical:document.scrollingElement.scrollHeight<=innerHeight,
          horizontal:document.scrollingElement.scrollWidth<=innerWidth,
          logo:[logo.naturalWidth,logo.naturalHeight],
          rightEdge:edgeHasArt(canvas.width-edgeWidth,0,edgeWidth,canvas.height),
          bottomEdge:edgeHasArt(0,canvas.height-edgeHeight,canvas.width,edgeHeight)
        };
      });
      assert.deepEqual(homeLayout,{vertical:true,horizontal:true,logo:[720,509],rightEdge:true,bottomEdge:true},'main menu fits and the corrected logo crop reaches both outer edge strips');checks++;
      const whatsNewBox=await page.locator('#whatsNewButton').boundingBox();
      assert.ok(whatsNewBox&&whatsNewBox.x>=0&&whatsNewBox.y>=0&&whatsNewBox.x+whatsNewBox.width<=vp.width&&whatsNewBox.y+whatsNewBox.height<=vp.height,'What\'s New stays inside the top-right viewport');checks++;
      await page.waitForFunction(()=>window.__ebHomeCalmAt!==null,null,{timeout:10000});
      assert.ok(await page.evaluate(()=>window.__ebHomeCalmAt-(performance.getEntriesByType('navigation')[0]?.domContentLoadedEventEnd||0))>=1000,'full menu art holds for over a second before it calms');checks++;
      const homeArt=await page.evaluate(()=>getComputedStyle(document.getElementById('home'),'::before').backgroundImage);
      assert.match(homeArt,/image-1-de14f0ce02bf\.png/, 'main menu uses the plain environment artwork');checks++;
      const stamp = await page.locator('#buildStamp').textContent();
      assert.equal(stamp, await page.evaluate(()=>`Alpha ${EB_RELEASE.version}`), 'main menu shows only the concise release version'); checks++;
      await foundation('home');
      assert.equal((await page.locator('.tome-start-badge').textContent()).trim(),'Start here','fresh profile nudges new players toward How to Play');checks++;
      assert.equal(await page.locator('.home-links button:last-child').getAttribute('aria-label'),'How to Play, start here','new-player nudge is announced accessibly');checks++;
      await shot('01-home');
      assert.equal(await page.locator('#whatsNewButton').getAttribute('aria-label'),"What's New, 1 unread update",'What\'s New announces its unread update');checks++;
      assert.equal(await page.locator('#whatsNewButton').evaluate(button=>button.classList.contains('has-badge')),true,'What\'s New dot is visible');checks++;
      await page.locator('#whatsNewButton').click();
      await visible('.whats-new-sheet','What\'s New sheet');
      assert.equal(await page.locator('.whats-new-list li').count(),await page.evaluate(()=>EB_RELEASE.notes.length),'What\'s New renders every release note');checks++;
      assert.equal(await page.evaluate(()=>document.querySelector('.whats-new-sheet').contains(document.activeElement)),true,'focus moves into What\'s New');checks++;
      assert.equal(await page.locator('#whatsNewButton').evaluate(button=>button.classList.contains('has-badge')),false,'opening What\'s New clears the dot');checks++;
      await shot('13-whats-new');
      await page.locator('.whats-new-got-it').click();
      assert.equal(await page.evaluate(()=>document.activeElement===document.getElementById('whatsNewButton')),true,'closing What\'s New restores focus');checks++;
      await page.locator('#whatsNewButton').click();await visible('.whats-new-sheet','What\'s New reopened');await page.keyboard.press('Escape');await page.locator('.whats-new-sheet').waitFor({state:'detached'});assert.equal(await page.evaluate(()=>document.activeElement===document.getElementById('whatsNewButton')),true,'Escape closes What\'s New and restores focus');checks++;
      await page.locator('#whatsNewButton').click();await visible('.whats-new-sheet','What\'s New for backdrop close');await page.locator('.whats-new-backdrop').click({position:{x:5,y:5}});await page.locator('.whats-new-sheet').waitFor({state:'detached'});checks++;
      await page.reload({waitUntil:'load'});await visible('#home.on','home after reload');
      assert.equal(await page.locator('#whatsNewButton').evaluate(button=>button.classList.contains('has-badge')),false,'seen state survives reload');checks++;
      await page.waitForTimeout(3000);
      assert.equal(await page.evaluate(()=>getComputedStyle(document.getElementById('home'),'::before').opacity),'0','full menu art fades to calm by three seconds');checks++;
      const reducedPage=await context.newPage();await reducedPage.emulateMedia({reducedMotion:'reduce'});await reducedPage.goto(base,{waitUntil:'load'});
      assert.equal(await reducedPage.evaluate(()=>getComputedStyle(document.getElementById('home'),'::before').opacity),'0','reduced motion starts with the calm menu');checks++;
      // Speed is guaranteed by the configured 150 ms fade; wall-clock limits are not reliable on a busy CI machine.
      const reducedNav=await reducedPage.evaluate(async()=>{const started=performance.now();document.querySelector('.home-play').click();const animation=getComputedStyle(document.getElementById('setup')).animationDuration;while(performance.now()-started<3000){await new Promise(resolve=>requestAnimationFrame(resolve));const on=[...document.querySelectorAll('.screen.on')].map(screen=>screen.id);if(on.length===1&&on[0]==='setup'&&!document.querySelector('.screen[class*="eb-nav-"]'))return{ms:performance.now()-started,animation,on}}return{ms:Infinity,animation}});
      assert.equal(reducedNav.animation,'0.15s','reduced-motion menu navigation uses a 150 ms fade');checks++;
      assert.ok(reducedNav.ms<=2000,`reduced-motion menu navigation completes (${JSON.stringify(reducedNav)})`);checks++;await reducedPage.close();

      await page.locator('#buildStamp').dispatchEvent('pointerdown',{pointerId:1,pointerType:'touch'});await page.waitForTimeout(650);await page.locator('#buildStamp').dispatchEvent('pointerup',{pointerId:1,pointerType:'touch'});
      await visible('#devcheck.on','System Check after version long-press');await navigate(()=>go('home'),'#home.on');
      for(let tap=0;tap<5;tap++)await page.locator('#buildStamp').click();await visible('#devcheck.on','System Check after five version taps');await navigate(()=>go('home'),'#home.on');
      await menuPush({trigger:'.home-secondary .ghost:first-child',from:'#home',to:'#friends',label:'Home to Friends'});
      await page.waitForFunction(()=>/Connecting to online services|Couldn't connect|Ready to create/.test(document.getElementById('mpMatchmakingResult')?.textContent||''),null,{timeout:8000});checks++;
      await page.waitForFunction(()=>!/Connecting to online services/.test(document.getElementById('mpMatchmakingResult')?.textContent||''),null,{timeout:15000});
      const friendsState=await page.evaluate(()=>({text:document.getElementById('mpMatchmakingResult').textContent,retry:!document.getElementById('mpConnectOnline').hidden,create:!document.getElementById('mpCreateMatch').disabled}));
      assert.ok(friendsState.create?!friendsState.retry:(friendsState.retry&&/Try again/.test(friendsState.text)),`Play with Friends connects by itself and only offers Try again after a failure (${JSON.stringify(friendsState)})`);checks++;
      assert.ok(await page.locator('#friends #mpRoomCode').count(),'Friends room-code control is present');checks++;
      assert.equal(await page.locator('#mpDeckPicker img').count(),1,'Friends deck trigger shows a medallion');checks++;
      assert.ok((await page.locator('#mpDeckPicker strong').textContent()).trim(),'Friends deck trigger shows a deck name');checks++;
      await page.locator('#mpDeckPicker').click();await visible('.mp-deck-sheet','online deck picker');
      assert.equal(await page.locator('.mp-deck-option').count(),9,'online deck picker shows nine choices');checks++;
      assert.equal(await page.locator('.mp-deck-option img').count(),9,'every online deck choice has a medallion');checks++;
      const firstDeckOption=await page.evaluate(()=>document.activeElement?.dataset.deck);await page.keyboard.press('ArrowDown');
      assert.notEqual(await page.evaluate(()=>document.activeElement?.dataset.deck),firstDeckOption,'deck picker arrow keys move between options');checks++;
      await shot('15-friends-deck-picker');
      await page.locator('.mp-deck-option[data-deck="STORM"]').click();await page.locator('.mp-deck-sheet').waitFor({state:'detached'});
      assert.equal((await page.locator('#mpDeckPicker strong').textContent()).trim(),'Storm','choosing Storm updates the trigger');checks++;
      assert.equal(await page.locator('#mpDeck').inputValue(),'STORM','custom picker updates the authoritative select');checks++;
      assert.deepEqual(await page.evaluate(()=>({hidden:document.getElementById('mpResponse').hidden,options:[...document.querySelectorAll('#mpResponse [role="radio"]')].map(button=>button.dataset.response)})),{hidden:false,options:['LIGHTNING','AIR']},'a Hybrid online deck offers its two Response cards');checks++;
      await page.locator('#mpResponse [data-response="AIR"]').click();
      assert.equal(await page.locator('#mpResponse [data-response="AIR"]').getAttribute('aria-checked'),'true','the online Response choice is selectable');checks++;
      let createBody=null;await page.route('**/api/create-room',route=>{createBody=route.request().postDataJSON();route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({ok:false,error:'SMOKE_TEST'})})});
      await page.evaluate(()=>{window.EB_MULTIPLAYER_DEPS={user:{uid:'smoke',getIdToken:async()=>'smoke-token'},db:{},fetchImpl:window.fetch.bind(window)};ebSetMatchmakingEnabled(true)});
      await page.locator('#mpCreateMatch').click();await page.waitForFunction(()=>/SMOKE_TEST/.test(document.getElementById('mpMatchmakingResult').textContent),null,{timeout:5000});
      assert.deepEqual(createBody,{element:'STORM',responseElement:'AIR'},'Create Match sends the chosen Hybrid Response');checks++;
      await page.unroute('**/api/create-room');await page.evaluate(()=>{delete window.EB_MULTIPLAYER_DEPS;ebSetMatchmakingEnabled(false)});
      await page.locator('#mpDeckPicker').click();await visible('.mp-deck-sheet','reopened online deck picker');
      assert.equal(await page.locator('.mp-deck-option[data-deck="STORM"]').getAttribute('aria-selected'),'true','reopened picker marks Storm selected');checks++;
      await page.keyboard.press('Escape');await page.locator('.mp-deck-sheet').waitFor({state:'detached'});assert.equal(await page.evaluate(()=>document.activeElement===document.getElementById('mpDeckPicker')),true,'deck picker Escape restores trigger focus');checks++;
      await page.locator('#mpDeckPicker').click();await visible('.mp-deck-sheet','deck picker for backdrop close');await page.locator('.mp-deck-backdrop').click({position:{x:4,y:4}});await page.locator('.mp-deck-sheet').waitFor({state:'detached'});assert.equal(await page.evaluate(()=>document.activeElement===document.getElementById('mpDeckPicker')),true,'deck picker backdrop restores trigger focus');checks++;
      await shot('14-friends');await menuPush({trigger:'#friends .friends-header button',from:'#friends',to:'#home',direction:'back',label:'Friends to Home'});

      await menuPush({trigger:'.home-secondary .ghost:nth-child(2)',from:'#home',to:'#trials',label:'Home to Trials'});
      await foundation('trials');
      assert.equal(await page.locator('.trial-map-node').count(),9,'Trials map shows nine chapters');checks++;
      assert.equal(await page.locator('.trial-map-node.is-hybrid:disabled').count(),3,'all Hybrid chapters start locked');checks++;
      assert.ok(await page.locator('.trial-river path').count()>=8,'Trials map path is rendered with SVG paths');checks++;
      assert.equal(await page.locator('.trial-river path').evaluateAll(paths=>paths.every(path=>getComputedStyle(path).fill==='none')),true,'every river and branch path has no fill');checks++;
      assert.equal(await page.locator('.trial-map-node').evaluateAll(nodes=>nodes.every(node=>{const box=node.getBoundingClientRect();return box.width>=56&&box.height>=56})),true,'every Trial node has a visible touch and focus box');checks++;
      assert.equal(await page.locator('.trial-node-lock').count(),0,'locked medallions do not show duplicate lock icons');checks++;
      assert.equal(await page.locator('.trial-map-header.codex-header .codex-title').count(),1,'Trials uses the standard plain screen header');checks++;
      assert.match((await page.locator('#trialStars').textContent()).trim(),/^0 \/ 27 stars$/,'Trials header includes the stars unit');checks++;
      const trialMapBox=await page.locator('.trial-map').boundingBox();assert.ok(Math.abs(trialMapBox.width-vp.width)<=1&&Math.abs(trialMapBox.x)<=1,'Trials map spans the viewport width');checks++;
      assert.equal(await page.locator('.callout').count(),3,'all locked Hybrids show completion callouts');checks++;
      const mapGeometry=await page.evaluate(()=>{
        const boxes=[...document.querySelectorAll('.trial-node-plate,.callout')].map(node=>({node,rect:node.getBoundingClientRect()}));
        const medals=[...document.querySelectorAll('.trial-map-node .med')].map(node=>({node,rect:node.getBoundingClientRect()}));
        const overlap=(a,b)=>a.left<b.right&&a.right>b.left&&a.top<b.bottom&&a.bottom>b.top;
        const collisions=[];
        const all=[...boxes,...medals];for(let a=0;a<all.length;a++)for(let b=a+1;b<all.length;b++){if(all[a].node.closest('.trial-map-node')===all[b].node.closest('.trial-map-node')&&all[a].node.closest('.trial-map-node'))continue;if(overlap(all[a].rect,all[b].rect))collisions.push([all[a].node.className,all[b].node.className])}
        const pathHits=[];for(const path of document.querySelectorAll('.trial-river path')){const length=path.getTotalLength(),matrix=path.getScreenCTM();for(let offset=0;offset<=length;offset+=2){const local=path.getPointAtLength(offset),point=new DOMPoint(local.x,local.y).matrixTransform(matrix);for(const box of boxes)if(point.x>=box.rect.left&&point.x<=box.rect.right&&point.y>=box.rect.top&&point.y<=box.rect.bottom){pathHits.push(path.dataset.segment||path.dataset.branch);offset=length+2;break}}}
        const inViewport=all.every(({rect})=>rect.left>=-0.5&&rect.right<=innerWidth+0.5);
        const ys=Object.fromEntries([...document.querySelectorAll('.trial-map-node')].map(node=>[node.dataset.element,node.getBoundingClientRect().top]));
        const hybridsAfter=Object.entries(EB_Trials.PARENTS).every(([hybrid,parents])=>parents.every(parent=>ys[hybrid]>ys[parent]));
        return{collisions,pathHits,inViewport,hybridsAfter};
      });
      assert.deepEqual(mapGeometry.collisions,[],'no Trial medallion, plate, or callout overlaps another');checks++;
      assert.deepEqual(mapGeometry.pathHits,[],'no river or branch enters a label plate or callout');checks++;
      assert.equal(mapGeometry.inViewport,true,'all Trial nodes and plates stay inside the viewport');checks++;
      assert.equal(mapGeometry.hybridsAfter,true,'every Hybrid follows both parents');checks++;
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=document.documentElement.clientWidth),true,'Trials map has no horizontal scroll');checks++;
      await page.emulateMedia({reducedMotion:'reduce'});assert.equal(await page.locator('.ember').first().evaluate(node=>getComputedStyle(node).display),'none','reduced motion hides ambient embers');checks++;await page.emulateMedia({reducedMotion:'no-preference'});
      await page.evaluate(()=>{localStorage.setItem(EB_Trials.STORAGE_KEY,JSON.stringify({FIRE:1,WATER:1,EARTH:1,_seen:7,_unlocked:1}));EB_Trials.renderMap();scrollTo(0,0)});
      assert.equal(await page.locator('.callout[data-element="MAGMA"]').count(),0,'Magma callout is absent after both parents are cleared');checks++;
      assert.equal(await page.locator('.callout[data-element="BLOOM"] .cchip.done .ccheck').count(),1,'approved map state checks Water in Bloom callout');checks++;
      await shot('16-trials-map');
      await page.locator('.callout[data-element="BLOOM"]').scrollIntoViewIfNeeded();await shot('21-trials-map-callouts');
      await page.evaluate(()=>{localStorage.removeItem(EB_Trials.STORAGE_KEY);EB_Trials.renderMap();scrollTo(0,0)});
      await page.locator('.trial-map-node[data-element="FIRE"]').click();await visible('.trial-chapter-sheet','Fire chapter sheet');
      await page.locator('.trial-chapter-backdrop.is-open').waitFor({state:'attached'});assert.equal(await page.locator('.trial-chapter-backdrop.is-open').count(),1,'chapter backdrop reaches its open state');checks++;
      const chapterMotion=await page.locator('.trial-chapter-sheet').evaluate(sheet=>({sheet:getComputedStyle(sheet).transitionDuration,backdrop:getComputedStyle(sheet.parentElement).transitionDuration}));assert.deepEqual(chapterMotion,{sheet:'0.34s',backdrop:'0.3s'},'chapter sheet and backdrop use approved opening durations');checks++;
      await page.evaluate(()=>EB_Trials.openChapter('WATER',document.querySelector('.trial-map-node[data-element="WATER"]')));assert.equal(await page.locator('.trial-chapter-backdrop').count(),1,'chapter motion never stacks sheets');checks++;
      await page.locator('.trial-chapter-backdrop.is-opening').waitFor({state:'detached'});await page.keyboard.press('Escape');assert.equal(await page.locator('.trial-chapter-backdrop.is-closing').count(),1,'Escape starts the chapter close transition');checks++;await page.locator('.trial-chapter-backdrop').waitFor({state:'detached'});assert.equal(await page.evaluate(()=>document.activeElement===document.querySelector('.trial-map-node[data-element="FIRE"]')),true,'chapter close restores node focus');checks++;await page.locator('.trial-map-node[data-element="FIRE"]').click();await page.locator('.trial-chapter-backdrop.is-opening').waitFor({state:'detached'});
      assert.equal(await page.locator('.trial-chapter-step').count(),3,'Fire chapter shows three steps');checks++;
      assert.equal(await page.locator('.trial-chapter-step.is-coming').count(),2,'Set up and Cash in are coming soon');checks++;
      await shot('17-trial-chapter');
      await page.locator('.trial-chapter-step:not(.is-coming)').click();await visible('#battle.on','Fire Full combo trial');
      assert.equal(await page.locator('.trial-token').count(),4,'Fire trial renders its four-token strip');checks++;
      assert.equal(await page.locator('.trial-token.is-next').getAttribute('aria-label'),'Step 1: Cinder Adept, next','Cinder Adept starts as the next token');checks++;
      assert.equal(await page.locator('#trialObjective').isVisible(),false,'trial objective sentence is not displayed');checks++;
      assert.equal(await page.locator('.trial-goal').count(),0,'trial screen omits goal badges');checks++;
      await shot('18-trial-strip');
      await page.evaluate(()=>{window.EB_TRIAL_HINT_MS=40;ebTrialScheduleHint()});await page.locator('[data-eb-card="Cinder Adept"].trial-hint-card').waitFor({state:'visible'});await page.evaluate(()=>{window.EB_TRIAL_HINT_MS=20000;ebTrialScheduleHint()});checks++;
      await page.locator('[data-eb-card="Cinder Adept"] .trial-hint-badge').waitFor({state:'visible'});checks++;
      await page.locator('.trial-rewind').click();await page.waitForTimeout(80);
      assert.equal(await page.evaluate(()=>G?.trial?.element),'FIRE','Rewind restarts the Fire trial');checks++;
      await page.evaluate(()=>{window.EB_TRIAL_HINT_MS=20000;const c=me().hand.find(card=>card.n==='Cinder Adept');play(c,0);const flame=me().hand.find(card=>card.n==='Flame Burst');play(flame,null,{bender:true})});
      await visible('.trial-recap','trial recap');
      assert.equal(await page.locator('.trial-recap-stars .is-earned').count(),2,'a completed trial after Rewind earns two stars');checks++;
      assert.equal(await page.locator('.trial-recap-mastered').count(),0,'trial recap omits the retired mastery line');checks++;
      await shot('19-trial-recap');
      await page.locator('.trial-recap .primary').click();await visible('#trials.on','Trials map after Continue');
      assert.equal(await page.locator('.trial-map-node[data-element="FIRE"] .trial-star-pips .is-earned').count(),2,'Fire node shows two earned stars');checks++;
      assert.equal(await page.locator('.trial-river-segment[data-segment="0"].is-cleared').count(),1,'Fire completion lights the Fire to Water stretch');checks++;
      assert.equal(await page.locator('.callout[data-element="MAGMA"] .cchip.done .ccheck').count(),1,'a cleared parent chip shows its gold check');checks++;

      await page.evaluate(()=>startTrial('NATURE'));await visible('#battle.on','Nature Full combo trial');
      await page.evaluate(()=>{window.EB_TRIAL_HINT_MS=40;ebTrialScheduleHint()});await page.locator('[data-eb-card="Sproutling"].trial-hint-card').waitFor({state:'visible'});checks++;
      await page.evaluate(()=>{window.EB_TRIAL_HINT_MS=20000;ebTrialScheduleHint();const sprout=me().hand.find(card=>card.n==='Sproutling');play(sprout,1);applyPrimeSummonGift(sprout,me().slots.find(card=>card?.n==='Grove Beast'));hideModal();const mend=me().hand.find(card=>card.n==='Verdant Mend');play(mend,null,{friend:me().slots.find(card=>card?.n==='Grove Beast')});attack(me().slots.find(card=>card?.n==='Grove Beast'),null)});
      await visible('.trial-recap','Nature trial recap');
      assert.equal(await page.locator('.trial-recap-stars .is-earned').count(),3,'idle hint does not prevent a mistake-free three-star Nature run');checks++;
      await page.locator('.trial-recap .primary').click();await visible('#trials.on','Trials map after Nature');

      await page.evaluate(()=>startTrial('WATER'));await visible('#battle.on','Water Full combo trial');
      await page.evaluate(()=>{const shift=me().hand.find(card=>card.n==='Current Shift'),brute=foe().slots.find(card=>card?.n==='Tide Brute');play(shift,null,{enemy:brute})});
      await visible('.trial-soaked-preview','Soaked Tide Brute preview');
      assert.match(await page.locator('.trial-soaked-preview').textContent(),/4\s*→\s*2/,'Soaked preview shows 4 to 2');checks++;
      await shot('20-trial-water-soaked');
      await page.locator('#end').click();await visible('.trial-recap','Water trial recap');
      assert.equal(await page.evaluate(()=>me().vit),1,'Soaked Tide Brute leaves the player at 1 Vitality');checks++;
      assert.equal(await page.locator('.trial-impact-chip').count(),1,'Soaked impact displays its minus-two chip');checks++;
      await page.locator('.trial-recap .primary').click();await visible('#trials.on','Trials map after Water');

      await page.reload({waitUntil:'load'});await page.evaluate(()=>goTrials());await visible('#trials.on','Trials map after reload');await navUnlocked();
      assert.equal(await page.locator('.trial-map-node[data-element="FIRE"] .trial-star-pips .is-earned').count(),2,'Fire stars persist after reload');checks++;
      assert.equal(await page.locator('.trial-map-node[data-element="WATER"]:not(:disabled),.trial-map-node[data-element="EARTH"]:not(:disabled)').count(),2,'Water and Earth remain unlocked');checks++;
      assert.equal(await page.locator('.trial-map-node.is-hybrid:disabled').count(),2,'Water and Nature completion unlocks only Bloom');checks++;
      assert.equal(await page.locator('.trial-map-node[data-element="BLOOM"]:not(:disabled)').count(),1,'Bloom unlock persists after both parents are cleared');checks++;
      await menuPush({trigger:'#trials .trial-map-header button',from:'#trials',to:'#home',direction:'back',label:'Trials to Home'});

      await menuPush({trigger:'.home-links button:first-child',from:'#home',to:'#codex',label:'Home to Codex'});
      await visible('.codex-card-grid .codex-card', 'codex cards');
      assert.equal(await page.locator('.codex-mastery').count(),0,'Codex cards omit retired mastery stars');checks++;
      await calmBackground('Codex');
      await foundation('codex');
      await shot('03-codex');
      assert.equal(await page.locator('.codex-dial-option').count(),9,'Codex shows all nine deck medallions');checks++;
      assert.equal(await page.locator('#codex').getAttribute('data-current-deck'),'FIRE','Codex starts on Fire');checks++;
      const dialBox=await page.locator('.codex-dial').boundingBox();
      await swipe(dialBox.x+dialBox.width/2+40,dialBox.y+dialBox.height/2,dialBox.x+dialBox.width/2-40,dialBox.y+dialBox.height/2);
      const codexSwipeSettle=await settleStyles('#codex');
      assert.deepEqual(codexSwipeSettle,{grid:'0.3s, 0.3s',dial:'0.3s, 0.3s'},'Codex swipe settles over 300 ms');checks++;
      await page.waitForTimeout(500);assert.equal(await page.locator('#codex').getAttribute('data-current-deck'),'WATER','dial swipe selects Water');checks++;
      const dialTargets=await page.evaluate(()=>[...document.querySelectorAll('#codex .codex-dial-option')].filter(option=>{const r=option.getBoundingClientRect();return r.left>0&&r.right<innerWidth&&Number(getComputedStyle(option).opacity)>.3}).map(option=>{const r=option.getBoundingClientRect(),cx=r.left+r.width/2,cy=r.top+r.height/2;return[[0,-20],[0,20],[-20,0],[20,0]].every(([dx,dy])=>{const hit=document.elementFromPoint(cx+dx,cy+dy);return hit===option||option.contains(hit)||(hit?.classList?.contains('codex-dial-option'))})}));
      assert.ok(dialTargets.length>=3&&dialTargets.every(Boolean),'every visible dial medallion keeps a 44 px tap area, even when shrunk');checks++;
      // Tap and read in the same task, before the 320 ms settle timer can clear the animating state on a slow machine.
      const codexTapSettle=await page.locator('#codex .codex-dial-option').nth(2).evaluate(button=>{button.click();const root=button.closest('#codex'),grid=root.querySelector('.codex-grid-wrap[aria-hidden="false"]'),dial=root.querySelector('.codex-dial-option[aria-selected="true"]');return{grid:getComputedStyle(grid).transitionDuration,dial:getComputedStyle(dial).transitionDuration}});
      assert.deepEqual(codexTapSettle,codexSwipeSettle,'Codex medallion tap matches swipe settling');checks++;
      await page.waitForTimeout(350);await page.locator('#codex .codex-dial-option').nth(1).evaluate(button=>button.click());await page.waitForTimeout(350);
      const waterGrid=page.locator('.codex-grid-wrap[data-deck="WATER"]');
      assert.equal(await waterGrid.locator('.codex-card').count(),5,'Water grid has five cards');checks++;
      assert.equal(await waterGrid.getAttribute('aria-hidden'),'false','Water grid is active');checks++;
      const tabbableCodexCards=await page.evaluate(()=>[...document.querySelectorAll('.codex-grid-wrap')].filter(grid=>!grid.inert).flatMap(grid=>[...grid.querySelectorAll('.codex-card')]).length);
      assert.equal(tabbableCodexCards,5,'only the active Codex grid exposes tabbable cards');checks++;
      assert.ok(await waterGrid.getByText('Mist Adept',{exact:true}).count(),'Water grid contains Mist Adept');checks++;
      await assertCardChrome('.codex-grid-wrap[data-deck="WATER"] .codex-card--s',12,'Codex S cards');
      await assertSmallCardLayout('#codex','Codex');
      const codexCarousel={};
      for(const part of ['.codex-dial','.codex-labels','.codex-dots','.codex-grids','.codex-grid-wrap[data-deck="WATER"]'])codexCarousel[part]=await carouselStyles(`#codex ${part}`);
      await shot('07-codex-dial');
      const closeupBox=await waterGrid.locator('.codex-card--s').first().boundingBox();
      await page.screenshot({path:path.join(OUT,`${vp.name}-09-codex-card-closeup.png`),clip:closeupBox});
      await waterGrid.locator('.codex-card').first().click();
      await visible('.codex-zoom.is-open','Codex zoom');
      await assertInfoOnTop('Codex zoom');
      assert.equal(await page.locator('.codex-zoom-slide[aria-hidden="false"] .codex-card-name').textContent(),'Mist Adept','tapped card opens active in zoom');checks++;
      const zoomBox=await page.locator('.codex-zoom-stage').boundingBox();
      await swipe(zoomBox.x+zoomBox.width*.8,zoomBox.y+180,zoomBox.x+zoomBox.width*.2,zoomBox.y+180);
      await page.waitForFunction(()=>document.querySelector('.codex-zoom-slide[aria-hidden="false"] .codex-card-name')?.textContent==='Tide Warden');checks++;
      await assertCardChrome('.codex-zoom-slide[aria-hidden="false"] .codex-card--l',30,'Codex L card');
      await shot('08-codex-zoom');
      const zoomKeyword=page.locator('.codex-zoom-slide[aria-hidden="false"] .codex-keyword').first();const zoomKeywordText=(await zoomKeyword.textContent()).trim();
      // A swipe suppresses the next tap for 350 ms (so the swipe itself is not read as a tap); wait for that to clear.
      await page.waitForFunction(()=>!document.querySelector('.codex-zoom-stage')?._ebSuppressClick,null,{timeout:5000});
      await zoomKeyword.click();await page.locator('.tome-peek-backdrop.is-open').waitFor({timeout:5000});
      await page.waitForTimeout(400);
      assert.equal((await page.locator('.tome-peek .tome-title').textContent()).trim(),zoomKeywordText,'Codex keyword chip opens its Tome page in a peek sheet');checks++;
      await page.keyboard.press('Escape');await page.locator('.tome-peek-backdrop').waitFor({state:'detached',timeout:5000});
      assert.equal(await page.locator('.codex-zoom.is-open').count(),1,'closing the Tome peek leaves the card zoom open');checks++;
      assert.equal(await page.evaluate(()=>document.activeElement?.classList.contains('codex-keyword')),true,'focus returns to the keyword chip');checks++;
      await page.locator('.codex-zoom-close').click();await page.locator('.codex-zoom').waitFor({state:'detached',timeout:5000});checks++;
      const noHorizontalScroll=await page.evaluate(()=>document.documentElement.scrollWidth<=document.documentElement.clientWidth);
      assert.equal(noHorizontalScroll,true,'Codex causes no horizontal page scroll');checks++;

      await page.locator('#codex .codex-guide-button').click();await page.locator('.tome-peek-backdrop.is-open').waitFor({timeout:5000});await page.waitForTimeout(400);
      const guideDeck=await page.evaluate(()=>EB_CardBrowser&&document.querySelector('#codex .codex-shell').dataset.currentDeck);
      assert.equal((await page.locator('.deck-guide-title').textContent()).trim(),await page.evaluate(key=>ElementBoundCards.INFO[key][0],guideDeck),'Codex guide opens for the deck on the dial');checks++;
      assert.equal(await page.locator('.deck-guide-plan li').count(),3,'deck guide shows a three-step plan');checks++;
      await shot('10-deck-guide');
      await page.locator('.deck-guide .tome-card-chip').first().click();await page.locator('.tome-peek .codex-card-name').waitFor({timeout:5000});
      assert.match(await page.locator('.tome-peek .tome-ribbon').textContent(),/Back to How .+ wins/,'a key card opens inside the guide with a way back');checks++;
      const cardFit=await page.evaluate(()=>{const body=document.querySelector('.tome-peek-body'),card=document.querySelector('.tome-peek .codex-card--l').getBoundingClientRect(),sheet=document.querySelector('.tome-peek').getBoundingClientRect();return{scroll:body.scrollHeight-body.clientHeight,offset:Math.abs((card.left+card.width/2)-(sheet.left+sheet.width/2))}});
      assert.ok(cardFit.scroll<=1&&cardFit.offset<=2,`a card opened in a sheet is centred and fits without scrolling (${JSON.stringify(cardFit)})`);checks++;
      await page.locator('.tome-peek .tome-ribbon').click();await page.locator('.deck-guide-title').waitFor({timeout:5000});checks++;
      await page.keyboard.press('Escape');await page.locator('.tome-peek-backdrop').waitFor({state:'detached',timeout:5000});
      assert.equal(await page.evaluate(()=>document.activeElement?.classList.contains('codex-guide-button')),true,'closing the guide returns focus to its button');checks++;
      await page.locator('#codex .codex-find-button').click();await page.locator('.tome-peek-backdrop.is-search.is-open').waitFor({timeout:5000});await page.waitForTimeout(400);
      assert.equal(await page.evaluate(()=>document.activeElement?.classList.contains('codex-finder-input')),true,'card finder opens with its input focused');checks++;
      assert.match(await page.locator('.codex-finder-status').textContent(),/^42 cards$/,'card finder lists every unique card by default');checks++;
      await page.locator('.codex-finder-chip[data-value="TECHNIQUE"]').click();await page.locator('.codex-finder-chip[data-value="2"]').click();
      assert.equal(await page.locator('.codex-finder-result').count(),9,'Type and Cost filters combine (2-Essence Techniques)');checks++;
      assert.equal(await page.locator('.codex-finder-chip[data-value="TECHNIQUE"]').getAttribute('aria-pressed'),'true','selected filters expose aria-pressed');checks++;
      await page.locator('.codex-finder-chip[data-value="ALL"]').click();await page.locator('.codex-finder-chip[data-value="ANY"]').click();
      await page.locator('.codex-finder-chip[data-value="Burning"]').click();
      assert.equal(await page.locator('.codex-finder-result').count(),6,'Effect filter finds every Burning card');checks++;
      await page.locator('.codex-finder-chip[data-value="Burning"]').click();
      await page.fill('.codex-finder-input','tidelily');await page.waitForTimeout(150);
      await shot('09-codex-finder');
      await page.keyboard.press('Enter');await page.locator('.codex-zoom.is-open').waitFor({timeout:5000});await page.waitForTimeout(500);
      assert.equal((await page.locator('.codex-zoom-slide[aria-hidden="false"] .codex-card-name').textContent()).trim(),'Tidelily Guardian','a finder result opens that card zoomed in its deck');checks++;
      assert.equal(await page.evaluate(()=>document.querySelector('#codex .codex-shell')?.dataset.currentDeck),'BLOOM','the dial moves to the card\'s deck');checks++;
      await page.locator('.codex-zoom-close').click();await page.locator('.codex-zoom').waitFor({state:'detached',timeout:5000});
      await menuPush({trigger:'#codex .codex-header .codex-back',from:'#codex',to:'#home',direction:'back',label:'Codex to Home'});
      await menuPush({trigger:'.home-links button:nth-child(2)',from:'#home',to:'#tome',label:'Home to Tome'});
      await visible('.tome-cover','Tome cover');
      await calmBackground('Tome');
      await page.waitForFunction(()=>document.activeElement?.textContent==='Open the Tome');assert.equal(await page.evaluate(()=>document.activeElement?.textContent),'Open the Tome','Tome cover receives focus');checks++;
      await shot('04-tome-cover');
      await page.locator('.tome-cover .primary').click();
      await page.locator('.tome-cover').waitFor({state:'detached',timeout:2000});
      assert.equal(await page.locator('.tome-page.is-current .tome-title').textContent(),'Contents','Tome opens to Contents');checks++;
      assert.equal(await page.evaluate(()=>document.activeElement?.classList.contains('tome-title')),true,'opened Tome focuses its page title');checks++;
      const tomeTabs=await page.locator('.tome-tab').evaluateAll(tabs=>tabs.map(tab=>({width:tab.getBoundingClientRect().width,height:tab.getBoundingClientRect().height})));
      assert.equal(tomeTabs.length,11,'Tome has eleven chapter tabs');checks++;
      assert.ok(tomeTabs.every(tab=>tab.width>=44&&tab.height>=44),'Tome tabs meet the touch-target minimum');checks++;
      const tomeTabLayout=await page.locator('.tome-tab').evaluateAll(tabs=>tabs.map(tab=>tab.getBoundingClientRect()).map(({left,top,right,bottom})=>({left,top,right,bottom})));
      assert.ok(tomeTabLayout.every((tab,index)=>tab.left>=0&&tab.right<=vp.width&&tab.top>=0&&tab.bottom<=vp.height&&(index===0||tab.top>=tomeTabLayout[index-1].bottom)),'Tome tabs do not overlap and stay inside the viewport');checks++;
      const tomeStage=await page.locator('.tome-stage').boundingBox();
      await swipe(tomeStage.x+tomeStage.width*.8,tomeStage.y+tomeStage.height*.55,tomeStage.x+tomeStage.width*.15,tomeStage.y+tomeStage.height*.55);
      await tomeSettled();
      assert.equal(await page.locator('.tome-page.is-current .tome-title').textContent(),'Your Bender','swiping flips to the next lesson');checks++;
      assert.equal((await page.locator('.tome-nav-label').textContent()).trim(),'First Lessons · 2','bottom navigation reports section and page');checks++;
      await page.locator('.tome-next').click();await tomeSettled();
      await page.locator('.tome-prev').click();await tomeSettled();
      assert.equal(await page.locator('.tome-page.is-current .tome-title').textContent(),'Your Bender','previous and next controls flip pages');checks++;
      await page.locator('.tome-tab[aria-label="Water"]').click();await tomeSettled();
      assert.equal(await page.locator('.tome-tab[aria-label="Water"]').getAttribute('aria-current'),'page','Water tab marks its chapter current');checks++;
      await page.locator('.tome-page.is-current .tome-chip',{hasText:'Soaked'}).click();await tomeSettled();
      assert.equal(await page.locator('.tome-page.is-current .tome-title').textContent(),'Soaked','element chapter links to its effect');checks++;
      await shot('04b-tome-term');
      await page.locator('.tome-page.is-current .tome-link',{hasText:'Weakened'}).click();await tomeSettled();
      assert.match(await page.locator('.tome-page.is-current .tome-ribbon').textContent(),/Back to Soaked/,'linked term exposes a return ribbon');checks++;
      await page.locator('.tome-page.is-current .tome-ribbon').click();await tomeSettled();
      assert.equal(await page.locator('.tome-page.is-current .tome-title').textContent(),'Soaked','return ribbon restores the source term');checks++;
      await page.evaluate(()=>EB_Tome.flipTo(1,{clearTrail:true,focus:true}));await tomeSettled();
      const ownVitality=page.locator('.tome-page.is-current .tl-plate[data-plate="you"] .tl-value');
      await page.locator('.tome-page.is-current .tl-plate[data-plate="you"]').click();
      assert.equal(await ownVitality.textContent(),'30','wrong Lesson I tap leaves your Vitality unchanged');checks++;
      assert.equal(await page.locator('.tome-page.is-current .tome-title').textContent(),'Your Bender','tapping inside a lesson board does not flip the page');checks++;
      await page.evaluate(()=>EB_Tome.flipTo(4,{clearTrail:true,focus:true}));await tomeSettled();
      await page.locator('.tome-page.is-current .tl-card[data-card="Cinder Adept"]').click({force:true});
      assert.equal(await page.locator('.tome-page.is-current .tome-title').textContent(),'Effects & Combos','playing a mini card does not flip the page');checks++;
      assert.equal(await page.locator('.tome-page.is-current .tl-plate[data-plate="rival"] .eb-icon').count()>1,true,'Cinder Adept applies the visible Burning glyph');checks++;
      await shot('04d-tome-lesson');
      await page.locator('.tome-page.is-current .tl-card[data-card="Flame Burst"]').click({force:true});
      assert.equal((await page.locator('.tome-page.is-current .tl-say').textContent()).trim(),'3 damage instead of 2. That is a combo.','Lesson IV finishes with the approved line');checks++;
      assert.equal(await page.locator('.tome-page.is-current .tl-plate[data-plate="rival"]>.tl-value').textContent(),'7','Lesson IV reduces rival Vitality to 7');checks++;
      await page.waitForFunction(()=>document.querySelector('.tome-page.is-current .tome-try')?.classList.contains('tl-hint'));assert.equal(await page.locator('.tome-page.is-current .tome-try').evaluate(button=>button.classList.contains('tl-hint')),true,'Lesson IV completion highlights Try it');checks++;
      await page.locator('.tome-page.is-current .tl-finish .ghost').click();
      await page.waitForFunction(()=>document.querySelector('.tome-page.is-current .tl-plate[data-plate="rival"]>.tl-value')?.textContent==='10',null,{timeout:5000});checks++;
      await page.evaluate(()=>EB_Tome.flipTo(5,{clearTrail:true,focus:true}));await tomeSettled();
      await visible('.tome-page.is-current .tl-response','Lesson V Response Window');
      await page.locator('.tome-page.is-current .tl-response').scrollIntoViewIfNeeded();
      await shot('04e-tome-lesson-v');
      await page.locator('.tome-page.is-current .tl-response button',{hasText:'Pass'}).click();
      assert.equal((await page.locator('.tome-page.is-current .tl-say').textContent()).trim(),'Passing is a choice too. Save the Response for the attack that matters.','Lesson V Pass branch uses the approved line');checks++;
      assert.ok((await page.locator('.tome-page:not([hidden])').count())<=5,'Tome keeps only the nearby page window rendered');checks++;
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=document.documentElement.clientWidth),true,'Tome causes no horizontal scroll');checks++;
      assert.ok(await page.evaluate(()=>document.documentElement.scrollHeight<=innerHeight+1),'the Tome screen fits without page scrolling');checks++;
      assert.match(await page.locator('.tome-narr').first().evaluate(el=>getComputedStyle(el).fontFamily),/Cormorant Garamond/,'Archivist uses the narrator font');checks++;
      await page.locator('.tome-tab[aria-label="Contents"]').click();await tomeSettled();
      await page.locator('.tome-page.is-current button',{hasText:'Effects at a Glance'}).first().click();await tomeSettled();
      assert.equal(await page.locator('.tome-page.is-current .tome-title').textContent(),'Effects at a Glance','a mouse click on a Contents row reaches its button');checks++;
      assert.equal(await page.locator('.tome-glance-row').count(),10,'Effects at a Glance shows ten rows');checks++;
      await shot('04c-tome-glance');
      const glanceStage=await page.locator('.tome-stage').boundingBox();
      await swipe(glanceStage.x+glanceStage.width*.15,glanceStage.y+glanceStage.height*.55,glanceStage.x+glanceStage.width*.8,glanceStage.y+glanceStage.height*.55);
      await tomeSettled();
      assert.equal(await page.locator('.tome-page.is-current .tome-title').textContent(),'Card Depletion','swiping right flips back to the previous page');checks++;
      await page.locator('.tome-tab[aria-label="Water"]').click();await page.waitForFunction(()=>document.querySelector('.tome-page.is-current .tome-title')?.textContent.trim()==='Water',null,{timeout:5000});await tomeSettled();
      await page.locator('.tome-page.is-current .tome-chip',{hasText:'Soaked'}).click();await page.waitForFunction(()=>document.querySelector('.tome-page.is-current .tome-title')?.textContent.trim()==='Soaked',null,{timeout:5000});await tomeSettled();
      await page.locator('.tome-page.is-current .tome-card-chip',{hasText:'River Serpent'}).click();await page.locator('.tome-peek-backdrop.is-open').waitFor({timeout:5000});await page.waitForTimeout(400);
      assert.equal((await page.locator('.tome-peek .codex-card-name').textContent()).trim(),'River Serpent','Seen on chip opens the card in a peek sheet');checks++;
      await page.locator('.tome-peek .codex-keyword',{hasText:'Soaked'}).click();await page.locator('.tome-peek .tome-title').waitFor({timeout:5000});
      assert.equal((await page.locator('.tome-peek .tome-title').textContent()).trim(),'Soaked','a keyword inside the peek opens its term in place');checks++;
      assert.match(await page.locator('.tome-peek .tome-ribbon').textContent(),/Back to River Serpent/,'the peek keeps its own back trail');checks++;
      await shot('04f-tome-peek');
      await page.locator('.tome-peek-close').click();await page.locator('.tome-peek-backdrop').waitFor({state:'detached',timeout:5000});
      assert.equal((await page.locator('.tome-page.is-current .tome-title').textContent()).trim(),'Soaked','closing the peek leaves the Tome page unchanged');checks++;
      await page.evaluate(()=>inspectCard({n:'Flare Hawk',el:'FIRE',type:'MANIFESTATION',c:3,a:3,h:3,max:3,text:'When this attacks a Burning target, it gets +1 ATK for that attack.'}));
      await page.locator('#mw [data-tome-term="Burning"]').click();await page.locator('.tome-peek-backdrop.is-open').waitFor({timeout:5000});await page.waitForTimeout(400);
      assert.equal((await page.locator('.tome-peek .tome-title').textContent()).trim(),'Burning','card inspect terms open their Tome page above the inspect sheet');checks++;
      assert.equal(await page.locator('.tome-peek .tome-try').count(),0,'Try it is hidden inside a peek');checks++;
      await page.keyboard.press('Escape');await page.locator('.tome-peek-backdrop').waitFor({state:'detached',timeout:5000});
      await page.evaluate(()=>closeCardInspect());await page.locator('#mw').waitFor({state:'hidden',timeout:5000});
      await page.locator('.tome-search-button').click();await page.locator('.tome-peek-backdrop.is-search.is-open').waitFor({timeout:5000});await page.waitForTimeout(400);
      assert.equal(await page.evaluate(()=>document.activeElement?.classList.contains('tome-search-input')),true,'search opens with the input focused');checks++;
      const searchBox=await page.locator('.tome-peek').boundingBox();assert.ok(searchBox.y<=4,'search sheet drops from the top so the phone keyboard never covers it');checks++;
      await page.fill('.tome-search-input','graveyard');await page.locator('.tome-search-result').first().waitFor({timeout:5000});
      assert.equal((await page.locator('.tome-search-result strong').first().textContent()).trim(),'Wake','other-game words find their Tome page (graveyard → Wake)');checks++;
      await shot('04g-tome-search');
      await page.keyboard.press('Enter');await page.locator('.tome-peek-backdrop').waitFor({state:'detached',timeout:5000});
      await page.waitForFunction(()=>document.querySelector('.tome-page.is-current .tome-title')?.textContent.trim()==='Wake',null,{timeout:5000});checks++;
      await page.locator('.tome-search-button').click();await page.locator('.tome-peek-backdrop.is-open').waitFor({timeout:5000});
      await page.fill('.tome-search-input','xyzq');await page.waitForTimeout(150);
      assert.equal(await page.locator('.tome-search-result').count(),0,'unknown words show no results');checks++;
      assert.match(await page.locator('.tome-search-status').textContent(),/no page for that/,'empty search explains itself');checks++;
      await page.keyboard.press('Escape');await page.locator('.tome-peek-backdrop').waitFor({state:'detached',timeout:5000});
      assert.equal(await page.evaluate(()=>document.activeElement?.classList.contains('tome-search-button')),true,'closing search returns focus to the search button');checks++;
      await page.locator('.tome-tab[aria-label="Contents"]').click();await tomeSettled();
      assert.match(await page.locator('.tome-page.is-current .tome-contents-row').first().textContent(),/I\s*Your Bender/,'Contents rows show the lesson names');checks++;
      await page.emulateMedia({reducedMotion:'reduce'});
      const reducedFlip=await page.locator('.tome-page.is-current').evaluate(el=>getComputedStyle(el).transitionDuration);
      assert.equal(reducedFlip,'0.15s','reduced motion uses a 150 ms cross-fade');checks++;
      const reducedTomeFlip=await page.evaluate(async()=>{const started=performance.now();document.querySelector('.tome-next').click();while(performance.now()-started<3000){await new Promise(resolve=>requestAnimationFrame(resolve));if(document.activeElement?.classList.contains('tome-title'))return performance.now()-started}return Infinity});
      assert.ok(reducedTomeFlip<=2000,`reduced-motion flip (already asserted as a 150 ms cross-fade) completes and focuses (${Math.round(reducedTomeFlip)} ms)`);checks++;
      await page.emulateMedia({reducedMotion:'no-preference'});
      await menuPush({trigger:'#tome .tome-header .codex-back',from:'#tome',to:'#home',direction:'back',label:'Tome to Home'});
      assert.equal(await page.locator('.tome-start-badge').count(),0,'opening the Tome clears the Start here badge');checks++;

      await menuPush({trigger:'.home-play',from:'#home',to:'#setup',label:'Home to deck select'});
      await visible('#setup .deckselect-shell .codex-card','deck select cards');
      await page.locator('#setup .codex-guide-icon').click();await page.locator('.tome-peek-backdrop.is-open').waitFor({timeout:5000});
      assert.equal(await page.locator('.deck-guide-plan li').count(),3,'deck select opens the same deck guide from its header');checks++;
      await page.keyboard.press('Escape');await page.locator('.tome-peek-backdrop').waitFor({state:'detached',timeout:5000});
      await calmBackground('Deck select');
      await menuPush({trigger:'#setup .codex-header .codex-back',from:'#setup',to:'#home',direction:'back',label:'Deck select to Home'});
      await menuPush({trigger:'.home-play',from:'#home',to:'#setup',label:'Home to deck select again'});
      await visible('#setup .deckselect-shell .codex-card','deck select cards after returning');
      const deckSelectFits=await page.evaluate(()=>({vertical:document.documentElement.scrollHeight<=document.documentElement.clientHeight,horizontal:document.documentElement.scrollWidth<=document.documentElement.clientWidth}));
      assert.deepEqual(deckSelectFits,{vertical:true,horizontal:true},'deck select fits without page scrolling');checks++;
      const selectDialBox=await page.locator('#setup .codex-dial').boundingBox();
      await swipe(selectDialBox.x+selectDialBox.width/2+40,selectDialBox.y+selectDialBox.height/2,selectDialBox.x+selectDialBox.width/2-40,selectDialBox.y+selectDialBox.height/2);
      const deckSwipeSettle=await settleStyles('#setup');
      assert.deepEqual(deckSwipeSettle,codexSwipeSettle,'deck-select swipe settle matches Codex immediately after release');checks++;
      await page.waitForFunction(()=>document.querySelector('#setup')?.dataset.currentDeck==='WATER');checks++;
      await page.locator('#setup .codex-dial-option').nth(2).evaluate(button=>button.click());
      const deckTapSettle=await settleStyles('#setup');
      assert.deepEqual(deckTapSettle,codexTapSettle,'deck-select medallion tap settle matches Codex');checks++;
      await page.waitForTimeout(350);await page.locator('#setup .codex-dial-option').nth(1).evaluate(button=>button.click());await page.waitForTimeout(350);
      const selectWaterGrid=page.locator('#setup .codex-grid-wrap[data-deck="WATER"]');
      assert.equal(await selectWaterGrid.locator('.codex-card').count(),5,'deck select Water grid shows five cards');checks++;
      const deckCardSize=await selectWaterGrid.locator('.codex-card').first().evaluate(card=>({width:card.getBoundingClientRect().width,height:card.getBoundingClientRect().height}));
      assert.deepEqual(deckCardSize,{width:100,height:140},'deck-select cards stay 100 by 140 pixels at phone sizes');checks++;
      const titleLines=await page.locator('#setup .codex-title').evaluate(title=>Math.round(title.getBoundingClientRect().height/parseFloat(getComputedStyle(title).lineHeight)));
      assert.equal(titleLines,1,'deck-select title stays on one line');checks++;
      await assertSmallCardLayout('#setup','Deck select');
      for(const part of ['.codex-dial','.codex-labels','.codex-dots','.codex-grids','.codex-grid-wrap[data-deck="WATER"]']){
        assert.deepEqual(await carouselStyles(`#setup ${part}`),codexCarousel[part],`deck select matches Codex computed carousel styles for ${part}`);checks++;
      }
      const selectTabbable=await page.evaluate(()=>[...document.querySelectorAll('#setup .codex-grid-wrap')].filter(grid=>!grid.inert).flatMap(grid=>[...grid.querySelectorAll('.codex-card')]).length);
      assert.equal(selectTabbable,5,'only the active deck-select grid exposes cards');checks++;
      await foundation('setup');
      await shot('05-setup');
      await shot('10-deck-select');
      await selectWaterGrid.locator('.codex-card').first().click();
      await visible('.codex-zoom.is-open','deck-select card zoom');
      await assertInfoOnTop('Deck-select zoom');
      const beforeArrow=await page.locator('.codex-zoom-slide[aria-hidden="false"] .codex-card-name').textContent();
      await page.locator('.codex-zoom-controls .is-next').click();
      assert.ok(await page.locator('.codex-zoom').evaluate(zoom=>zoom.classList.contains('is-sliding')),'reduced-motion arrow navigation uses the slide transition');checks++;
      await page.waitForFunction(name=>document.querySelector('.codex-zoom-slide[aria-hidden="false"] .codex-card-name')?.textContent!==name,beforeArrow);checks++;
      const trackDuration=await page.locator('.codex-zoom-track').evaluate(track=>parseFloat(getComputedStyle(track).transitionDuration)*1000);
      assert.equal(trackDuration,300,'deck zoom uses the shared 300 ms slide');checks++;
      await shot('11-deck-zoom');
      await page.locator('.codex-zoom-close').click();await page.locator('.codex-zoom').waitFor({state:'detached',timeout:5000});checks++;
      await page.evaluate(()=>scrollTo(0,0));
      const scrollBeforeSelect=await page.evaluate(()=>scrollY);
      const revealStart=await page.evaluate(async()=>{document.querySelector('.deckselect-main').click();await new Promise(resolve=>requestAnimationFrame(resolve));const panel=document.querySelector('.deckselect-difficulty'),style=getComputedStyle(panel);return{opacity:Number(style.opacity),pointerEvents:style.pointerEvents}});
      await visible('.deckselect-difficulty','difficulty panel');
      assert.equal(await page.locator('.deckselect-difficulty').getAttribute('aria-hidden'),'false','difficulty choices are exposed to assistive technology');checks++;
      assert.ok(revealStart.opacity<.1,`difficulty panel stays hidden while cards begin leaving (${JSON.stringify(revealStart)})`);checks++;
      assert.equal(revealStart.pointerEvents,'none','hidden difficulty controls cannot intercept taps during the reveal delay');checks++;
      await page.waitForFunction(()=>getComputedStyle(document.querySelector('.deckselect-difficulty')).opacity==='1',null,{timeout:5000});checks++;
      assert.equal(await page.locator('.deckselect-difficulty').evaluate(panel=>getComputedStyle(panel).pointerEvents),'auto','difficulty controls enable after the reveal begins');checks++;
      assert.equal(await page.locator('.deckselect-grid-stage').evaluate(stage=>getComputedStyle(stage).opacity),'0','card grid has stepped aside before difficulty settles');checks++;
      assert.equal(await page.evaluate(()=>document.activeElement===document.querySelector('.deckselect-difficulty h2')),true,'focus moves to the arrived difficulty heading');checks++;
      assert.equal(await page.evaluate(()=>scrollY),scrollBeforeSelect,'difficulty focus does not move the page');checks++;
      assert.ok(await page.locator('#setup .codex-grid-wrap').evaluateAll(grids=>grids.every(grid=>grid.inert)),'card grids are inert while choosing difficulty');checks++;
      assert.equal((await page.locator('.deckselect-button-label[aria-hidden="false"]').textContent()).trim(),'START DUEL','main button changes to Start Duel');checks++;
      assert.ok(await page.evaluate(()=>document.scrollingElement.scrollHeight<=innerHeight),'deck select does not scroll after Select');checks++;
      await shot('12-deck-difficulty');
      await page.locator('.deckselect-change').click();
      await page.waitForFunction(()=>getComputedStyle(document.querySelector('.deckselect-grid-stage')).opacity==='1',null,{timeout:5000});checks++;
      assert.equal(await page.locator('.deckselect-response').evaluate(box=>box.hidden),true,'Prime decks show no Response choice');checks++;
      const primeDeckLabel=await page.locator('#setup .codex-dial-option[aria-selected="true"]').getAttribute('aria-label');
      await page.evaluate(()=>[...document.querySelectorAll('#setup .codex-dial-option')].find(button=>button.getAttribute('aria-label')==='Magma').click());
      await page.waitForFunction(()=>document.querySelector('#setup .codex-shell, #setup .deckselect-shell')?.dataset.currentDeck==='MAGMA',null,{timeout:5000});await page.waitForTimeout(400);
      await page.locator('.deckselect-main').click();await page.locator('.deckselect-response-option').first().waitFor({timeout:5000});
      assert.deepEqual(await page.locator('.deckselect-response-option').evaluateAll(buttons=>buttons.map(button=>[button.dataset.response,button.getAttribute('aria-checked')])),[['FIRE','true'],['EARTH','false']],'Magma offers Fire or Earth Response, starting on Fire');checks++;
      await page.locator('.deckselect-response-option[data-response="EARTH"]').click();
      assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('ebHybridResponse')||'{}').MAGMA),'EARTH','the chosen Response is remembered for Magma');checks++;
      assert.ok(await page.evaluate(()=>document.scrollingElement.scrollHeight<=innerHeight),'deck select still fits with the Response row');checks++;
      await page.waitForFunction(()=>getComputedStyle(document.querySelector('.deckselect-difficulty')).transform==='none'&&getComputedStyle(document.querySelector('.deckselect-difficulty')).opacity==='1',null,{timeout:5000});
      const responseLayout=await page.evaluate(()=>{const rival=document.querySelector('.deckselect-rival').getBoundingClientRect(),actions=document.querySelector('.deckselect-actions').getBoundingClientRect();return{rival:Math.round(rival.bottom),actions:Math.round(actions.top)}});
      assert.ok(responseLayout.rival<=responseLayout.actions,`the Response row never pushes the panel under Start Duel (${JSON.stringify(responseLayout)})`);checks++;
      await shot('13-deck-hybrid-response');
      await page.locator('.deckselect-response-item:first-child .deckselect-response-info').click();await page.locator('.tome-peek .codex-card-name').waitFor({timeout:5000});
      assert.equal((await page.locator('.tome-peek .codex-card-name').textContent()).trim(),'Backdraft','the Response info button shows that card');checks++;
      await page.keyboard.press('Escape');await page.locator('.tome-peek-backdrop').waitFor({state:'detached',timeout:5000});
      await page.locator('.deckselect-change').click();
      await page.waitForFunction(()=>getComputedStyle(document.querySelector('.deckselect-grid-stage')).opacity==='1',null,{timeout:5000});
      await page.evaluate(label=>[...document.querySelectorAll('#setup .codex-dial-option')].find(button=>button.getAttribute('aria-label')===label).click(),primeDeckLabel);await page.waitForTimeout(500);
      const selectedLook=await page.evaluate(()=>({checks:document.querySelectorAll('#setup .deckselect-difficulty .eb-icon[aria-label$="selected"], #setup .deckselect-check').length,glow:getComputedStyle(document.querySelector('.deckselect-option.is-selected')).boxShadow!=='none',buttons:getComputedStyle(document.querySelector('.deckselect-main')).touchAction,overscroll:getComputedStyle(document.documentElement).overscrollBehaviorY}));
      assert.deepEqual(selectedLook,{checks:0,glow:true,buttons:'manipulation',overscroll:'none'},'selection shows only the glowing outline (no ✓), and taps are not delayed or swallowed by page bounce');checks++;
      const gridBox=await page.locator('#setup .codex-grids').boundingBox();
      await swipe(gridBox.x+gridBox.width*.75,gridBox.y+gridBox.height*.5,gridBox.x+gridBox.width*.2,gridBox.y+gridBox.height*.5);
      await page.waitForFunction(()=>!document.querySelector('#setup .codex-grids')?._ebSuppressClick,null,{timeout:5000});
      const selectBox=await page.locator('.deckselect-main').boundingBox();await page.touchscreen.tap(selectBox.x+selectBox.width/2,selectBox.y+selectBox.height/2);
      await page.waitForFunction(()=>document.querySelector('#setup .deckselect-shell')?.classList.contains('is-choosing-difficulty'),null,{timeout:3000});checks++;
      await page.locator('.deckselect-change').click();await page.waitForFunction(()=>getComputedStyle(document.querySelector('.deckselect-grid-stage')).opacity==='1',null,{timeout:5000});
      await page.evaluate(label=>[...document.querySelectorAll('#setup .codex-dial-option')].find(button=>button.getAttribute('aria-label')===label).click(),primeDeckLabel);await page.waitForTimeout(500);
      await page.emulateMedia({reducedMotion:'reduce'});
      const reducedReveal=await page.evaluate(async()=>{const started=performance.now();document.querySelector('.deckselect-main').click();await new Promise(resolve=>requestAnimationFrame(resolve));const style=getComputedStyle(document.querySelector('.deckselect-difficulty')),timing={duration:style.transitionDuration,delay:style.transitionDelay};while(performance.now()-started<3000){await new Promise(resolve=>requestAnimationFrame(resolve));if(Number(getComputedStyle(document.querySelector('.deckselect-difficulty')).opacity)>.99)return{...timing,ms:performance.now()-started}}return{...timing,ms:Infinity}});
      assert.ok(/^0\.15s(, 0\.15s)*$/.test(reducedReveal.duration)&&/^0s(, 0s)*$/.test(reducedReveal.delay),`reduced-motion difficulty reveal is a 150 ms fade with no delay (${JSON.stringify(reducedReveal)})`);checks++;
      assert.ok(reducedReveal.ms<=2000,`reduced-motion difficulty reveal completes (${JSON.stringify(reducedReveal)})`);checks++;
      await page.locator('.deckselect-option[data-difficulty="Hard"]').click();
      await page.locator('.deckselect-main').click();
      await visible('#battle.on', 'duel screen');
      await calmBackground('Duel');
      await navUnlocked();
      // The initiative coin flip starts shortly after the duel opens. Wait for it,
      // skip it all the way to the end (the first skip only reveals the result),
      // then wait until the overlay is hidden so the screenshot shows the board.
      // Wait for the overlay to actually appear first: ebInitiativeShow() runs
      // ~140 ms after the duel opens and un-hides the overlay even if the flip
      // was already finished, so skipping earlier would leave it stuck on screen.
      await page.locator('#initiativeOverlay').waitFor({ state: 'visible', timeout: 5000 });
      const selectedSetup=await page.evaluate(()=>({choice,diff,rival:document.getElementById('initiativeRival')?.textContent||''}));
      assert.equal(selectedSetup.choice,'WATER','deck select starts the chosen Water deck');checks++;
      assert.equal(selectedSetup.diff,'Difficult','Hard maps to the Difficult AI key');checks++;
      assert.match(selectedSetup.rival,/^vs .+/,'coin flip names the rival deck');checks++;
      await page.waitForFunction(() => {
        if (!G.initiative.finished) ebInitiativeSkip();
        return G.initiative.finished;
      }, null, { timeout: 5000, polling: 100 });
      await page.locator('#initiativeOverlay').waitFor({ state: 'hidden', timeout: 5000 });
      checks++;
      await visible('#hand .card, #hand button, #hand > *', 'cards in hand');
      await foundation('duel');
      await shot('06-duel');

      await page.evaluate(()=>exitBattle());
      await visible('#setup.on','deck select after leaving duel');
      await navUnlocked();
      const activeScreens=await page.locator('.screen.on').evaluateAll(screens=>screens.map(screen=>screen.id));
      assert.deepEqual(activeScreens,['setup'],'leaving a duel shows only the deck-select screen');checks++;
      assert.equal((await page.locator('.deckselect-hint').textContent()).trim(),'Shifting Tide selected','quick rematch keeps the selected-deck hint');checks++;
      assert.equal((await page.locator('.deckselect-button-label[aria-hidden="false"]').textContent()).trim(),'START DUEL','returning from a duel preserves quick-rematch difficulty mode');checks++;

      // Phase 3 · 3-1: the Arena field (behind the ?arena=1 toggle) fits one screen and keeps the field-anchor contract.
      await page.evaluate(()=>{EB_Arena.setEnabled(true);startSelectedMatch('FIRE','Normal')});
      await visible('#battle.on.arena','arena duel screen');
      await page.locator('#initiativeOverlay').waitFor({ state: 'visible', timeout: 5000 });
      await page.waitForFunction(() => { if (!G.initiative.finished) ebInitiativeSkip(); return G.initiative.finished; }, null, { timeout: 5000, polling: 100 });
      await page.locator('#initiativeOverlay').waitFor({ state: 'hidden', timeout: 5000 });
      await page.waitForFunction(()=>G.active===0&&!G.pendingResponse,null,{timeout:15000});
      const arena=await page.evaluate(()=>{
        const benders=side=>[...document.querySelectorAll(`[data-eb-anchor="bender"][data-eb-side="${side}"]`)].map(el=>el.id);
        const inView=el=>{const r=el.getBoundingClientRect();return r.width>0&&r.top>=0&&r.bottom<=innerHeight+.5&&r.left>=0&&r.right<=innerWidth+.5};
        const big=el=>{const r=el.getBoundingClientRect();return r.width>=44&&r.height>=44};
        return {scrollY:document.documentElement.scrollHeight-innerHeight,scrollX:document.documentElement.scrollWidth-innerWidth,
          rival:benders('rival'),you:benders('you'),slots:document.querySelectorAll('[data-eb-anchor="slot"]').length,
          slotsInView:[...document.querySelectorAll('[data-eb-anchor="slot"]')].every(inView),
          handInView:inView(document.querySelector('[data-eb-anchor="hand-card"]')),
          plates:[...document.querySelectorAll('.arena-vit')].map(el=>el.getAttribute('aria-label')),
          turn:document.querySelector('.rift-turn-label')?.textContent,
          targets:['.arena-exit','.arena-chronicle','#end','#attack'].every(sel=>big(document.querySelector(sel))),
          classicHidden:['#log','#battle .top','#estats'].every(sel=>getComputedStyle(document.querySelector(sel)).display==='none')};
      });
      assert.ok(arena.scrollY<=0&&arena.scrollX<=0,`arena duel fits the screen with no scroll (${arena.scrollY}px down, ${arena.scrollX}px across)`);checks++;
      assert.deepEqual([arena.rival,arena.you,arena.slots],[['eplate'],['pplate'],6],'Bender anchors move to the plates (one per side) and all six slot anchors remain');checks++;
      assert.ok(arena.slotsInView&&arena.handInView,'every slot and the hand are on screen');checks++;
      assert.deepEqual(arena.plates,['Vitality 30','Vitality 30'],'both Bender plates show Vitality as a number');checks++;
      assert.equal(arena.turn,'Your turn','the Rift says whose turn it is');checks++;
      assert.ok(arena.targets,'arena controls are at least 44×44');checks++;
      assert.ok(arena.classicHidden,'the classic header, stats pills and Event Log leave the arena field');checks++;
      const summon=await page.evaluate(()=>{const c=me().hand.find(card=>card.type==='MANIFESTATION'&&playable(card));if(!c)return null;const i=me().slots.findIndex(slot=>!slot);play(c,i);return {id:c.id,i}});
      if(summon){
        await page.waitForFunction(({id,i})=>!!document.querySelector(`#pslots .slot[data-slot="${i}"] .card[data-id="${id}"]`),summon,{timeout:5000});
        const fieldCard=await page.evaluate(({id,i})=>{const slot=document.querySelector(`#pslots .slot[data-slot="${i}"]`).getBoundingClientRect(),card=document.querySelector(`#pslots .card[data-id="${id}"]`),r=card.getBoundingClientRect();return {inside:r.left>=slot.left-1&&r.right<=slot.right+1&&r.top>=slot.top-8&&r.bottom<=slot.bottom+8,sick:card.classList.contains('is-sick'),stats:!!card.querySelector('.codex-card-stats [aria-label="Attack"]')}},summon);
        assert.deepEqual(fieldCard,{inside:true,sick:true,stats:true},'a summoned card stands inside its pedestal, shows ⚔/♡ and waits (summoning sickness)');checks++;
      }
      // 3-2 · the fanned hand: mini Codex cards; dragging one up onto an empty pedestal summons it.
      const fan=await page.evaluate(()=>{const cards=[...document.querySelectorAll('#hand .arena-card')];const rot=cards.map(c=>parseFloat(getComputedStyle(c).rotate)||0);return {n:cards.length,codex:cards.every(c=>c.classList.contains('codex-card--s')&&!!c.querySelector('.codex-card-medallion--s')),fanned:cards.length<2||rot[0]<0&&rot.at(-1)>0}});
      assert.ok(fan.codex&&fan.fanned,`the hand is a fan of mini Codex cards (${JSON.stringify(fan)})`);checks++;
      await page.evaluate(()=>{G.p[0].e=Math.max(G.p[0].e,3);let free=G.p[0].hand.find(c=>c.type==='MANIFESTATION'&&c.c<=G.p[0].e);if(!free){let unit=G.p[0].deck.find(c=>c.type==='MANIFESTATION'&&c.c<=3);if(unit){G.p[0].deck.splice(G.p[0].deck.indexOf(unit),1);G.p[0].hand.push(unit)}}render()});
      const dragPlan=await page.evaluate(()=>{const hand=document.getElementById('hand'),r=hand.getBoundingClientRect(),cards=[...hand.querySelectorAll('.arena-card')];const i=cards.findIndex(el=>{const c=me().hand.find(h=>h.id==el.dataset.id);return c&&c.type==='MANIFESTATION'&&playable(c)});const slot=[...document.querySelectorAll('#pslots .slot')].find(el=>!el.querySelector('.card'));if(i<0||!slot)return null;const s=slot.getBoundingClientRect();return {id:Number(cards[i].dataset.id),x:r.left+r.width/2+Number(cards[i].dataset.fanX),y:r.top+r.height*.7,tx:s.left+s.width/2,ty:s.top+s.height/2,slot:Number(slot.dataset.slot),w:cards[i].offsetWidth,h:cards[i].offsetHeight}});
      if(dragPlan){
        await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:dragPlan.x,y:dragPlan.y}]});
        for(let step=1;step<=10;step++){const t=step/10;await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:dragPlan.x+(dragPlan.tx-dragPlan.x)*t,y:dragPlan.y+(dragPlan.ty-dragPlan.y)*t}]})}
        const ghost=await page.evaluate(()=>{const g=document.querySelector('.arena-ghost');return g?{w:g.offsetWidth,h:g.offsetHeight,text:!!g.querySelector('.rules,.card-summary,.card-inspect-hint'),hover:!!document.querySelector('#pslots .slot.drop-hover')}:null});
        await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
        assert.ok(ghost&&ghost.w===dragPlan.w&&ghost.h===dragPlan.h&&!ghost.text&&ghost.hover,`the dragged card keeps its mini-card size with no description and lights the pedestal (${JSON.stringify(ghost)})`);checks++;
        await page.waitForFunction(({id,slot})=>me().slots[slot]?.id===id,dragPlan,{timeout:5000});checks++;
        assert.equal(await page.locator('.arena-ghost').count(),0,'the drag ghost is removed after the drop');checks++;
      }
      // 3-3 · attacking: a ready Manifestation aims at targets with a damage preview; tapping a target attacks.
      await page.evaluate(()=>{const unit=me().slots.find(Boolean);if(unit){unit.sick=false;unit.ready=true}render()});
      const aimPlan=await page.evaluate(()=>{const el=document.querySelector('#pslots .arena-card');if(!el)return null;const r=el.getBoundingClientRect();return {x:r.left+r.width/2,y:r.top+r.height/2}});
      if(aimPlan){
        await page.touchscreen.tap(aimPlan.x,aimPlan.y);
        const aimState=await page.evaluate(()=>({aiming:EB_Arena.aiming,targets:[...document.querySelectorAll('[data-arena-target]')].map(el=>({key:el.dataset.arenaTarget,label:el.getAttribute('aria-label')})),modal:!document.getElementById('mw').classList.contains('hide')}));
        assert.ok(aimState.aiming!=null&&aimState.targets.length>0&&aimState.targets.every(t=>/^Attack (the rival Bender( past Guard)?|.+), \d+ damage$/.test(t.label))&&!aimState.modal,`tapping a ready Manifestation aims it with labelled targets and damage, no pop-up (${JSON.stringify(aimState)})`);checks++;
        const rev=await page.evaluate(()=>G.rev);
        const targetBox=await page.locator('[data-arena-target]').last().boundingBox();
        await page.touchscreen.tap(targetBox.x+targetBox.width*.5,targetBox.y+targetBox.height*.4);
        await page.waitForFunction(r=>G.rev>r||!!G.pendingResponse,rev,{timeout:5000});checks++;
        assert.equal(await page.evaluate(()=>EB_Arena.aiming),null,'aiming ends after the attack');checks++;
      }
      // Playtest fixes: status chips carry a word, the live detail is the Codex close-up plus "Right now", no card stays lifted after a touch.
      const live=await page.evaluate(()=>{const unit=me().slots.find(Boolean);if(!unit)return null;unit.marks=[...new Set([...(unit.marks||[]),'Weakened'])];render();const el=document.querySelector(`#pslots .card[data-id="${unit.id}"]`);return {word:[...el.querySelectorAll('.arena-glyph-text')].map(x=>x.textContent),medallion:!!el.querySelector('.codex-card-medallion--s')&&getComputedStyle(el.querySelector('.codex-card-medallion--s')).display!=='none',id:unit.id}});
      if(live){
        assert.ok(live.word.includes('Weak')&&live.medallion,`field cards show their medallion and status chips carry a word (${JSON.stringify(live)})`);checks++;
        await page.evaluate(id=>inspectCard(me().slots.find(c=>c&&c.id===id)),live.id);
        await page.locator('.tome-peek .arena-now').waitFor({timeout:5000});
        const sheet=await page.evaluate(()=>({codex:!!document.querySelector('.tome-peek .codex-card--l'),status:document.querySelector('.tome-peek .arena-now-list')?.textContent||'',oldModal:!document.getElementById('mw').classList.contains('hide')}));
        assert.ok(sheet.codex&&/Weakened/.test(sheet.status)&&!sheet.oldModal,`card detail is the Codex close-up with the live Right now panel (${JSON.stringify(sheet)})`);checks++;
        await page.keyboard.press('Escape');await page.locator('.tome-peek-backdrop').waitFor({state:'detached',timeout:5000});
      }
      const handBox=await page.locator('#hand').boundingBox();
      if(await page.locator('#hand .arena-card').count()){
        await page.touchscreen.tap(handBox.x+handBox.width/2,handBox.y+handBox.height*.6);
        await page.waitForTimeout(250);
        assert.equal(await page.locator('#hand .arena-card.is-focus').count(),0,'no hand card stays lifted after the finger leaves');checks++;
      }
      // 3-4 · choices open in the thumb-zone panel, not the centred pop-up; a Response dims everything but attacker and target and exits only through a game action.
      const resp=await page.evaluate(()=>{const p=me(),e=foe(),mine=p.slots.find(Boolean)||(()=>{const c=[...p.deck,...p.hand].find(x=>x.type==='MANIFESTATION');p.deck=p.deck.filter(x=>x!==c);p.hand=p.hand.filter(x=>x!==c);p.slots[p.slots.findIndex(x=>!x)]=c;return c})(),enemy=e.slots.find(Boolean)||(()=>{const c=e.deck.find(x=>x.type==='MANIFESTATION');e.deck=e.deck.filter(x=>x!==c);e.slots[e.slots.findIndex(x=>!x)]=c;return c})();p.initiationToken=true;mine.h=Math.max(1,mine.max-1);render();window.__smokeResp=null;ebChooseHumanResponse(enemy,mine,'AFTER',r=>{window.__smokeResp=r});return {open:EB_Arena.panelOpen,legacy:!document.getElementById('mw').classList.contains('hide'),cancel:[...document.querySelectorAll('#arenaPanel .arena-panel-btn')].some(b=>/^cancel$/i.test(b.textContent)),pass:[...document.querySelectorAll('#arenaPanel .arena-panel-btn')].some(b=>b.textContent==='PASS'),dim:document.getElementById('battle').classList.contains('is-responding'),threat:!!document.querySelector('#eslots .is-threat')&&!!document.querySelector('#pslots .is-threatened'),focus:document.activeElement?.classList.contains('arena-panel-btn')}});
      if(resp){
        assert.deepEqual(resp,{open:true,legacy:false,cancel:false,pass:true,dim:true,threat:true,focus:true},`the Response Window opens in the arena panel with the held breath (${JSON.stringify(resp)})`);checks++;
        await shot('06d-duel-response');
        await page.keyboard.press('Escape');
        assert.equal(await page.evaluate(()=>EB_Arena.panelOpen),true,'Escape cannot dismiss a rules-critical Response');checks++;
        await page.locator('#arenaPanel .arena-panel-btn',{hasText:'PASS'}).click();
        await page.waitForFunction(()=>!!window.__smokeResp&&!EB_Arena.panelOpen&&!document.getElementById('battle').classList.contains('is-responding'),null,{timeout:5000});checks++;
      }
      // 3-5 · combo language: a payoff card in hand is marked, its set-up hums, selecting it draws the thread; unspent Essence on the rival's turn shows as Reserve.
      const comboState=await page.evaluate(()=>{const p=me(),e=foe();let en=e.slots.find(Boolean);if(!en){en=e.deck.find(x=>x.type==='MANIFESTATION');e.deck=e.deck.filter(x=>x!==en);e.slots[e.slots.findIndex(x=>!x)]=en}en.marks=[...new Set([...(en.marks||[]),'Burning'])];let t=p.hand.find(x=>x.n==='Flame Burst');if(!t){t=p.deck.find(x=>x.n==='Flame Burst');if(t){p.deck=p.deck.filter(x=>x!==t);p.hand.push(t)}}p.e=Math.max(p.e,2);render();if(t)selectHandCard(t);return {has:!!t,badge:!!document.querySelector(`#hand .arena-card.is-combo[data-id="${t?.id}"] .arena-combo-badge`),primed:!!document.querySelector(`#eslots .card[data-id="${en.id}"].is-primed`)}});
      if(comboState.has){
        await page.waitForTimeout(250);
        assert.ok(comboState.badge&&comboState.primed&&await page.evaluate(()=>document.querySelector('.arena-thread')?.classList.contains('is-on')&&document.querySelectorAll('.arena-thread path').length>0),`a payoff card shows Combo, its Burning target hums and the thread is drawn (${JSON.stringify(comboState)})`);checks++;
      }
      const reserve=await page.evaluate(()=>{const p=me();p.e=3;G.active=1;render();const shown=document.getElementById('pplate').classList.contains('has-reserve')&&/Reserve/.test(document.querySelector('#pplate .arena-essence').getAttribute('aria-label'));G.active=0;render();return shown&&!document.getElementById('pplate').classList.contains('has-reserve')});
      assert.ok(reserve,'unspent Essence shows as Reserve only during the rival turn');checks++;
      await page.evaluate(()=>{selectedCardId=null;renderSelectionOnly()});
      await shot('06b-duel-arena');
      await page.locator('.arena-chronicle').click();
      await page.locator('.tome-peek .arena-chronicle-list').waitFor({timeout:5000});
      const chronicle=await page.evaluate(()=>({items:document.querySelectorAll('.tome-peek .arena-chronicle-list li').length,logs:G.logs.length}));
      assert.equal(chronicle.items,chronicle.logs,'the Chronicle lists every log line');checks++;
      await shot('06c-duel-chronicle');
      await page.keyboard.press('Escape');await page.locator('.tome-peek-backdrop').waitFor({state:'detached',timeout:5000});
      assert.ok(await page.evaluate(()=>document.activeElement?.classList.contains('arena-chronicle')),'closing the Chronicle returns focus to its button');checks++;
      await page.evaluate(()=>{exitBattle();EB_Arena.setEnabled(false)});
      await visible('#setup.on','deck select after leaving the arena duel');
      assert.equal(await page.evaluate(()=>document.querySelectorAll('[data-eb-anchor="bender"]').length===2&&!!document.querySelector('#you[data-eb-anchor="bender"]')&&!document.getElementById('battle').classList.contains('arena')),true,'turning the arena off restores the classic anchors');checks++;

      assert.deepEqual(errors, [], `${vp.name}: page errors:\n${errors.join('\n')}`); checks++;
      console.log(`${vp.name}: ${blockedStyles.size} distinct inline styles blocked by CSP (ceiling ${MAX_BLOCKED_INLINE_STYLES})`);
      assert.ok(blockedStyles.size <= MAX_BLOCKED_INLINE_STYLES,
        `${vp.name}: ${blockedStyles.size} inline styles blocked by CSP, above the ceiling of ${MAX_BLOCKED_INLINE_STYLES}`); checks++;
      await context.close();
    }
  } finally {
    await browser.close();
    server.close();
  }
  console.log(`Browser smoke test: ${checks} checks passed; screenshots in test-results/screenshots/`);
}

run().catch(err => {
  console.error(err);
  // On GitHub Actions, surface the failure as an annotation so it can be read without downloading the log.
  if (process.env.GITHUB_ACTIONS) console.log(`::error title=browser-smoke::${(String(err && (err.message || err))+' @ '+String(err&&err.stack||'').split('\n').filter(line=>line.includes('smoke.cjs')).slice(0,2).join(' | ')).replace(/%/g,'%25').replace(/\r?\n/g,'%0A').slice(0,1800)}`);
  process.exit(1);
});
