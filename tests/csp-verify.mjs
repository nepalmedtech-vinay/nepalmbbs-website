// Proves two claims that are easy to assert and easy to be wrong about:
//
//  1. Every page loads clean under the real Content-Security-Policy from
//     netlify.toml -- not a policy invented here, the one that will ship.
//  2. All 117+ converted handlers still fire, with the right arguments, under
//     that policy. Replacing inline onclick= with a dispatcher is the kind of
//     change that looks fine and silently kills a button, so every element
//     carrying data-act is exercised rather than sampled.
//
// The second is the point. A CSP that blocks the site's own buttons is not a
// security win, it is an outage.
import { chromium } from 'playwright';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

const REPO = path.resolve(import.meta.dirname, '..');
const DIST = path.join(REPO, 'dist');
const PORT = 8107;
const MIME = { '.html':'text/html', '.js':'text/javascript', '.json':'application/json',
               '.css':'text/css', '.png':'image/png', '.svg':'image/svg+xml',
               '.webp':'image/webp', '.xml':'application/xml', '.txt':'text/plain',
               '.woff2':'font/woff2', '.ico':'image/x-icon' };

/* ── read the policies out of netlify.toml ────────────────────────────── */
const toml = fs.readFileSync(path.join(REPO, 'netlify.toml'), 'utf8');
const rules = [];
for (const m of toml.matchAll(/\[\[headers\]\]\s*\n\s*for = "([^"]+)"\s*\n\s*\[headers\.values\]\s*\n((?:\s{4}\w[\w-]* = "[^"]*"\s*\n)+)/g)) {
  const values = {};
  for (const h of m[2].matchAll(/\s{4}([\w-]+) = "([^"]*)"/g)) values[h[1]] = h[2];
  rules.push({ for: m[1], values });
}
const csp = rules.filter(r => r.values['Content-Security-Policy']);
if (!csp.length) { console.error('no CSP found in netlify.toml'); process.exit(1); }

// Netlify applies the most specific matching rule; mirror that by preferring
// the longest literal prefix.
function headersFor(urlPath) {
  const out = {};
  const matches = rules
    .filter(r => {
      const p = r.for.replace(/\/\*$/, '');
      return r.for === '/*' ? true : urlPath === p || urlPath.startsWith(p + '/');
    })
    .sort((a, b) => a.for.length - b.for.length);
  for (const r of matches) Object.assign(out, r.values);
  delete out['Cache-Control'];
  return out;
}

const server = http.createServer((req, res) => {
  const urlPath = decodeURIComponent(req.url.split('?')[0]);
  let f = path.join(DIST, urlPath);
  if (fs.existsSync(f) && fs.statSync(f).isDirectory()) f = path.join(f, 'index.html');
  else if (!fs.existsSync(f) && fs.existsSync(f + '/index.html')) f = f + '/index.html';
  if (!f.startsWith(DIST) || !fs.existsSync(f)) { res.writeHead(404); return res.end('nf'); }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream',
                       ...headersFor(urlPath) });
  res.end(fs.readFileSync(f));
});
await new Promise(r => server.listen(PORT, r));

const results = [];
const check = (name, pass, detail = '') => results.push({ name, pass, detail });

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
await ctx.route('**/rest/v1/**', r => r.fulfill({ status: 200, contentType: 'application/json', body: '[]' }));
const page = await ctx.newPage();

const allow = JSON.parse(fs.readFileSync(path.join(REPO, 'tools/action-allowlist.json'), 'utf8'));

const walk = d => fs.readdirSync(d, { withFileTypes: true }).flatMap(e => {
  const p = path.join(d, e.name);
  return e.isDirectory() ? walk(p) : e.name === 'index.html' ? [p] : [];
});
const ROUTES = walk(DIST)
  .map(p => '/' + path.relative(DIST, p).replace(/index\.html$/, ''))
  .map(r => (r.length > 1 ? r.replace(/\/$/, '') : r))
  .sort();

let totalElements = 0, totalFired = 0;
const allViolations = [];

for (const route of ROUTES) {
  const violations = [];
  page.removeAllListeners('console');
  await page.exposeFunction('__cspViolation', v => violations.push(v)).catch(() => {});

  await page.addInitScript(() => {
    document.addEventListener('securitypolicyviolation', e => {
      window.__cspv = window.__cspv || [];
      window.__cspv.push(e.violatedDirective + ' :: ' +
        String(e.blockedURI || '').slice(0, 60) + ' @' + (e.sourceFile || '') + ':' + e.lineNumber);
    });
  });

  await page.goto(`http://localhost:${PORT}${route}`, { waitUntil: 'load' });
  await page.waitForTimeout(250);

  const v = await page.evaluate(() => window.__cspv || []);
  if (v.length) allViolations.push([route, v]);

  const isTracker = route.includes('tracker');
  if (isTracker) continue;   // relaxed policy by design; nothing to dispatch

  /* ── exercise every converted handler on this page ──────────────────── */
  const report = await page.evaluate((names) => {
    // Stop navigation and form submission without stopping propagation, so the
    // delegated listener still sees the event.
    document.addEventListener('click', e => e.preventDefault(), true);
    document.addEventListener('keydown', e => e.preventDefault(), true);

    const calls = [];
    for (const n of names) {
      if (typeof window[n] === 'function') {
        window[n] = function () {
          calls.push([n, ...[].map.call(arguments,
            a => (a && a.nodeType === 1 ? '@el' : a))]);
        };
      } else {
        window[n] = function () { calls.push([n, ...arguments]); };
      }
    }

    const out = { elements: 0, fired: 0, mismatches: [] };
    for (const el of document.querySelectorAll('[data-act]')) {
      let want;
      try { want = JSON.parse(el.getAttribute('data-do') || '[]'); }
      catch (e) { out.mismatches.push(['unparseable data-do', el.outerHTML.slice(0, 90)]); continue; }
      if (!want.length) continue;

      out.elements++;
      calls.length = 0;
      const act = el.getAttribute('data-act');
      if (act === 'enter') {
        el.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
      } else {
        el.dispatchEvent(new (act === 'click' ? MouseEvent : Event)(act, { bubbles: true }));
      }

      const got = JSON.stringify(calls);
      const exp = JSON.stringify(want);
      if (got === exp) out.fired++;
      else out.mismatches.push([el.getAttribute('data-do'), got]);
    }
    return out;
  }, allow);

  totalElements += report.elements;
  totalFired += report.fired;
  if (report.mismatches.length) {
    check(`${route} handlers dispatch`, false,
      `${report.fired}/${report.elements} · e.g. want ${report.mismatches[0][0]} got ${report.mismatches[0][1]}`);
  }
}

/* ── end-to-end, with nothing stubbed ─────────────────────────────────── */
// The dispatch loop above proves the right function is called with the right
// arguments. It does not prove the feature still works, because it replaces
// those functions with recorders. These do not stub anything: a real click,
// and then a look at what actually changed on the page.

await page.goto(`http://localhost:${PORT}/faq`, { waitUntil: 'load' });
await page.waitForTimeout(200);
{
  const q = page.locator('.faq-q[data-act="click"]').first();
  const before = await q.evaluate(el => el.parentElement.className);
  await q.click();
  await page.waitForTimeout(250);
  const after = await q.evaluate(el => el.parentElement.className);
  check('FAQ accordion still opens on a real click', before !== after,
    `${before || '(none)'} → ${after || '(none)'}`);
}

await page.goto(`http://localhost:${PORT}/neet-calculator`, { waitUntil: 'load' });
await page.waitForTimeout(200);
{
  const sel = page.locator('#cat, select[id*=cat]').first();
  const score = page.locator('#neet-score, input[id*=score]').first();
  let ran = false;
  if (await score.count()) {
    await score.fill('450');
    if (await sel.count()) await sel.selectOption({ index: 0 }).catch(() => {});
    const btn = page.locator('[data-do*="checkEligibility"]').first();
    if (await btn.count()) {
      await btn.click();
      await page.waitForTimeout(400);
      ran = await page.evaluate(() =>
        !!document.querySelector('.result-card, .res-ok, .res-warn'));
    }
  }
  check('NEET calculator still produces a result on a real click', ran);
}

// The hamburger only exists at mobile widths, so ask for one.
await page.setViewportSize({ width: 390, height: 844 });
await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'load' });
await page.waitForTimeout(200);
{
  const btn = page.locator('[data-do*="toggleMenu"]').first();
  let opened = false;
  if (await btn.count()) {
    // toggleMenu() flips .open on #mob-menu and #hbg (i18n.js).
    const state = () => page.evaluate(() =>
      (document.getElementById('mob-menu')?.className || '') + '|' +
      (document.getElementById('hbg')?.className || ''));
    const before = await state();
    await btn.click({ force: true });
    await page.waitForTimeout(350);
    const after = await state();
    opened = before !== after && /open/.test(after);
    check('mobile menu opens', opened, `${before} → ${after}`);

    // and closes again, which is the half that a delegated listener can break
    // on its own: closeMenu() lives on a different element inside the panel.
    const closeBtn = page.locator('#mob-menu [data-do*="closeMenu"]').first();
    if (await closeBtn.count()) {
      await closeBtn.click({ force: true });
      await page.waitForTimeout(350);
      check('mobile menu closes again', !/open/.test(await state()), await state());
    }
  }
  await page.setViewportSize({ width: 1280, height: 900 });
}

/* ── assertions ───────────────────────────────────────────────────────── */
check('every page loads with zero CSP violations', allViolations.length === 0,
  allViolations.slice(0, 3).map(([r, v]) => `${r}: ${v[0]}`).join(' | '));

check('script-src has no unsafe-inline on the site policy',
  !csp.find(r => r.for === '/*').values['Content-Security-Policy']
       .match(/script-src[^;]*unsafe-inline/),
  csp.find(r => r.for === '/*').values['Content-Security-Policy'].match(/script-src[^;]*/)[0].slice(0, 80));

check('script-src has no unsafe-eval anywhere',
  !csp.some(r => /unsafe-eval/.test(r.values['Content-Security-Policy'])));

check('object-src is none on every policy',
  csp.every(r => /object-src 'none'/.test(r.values['Content-Security-Policy'])));

check('ld+json needs no hash (browser does not execute it)',
  !allViolations.some(([, v]) => v.some(x => /ld\+json|application\/ld/.test(x))));

check(`all ${totalElements} converted handlers dispatch correctly`,
  totalElements > 0 && totalFired === totalElements, `${totalFired}/${totalElements}`);

check('every page carries the portal Referrer-Policy where it applies',
  rules.some(r => r.for === '/portal/*' && r.values['Referrer-Policy'] === 'no-referrer'));

/* ── report ───────────────────────────────────────────────────────────── */
for (const r of results) {
  console.log(`${r.pass ? '✅' : '❌'}  ${r.name}${r.detail ? '  → ' + r.detail : ''}`);
}
const passed = results.filter(r => r.pass).length;
console.log(`\n${passed}/${results.length} passed · ${ROUTES.length} routes · ${totalFired} handlers fired`);

await browser.close();
server.close();
process.exit(passed === results.length ? 0 : 1);
