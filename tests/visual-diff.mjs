// Renders the pre-extraction commit and the working tree side by side and
// compares them pixel for pixel. Extraction must be visually inert; any
// non-zero diff means the cascade or load order moved.
import { chromium } from 'playwright';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { PNG } from 'pngjs';

const SCRATCH = '/tmp/claude-0/-home-user-leadflow-ai/c458c096-29e3-5080-8937-2decb648b144/scratchpad';
const MIME = { '.html':'text/html','.js':'text/javascript','.json':'application/json',
               '.css':'text/css','.png':'image/png','.xml':'application/xml','.txt':'text/plain' };

function serve(root, port) {
  const s = http.createServer((req, res) => {
    let p = decodeURIComponent(req.url.split('?')[0]);
    if (p.endsWith('/')) p += 'index.html';
    const f = path.join(root, p);
    if (!f.startsWith(root) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) {
      res.writeHead(404); return res.end('nf');
    }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream' });
    res.end(fs.readFileSync(f));
  });
  return new Promise(r => s.listen(port, () => r(s)));
}

// Freeze everything non-deterministic: animations, transitions, the hero
// slideshow timer and Math.random, so two runs are directly comparable.
const FREEZE = `
  *,*::before,*::after{animation:none!important;transition:none!important;
    animation-duration:0s!important;transition-duration:0s!important}
  #loader{display:none!important}
  .hero-slide{opacity:0!important}
  .hero-slide:first-of-type{opacity:1!important}
`;

async function shoot(page, url, out, viewport) {
  await page.setViewportSize(viewport);
  await page.addInitScript(() => {
    Math.random = () => 0.42;
    window.setInterval = () => 0;
  });
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(3000);
  await page.addStyleTag({ content: FREEZE });
  await page.waitForTimeout(600);
  await page.screenshot({ path: out, fullPage: true });
}

function diff(aPath, bPath, outPath) {
  const a = PNG.sync.read(fs.readFileSync(aPath));
  const b = PNG.sync.read(fs.readFileSync(bPath));
  if (a.width !== b.width || a.height !== b.height) {
    return { sizeMismatch: `${a.width}x${a.height} vs ${b.width}x${b.height}` };
  }
  const out = new PNG({ width: a.width, height: a.height });
  let bad = 0;
  for (let i = 0; i < a.data.length; i += 4) {
    const d = Math.abs(a.data[i]-b.data[i]) + Math.abs(a.data[i+1]-b.data[i+1]) + Math.abs(a.data[i+2]-b.data[i+2]);
    if (d > 12) {                       // ignore sub-perceptual AA noise
      bad++;
      out.data[i]=255; out.data[i+1]=0; out.data[i+2]=0; out.data[i+3]=255;
    } else {
      out.data[i]=a.data[i]; out.data[i+1]=a.data[i+1]; out.data[i+2]=a.data[i+2]; out.data[i+3]=80;
    }
  }
  fs.writeFileSync(outPath, PNG.sync.write(out));
  const total = a.width * a.height;
  return { bad, total, pct: (bad / total * 100), w: a.width, h: a.height };
}

const before = await serve(process.argv[2], 8101);   // baseline worktree
const after  = await serve(process.argv[3], 8102);   // working tree
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });

const VIEWPORTS = [
  ['mobile',  { width: 390,  height: 844 }],
  ['tablet',  { width: 820,  height: 1180 }],
  ['desktop', { width: 1440, height: 900 }],
];

let worst = 0;
for (const [name, vp] of VIEWPORTS) {
  const ctx = await browser.newContext({ viewport: vp, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  await shoot(page, 'http://localhost:8101/', `${SCRATCH}/vd-${name}-before.png`, vp);
  await shoot(page, 'http://localhost:8102/', `${SCRATCH}/vd-${name}-after.png`, vp);
  await ctx.close();
  const r = diff(`${SCRATCH}/vd-${name}-before.png`, `${SCRATCH}/vd-${name}-after.png`, `${SCRATCH}/vd-${name}-diff.png`);
  if (r.sizeMismatch) { console.log(`❌ ${name}: page size changed — ${r.sizeMismatch}`); worst = 100; }
  else {
    const ok = r.pct < 0.01;
    console.log(`${ok?'✅':'❌'} ${name.padEnd(8)} ${r.w}x${r.h}  differing pixels: ${r.bad}/${r.total} (${r.pct.toFixed(4)}%)`);
    worst = Math.max(worst, r.pct);
  }
}
await browser.close(); before.close(); after.close();
console.log(worst < 0.01 ? '\n✅ VISUALLY IDENTICAL' : `\n❌ VISUAL DRIFT: ${worst.toFixed(4)}%`);
process.exit(worst < 0.01 ? 0 : 1);
