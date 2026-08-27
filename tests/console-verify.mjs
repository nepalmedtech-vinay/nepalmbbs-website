// The two new screens: the student portal and the counselor console.
//
// Both talk to PostgREST, so both are tested against a mocked PostgREST rather
// than a live project -- the migrations are written but not yet applied, and a
// test that needs the production database is a test nobody runs.
//
// What is worth asserting here is not "the page renders". It is the boundaries:
// that a wrong token and an expired one are indistinguishable to the person
// holding them, that the token does not stay in the address bar, that internal
// notes never appear on the student's screen, and that a name containing markup
// is drawn as text. Those are the things that are quiet when they break.
import { chromium } from 'playwright';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

const REPO = path.resolve(import.meta.dirname, '..');
const DIST = path.join(REPO, 'dist');
let PORT = 0;   // 0 = let the OS pick: a stray server from an
                // earlier run should not fail a suite it has
                // nothing to do with.
const MIME = { '.html':'text/html', '.js':'text/javascript', '.css':'text/css',
               '.json':'application/json', '.svg':'image/svg+xml', '.png':'image/png',
               '.webp':'image/webp', '.woff2':'font/woff2', '.xml':'application/xml' };

const server = http.createServer((req, res) => {
  const u = decodeURIComponent(req.url.split('?')[0]);
  let f = path.join(DIST, u);
  if (fs.existsSync(f) && fs.statSync(f).isDirectory()) f = path.join(f, 'index.html');
  else if (!fs.existsSync(f) && fs.existsSync(f + '/index.html')) f = f + '/index.html';
  if (!f.startsWith(DIST) || !fs.existsSync(f)) { res.writeHead(404); return res.end('nf'); }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream' });
  res.end(fs.readFileSync(f));
});
await new Promise(r => server.listen(0, r));
PORT = server.address().port;

const results = [];
const check = (name, pass, detail = '') => results.push({ name, pass, detail });

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });

const GOOD = 'a'.repeat(64);
const APP = {
  student_name: 'Riya Sharma', stage: 'counselling', intake_year: 2026,
  allotted_college: null, updated_at: '2026-08-01T10:00:00Z',
  documents: [
    { kind: 'neet_scorecard', state: 'verified' },
    { kind: 'passport', state: 'pending' },
    { kind: 'marksheet_12', state: 'rejected', rejectReason: 'Photo was blurred' }
  ],
  timeline: [{ kind: 'note', body: 'Documents checked with the college.', at: '2026-08-01T10:00:00Z' }]
};

/* ── a fresh context with the PostgREST surface mocked ─────────────────── */
async function makeCtx({ portalRows = null, staffRow = null, apps = [], tasks = [], leads = [],
                         convertFails = false } = {}) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const seen = [];
  const json = (route, body, status = 200) =>
    route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });

  // Catch-all FIRST: Playwright matches routes in reverse registration order,
  // so a broad pattern registered last swallows every specific one.
  await ctx.route('**/rest/v1/**', r => json(r, []));
  await ctx.route('**/rest/v1/rpc/portal_application', async route => {
    seen.push(['rpc', route.request().postData()]);
    return json(route, portalRows === null ? [] : portalRows);
  });
  await ctx.route('**/rest/v1/staff**', r => json(r, staffRow ? [staffRow] : []));
  await ctx.route('**/rest/v1/applications**', async route => {
    const req = route.request();
    if (req.method() !== 'GET') { seen.push([req.method(), req.url(), req.postData()]); return json(route, []); }
    return json(route, apps);
  });
  await ctx.route('**/rest/v1/tasks**', r => json(r, tasks));
  await ctx.route('**/rest/v1/leads**', async route => {
    // The console asks only for unconverted enquiries; once one is converted
    // the server stops returning it, which is what this models.
    seen.push(['leads', route.request().url()]);
    return json(route, leads);
  });
  await ctx.route('**/rest/v1/rpc/convert_lead_to_application', async route => {
    seen.push(['convert', route.request().postData()]);
    if (convertFails) return json(route, { message: 'boom' }, 500);
    leads = [];                       // converted: it leaves the queue
    return json(route, 'app-new');
  });
  await ctx.route('**/auth/v1/token**', r =>
    json(r, { access_token: 'JWT', refresh_token: 'R', expires_in: 3600,
              user: { id: 'staff-1', email: 'c@nepalmbbs.in' } }));
  await ctx.route('**/auth/v1/logout', r => r.fulfill({ status: 204, body: '' }));
  return { ctx, seen };
}

/* ══ portal ═══════════════════════════════════════════════════════════════ */
{
  const { ctx } = await makeCtx();
  const page = await ctx.newPage();
  await page.goto(`http://localhost:${PORT}/portal`, { waitUntil: 'load' });
  await page.waitForTimeout(400);
  check('portal with no token shows the gate',
    await page.locator('#p-gate').isVisible() && !(await page.locator('#p-app').isVisible()));
  await ctx.close();
}

{
  // Wrong token and expired token both return zero rows from the function.
  const { ctx } = await makeCtx({ portalRows: [] });
  const page = await ctx.newPage();
  await page.goto(`http://localhost:${PORT}/portal?t=wrongwrong`, { waitUntil: 'load' });
  await page.waitForTimeout(500);
  const err = (await page.locator('#p-gate-err').textContent()) || '';
  check('a bad token is refused', /not valid|expired/i.test(err), err.slice(0, 60));
  // Both possibilities in one breath: the person holding a bad link learns
  // nothing about whether the token exists.
  check('the message does not say which of the two it was',
    /not valid, or it has expired/i.test(err) &&
    !/no such|unknown|already expired|does not exist/i.test(err));
  await ctx.close();
}

{
  const { ctx } = await makeCtx({ portalRows: [APP] });
  const page = await ctx.newPage();
  await page.goto(`http://localhost:${PORT}/portal?t=${GOOD}`, { waitUntil: 'load' });
  await page.waitForTimeout(500);

  check('a valid token opens the application',
    (await page.locator('#p-name').textContent()) === 'Riya Sharma');
  check('the stage is shown by name, not by enum',
    /counselling/i.test(await page.locator('#p-stage').textContent()),
    await page.locator('#p-stage').textContent());

  const marked = await page.locator('#p-timeline li.on').count();
  check('the timeline marks every step up to the current one', marked === 6, `${marked} of 8`);

  const docText = await page.locator('#p-docs').textContent();
  check('a rejected document says why', /blurred/i.test(docText));
  check('outstanding documents are counted',
    /2 documents still needed/i.test(await page.locator('#p-doc-summary').textContent()),
    await page.locator('#p-doc-summary').textContent());

  check('the token is taken out of the address bar',
    !page.url().includes(GOOD) && !page.url().includes('?t='), page.url());
  // localStorage legitimately holds the theme preference; what must never be
  // there is the token, because localStorage outlives the tab.
  check('the token is kept for the tab only',
    (await page.evaluate(() => sessionStorage.getItem('nmb_portal_token'))) === GOOD &&
    !(await page.evaluate(() => JSON.stringify(Object.entries(localStorage)))).includes(GOOD));

  // The portal reads through portal_application(), whose projection has no
  // notes column. Assert the screen really has none of it.
  const bodyText = await page.locator('body').innerText();
  check('internal notes are nowhere on the student screen',
    !/internal note/i.test(bodyText));

  await page.locator('#p-signout').click();
  await page.waitForLoadState('load');   // sign-out reloads the page
  await page.waitForTimeout(500);
  check('signing out forgets the token',
    (await page.evaluate(() => sessionStorage.getItem('nmb_portal_token'))) === null &&
    await page.locator('#p-gate').isVisible());
  await ctx.close();
}

/* ══ staff console ════════════════════════════════════════════════════════ */
const APPS = [
  { id: 'app-1', student_name: 'Riya Sharma', contact_number: '9876543210',
    city: 'Lucknow', neet_score: 480, stage: 'counselling', assigned_to: 'staff-1',
    next_action_at: '2020-01-01T00:00:00Z', updated_at: '2026-08-01T10:00:00Z' },
  { id: 'app-2', student_name: '<img src=x onerror=alert(1)>', contact_number: '9000000000',
    city: 'Patna', neet_score: 300, stage: 'enquiry', assigned_to: 'other',
    next_action_at: null, updated_at: '2026-08-02T10:00:00Z' },
  { id: 'app-3', student_name: 'Aman Verma', contact_number: '9111111111',
    city: 'Delhi', neet_score: 610, stage: 'admitted', assigned_to: 'staff-1',
    next_action_at: null, updated_at: '2026-08-03T10:00:00Z' }
];

{
  const { ctx } = await makeCtx({ staffRow: null });
  const page = await ctx.newPage();
  await page.goto(`http://localhost:${PORT}/staff`, { waitUntil: 'load' });
  await page.waitForTimeout(300);
  check('console shows the sign-in when signed out', await page.locator('#s-gate').isVisible());

  // A real account that authenticates but is not on the team.
  await page.fill('#s-email', 'stranger@example.com');
  await page.fill('#s-pass', 'correct-password');
  await page.click('#s-gate-btn');
  await page.waitForTimeout(600);
  check('a valid account that is not staff is refused',
    await page.locator('#s-gate').isVisible() && !(await page.locator('#s-console').isVisible()));
  check('and is signed back out',
    (await page.evaluate(() => sessionStorage.getItem('nmb_session_v1'))) === null);
  await ctx.close();
}

{
  const { ctx, seen } = await makeCtx({
    staffRow: { id: 'staff-1', email: 'c@nepalmbbs.in', full_name: 'Counselor', role: 'counselor' },
    apps: APPS,
    tasks: [{ id: 't-1', title: 'Call about passport', channel: 'call',
              due_at: '2020-01-01T00:00:00Z', state: 'open', application_id: 'app-1',
              applications: { student_name: 'Riya Sharma' } }],
    leads: [
      { id: 11, student_name: 'Deepak Yadav', contact_number: '9222222222',
        city: 'Varanasi', neet_score: 405, created_at: '2026-08-26T09:00:00Z' },
      { id: 12, student_name: 'Anita Roy', contact_number: '9333344444',
        city: 'Ranchi', neet_score: null, created_at: '2026-08-25T09:00:00Z' }
    ]
  });
  const page = await ctx.newPage();
  await page.goto(`http://localhost:${PORT}/staff`, { waitUntil: 'load' });
  await page.waitForTimeout(300);
  await page.fill('#s-email', 'c@nepalmbbs.in');
  await page.fill('#s-pass', 'correct-password');
  await page.click('#s-gate-btn');
  await page.waitForTimeout(700);

  check('staff sign-in opens the console', await page.locator('#s-console').isVisible());
  check('live applications exclude nothing that is still open',
    (await page.locator('#s-stat-live').textContent()) === '3',
    await page.locator('#s-stat-live').textContent());
  check('applications needing action now are counted',
    (await page.locator('#s-stat-due').textContent()) === '1');
  check('the board has one column per stage plus the cards',
    (await page.locator('#s-board .cx-col').count()) === 8 &&
    (await page.locator('#s-board .cx-item').count()) === 3,
    `${await page.locator('#s-board .cx-col').count()} cols / ${await page.locator('#s-board .cx-item').count()} cards`);

  // A name that is markup must be text on the page, not an element.
  check('a student name containing markup is drawn as text',
    (await page.locator('#s-board').evaluate(n => n.querySelectorAll('img').length)) === 0 &&
    (await page.locator('#s-board').innerText()).includes('<img src=x'));

  check('an overdue task is flagged',
    (await page.locator('#s-tasks .d-rejected').count()) === 1);

  await page.fill('#s-search', 'lucknow');
  await page.waitForTimeout(200);
  check('search filters the board',
    (await page.locator('#s-board .cx-item').count()) === 1,
    await page.locator('#s-count').textContent());
  await page.fill('#s-search', '');
  await page.waitForTimeout(200);

  await page.check('#s-mine');
  await page.waitForTimeout(200);
  check('"only mine" hides other counselors\' applications',
    (await page.locator('#s-board .cx-item').count()) === 2);
  await page.uncheck('#s-mine');
  await page.waitForTimeout(200);

  await page.locator('#s-board .cx-item').first().click();
  await page.waitForTimeout(600);
  check('clicking a card opens the detail drawer',
    await page.locator('#s-drawer').evaluate(d => d.open));
  const drawer = await page.locator('#s-drawer-body').innerText();
  check('the drawer separates internal notes from the student view',
    /internal notes/i.test(drawer) && /not in the student portal/i.test(drawer));

  await page.selectOption('#s-drawer-body select', 'allotted');
  await page.waitForTimeout(600);
  const patch = seen.find(s => s[0] === 'PATCH');
  check('changing the stage issues a PATCH with the new stage',
    !!patch && JSON.parse(patch[2]).stage === 'allotted',
    patch ? patch[2] : 'no PATCH seen');

  /* ── enquiry intake ─────────────────────────────────────────────────── */
  // The drawer from the previous block is modal and swallows clicks.
  await page.evaluate(() => document.getElementById('s-drawer').close());
  await page.waitForTimeout(200);

  check('unworked enquiries are counted',
    (await page.locator('#s-lead-count').textContent()) === '2',
    await page.locator('#s-lead-count').textContent());
  check('the console asks only for unconverted enquiries',
    seen.some(s => s[0] === 'leads' && s[1].includes('converted_application_id=is.null')),
    (seen.find(s => s[0] === 'leads') || [])[1]);
  const leadRow = await page.locator('#s-leads .cx-doc').first().innerText();
  check('an enquiry shows what the student typed',
    /Deepak Yadav/.test(leadRow) && /9222/.test(leadRow) && /NEET 405/.test(leadRow),
    leadRow.replace(/\n/g, ' · '));

  await page.locator('#s-leads button').first().click();
  await page.waitForTimeout(900);
  const conv = seen.find(s => s[0] === 'convert');
  check('starting an application calls the conversion function with the lead id',
    !!conv && JSON.parse(conv[1]).p_lead_id === 11, conv ? conv[1] : 'no call seen');
  check('a converted enquiry leaves the queue',
    (await page.locator('#s-leads .cx-empty').count()) === 1 &&
    (await page.locator('#s-lead-count').textContent()) === '0');

  await ctx.close();
}

/* ── a conversion that fails must hand the button back ────────────────── */
{
  const { ctx } = await makeCtx({
    staffRow: { id: 'staff-1', email: 'c@nepalmbbs.in', full_name: 'C', role: 'counselor' },
    apps: APPS,
    leads: [{ id: 11, student_name: 'Deepak Yadav', contact_number: '9222222222',
              city: 'Varanasi', neet_score: 405, created_at: '2026-08-26T09:00:00Z' }],
    convertFails: true
  });
  const page = await ctx.newPage();
  await page.goto(`http://localhost:${PORT}/staff`, { waitUntil: 'load' });
  await page.waitForTimeout(300);
  await page.fill('#s-email', 'c@nepalmbbs.in');
  await page.fill('#s-pass', 'x');
  await page.click('#s-gate-btn');
  await page.waitForTimeout(700);

  const btn = page.locator('#s-leads button').first();
  await btn.click();
  await page.waitForTimeout(700);

  check('a failed conversion says so rather than failing silently',
    await page.locator('#s-toast').isVisible() &&
    /try again|wait a moment/i.test(await page.locator('#s-toast').textContent()),
    await page.locator('#s-toast').textContent());
  // Without this the counselor's only way to retry is a page reload.
  check('a failed conversion gives the button back',
    !(await btn.isDisabled()) && /Start application/.test(await btn.textContent()),
    (await btn.textContent()) + ' disabled=' + await btn.isDisabled());
  check('and the enquiry stays in the queue',
    (await page.locator('#s-leads .cx-doc').count()) === 1);
  await ctx.close();
}

for (const r of results) {
  console.log(`${r.pass ? '✅' : '❌'}  ${r.name}${r.detail ? '  → ' + r.detail : ''}`);
}
const passed = results.filter(r => r.pass).length;
console.log(`\n${passed}/${results.length} passed`);

await browser.close();
server.close();
process.exit(passed === results.length ? 0 : 1);
