// Verifies the admissions assistant.
//
// The behaviours worth guarding here are not "does it reply" — it always
// replies. They are the ones that go quiet when they break:
//
//   - that a college question is answered from colleges.json rather than
//     falling through, which is the whole reason the assistant was rewritten;
//   - that an answer it cannot source is refused rather than dressed up;
//   - that no answer ever states a fee, because the site's standing position
//     is that a fee figure goes stale before a family reads it;
//   - that the visitor's own words are never re-inserted as markup;
//   - and that the dataset has been reviewed recently enough to still be
//     worth trusting. That last one is a data-freshness audit, not a code
//     test: it fails on the calendar, with nobody having touched the repo.
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

const results = [];
const check = (name, pass, detail = '') => results.push({ name, pass, detail });

/* ── the dataset itself, before a browser is involved ──────────────────── */

const kb = JSON.parse(fs.readFileSync(path.join(REPO, 'src/data/knowledge.json'), 'utf8'));

check('every topic carries a source and a checked date',
  kb.topics.every(t => t.source && t.source.name && t.source.checked),
  kb.topics.filter(t => !(t.source && t.source.checked)).map(t => t.id).join(', '));

const STATUSES = ['official', 'estimate', 'general'];
check('every topic declares an honest status',
  kb.topics.every(t => STATUSES.includes(t.status)),
  kb.topics.filter(t => !STATUSES.includes(t.status)).map(t => t.id).join(', '));

// A fee figure is the one thing this site has decided never to publish.
const FEE_SHAPED = /(?:₹|rs\.?|npr|inr)\s?[\d,]{5,}|\b\d{1,2}\s?(?:lakh|lac|crore)\b/i;
const feeClaims = kb.topics.filter(t => FEE_SHAPED.test(t.answer) && t.id !== 'living-cost');
check('no topic states a tuition fee figure', feeClaims.length === 0,
  feeClaims.map(t => t.id).join(', '));

// Anything presented as an official rule must point at an authority, not at us.
const badOfficial = kb.topics.filter(t => t.status === 'official' && !/^https?:\/\//.test(t.source.url || ''));
check('every "official" topic links to the authority it cites', badOfficial.length === 0,
  badOfficial.map(t => t.id).join(', '));

// Freshness. Admissions rules are restated yearly; a dataset nobody has
// re-checked in a year should stop claiming to be current.
const ageDays = Math.floor((Date.now() - Date.parse(kb.reviewed)) / 86400000);
check(`knowledge base reviewed within 365 days (currently ${ageDays}d)`,
  Number.isFinite(ageDays) && ageDays <= 365, `reviewed ${kb.reviewed}`);

/* ── the assistant, in a browser ───────────────────────────────────────── */

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
await ctx.route('**/rest/v1/**', r => r.fulfill({ status: 200, contentType: 'application/json', body: '[]' }));
const page = await ctx.newPage();
const pageErrors = [];
page.on('pageerror', e => pageErrors.push(e.message));

await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'load' });
await page.waitForTimeout(1200);

// Ask, then read back the last bot message.
async function ask(q) {
  await page.evaluate((q) => window.askBot(q), q);
  await page.waitForFunction(() => {
    const m = document.querySelectorAll('#chat-msgs .chat-msg.bot');
    return m.length && !document.getElementById('chat-typing');
  }, null, { timeout: 8000 }).catch(() => {});
  return page.evaluate(() => {
    const m = document.querySelectorAll('#chat-msgs .chat-msg.bot');
    return m.length ? m[m.length - 1].innerHTML : '';
  });
}

// The rendered text rather than the markup. Needed for name matching: the
// assistant escapes college names before inserting them, so "B & C Medical
// College" appears in the HTML as "B &amp; C Medical College" and a raw
// substring test on innerHTML reports it missing when it is plainly there.
function lastBotText() {
  return page.evaluate(() => {
    const m = document.querySelectorAll('#chat-msgs .chat-msg.bot');
    return m.length ? (m[m.length - 1].textContent || '') : '';
  });
}

const colleges = JSON.parse(fs.readFileSync(path.join(REPO, 'src/data/colleges.json'), 'utf8'));

// The rewrite's reason for existing: this used to fall through to "book a
// session" because the assistant had no access to the college records.
const nobel = await ask('How many seats does Nobel Medical College have?');
check('answers a college question from the college records',
  /Nobel Medical College/i.test(nobel) && /43/.test(nobel), nobel.slice(0, 110));

check('a college answer links to that college\'s own page',
  /href="\/colleges\/nobel-medical-college-teaching-hospital"/.test(nobel));

check('a college answer carries its source and check date',
  /chat-src/.test(nobel) && new RegExp(kb.reviewed).test(nobel));

check('a college answer states that recognition is per intake year',
  /per intake year/i.test(nobel));

// An acronym is how people actually ask about this one.
const bpk = await ask('Where is BPKIHS located?');
check('resolves a college by its acronym', /Dharan/i.test(bpk), bpk.slice(0, 90));

// Topic retrieval, with the source attached.
const neet = await ask('Is NEET mandatory?');
check('answers a rules question with an official source',
  /NEET/i.test(neet) && /Official source/i.test(neet) && /nmc\.org\.in/.test(neet),
  neet.slice(0, 110));

// The site's fee position must survive contact with the assistant.
const fee = await ask('What are the total fees?');
check('never answers a fee question with a number',
  !FEE_SHAPED.test(fee.replace(/<[^>]*>/g, '')), fee.slice(0, 110));

// An estimate must be labelled as ours, not as an authority's.
const cost = await ask('What is the monthly living cost?');
check('labels an estimate as an estimate, not an official figure',
  /not an official figure/i.test(cost), cost.slice(0, 110));

// The behaviour that matters most: admitting ignorance. The question is
// deliberately free of any indexed term — an earlier draft asked about the
// "tallest hostel", which legitimately matched the accommodation topic and
// so tested nothing.
const unknown = await ask('Who is the current dean of the faculty?');
check('declines a question it cannot source',
  /don.t have a verified answer/i.test(unknown), unknown.slice(0, 110));

check('a declined question still routes to a human',
  /\/counseling/.test(unknown));

// The visitor's own words must come back as text, never as markup.
await ask('<img src=x onerror=alert(1)> what are the fees');
const injected = await page.evaluate(() => {
  const u = document.querySelectorAll('#chat-msgs .chat-msg.user');
  const last = u[u.length - 1];
  return { html: last ? last.innerHTML : '', imgs: document.querySelectorAll('#chat-msgs img').length };
});
check('a question containing markup is rendered as text',
  injected.imgs === 0 && /&lt;img/.test(injected.html), injected.html.slice(0, 80));

check('no uncaught JS errors during the exchange', pageErrors.length === 0,
  pageErrors.slice(0, 2).join(' | '));

// Every college in the dataset should be reachable by name, or the "27
// colleges answerable" claim is not true.
let reachable = 0;
const unreachable = [];
for (const c of colleges) {
  const short = c.name.split('(')[0].trim();
  await ask(`Tell me about ${short}`);
  const text = await lastBotText();
  // The answer opens with the college's own name, so compare on that.
  if (text.trim().startsWith(c.name)) reachable++;
  else unreachable.push(short);
}
check(`all ${colleges.length} colleges are reachable by name`,
  reachable === colleges.length, `${reachable}/${colleges.length} · missed: ${unreachable.join(', ')}`);

/* ── report ────────────────────────────────────────────────────────────── */

console.log('\n══════ ADMISSIONS ASSISTANT ══════');
let fail = 0;
for (const r of results) {
  if (!r.pass) fail++;
  console.log(`${r.pass ? '✅' : '❌'}  ${r.name}${r.pass || !r.detail ? '' : '\n      → ' + r.detail}`);
}
console.log(`\n${results.length - fail}/${results.length} passed`);

await browser.close();
server.close();
process.exit(fail ? 1 : 0);
