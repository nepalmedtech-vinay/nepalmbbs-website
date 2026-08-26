import { chromium } from 'playwright';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = '/home/user/nepalmedtech-vinay/nepalmbbs-website';
const MIME = { '.html':'text/html', '.js':'text/javascript', '.json':'application/json', '.css':'text/css',
               '.png':'image/png', '.xml':'application/xml', '.txt':'text/plain' };

// Serve the repo locally. Supabase + fonts + unsplash are blocked by egress here,
// so those requests will fail — that is expected and is what we assert around.
const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]);
  if (p.endsWith('/')) p += 'index.html';
  const file = path.join(ROOT, p);
  if (!file.startsWith(ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
    res.writeHead(404); return res.end('nf');
  }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream' });
  res.end(fs.readFileSync(file));
});
await new Promise(r => server.listen(8099, r));

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
const page = await ctx.newPage();

const errors = [];
page.on('pageerror', e => errors.push('PAGEERROR: ' + e.message));
page.on('console', m => { if (m.type() === 'error') {
  const t = m.text();
  // network failures to blocked third parties are environmental, not code faults
  if (!/ERR_|Failed to load resource|net::/i.test(t)) errors.push('CONSOLE: ' + t);
}});

// Stub Supabase so we can test auth logic deterministically without the network.
await page.route('**/rest/v1/**', route => {
  const u = route.request().url();
  if (u.includes('admin_password')) {
    return route.fulfill({ status: 200, contentType: 'application/json',
      body: JSON.stringify([{ value: 'correct-horse-battery' }]) });
  }
  return route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
});

const results = [];
const check = (name, pass, detail = '') => { results.push({ name, pass, detail }); };

await page.goto('http://localhost:8099/', { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(2500);

// --- T1: page renders, no JS errors
check('Page loads with no JS errors', errors.length === 0, errors.slice(0, 4).join(' | '));
check('Hero rendered', await page.locator('section.hero').count() > 0);
check('Navbar rendered', await page.locator('#navbar').count() > 0);

// --- T2: core navigation still works (regression guard)
await page.evaluate(() => switchTab('faq'));
await page.waitForTimeout(400);
check('switchTab("faq") activates pane', await page.locator('#pane-faq.on').count() === 1);
await page.evaluate(() => switchTab('counsel'));
await page.waitForTimeout(400);
check('switchTab("counsel") activates pane', await page.locator('#pane-counsel.on').count() === 1);

// --- T3: bilingual still works
await page.evaluate(() => setLang('hi'));
await page.waitForTimeout(300);
const hi = await page.evaluate(() => document.querySelector('.nav-cta')?.textContent || '');
check('setLang("hi") switches copy', /निःशुल्क|काउंसलिंग/.test(hi), `nav-cta="${hi}"`);
await page.evaluate(() => setLang('en'));

// --- T4: THE BACKDOOR IS GONE
const oldPass = await page.evaluate(async () => {
  document.getElementById('admin-pass').value = 'NepalMBBS@2025';
  await doAdminLogin();
  return {
    loggedIn: document.getElementById('admin-main').style.display === 'block',
    err: document.getElementById('admin-err').textContent
  };
});
check('Old hardcoded password REJECTED', oldPass.loggedIn === false, JSON.stringify(oldPass));

// --- T5: the real stored password still works (no lockout)
const realPass = await page.evaluate(async () => {
  document.getElementById('admin-pass').value = 'correct-horse-battery';
  await doAdminLogin();
  return document.getElementById('admin-main').style.display === 'block';
});
check('Correct stored password ACCEPTED', realPass === true);

// --- T6: nothing secret cached locally
const ls = await page.evaluate(() => Object.keys(localStorage));
check('No password written to localStorage', !ls.includes('nmb_admin_pass'), 'keys=' + JSON.stringify(ls));

// --- T7: hashed password path
const hashOk = await page.evaluate(async () => {
  const h = await sha256Hex('hunter2hunter2');
  return h === 'e2ee2f70ad6ff02a3d7be0d3e6b6d8d1e2c9a51f24bb2ba64f0b7e8b1d0e9c6f' ? 'ref' : h;
});
check('sha256Hex produces 64-hex digest', /^[0-9a-f]{64}$/.test(hashOk), hashOk);

// --- T8: GA accepts only a valid Measurement ID
const ga = await page.evaluate(() => ({
  rejectsScript: loadGA('<script>alert(1)</script>') === false,
  rejectsJunk: loadGA('UA-12345-1') === false,
  acceptsId: loadGA('G-ABC1234567') === true,
}));
check('GA rejects injected HTML', ga.rejectsScript);
check('GA rejects non-GA4 id', ga.rejectsJunk);
check('GA accepts valid G- id', ga.acceptsId);
const gtagTag = await page.evaluate(() =>
  !!document.querySelector('script[src*="googletagmanager.com/gtag/js?id=G-ABC1234567"]'));
check('GA injects a real gtag <script> tag', gtagTag);

// --- T9: lead form validation intact
const lead = await page.evaluate(async () => {
  document.getElementById('h-name').value = 'Test Student';
  document.getElementById('h-phone').value = '123';   // invalid
  await submitLead('hero');
  return document.getElementById('toast').textContent;
});
check('Lead form rejects bad phone', /valid 10-digit/i.test(lead), lead);

// --- T10: static assets resolve
for (const u of ['/manifest.json', '/robots.txt', '/sitemap.xml',
                 '/assets/brand/icon-192.png', '/assets/brand/icon-maskable-512.png']) {
  const r = await page.request.get('http://localhost:8099' + u);
  check(`${u} → 200`, r.status() === 200, 'status ' + r.status());
}

// --- T11: sub-apps untouched
for (const u of ['/wrc-tracker/index.html', '/cmc-tracker/index.html']) {
  const r = await page.request.get('http://localhost:8099' + u);
  check(`${u} still serves`, r.status() === 200);
}

// --- T12: no service worker registered by the site
const swCount = await page.evaluate(async () =>
  (await navigator.serviceWorker.getRegistrations()).length);
check('Site registers no service worker', swCount === 0, 'registrations=' + swCount);

console.log('\n══════ PHASE 0 QA ══════');
let fail = 0;
for (const r of results) {
  console.log(`${r.pass ? '✅' : '❌'}  ${r.name}${r.pass || !r.detail ? '' : '\n      → ' + r.detail}`);
  if (!r.pass) fail++;
}
console.log(`\n${results.length - fail}/${results.length} passed`);

await page.screenshot({ path: '/tmp/claude-0/-home-user-leadflow-ai/c458c096-29e3-5080-8937-2decb648b144/scratchpad/phase0-mobile.png', fullPage: false });
await browser.close();
server.close();
process.exit(fail ? 1 : 0);
