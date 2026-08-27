// Contrast and mobile-overflow regression guard.
//
// It began as a measuring pass and became an assertion, because the first run
// found 1140 pieces of text below WCAG AA on a site that looked, to the eye,
// entirely fine. Nothing about a glass design system makes that visible: a
// muted grey at 3.3:1 reads as a considered choice right up until someone
// tries to read it on a phone in daylight.
//
// It exits non-zero if any text fails its AA threshold or any page scrolls
// sideways at 390px, so the number cannot drift back up unnoticed.
import { chromium } from 'playwright';
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path';

const REPO = path.resolve(import.meta.dirname, '..');
const DIST = path.join(REPO, 'dist');
let PORT = 0;   // 0 = let the OS pick: a stray server from an
                // earlier run should not fail a suite it has
                // nothing to do with.
const MIME = { '.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json',
  '.svg':'image/svg+xml','.png':'image/png','.webp':'image/webp','.jpg':'image/jpeg',
  '.woff2':'font/woff2','.xml':'application/xml','.txt':'text/plain','.ico':'image/x-icon' };

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

const walk = d => fs.readdirSync(d, { withFileTypes: true }).flatMap(e => {
  const p = path.join(d, e.name);
  return e.isDirectory() ? walk(p) : e.name === 'index.html' ? [p] : [];
});
const ROUTES = walk(DIST).map(p => '/' + path.relative(DIST, p).replace(/index\.html$/, ''))
  .map(r => (r.length > 1 ? r.replace(/\/$/, '') : r))
  .filter(r => !r.includes('tracker')).sort();

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });

/* Colour resolution, done properly.
   The obvious approach -- assign the computed colour to a canvas fillStyle and
   read it back as hex -- does not work here. Chrome accepts oklab() and hands
   the same oklab() string straight back, so a naive parser reads "0.43" as a
   red channel and every element measures as near-black against near-black: a
   contrast of exactly 1.00 everywhere, which looks like catastrophe and is
   actually a broken ruler. color-mix(in oklab, ...) is all over this design
   system, so that is most of the page.
   So: convert OKLab and OKLCH to sRGB with the real matrices, and composite
   translucent backgrounds down the ancestor stack, because a glass surface at
   12% alpha is not the colour the text sits on. */
const CONTRAST = `(() => {
  const clamp = (v) => Math.min(1, Math.max(0, v));
  const gamma = (v) => v <= 0.0031308 ? 12.92*v : 1.055*Math.pow(clamp(v), 1/2.4) - 0.055;

  function oklabToRgb(L, a, b) {
    const l_ = L + 0.3963377774*a + 0.2158037573*b;
    const m_ = L - 0.1055613458*a - 0.0638541728*b;
    const s_ = L - 0.0894841775*a - 1.2914855480*b;
    const l = l_*l_*l_, m = m_*m_*m_, s = s_*s_*s_;
    return [
      gamma( 4.0767416621*l - 3.3077115913*m + 0.2309699292*s),
      gamma(-1.2684380046*l + 2.6097574011*m - 0.3413193965*s),
      gamma(-0.0041960863*l - 0.7034186147*m + 1.7076147010*s)
    ].map(v => Math.round(clamp(v) * 255));
  }

  // -> [r, g, b, alpha] in 0-255 / 0-1, or null when it cannot be known
  function parse(c) {
    if (!c || c === 'transparent') return [0,0,0,0];
    let m;
    if ((m = c.match(/^rgba?\\(([^)]+)\\)/))) {
      const p = m[1].split(/[\\s,\\/]+/).filter(Boolean).map(Number);
      return [p[0], p[1], p[2], p.length > 3 ? p[3] : 1];
    }
    if ((m = c.match(/^oklab\\(([^)]+)\\)/))) {
      const p = m[1].split(/[\\s\\/]+/).filter(Boolean);
      const n = p.map(v => v.endsWith('%') ? parseFloat(v)/100 : parseFloat(v));
      return [...oklabToRgb(n[0], n[1], n[2]), p.length > 3 ? n[3] : 1];
    }
    if ((m = c.match(/^oklch\\(([^)]+)\\)/))) {
      const p = m[1].split(/[\\s\\/]+/).filter(Boolean);
      const n = p.map(v => v.endsWith('%') ? parseFloat(v)/100 : parseFloat(v));
      const h = n[2] * Math.PI / 180;
      return [...oklabToRgb(n[0], n[1]*Math.cos(h), n[1]*Math.sin(h)), p.length > 3 ? n[3] : 1];
    }
    if ((m = c.match(/^#([0-9a-f]{3,8})$/i))) {
      let h = m[1];
      if (h.length === 3) h = h.split('').map(x => x+x).join('');
      return [parseInt(h.slice(0,2),16), parseInt(h.slice(2,4),16), parseInt(h.slice(4,6),16),
              h.length === 8 ? parseInt(h.slice(6,8),16)/255 : 1];
    }
    return null;
  }

  const over = (fg, bg) => {                       // src-over composite
    const a = fg[3];
    return [ fg[0]*a + bg[0]*(1-a), fg[1]*a + bg[1]*(1-a), fg[2]*a + bg[2]*(1-a), 1 ];
  };

  function groundOf(el) {
    const layers = [];
    let n = el;
    while (n) {
      const cs = getComputedStyle(n);
      if (cs.backgroundImage && cs.backgroundImage !== 'none') return null;  // gradient: unknowable
      const c = parse(cs.backgroundColor);
      if (!c) return null;
      if (c[3] > 0) { layers.push(c); if (c[3] >= 1) break; }
      n = n.parentElement;
    }
    if (!layers.length || layers[layers.length-1][3] < 1) {
      const html = parse(getComputedStyle(document.documentElement).backgroundColor);
      if (!html || html[3] < 1) return null;
      layers.push(html);
    }
    let out = layers[layers.length-1];
    for (let i = layers.length-2; i >= 0; i--) out = over(layers[i], out);
    return out;
  }

  const lum = (c) => { const s = c.slice(0,3).map(v => { v/=255;
      return v <= 0.03928 ? v/12.92 : Math.pow((v+0.055)/1.055, 2.4); });
    return 0.2126*s[0] + 0.7152*s[1] + 0.0722*s[2]; };

  const out = [];
  for (const el of document.querySelectorAll('p,span,a,h1,h2,h3,h4,li,td,th,button,label,div')) {
    if (!el.textContent || !el.textContent.trim()) continue;
    if (el.children.length && ![...el.childNodes].some(n => n.nodeType===3 && n.textContent.trim())) continue;
    const cs = getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden' || parseFloat(cs.opacity) < 0.95) continue;
    const r = el.getBoundingClientRect();
    if (!r.width || !r.height || r.bottom < 0) continue;
    let fg = parse(cs.color); const bg = groundOf(el);
    if (!fg || !bg) continue;
    if (fg[3] < 1) fg = over(fg, bg);
    const l1 = lum(fg), l2 = lum(bg);
    const ratio = (Math.max(l1,l2)+0.05)/(Math.min(l1,l2)+0.05);
    const size = parseFloat(cs.fontSize), bold = parseInt(cs.fontWeight,10) >= 700;
    const need = (size >= 24 || (size >= 18.66 && bold)) ? 3 : 4.5;
    if (ratio < need) out.push({ t: el.textContent.trim().slice(0,34), ratio: +ratio.toFixed(2), need });
  }
  return out;
})()`;

const rows = [];
for (const route of ROUTES) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  await ctx.route('**/rest/v1/**', r => r.fulfill({ status: 200, contentType: 'application/json', body: '[]' }));
  const page = await ctx.newPage();

  let bytes = 0, reqs = 0;
  page.on('response', async res => { reqs++;
    try { const b = res.headers()['content-length']; bytes += b ? +b : (await res.body()).length; } catch {} });

  await page.goto(`http://localhost:${PORT}${route}`, { waitUntil: 'load' });
  await page.waitForTimeout(700);

  const low = await page.evaluate(CONTRAST);
  const nodes = await page.evaluate(() => document.querySelectorAll('*').length);

  // mobile: does the body scroll sideways?
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(400);
  const overflow = await page.evaluate(() => {
    const d = document.documentElement;
    const over = d.scrollWidth - d.clientWidth;
    if (over <= 1) return { over: 0, culprit: null };
    let worst = null, w = 0;
    for (const el of document.querySelectorAll('body *')) {
      const r = el.getBoundingClientRect();
      if (r.right > d.clientWidth + 1 && r.width > w &&
          getComputedStyle(el).overflowX !== 'auto' &&
          getComputedStyle(el).overflowX !== 'scroll') {
        w = r.width; worst = el.tagName + '.' + (el.className || '').toString().slice(0, 30);
      }
    }
    return { over, culprit: worst };
  });

  rows.push({ route, low: low.length, worst: low.sort((a,b)=>a.ratio-b.ratio)[0],
              kb: Math.round(bytes/1024), reqs, nodes, overflow });
  await ctx.close();
}

console.log('route                          lowContrast  worst   kB  reqs  nodes  mobileOverflow');
for (const r of rows) {
  console.log(
    r.route.padEnd(30) +
    String(r.low).padStart(11) +
    String(r.worst ? r.worst.ratio : '-').padStart(8) +
    String(r.kb).padStart(5) +
    String(r.reqs).padStart(6) +
    String(r.nodes).padStart(7) +
    '  ' + (r.overflow.over ? r.overflow.over + 'px ' + r.overflow.culprit : 'none'));
}
const tot = rows.reduce((a,r)=>a+r.low,0);
console.log(`\n${rows.length} routes · ${tot} low-contrast elements · ` +
  `${rows.filter(r=>r.overflow.over).length} with mobile overflow · ` +
  `median ${[...rows.map(r=>r.kb)].sort((a,b)=>a-b)[Math.floor(rows.length/2)]} kB`);

// the worst offenders, once, so they can be fixed rather than counted
const seen = new Map();
for (const r of rows) if (r.worst) {
  const k = r.worst.t;
  if (!seen.has(k) || seen.get(k).ratio > r.worst.ratio) seen.set(k, { ...r.worst, route: r.route });
}
if (seen.size) {
  console.log('\nlowest-contrast text found:');
  [...seen.values()].sort((a,b)=>a.ratio-b.ratio).slice(0,10)
    .forEach(w => console.log(`  ${String(w.ratio).padStart(5)} (needs ${w.need})  "${w.t}"  ${w.route}`));
}

await browser.close(); server.close();

const fails = rows.reduce((a, r) => a + r.low, 0);
const overs = rows.filter(r => r.overflow.over);
if (fails || overs.length) {
  console.log(`\n❌ ${fails} low-contrast element(s), ${overs.length} page(s) overflowing`);
  process.exit(1);
}
console.log('\n✅ every route: text meets WCAG AA, nothing scrolls sideways at 390px');
