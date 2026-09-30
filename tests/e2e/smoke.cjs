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
// Known issue: the CSP (style-src 'self') blocks the game's inline style attributes.
// This ceiling stops it getting worse; UI Phase 1 must bring it to 0.
const MAX_BLOCKED_INLINE_STYLES = Number(process.env.EB_MAX_BLOCKED_INLINE_STYLES ?? 6);
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

      await page.goto(base, { waitUntil: 'load' });
      await visible('#home.on', 'home screen');
      const stamp = await page.locator('#buildStamp').textContent();
      assert.match(stamp, /Alpha \d+\.\d+\.\d+/, 'main menu shows the release version'); checks++;
      await shot('01-home');

      await page.evaluate(() => goTrials());
      await visible('#trials.on', 'trials screen');
      await shot('02-trials');

      await page.evaluate(() => goCodex());
      await visible('#codex.on', 'codex screen');
      await visible('#codexList button', 'codex cards');
      await shot('03-codex');

      await page.evaluate(() => { go('home'); showRules(); });
      await visible('#mw:not(.hide)', 'how to play sheet');
      await shot('04-how-to-play');
      await page.evaluate(() => hideModal());

      await page.evaluate(() => go('setup'));
      await visible('#setup.on', 'deck setup');
      await page.locator('#decks button').first().click();
      await page.locator('#diffs button').first().click();
      await shot('05-setup');
      await page.locator('#start').click();
      await visible('#battle.on', 'duel screen');
      // Skip the initiative coin flip if it is showing.
      const overlay = page.locator('#initiativeOverlay:not(.hide)');
      if (await overlay.count()) await overlay.click();
      await visible('#hand .card, #hand button, #hand > *', 'cards in hand');
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
