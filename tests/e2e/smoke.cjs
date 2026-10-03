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
      const page = await context.newPage();
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
      const homeLayout=await page.evaluate(()=>({vertical:document.scrollingElement.scrollHeight<=innerHeight,horizontal:document.scrollingElement.scrollWidth<=innerWidth,logo:document.querySelector('.main-logo')?.naturalWidth||0}));
      assert.deepEqual(homeLayout,{vertical:true,horizontal:true,logo:720},'main menu fits and the cropped logo loads');checks++;
      const whatsNewBox=await page.locator('#whatsNewButton').boundingBox();
      assert.ok(whatsNewBox&&whatsNewBox.x>=0&&whatsNewBox.y>=0&&whatsNewBox.x+whatsNewBox.width<=vp.width&&whatsNewBox.y+whatsNewBox.height<=vp.height,'What\'s New stays inside the top-right viewport');checks++;
      await page.waitForTimeout(500);
      assert.equal(await page.evaluate(()=>getComputedStyle(document.getElementById('home'),'::before').opacity),'1','full menu art holds through 0.5 seconds');checks++;
      const homeArt=await page.evaluate(()=>getComputedStyle(document.getElementById('home'),'::before').backgroundImage);
      assert.match(homeArt,/image-1-de14f0ce02bf\.png/, 'main menu uses the plain environment artwork');checks++;
      const stamp = await page.locator('#buildStamp').textContent();
      assert.match(stamp, /Alpha \d+\.\d+\.\d+/, 'main menu shows the release version'); checks++;
      await foundation('home');
      await shot('01-home');
      assert.equal(await page.locator('#whatsNewButton').getAttribute('aria-label'),"What's New, 1 unread update",'What\'s New announces its unread update');checks++;
      assert.equal(await page.locator('#whatsNewButton').evaluate(button=>button.classList.contains('has-badge')),true,'What\'s New dot is visible');checks++;
      await page.locator('#whatsNewButton').click();
      await visible('.whats-new-sheet','What\'s New sheet');
      assert.equal(await page.locator('.whats-new-list li').count(),3,'What\'s New renders release notes');checks++;
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
      assert.equal(await reducedPage.evaluate(()=>getComputedStyle(document.getElementById('home'),'::before').opacity),'0','reduced motion starts with the calm menu');checks++;await reducedPage.close();

      await page.locator('#buildStamp').dispatchEvent('pointerdown',{pointerId:1,pointerType:'touch'});await page.waitForTimeout(650);await page.locator('#buildStamp').dispatchEvent('pointerup',{pointerId:1,pointerType:'touch'});
      await visible('#devcheck.on','System Check after version long-press');await navigate(()=>go('home'),'#home.on');
      for(let tap=0;tap<5;tap++)await page.locator('#buildStamp').click();await visible('#devcheck.on','System Check after five version taps');await navigate(()=>go('home'),'#home.on');
      await page.locator('.home-secondary .ghost').first().click();await visible('#friends.on','Play with Friends');await navUnlocked();
      await visible('#friends #mpConnectOnline','Friends connect control');assert.ok(await page.locator('#friends #mpRoomCode').count(),'Friends room-code control is present');checks++;
      await shot('14-friends');await page.locator('#friends .friends-header button').click();await visible('#home.on','home after Friends');await navUnlocked();

      await navigate(() => goTrials(), '#trials.on');
      await foundation('trials');
      await shot('02-trials');

      await navigate(() => goCodex(), '#codex.on');
      await visible('.codex-card-grid .codex-card', 'codex cards');
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
      await page.locator('#codex .codex-dial-option').nth(2).evaluate(button=>button.click());
      const codexTapSettle=await settleStyles('#codex');
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
      await page.locator('.codex-zoom-close').click();await page.locator('.codex-zoom').waitFor({state:'detached',timeout:5000});checks++;
      const noHorizontalScroll=await page.evaluate(()=>document.documentElement.scrollWidth<=document.documentElement.clientWidth);
      assert.equal(noHorizontalScroll,true,'Codex causes no horizontal page scroll');checks++;

      await navigate(() => go('home'), '#home.on');
      await page.evaluate(() => showRules());
      await visible('#mw:not(.hide)', 'how to play sheet');
      await foundation('how to play');
      await shot('04-how-to-play');
      await page.evaluate(() => hideModal());
      await page.locator('#mw').waitFor({ state: 'hidden', timeout: 5000 });

      await navUnlocked();await page.locator('.home-play').click();await visible('#setup.on','deck select from Play');await navUnlocked();
      await visible('#setup .deckselect-shell .codex-card','deck select cards');
      await calmBackground('Deck select');
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
      await page.locator('.deckselect-main').click();
      await visible('.deckselect-difficulty','difficulty panel');
      assert.equal(await page.locator('.deckselect-difficulty').getAttribute('aria-hidden'),'false','difficulty choices are exposed to assistive technology');checks++;
      await page.waitForTimeout(50);
      assert.ok(Number(await page.locator('.deckselect-difficulty').evaluate(panel=>getComputedStyle(panel).opacity))<.1,'difficulty panel stays hidden while cards begin leaving');checks++;
      assert.equal(await page.locator('.deckselect-difficulty').evaluate(panel=>getComputedStyle(panel).pointerEvents),'none','hidden difficulty controls cannot intercept taps during the reveal delay');checks++;
      await page.waitForTimeout(650);
      assert.equal(await page.locator('.deckselect-difficulty').evaluate(panel=>getComputedStyle(panel).opacity),'1','difficulty panel finishes its gentle reveal');checks++;
      assert.equal(await page.locator('.deckselect-difficulty').evaluate(panel=>getComputedStyle(panel).pointerEvents),'auto','difficulty controls enable after the reveal begins');checks++;
      assert.equal(await page.locator('.deckselect-grid-stage').evaluate(stage=>getComputedStyle(stage).opacity),'0','card grid has stepped aside before difficulty settles');checks++;
      assert.equal(await page.evaluate(()=>document.activeElement===document.querySelector('.deckselect-difficulty h2')),true,'focus moves to the arrived difficulty heading');checks++;
      assert.equal(await page.evaluate(()=>scrollY),scrollBeforeSelect,'difficulty focus does not move the page');checks++;
      assert.ok(await page.locator('#setup .codex-grid-wrap').evaluateAll(grids=>grids.every(grid=>grid.inert)),'card grids are inert while choosing difficulty');checks++;
      assert.equal((await page.locator('.deckselect-button-label[aria-hidden="false"]').textContent()).trim(),'START DUEL','main button changes to Start Duel');checks++;
      assert.ok(await page.evaluate(()=>document.scrollingElement.scrollHeight<=innerHeight),'deck select does not scroll after Select');checks++;
      await shot('12-deck-difficulty');
      await page.locator('.deckselect-change').click();
      await page.waitForTimeout(600);
      assert.equal(await page.locator('.deckselect-grid-stage').evaluate(stage=>getComputedStyle(stage).opacity),'1','Change deck restores cards after the panel leaves');checks++;
      await page.emulateMedia({reducedMotion:'reduce'});
      await page.locator('.deckselect-main').click();
      await page.waitForTimeout(200);
      assert.ok(Number(await page.locator('.deckselect-difficulty').evaluate(panel=>getComputedStyle(panel).opacity))>.99,'reduced-motion difficulty reveal finishes within 200 ms');checks++;
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

run().catch(err => { console.error(err); process.exit(1); });
