// Core Web Vitals, measured under throttling.
//
// Measured, because the standing instruction on this project is not to claim a
// performance result that has not been observed. Throttled, because the site's
// audience is students on mid-range Android phones on Indian mobile networks,
// and an unthrottled desktop number describes nobody who will ever visit.
//
// CPU is slowed 4x and the network shaped to roughly "slow 4G". Those are the
// Lighthouse mobile defaults, chosen so the numbers here are comparable to a
// Lighthouse run rather than being a private scale.
//
// Thresholds are the Core Web Vitals "good" bands: LCP <= 2.5s, CLS <= 0.1,
// and total blocking time <= 200ms as the lab stand-in for INP.
import { chromium } from 'playwright';
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path';

const REPO = path.resolve(import.meta.dirname, '..');
const DIST = path.join(REPO, 'dist');
let PORT = 0;
const MIME = { '.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json',
  '.svg':'image/svg+xml','.png':'image/png','.webp':'image/webp','.jpg':'image/jpeg',
  '.woff2':'font/woff2','.xml':'application/xml','.ico':'image/x-icon' };

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

const ROUTES = ['/', '/colleges', '/colleges/institute-of-medicine', '/faq',
                '/neet-calculator', '/staff', '/portal'];

const LIMITS = { lcp: 2500, cls: 0.1, tbt: 200 };

const browser = await chromium.launch({
  executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  args: ['--disable-gpu']            // headless GPU emulation skews paint timing
});

const rows = [];
for (const route of ROUTES) {
  const ctx = await browser.newContext({
    viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true,
    deviceScaleFactor: 2
  });
  await ctx.route('**/rest/v1/**', r =>
    r.fulfill({ status: 200, contentType: 'application/json', body: '[]' }));

  // Google Fonts is not reachable from this sandbox, and a render-blocking
  // stylesheet that never answers pins first paint to the socket timeout --
  // ~13s on every route, identical whether the page is 51kB or 190kB. Serving
  // an empty stylesheet keeps the request in the waterfall (so the cost of
  // asking is still measured) without measuring this network's failure mode.
  // Whether that request SHOULD be render-blocking is a separate question, and
  // the assertion below answers it.
  await ctx.route('https://fonts.googleapis.com/**', r =>
    r.fulfill({ status: 200, contentType: 'text/css', body: '' }));
  await ctx.route('https://fonts.gstatic.com/**', r => r.abort());
  const page = await ctx.newPage();

  const cdp = await ctx.newCDPSession(page);
  await cdp.send('Network.enable');
  await cdp.send('Network.emulateNetworkConditions', {
    offline: false, latency: 150,                  // ms RTT
    downloadThroughput: 1.6 * 1024 * 1024 / 8,     // ~1.6 Mbps
    uploadThroughput: 750 * 1024 / 8
  });
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });

  await page.addInitScript(() => {
    window.__v = { lcp: 0, cls: 0, fcp: 0, long: 0 };
    new PerformanceObserver(l => {
      for (const e of l.getEntries()) window.__v.lcp = e.startTime;
    }).observe({ type: 'largest-contentful-paint', buffered: true });
    new PerformanceObserver(l => {
      for (const e of l.getEntries()) if (!e.hadRecentInput) window.__v.cls += e.value;
    }).observe({ type: 'layout-shift', buffered: true });
    new PerformanceObserver(l => {
      for (const e of l.getEntries()) if (e.name === 'first-contentful-paint') window.__v.fcp = e.startTime;
    }).observe({ type: 'paint', buffered: true });
    // Total blocking time: the part of each long task beyond 50ms.
    new PerformanceObserver(l => {
      for (const e of l.getEntries()) window.__v.long += Math.max(0, e.duration - 50);
    }).observe({ type: 'longtask', buffered: true });
  });

  await page.goto(`http://localhost:${PORT}${route}`, { waitUntil: 'load' });
  await page.waitForTimeout(3500);            // let late shifts and LCP settle
  // A real visitor scrolls; shifts caused by lazy content count against them.
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight / 2));
  await page.waitForTimeout(1200);

  const v = await page.evaluate(() => window.__v);
  rows.push({ route, ...v });
  await ctx.close();
}

console.log('route                              FCP     LCP     CLS     TBT');
for (const r of rows) {
  const bad = (k, v) => (v > LIMITS[k] ? '!' : ' ');
  console.log(
    r.route.padEnd(34) +
    (Math.round(r.fcp) + 'ms').padStart(7) +
    (Math.round(r.lcp) + 'ms').padStart(7) + bad('lcp', r.lcp) +
    r.cls.toFixed(3).padStart(7) + bad('cls', r.cls) +
    (Math.round(r.long) + 'ms').padStart(7) + bad('tbt', r.long));
}

/* A stylesheet parked at media="print" that never gets promoted is invisible
   rather than slow, which is the failure mode nobody notices. */
{
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  await ctx.route('**/rest/v1/**', r =>
    r.fulfill({ status: 200, contentType: 'application/json', body: '[]' }));
  const page = await ctx.newPage();
  await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'load' });
  await page.waitForTimeout(1200);
  const late = await page.evaluate(() => {
    const l = document.querySelector('link[data-late-style]');
    const g = document.querySelector('.grain');
    return { media: l ? l.media : null,
             painted: g ? /url\(/.test(getComputedStyle(g).backgroundImage) : false };
  });
  if (late.media !== 'all' || !late.painted) {
    console.log(`\n❌ deferred stylesheet was never promoted (media=${late.media}, painted=${late.painted})`);
    await browser.close(); server.close();
    process.exit(1);
  }
  console.log('\n✅ the deferred grain stylesheet is promoted after load and paints');
  await ctx.close();
}

const fails = [];
for (const r of rows) {
  if (r.lcp > LIMITS.lcp) fails.push(`${r.route} LCP ${Math.round(r.lcp)}ms > ${LIMITS.lcp}`);
  if (r.cls > LIMITS.cls) fails.push(`${r.route} CLS ${r.cls.toFixed(3)} > ${LIMITS.cls}`);
  if (r.long > LIMITS.tbt) fails.push(`${r.route} TBT ${Math.round(r.long)}ms > ${LIMITS.tbt}`);
}

console.log(`\n${rows.length} routes · 4x CPU throttle · ~1.6Mbps / 150ms RTT · 390x844`);
if (fails.length) {
  console.log('\n❌ ' + fails.length + ' threshold(s) missed:');
  fails.forEach(f => console.log('   ' + f));
} else {
  console.log('\n✅ every route inside the Core Web Vitals "good" bands');
}

await browser.close(); server.close();
process.exit(fails.length ? 1 : 0);
