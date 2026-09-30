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
        isMobile: true, hasTouch: true, reducedMotion: 'reduce'
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

      await page.goto(base, { waitUntil: 'load' });
      await visible('#home.on', 'home screen');
      const stamp = await page.locator('#buildStamp').textContent();
      assert.match(stamp, /Alpha \d+\.\d+\.\d+/, 'main menu shows the release version'); checks++;
      await foundation('home');
      await shot('01-home');

      await navigate(() => goTrials(), '#trials.on');
      await foundation('trials');
      await shot('02-trials');

      await navigate(() => goCodex(), '#codex.on');
      await visible('.codex-card-grid .codex-card', 'codex cards');
      await foundation('codex');
      await shot('03-codex');
      assert.equal(await page.locator('.codex-dial-option').count(),9,'Codex shows all nine deck medallions');checks++;
      assert.equal(await page.locator('#codex').getAttribute('data-current-deck'),'FIRE','Codex starts on Fire');checks++;
      const dialBox=await page.locator('.codex-dial').boundingBox();
      await swipe(dialBox.x+dialBox.width/2+40,dialBox.y+dialBox.height/2,dialBox.x+dialBox.width/2-40,dialBox.y+dialBox.height/2);
      await page.waitForTimeout(500);assert.equal(await page.locator('#codex').getAttribute('data-current-deck'),'WATER','dial swipe selects Water');checks++;
      const waterGrid=page.locator('.codex-grid-wrap[data-deck="WATER"]');
      assert.equal(await waterGrid.locator('.codex-card').count(),5,'Water grid has five cards');checks++;
      assert.equal(await waterGrid.getAttribute('aria-hidden'),'false','Water grid is active');checks++;
      assert.ok(await waterGrid.getByText('Mist Adept',{exact:true}).count(),'Water grid contains Mist Adept');checks++;
      await shot('07-codex-dial');
      await waterGrid.locator('.codex-card').first().click();
      await visible('.codex-zoom.is-open','Codex zoom');
      assert.equal(await page.locator('.codex-zoom-slide[aria-hidden="false"] .codex-card-name').textContent(),'Mist Adept','tapped card opens active in zoom');checks++;
      const zoomBox=await page.locator('.codex-zoom-stage').boundingBox();
      await swipe(zoomBox.x+zoomBox.width*.8,zoomBox.y+180,zoomBox.x+zoomBox.width*.2,zoomBox.y+180);
      await page.waitForFunction(()=>document.querySelector('.codex-zoom-slide[aria-hidden="false"] .codex-card-name')?.textContent==='Tide Warden');checks++;
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

      await navigate(() => go('setup'), '#setup.on');
      await page.locator('#decks button').first().click();
      await page.locator('#diffs button').first().click();
      await foundation('setup');
      await shot('05-setup');
      await page.locator('#start').click();
      await visible('#battle.on', 'duel screen');
      await navUnlocked();
      // The initiative coin flip starts shortly after the duel opens. Wait for it,
      // skip it all the way to the end (the first skip only reveals the result),
      // then wait until the overlay is hidden so the screenshot shows the board.
      // Wait for the overlay to actually appear first: ebInitiativeShow() runs
      // ~140 ms after the duel opens and un-hides the overlay even if the flip
      // was already finished, so skipping earlier would leave it stuck on screen.
      await page.locator('#initiativeOverlay').waitFor({ state: 'visible', timeout: 5000 });
      await page.waitForFunction(() => {
        if (!G.initiative.finished) ebInitiativeSkip();
        return G.initiative.finished;
      }, null, { timeout: 5000, polling: 100 });
      await page.locator('#initiativeOverlay').waitFor({ state: 'hidden', timeout: 5000 });
      checks++;
      await visible('#hand .card, #hand button, #hand > *', 'cards in hand');
      await foundation('duel');
      await shot('06-duel');

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
