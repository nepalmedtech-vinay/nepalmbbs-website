// Verifies /colleges/compare: the picker selects, the table renders the same
// record fields published on each college's own page, the URL stays
// shareable, the 4-college cap holds, and nothing overflows at 390px.
import { chromium } from 'playwright';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

const REPO = path.resolve(import.meta.dirname, '..');
const DIST = path.join(REPO, 'dist');
const MIME = { '.html':'text/html','.js':'text/javascript','.json':'application/json',
  '.css':'text/css','.png':'image/png','.svg':'image/svg+xml','.woff2':'font/woff2',
  '.xml':'application/xml','.txt':'text/plain' };

const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]);
  let f = path.join(DIST, p);
  if (fs.existsSync(f) && fs.statSync(f).isDirectory()) f = path.join(f, 'index.html');
  else if (!fs.existsSync(f) && fs.existsSync(f + '/index.html')) f = f + '/index.html';
  if (!f.startsWith(DIST) || !fs.existsSync(f)) { res.writeHead(404); return res.end('nf'); }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream' });
  res.end(fs.readFileSync(f));
});
await new Promise(r => server.listen(0, r));
const PORT = server.address().port;

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
await ctx.route('**/rest/v1/**', r => r.fulfill({ status: 200, contentType: 'application/json', body: '[]' }));
const page = await ctx.newPage();

const results = [];
const check = (name, pass, detail = '') => results.push({ name, pass, detail });

const pageErrors = [];
page.on('pageerror', e => pageErrors.push(e.message));

await page.goto(`http://localhost:${PORT}/colleges/compare`, { waitUntil: 'load' });
await page.waitForTimeout(400);

check('page loads with no uncaught JS errors', pageErrors.length === 0, pageErrors.join(' | '));

const emptyText = await page.locator('#cmp-result').innerText();
check('shows an empty-state prompt before any selection', /Pick 2 or more/i.test(emptyText), emptyText);

const boxes = page.locator('.cmp-check');
const total = await boxes.count();
check('renders one checkbox per committed college (27)', total === 27, String(total));

await boxes.nth(0).check();
await boxes.nth(1).check();
await boxes.nth(2).check();
await page.waitForTimeout(200);

const headerNames = await page.locator('#cmp-result thead th a').allTextContents();
check('table shows one column per selected college', headerNames.length === 3, String(headerNames.length));

const rowLabels = await page.locator('#cmp-result tbody th').allTextContents();
const expectRows = ['Ownership','Location','University affiliation','Established',
  'Foreign-quota seats','Course duration','Admission route','Tuition fee','Official website'];
check('rows match the fields published on each college\'s own page',
  JSON.stringify(rowLabels) === JSON.stringify(expectRows), rowLabels.join(', '));

const feeCells = await page.locator('#cmp-result tr', { hasText: 'Tuition fee' }).locator('td').allTextContents();
check('tuition is never shown as a number, only "ask us"', feeCells.every(t => /ask us/i.test(t)), feeCells.join(' | '));

check('URL becomes shareable (?c=slug,slug,slug)',
  /\?c=[^&]+(,|%2C)[^&]+(,|%2C)[^&]+/i.test(page.url()), page.url());

const countLabel = (await page.locator('#cmp-count').textContent() || '').trim();
check('selection counter reflects 3 selected', countLabel.startsWith('3 selected'), countLabel);

await boxes.nth(3).check();
await page.waitForTimeout(150);
const disabledAtCap = await page.locator('.cmp-check:disabled').count();
check('caps at 4: the other 23 checkboxes disable', disabledAtCap === 23, String(disabledAtCap));

await boxes.nth(0).uncheck();
await page.waitForTimeout(150);
const disabledAfterUncheck = await page.locator('.cmp-check:disabled').count();
check('un-checking one re-enables the rest', disabledAfterUncheck === 0, String(disabledAfterUncheck));

// Sharing a link: load fresh with ?c=, confirm it pre-selects rather than
// requiring the picker to be used again.
const slugA = await boxes.nth(1).getAttribute('value');
const slugB = await boxes.nth(2).getAttribute('value');
await page.goto(`http://localhost:${PORT}/colleges/compare?c=${slugA},${slugB},not-a-real-slug`, { waitUntil: 'load' });
await page.waitForTimeout(300);
const preselected = await page.locator('.cmp-check:checked').count();
check('a shared ?c= link pre-selects its colleges (bad slugs ignored, not fatal)', preselected === 2, String(preselected));

// The dispatcher in actions.js only calls names in tools/action-allowlist.json;
// this page must not introduce a data-act name outside it.
const allow = JSON.parse(fs.readFileSync(path.join(REPO, 'tools/action-allowlist.json'), 'utf8'));
const badActs = await page.evaluate((allow) => {
  const bad = [];
  document.querySelectorAll('[data-act]').forEach(el => {
    try {
      const calls = JSON.parse(el.getAttribute('data-do') || '[]');
      calls.forEach(c => { if (!allow.includes(c[0])) bad.push(c[0]); });
    } catch (e) {}
  });
  return bad;
}, allow);
check('no data-act handler name outside tools/action-allowlist.json', badActs.length === 0, badActs.join(','));

// Same methodology as tests/audit.mjs: the table is allowed to scroll inside
// its own container, but the page itself must not scroll sideways.
await page.setViewportSize({ width: 390, height: 844 });
await page.waitForTimeout(300);
const overflow = await page.evaluate(() => {
  const d = document.documentElement;
  return d.scrollWidth - d.clientWidth;
});
check('no page-level horizontal overflow at 390px', overflow <= 1, `${overflow}px`);

console.log('\n══════ COLLEGE COMPARE VERIFICATION ══════');
let fail = 0;
for (const r of results) {
  if (!r.pass) fail++;
  console.log(`${r.pass ? '✅' : '❌'}  ${r.name}${r.pass || !r.detail ? '' : '\n      → ' + r.detail}`);
}
console.log(`\n${results.length - fail}/${results.length} passed`);

await browser.close();
server.close();
process.exit(fail ? 1 : 0);
