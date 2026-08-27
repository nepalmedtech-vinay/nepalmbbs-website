// Phase 2 verification: runs against the built dist/ output.
//
// The single-page regression suite still guards behaviour. This one guards the
// things that only multi-page can get wrong: a page shipping the wrong
// canonical, a route 404ing, the shared chrome missing from one page, or the
// tracker apps being altered by the move into public/.
import { chromium } from 'playwright';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execSync } from 'node:child_process';

const REPO = path.resolve(import.meta.dirname, '..');
const DIST = path.join(REPO, 'dist');
const MIME = { '.html':'text/html','.js':'text/javascript','.json':'application/json',
               '.css':'text/css','.png':'image/png','.xml':'application/xml','.txt':'text/plain' };

const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]);
  let f = path.join(DIST, p);
  if (fs.existsSync(f) && fs.statSync(f).isDirectory()) f = path.join(f, 'index.html');
  else if (!fs.existsSync(f) && fs.existsSync(f + '/index.html')) f = f + '/index.html';
  if (!f.startsWith(DIST) || !fs.existsSync(f)) { res.writeHead(404); return res.end('nf'); }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream' });
  res.end(fs.readFileSync(f));
});
await new Promise(r => server.listen(8103, r));

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
await ctx.route('**/rest/v1/**', r => r.fulfill({ status: 200, contentType: 'application/json', body: '[]' }));
const page = await ctx.newPage();

const results = [];
const check = (name, pass, detail = '') => results.push({ name, pass, detail });

const ROUTES = ['/', '/admission-process', '/colleges', '/why-nepal', '/neet-calculator',
                '/guidelines', '/videos', '/faq', '/life-in-nepal', '/counseling'];

// ── every route renders, with the right head and the shared chrome ────────
const titles = new Map(), descs = new Map();
for (const route of ROUTES) {
  const errors = [];
  const onErr = e => errors.push(e.message);
  page.on('pageerror', onErr);
  const resp = await page.goto('http://localhost:8103' + route, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(900);
  page.off('pageerror', onErr);

  check(`${route} → 200`, resp.status() === 200, 'status ' + resp.status());
  check(`${route} no JS errors`, errors.length === 0, errors.slice(0, 2).join(' | '));

  const head = await page.evaluate(() => ({
    title: document.title,
    desc: document.querySelector('meta[name=description]')?.content || '',
    canonical: document.querySelector('link[rel=canonical]')?.href || '',
    og: document.querySelector('meta[property="og:url"]')?.content || '',
    h1: document.querySelectorAll('h1').length,
  }));
  const expected = 'https://nepalmbbs.in' + (route === '/' ? '/' : route);
  check(`${route} canonical is self-referential`, head.canonical === expected,
        `got ${head.canonical}`);
  check(`${route} og:url matches canonical`, head.og === head.canonical, head.og);
  check(`${route} has title + description`, head.title.length > 20 && head.desc.length > 50,
        `title ${head.title.length}, desc ${head.desc.length}`);
  titles.set(route, head.title);
  descs.set(route, head.desc);

  const chrome = await page.evaluate(() => ({
    nav: !!document.getElementById('navbar'),
    menu: !!document.getElementById('mob-menu'),
    footer: !!document.querySelector('footer'),
    chat: !!document.getElementById('chat-wrap'),
    wa: !!document.getElementById('wa-float-wrap'),
    admin: !!document.getElementById('admin-overlay'),
    toast: !!document.getElementById('toast'),
  }));
  const missing = Object.entries(chrome).filter(([, v]) => !v).map(([k]) => k);
  check(`${route} shared chrome present`, missing.length === 0, 'missing: ' + missing.join(','));

  const globals = await page.evaluate(() =>
    ['switchTab','setLang','submitLead','toggleChat','openAdmin','toast','enquireCollege']
      .filter(n => typeof window[n] !== 'function'));
  check(`${route} JS globals intact`, globals.length === 0, 'missing: ' + globals.join(','));
}

// ── titles and descriptions must be unique (duplicate meta = wasted pages) ─
check('All page titles unique', new Set(titles.values()).size === ROUTES.length,
      `${new Set(titles.values()).size}/${ROUTES.length}`);
check('All descriptions unique', new Set(descs.values()).size === ROUTES.length,
      `${new Set(descs.values()).size}/${ROUTES.length}`);

// ── nav is real links, not onclick ────────────────────────────────────────
await page.goto('http://localhost:8103/', { waitUntil: 'domcontentloaded' });
const navHrefs = await page.evaluate(() =>
  [...document.querySelectorAll('#navbar .nl-btn')].map(a => a.getAttribute('href')));
check('Navbar uses real hrefs', navHrefs.length === 5 && navHrefs.every(h => h && h.startsWith('/')),
      JSON.stringify(navHrefs));
const cardHrefs = await page.evaluate(() =>
  [...document.querySelectorAll('.tab-card')].map(a => a.tagName + ':' + a.getAttribute('href')));
check('Section cards are crawlable anchors', cardHrefs.length === 9 && cardHrefs.every(h => h.startsWith('A:/')),
      JSON.stringify(cardHrefs.slice(0, 3)));

// ── switchTab from a page that lacks the pane must navigate, not no-op ────
await page.goto('http://localhost:8103/faq', { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(600);
await page.evaluate(() => switchTab('counsel'));
await page.waitForURL('**/counseling', { waitUntil: 'load', timeout: 8000 }).catch(() => {});
check('switchTab() navigates across pages', page.url().endsWith('/counseling'), page.url());
await page.waitForFunction(() => typeof window.setLang === 'function', null, { timeout: 8000 });

// ── bilingual still works on a sub-page ──────────────────────────────────
const hi = await page.evaluate(() => { setLang('hi'); return document.querySelector('.nav-cta')?.textContent || ''; });
check('EN/HI works on sub-pages', /निःशुल्क|काउंसलिंग/.test(hi), hi);

// ── lead form validation still guards ────────────────────────────────────
const leadMsg = await page.evaluate(async () => {
  const n = document.getElementById('c-name'), p = document.getElementById('c-phone');
  if (!n || !p) return 'form missing';
  n.value = 'Test'; p.value = '123';
  await submitLead('counsel');
  return document.getElementById('toast').textContent;
});
check('Lead form validation intact', /valid 10-digit/i.test(leadMsg), leadMsg);

// ── college pages ────────────────────────────────────────────────────────
const colleges = JSON.parse(fs.readFileSync(path.join(REPO, 'src/data/colleges.json'), 'utf8'));
check('27 college pages generated',
      colleges.every(c => fs.existsSync(path.join(DIST, 'colleges', c.slug, 'index.html'))),
      `${colleges.filter(c => fs.existsSync(path.join(DIST,'colleges',c.slug,'index.html'))).length}/${colleges.length}`);

const sample = colleges[0];
await page.goto(`http://localhost:8103/colleges/${sample.slug}`, { waitUntil: 'domcontentloaded' });
const cp = await page.evaluate(() => ({
  h1: document.querySelector('h1')?.textContent?.trim() || '',
  canonical: document.querySelector('link[rel=canonical]')?.href || '',
  schema: document.querySelector('script[type="application/ld+json"]')?.textContent || '',
}));
check('College page has H1', cp.h1.includes(sample.name.split('(')[0].trim()), cp.h1);
check('College page canonical correct',
      cp.canonical === `https://nepalmbbs.in/colleges/${sample.slug}`, cp.canonical);
let schemaOk = false;
try { const s = JSON.parse(cp.schema); schemaOk = s['@type'] === 'CollegeOrUniversity' && s.name === sample.name; } catch {}
check('College page emits valid CollegeOrUniversity schema', schemaOk, cp.schema.slice(0, 90));

// index page ItemList
await page.goto('http://localhost:8103/colleges', { waitUntil: 'domcontentloaded' });
const listSchema = await page.evaluate(() => document.querySelector('script[type="application/ld+json"]')?.textContent || '');
let listOk = false;
try { const s = JSON.parse(listSchema); listOk = s['@type'] === 'ItemList' && s.itemListElement.length === 27; } catch {}
check('Colleges index emits ItemList schema (27 items)', listOk, listSchema.slice(0, 80));
const linkCount = await page.evaluate(() =>
  document.querySelectorAll('a[href^="/colleges/"]').length);
check('Colleges index links every college page', linkCount >= 27, 'links=' + linkCount);

// ── sitemap ──────────────────────────────────────────────────────────────
const smIndex = fs.readFileSync(path.join(DIST, 'sitemap-index.xml'), 'utf8');
const smFile = fs.readdirSync(DIST).find(f => /^sitemap-\d+\.xml$/.test(f));
const sm = fs.readFileSync(path.join(DIST, smFile), 'utf8');
check('sitemap-index.xml exists', smIndex.includes('sitemap'));
for (const r of ROUTES) {
  // The root is emitted without its trailing slash (see astro.config.mjs).
  // RFC 3986 6.2.3 makes the two equivalent, so accept either form here.
  const forms = r === '/'
    ? ['<loc>https://nepalmbbs.in</loc>', '<loc>https://nepalmbbs.in/</loc>']
    : [`<loc>https://nepalmbbs.in${r}</loc>`];
  check(`sitemap contains ${r}`, forms.some(f => sm.includes(f)));
}
check('sitemap contains all 27 college URLs',
      colleges.every(c => sm.includes(`/colleges/${c.slug}<`)),
      `${colleges.filter(c => sm.includes(`/colleges/${c.slug}<`)).length}/27`);
check('sitemap excludes tracker apps',
      !sm.includes('wrc-tracker') && !sm.includes('cmc-tracker'));

// ── robots ───────────────────────────────────────────────────────────────
const robots = fs.readFileSync(path.join(DIST, 'robots.txt'), 'utf8');
check('robots.txt disallows trackers',
      robots.includes('Disallow: /wrc-tracker/') && robots.includes('Disallow: /cmc-tracker/'));

// ── trackers must be byte-identical to the pre-Phase-2 commit ────────────
const hash = p => crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
let trackersOk = true, trackerDetail = '';
for (const app of ['wrc-tracker', 'cmc-tracker']) {
  for (const f of fs.readdirSync(path.join(DIST, app))) {
    const built = hash(path.join(DIST, app, f));
    const orig = crypto.createHash('sha256')
      .update(execSync(`git -C ${REPO} show phase1-static-rollback:${app}/${f}`, { maxBuffer: 1 << 28 }))
      .digest('hex');
    if (built !== orig) { trackersOk = false; trackerDetail += `${app}/${f} `; }
  }
}
check('Tracker apps byte-identical to Phase 1', trackersOk, 'changed: ' + trackerDetail);

// ── report ───────────────────────────────────────────────────────────────
console.log('\n══════ PHASE 2 BUILD VERIFICATION ══════');
let fail = 0;
for (const r of results) {
  if (!r.pass) fail++;
  console.log(`${r.pass ? '✅' : '❌'}  ${r.name}${r.pass || !r.detail ? '' : '\n      → ' + r.detail}`);
}
console.log(`\n${results.length - fail}/${results.length} passed`);
await browser.close(); server.close();
process.exit(fail ? 1 : 0);
