// Keyboard and assistive-technology behaviour, measured rather than assumed.
//
// Contrast was the loud accessibility problem and it is fixed. These are the
// quiet ones: a control you can see and cannot reach, a modal that traps you,
// a focus ring that was styled away, an animation that plays for someone who
// asked the operating system for less of that. None of them show up in a
// screenshot, and all of them are the difference between "looks premium" and
// "is usable".
import { chromium } from 'playwright';
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path';

const REPO = path.resolve(import.meta.dirname, '..');
const DIST = path.join(REPO, 'dist');
let PORT = 0;   // 0 = let the OS pick: a stray server from an
                // earlier run should not fail a suite it has
                // nothing to do with.
const MIME = { '.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json',
  '.svg':'image/svg+xml','.png':'image/png','.webp':'image/webp','.jpg':'image/jpeg',
  '.woff2':'font/woff2','.xml':'application/xml' };

const server = http.createServer((q, r) => {
  const u = decodeURIComponent(q.url.split('?')[0]);
  let f = path.join(DIST, u);
  if (fs.existsSync(f) && fs.statSync(f).isDirectory()) f = path.join(f, 'index.html');
  else if (!fs.existsSync(f) && fs.existsSync(f + '/index.html')) f = f + '/index.html';
  if (!f.startsWith(DIST) || !fs.existsSync(f)) { r.writeHead(404); return r.end('nf'); }
  r.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream' });
  r.end(fs.readFileSync(f));
});
await new Promise(r => server.listen(0, r));
PORT = server.address().port;

const results = [];
const check = (n, pass, detail = '') => results.push({ n, pass, detail });

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const J = (r, b) => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(b) });

async function ctxFor(opts = {}) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, ...opts });
  await ctx.route('**/rest/v1/**', r => J(r, []));
  await ctx.route('**/rest/v1/staff**', r => J(r, [{ id: 's1', email: 'c@x.in', full_name: 'C', role: 'admin' }]));
  await ctx.route('**/rest/v1/applications**', r => J(r, [
    { id: 'a1', student_name: 'Riya Sharma', contact_number: '9876543210', city: 'Lucknow',
      neet_score: 480, stage: 'counselling', assigned_to: 's1', updated_at: '2026-08-20T10:00:00Z' }]));
  await ctx.route('**/rest/v1/leads**', r => J(r, []));
  await ctx.route('**/rest/v1/tasks**', r => J(r, []));
  await ctx.route('**/rest/v1/rpc/portal_application', r => J(r, [{
    student_name: 'Riya Sharma', stage: 'counselling', intake_year: 2026,
    updated_at: '2026-08-20T10:00:00Z',
    documents: [{ kind: 'passport', state: 'pending' }], timeline: [] }]));
  await ctx.route('**/auth/v1/token**', r => J(r, {
    access_token: 'JWT', refresh_token: 'R', expires_in: 3600, user: { id: 's1', email: 'c@x.in' } }));
  return ctx;
}

/* ── every interactive control must be reachable and show focus ───────── */
for (const route of ['/', '/colleges', '/neet-calculator', '/portal', '/staff']) {
  const ctx = await ctxFor();
  const page = await ctx.newPage();
  await page.goto(`http://localhost:${PORT}${route}`, { waitUntil: 'load' });
  await page.waitForTimeout(500);

  const r = await page.evaluate(() => {
    const vis = (el) => {
      const cs = getComputedStyle(el), b = el.getBoundingClientRect();
      return cs.display !== 'none' && cs.visibility !== 'hidden' &&
             parseFloat(cs.opacity) > 0.05 && b.width > 0 && b.height > 0;
    };
    const controls = [...document.querySelectorAll(
      'a[href],button,input,select,textarea,[tabindex]')].filter(vis);
    const unreachable = controls.filter(el => el.tabIndex < 0).map(el =>
      el.tagName.toLowerCase() + '.' + String(el.className).slice(0, 20));
    // a control whose only label is an icon or an emoji is unreachable by ear
    const unlabelled = controls.filter(el => {
      const t = (el.innerText || el.value || '').replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu, '').trim();
      return !t && !el.getAttribute('aria-label') && !el.getAttribute('title') &&
             !(el.id && document.querySelector(`label[for="${el.id}"]`));
    }).map(el => el.tagName.toLowerCase() + '.' + String(el.className).slice(0, 24));
    return { total: controls.length, unreachable, unlabelled };
  });

  check(`${route} every visible control is keyboard-reachable`,
    r.unreachable.length === 0, r.unreachable.slice(0, 3).join(', '));
  check(`${route} every control has an accessible name`,
    r.unlabelled.length === 0, `${r.unlabelled.length}: ` + r.unlabelled.slice(0, 3).join(', '));

  // Tab through the first few stops and confirm each one actually looks
  // different when focused. The earlier version accepted "has a box-shadow",
  // which every glass control has whether focused or not -- so it passed while
  // reporting an outline of `0px none`. The honest question is not "is there a
  // ring" but "did anything change".
  const focusRings = [];
  for (let i = 0; i < 4; i++) {
    await page.keyboard.press('Tab');
    const r = await page.evaluate(() => {
      const el = document.activeElement;
      if (!el || el === document.body) return null;
      const now = getComputedStyle(el);
      const painted = { outline: now.outlineWidth + ' ' + now.outlineStyle + ' ' + now.outlineColor,
                        shadow: now.boxShadow, border: now.borderColor };
      // Compare against the same element with focus removed.
      el.blur();
      const off = getComputedStyle(el);
      const resting = { outline: off.outlineWidth + ' ' + off.outlineStyle + ' ' + off.outlineColor,
                        shadow: off.boxShadow, border: off.borderColor };
      el.focus();
      return { tag: el.tagName.toLowerCase() + (el.className ? '.' + String(el.className).split(' ')[0] : ''),
               changed: painted.outline !== resting.outline || painted.shadow !== resting.shadow ||
                        painted.border !== resting.border,
               outline: painted.outline };
    });
    if (r) focusRings.push(r);
  }
  const noRing = focusRings.filter(r => !r.changed);
  check(`${route} focus is visibly indicated on every tab stop`,
    focusRings.length > 0 && noRing.length === 0,
    noRing.length ? noRing.map(r => r.tag + ' (' + r.outline + ')').join(', ')
                  : `${focusRings.length} stops checked`);

  await ctx.close();
}

/* ── the console drawer is a modal: it must trap and release ──────────── */
{
  const ctx = await ctxFor();
  const page = await ctx.newPage();
  await page.goto(`http://localhost:${PORT}/staff`, { waitUntil: 'load' });
  await page.waitForTimeout(300);
  await page.fill('#s-email', 'c@x.in'); await page.fill('#s-pass', 'x');
  await page.click('#s-gate-btn'); await page.waitForTimeout(700);

  await page.locator('#s-board .cx-item').first().click();
  await page.waitForTimeout(500);

  check('opening the drawer moves focus into it',
    await page.evaluate(() => {
      const d = document.getElementById('s-drawer');
      return d.open && d.contains(document.activeElement);
    }));

  await page.keyboard.press('Escape');
  await page.waitForTimeout(400);
  check('Escape closes the drawer',
    await page.evaluate(() => !document.getElementById('s-drawer').open));
  check('closing the drawer returns focus to the page',
    await page.evaluate(() => document.activeElement !== document.body &&
      !document.getElementById('s-drawer').contains(document.activeElement)));
  await ctx.close();
}

/* ── reduced motion is honoured, not decorated ────────────────────────── */
{
  const ctx = await ctxFor({ reducedMotion: 'reduce' });
  const page = await ctx.newPage();
  await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'load' });
  await page.waitForTimeout(900);
  const moving = await page.evaluate(() => {
    let n = 0;
    for (const el of document.querySelectorAll('*')) {
      const cs = getComputedStyle(el);
      const dur = parseFloat(cs.animationDuration) || 0;
      if (dur > 0.2 && cs.animationIterationCount === 'infinite') n++;
    }
    return { infinite: n, canvas: !!document.querySelector('.au canvas') };
  });
  check('reduced motion stops the endless animations',
    moving.infinite === 0, `${moving.infinite} still looping`);
  check('reduced motion drops the WebGL aurora',
    !moving.canvas, moving.canvas ? 'canvas still mounted' : '');
  await ctx.close();
}

/* ── document structure ───────────────────────────────────────────────── */
for (const route of ['/', '/colleges', '/staff', '/portal']) {
  const ctx = await ctxFor();
  const page = await ctx.newPage();
  await page.goto(`http://localhost:${PORT}${route}`, { waitUntil: 'load' });
  await page.waitForTimeout(400);
  const s = await page.evaluate(() => {
    const hs = [...document.querySelectorAll('h1,h2,h3,h4,h5,h6')]
      .filter(h => h.offsetParent !== null || h.tagName === 'H1');
    let skips = 0, prev = 0;
    for (const h of hs) { const l = +h.tagName[1]; if (prev && l > prev + 1) skips++; prev = l; }
    return { h1: document.querySelectorAll('h1').length, skips,
             lang: document.documentElement.lang,
             landmarks: document.querySelectorAll('main,nav,header,footer,[role=main]').length };
  });
  check(`${route} has exactly one h1`, s.h1 === 1, String(s.h1));
  check(`${route} heading levels do not skip`, s.skips === 0, `${s.skips} jump(s)`);
  check(`${route} declares a language and a main landmark`,
    !!s.lang && s.landmarks > 0, `lang=${s.lang} landmarks=${s.landmarks}`);
  await ctx.close();
}

for (const r of results) console.log(`${r.pass ? '✅' : '❌'}  ${r.n}${r.detail ? '  → ' + r.detail : ''}`);
const passed = results.filter(r => r.pass).length;
console.log(`\n${passed}/${results.length} passed`);
await browser.close(); server.close();
process.exit(passed === results.length ? 0 : 1);
