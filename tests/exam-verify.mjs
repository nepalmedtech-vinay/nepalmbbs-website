// Exam intelligence: the client pipeline, end to end, in a real browser.
//
// What is worth asserting here is not "the page renders". It is the things
// that are quiet when they break and expensive when they do:
//
//   - that the messy shape of a real college result sheet is read correctly —
//     merged paper headings, spacer columns, two parents each with their own
//     "Cell Number" column;
//   - that a subject with no maximum on the sheet BLOCKS the import instead of
//     being given a plausible one;
//   - that a total the sheet gets wrong is caught by adding up its own columns;
//   - that a phone number is never silently repaired;
//   - that the flyer a parent receives actually contains ink.
//
// The spreadsheet is generated (tests/lib/xlsx-fixture.mjs) with invented
// people in it. The file this feature was built from holds 41 real students'
// marks and their parents' mobile numbers and is not in this repository. To run
// the suite against a real sheet as well, point EXAM_SHEET at one.
import { chromium } from 'playwright';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { buildFixture } from './lib/xlsx-fixture.mjs';

const REPO = path.resolve(import.meta.dirname, '..');
const DIST = path.join(REPO, 'dist');
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css',
               '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png',
               '.webp': 'image/webp', '.woff2': 'font/woff2', '.xml': 'application/xml' };

const results = [];
const check = (name, pass, detail = '') => results.push({ name, pass, detail });

/* ── 1. the edge functions parse ────────────────────────────────────────
   `node --check` wraps a file as CommonJS and so accepts a broken ES module —
   it did, once, on whatsapp-webhook. Importing is the check that works: a
   SyntaxError is a bug, and "Deno is not defined" means it parsed. */
for (const f of ['_shared/http.ts', 'ai-gateway/index.ts',
                 'whatsapp-send/index.ts', 'whatsapp-webhook/index.ts']) {
  const file = path.join(REPO, 'supabase/functions', f);
  let verdict = 'parsed';
  try { await import(pathToFileURL(file).href); }
  catch (e) { if (e instanceof SyntaxError) verdict = e.message; }
  check(`edge function parses: ${f}`, verdict === 'parsed', verdict);
}

/* ── 2. no secret is in anything the browser downloads ─────────────────── */
const clientFiles = fs.readdirSync(path.join(REPO, 'public/assets/js'))
  .filter((f) => f.endsWith('.js'))
  .map((f) => path.join(REPO, 'public/assets/js', f));
const SECRET_SHAPES = [
  [/\bsk-[A-Za-z0-9_-]{20,}/, 'an OpenAI-style key'],
  [/\bsk-ant-[A-Za-z0-9_-]{20,}/, 'an Anthropic key'],
  [/\bAIza[0-9A-Za-z_-]{30,}/, 'a Google API key'],
  [/\bEAA[A-Za-z0-9]{40,}/, 'a Meta access token'],
];
let leaked = [];
for (const f of clientFiles) {
  const src = fs.readFileSync(f, 'utf8');
  for (const [re, what] of SECRET_SHAPES) {
    if (re.test(src)) leaked.push(`${path.basename(f)}: ${what}`);
  }
}
check('no provider key ships to the browser', leaked.length === 0, leaked.join(', '));

/* ── 3. the browser pipeline ────────────────────────────────────────────── */
const server = http.createServer((req, res) => {
  const u = decodeURIComponent(req.url.split('?')[0]);
  let f = path.join(DIST, u);
  if (fs.existsSync(f) && fs.statSync(f).isDirectory()) f = path.join(f, 'index.html');
  else if (!fs.existsSync(f) && fs.existsSync(f + '/index.html')) f = f + '/index.html';
  if (!f.startsWith(DIST) || !fs.existsSync(f)) { res.writeHead(404); return res.end('nf'); }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream' });
  res.end(fs.readFileSync(f));
});
await new Promise((r) => server.listen(0, r));
const PORT = server.address().port;

const browser = await chromium.launch({
  executablePath: process.env.CHROME_PATH ||
    '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
});
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
// Nothing in this suite should reach a database. If a call escapes, it fails
// loudly rather than hanging.
await ctx.route('**/rest/v1/**', (r) => r.fulfill({ status: 500, body: '[]' }));
await ctx.route('**/functions/v1/**', (r) => r.fulfill({ status: 500, body: '{}' }));
const page = await ctx.newPage();
// Uncaught exceptions only. Failed *requests* are expected here: this suite
// mocks PostgREST to 500 on purpose, and the sandbox has no route to Google
// Fonts. Counting those as failures would make the check noise rather than a
// signal.
const consoleErrors = [];
page.on('pageerror', (e) => consoleErrors.push('uncaught: ' + e.message));
page.on('console', (m) => {
  if (m.type() !== 'error') return;
  const t = m.text();
  if (/Failed to load resource|ERR_CONNECTION|ERR_NAME_NOT_RESOLVED|net::/.test(t)) return;
  consoleErrors.push(t);
});

await page.goto(`http://localhost:${PORT}/staff/exams`, { waitUntil: 'load' });

check('the console loads its modules',
  await page.evaluate(() => !!(window.XlsxRead && window.ExamMapping &&
                               window.ExamApi && window.ReportCard)));

/* CSP: the site's script-src carries no 'unsafe-inline', so an on* attribute
   is dead markup that looks alive. */
const inlineHandlers = await page.evaluate(() =>
  [...document.querySelectorAll('*')]
    .flatMap((n) => [...n.attributes].map((a) => a.name))
    .filter((n) => n.startsWith('on')).length);
check('no inline on* handlers on the page', inlineHandlers === 0, String(inlineHandlers));

/* ── the fixture, through the reader and the mapper ─────────────────────── */
const fixture = buildFixture();
await page.evaluate(async (b64) => {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  window.__file = new File([bytes], 'sample-result.xlsx',
    { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
}, fixture.buffer.toString('base64'));

const read = await page.evaluate(async () => {
  const book = await window.XlsxRead.readFile(window.__file);
  const sheet = book.sheets[0];
  const map = window.ExamMapping.detect(sheet);
  window.__sheet = sheet; window.__map = map;
  return {
    sheets: book.sheets.length, sheetName: sheet.name,
    merges: sheet.merges.length,
    ok: map.ok, headerRow: map.headerRow, groupRow: map.groupRow,
    firstDataRow: map.firstDataRow, lastDataRow: map.lastDataRow,
    institution: map.institution, exam: map.exam, fields: map.fields,
    papers: map.papers.map((p) => ({
      name: p.name, max: p.max_marks, pass: p.pass_marks,
      subjects: p.subjects.map((s) => ({ name: s.name, max: s.max_marks })),
      hasTotal: p.totalCol !== undefined, hasResult: p.resultCol !== undefined,
    })),
  };
});

check('reads a zipped .xlsx with no library',
  read.sheets === 1 && read.sheetName === 'indian' && read.merges === 6,
  JSON.stringify({ sheets: read.sheets, name: read.sheetName, merges: read.merges }));
check('finds the header under three title rows',
  read.ok && read.headerRow === 4 && read.groupRow === 3,
  `header ${read.headerRow}, group ${read.groupRow}`);
check('reads the college off the title block',
  read.institution.name === 'TEST MEDICAL COLLEGE' &&
  read.institution.address === 'Bharatpur-05 Chitwan',
  JSON.stringify(read.institution));
check('parses the exam title, keeping BS dates as written',
  read.exam.name === '2nd Internal Assessment' && read.exam.sequence_no === 2 &&
  read.exam.held_label === '2083/04/15,19,22' && read.exam.result_label === '2083/05/18' &&
  read.exam.year_label === 'MBBS 1st Year',
  JSON.stringify(read.exam));
check('splits three merged paper groups',
  read.papers.length === 3 &&
  read.papers[0].name === 'IBMS-MSK' && read.papers[0].max === 120 && read.papers[0].pass === 60 &&
  read.papers[1].name === 'Com Med-I' && read.papers[2].name === 'Com Med-II',
  read.papers.map((p) => p.name).join(', '));
check('assigns every subject to its own paper',
  read.papers[0].subjects.length === 6 && read.papers[1].subjects.length === 3 &&
  read.papers[2].subjects.length === 4,
  read.papers.map((p) => p.subjects.length).join('/'));
check('finds each paper\'s own Total and Result column',
  read.papers.every((p) => p.hasTotal && p.hasResult));
/* The one that matters most in the mapping layer: two columns both headed
   "Cell Number", and only their position says whose number each is. */
check('tells the father\'s number from the mother\'s by position',
  read.fields.father_name === 26 && read.fields.father_phone === 27 &&
  read.fields.mother_name === 28 && read.fields.mother_phone === 29,
  JSON.stringify(read.fields));

/* ── validation ─────────────────────────────────────────────────────────── */
const first = await page.evaluate(() => {
  const out = window.ExamMapping.buildPayload(window.__sheet, window.__map,
    { filename: 'sample-result.xlsx' });
  window.__out = out;
  const kinds = {};
  out.issues.forEach((i) => { kinds[i.severity + ':' + i.kind] = (kinds[i.severity + ':' + i.kind] || 0) + 1; });
  return { counts: out.counts, kinds,
           unknown: out.issues.filter((i) => i.kind === 'subject_max_unknown') };
});

check('refuses to invent a maximum for the four unlabelled subjects',
  first.kinds['error:subject_max_unknown'] === 4 && first.counts.errors >= 4,
  JSON.stringify(first.kinds));
check('shows the highest mark in an unlabelled column as a hint, not a value',
  first.unknown.every((u) => typeof u.observed_max === 'number' && u.paper_max === 80),
  JSON.stringify(first.unknown.map((u) => u.observed_max)));
check('catches the paper total the sheet gets wrong',
  first.kinds['error:total_mismatch'] === 1,
  JSON.stringify(first.kinds['error:total_mismatch']));
check('flags the unusable and the country-code-less parent numbers',
  first.kinds['warning:parent_phone_suspect'] === 2 &&
  first.kinds['warning:parent_phone_missing'] === 1,
  JSON.stringify({ suspect: first.kinds['warning:parent_phone_suspect'],
                   missing: first.kinds['warning:parent_phone_missing'] }));

/* Supply the four maxima, as a coordinator would, and the import unblocks. */
const second = await page.evaluate(() => {
  const paper = window.__map.papers[2];
  [25, 15, 25, 15].forEach((max, i) => { paper.subjects[i].max_marks = max; });
  const out = window.ExamMapping.buildPayload(window.__sheet, window.__map,
    { filename: 'sample-result.xlsx' });
  window.__payload = out.payload;
  const absent = out.payload.students.find((s) => s.full_name === 'Esha Gupta');
  return {
    counts: out.counts,
    errorKinds: [...new Set(out.issues.filter((i) => i.severity === 'error').map((i) => i.kind))],
    batch: out.payload.batch, exam: out.payload.exam,
    students: out.payload.students.length,
    absentMarks: absent ? absent.marks.length : 0,
    absentAllAbsent: absent ? absent.marks.every((m) => m.is_absent === true) : false,
    guardians: out.payload.students[0].guardians,
    suspect: out.payload.students.find((s) => s.full_name === 'Bhavna Iyer')
      .guardians.find((g) => g.relation === 'mother'),
  };
});

check('with the maxima supplied, only the sheet\'s own error is left',
  second.errorKinds.length === 1 && second.errorKinds[0] === 'total_mismatch',
  second.errorKinds.join(', '));
check('builds every student and every mark',
  second.students === fixture.students &&
  second.counts.marks === fixture.students * fixture.subjects,
  `${second.students} students, ${second.counts.marks} marks`);
check('an absent candidate is absent in all 13 subjects, not zero-scored',
  second.absentMarks === 13 && second.absentAllAbsent,
  `${second.absentMarks} marks, all absent: ${second.absentAllAbsent}`);
check('carries the batch and exam through to the payload',
  second.batch.name === '2025' && second.batch.course === 'MBBS' &&
  second.exam.name === '2nd Internal Assessment' && second.exam.sequence_no === 2,
  JSON.stringify(second.batch));
check('a ten-digit number is dialled as +91 but still marked suspect',
  second.suspect.phone_raw === '9812345681' &&
  second.suspect.phone_e164 === '+919812345681' &&
  second.suspect.phone_status === 'suspect',
  JSON.stringify(second.suspect));

/* ── phone rules, case by case ──────────────────────────────────────────── */
const phones = await page.evaluate(() => {
  const n = window.ExamMapping.normalisePhone;
  return {
    good: n('+919812345678'), nepal: n('+9779812345678'),
    trunk: n('+9109960943724'), tooLong: n('+9183800898754'),
    bare: n('9812345678'), junk: n('6919027143406'), blank: n('   '),
  };
});
check('a well-formed Indian or Nepali number is valid and unchanged',
  phones.good.status === 'valid' && phones.good.e164 === '+919812345678' &&
  phones.nepal.status === 'valid');
check('a malformed number is kept exactly as written, never repaired',
  ['trunk', 'tooLong', 'junk'].every((k) =>
    phones[k].status === 'suspect' && phones[k].e164 === null) &&
  phones.trunk.raw === '+9109960943724',
  JSON.stringify({ trunk: phones.trunk.e164, tooLong: phones.tooLong.e164 }));
check('a blank number is missing, not suspect', phones.blank.status === 'missing');

/* ── the flyer ──────────────────────────────────────────────────────────── */
const flyer = await page.evaluate(async () => {
  // A report exactly as exam_report() returns one.
  const report = {
    institution: { name: 'Test Medical College', address: 'Bharatpur-05 Chitwan' },
    student: { id: 's1', name: 'Aarav Sharma', code: 'MBBS1800', serial_no: 1,
               category: 'FOREIGNER', batch: { name: '2025', course: 'MBBS', year_label: 'MBBS 1st Year' } },
    exam: { id: 'e1', name: '2nd Internal Assessment', held_label: '2083/04/15,19,22' },
    guardians: [{ id: 'g1', relation: 'father', name: 'Rajesh Sharma',
                  phone_e164: '+919812345678', phone_status: 'valid' },
                { id: 'g2', relation: 'mother', name: 'Meena Sharma',
                  phone_e164: '+919812345679', phone_status: 'valid' }],
    papers: [{ id: 'p1', name: 'IBMS-MSK', position: 0, max_marks: 120, pass_marks: 60,
               obtained: 60, percentage: 50, passed: true,
               subjects: [
                 { id: 'x1', name: 'ANA', position: 0, max_marks: 20, obtained: 8,
                   is_absent: false, percentage: 40, batch_avg: 9.4, delta_percentage: -5 },
                 { id: 'x2', name: 'PHYSIO', position: 1, max_marks: 20, obtained: 16,
                   is_absent: false, percentage: 80, batch_avg: 11.2, delta_percentage: 12 },
                 { id: 'x3', name: 'BIO', position: 2, max_marks: 20, obtained: 6,
                   is_absent: true, percentage: null, batch_avg: 8.1 }] }],
    totals: { obtained: 60, max_marks: 120, percentage: 50, rank: 2, cohort_size: 6 },
    grade: { grade: 'B', label: 'Satisfactory' },
    cohort: { avg_percentage: 47.5, students: 6 },
    progress: { prev_percentage: 44, delta_percentage: 6, direction: 'improved',
                prev_exam: '1st Internal Assessment' },
    strengths: [{ subject: 'PHYSIO', percentage: 80, obtained: 16, max_marks: 20, vs_batch: 24 }],
    attention: [], absences: ['BIO'],
    history: [{ exam: '1st Internal Assessment', percentage: 44 },
              { exam: '2nd Internal Assessment', percentage: 50 }],
    computed_at: '2026-09-05T09:00:00Z',
  };
  const model = window.ReportCard.buildModel(report);
  const canvas = await window.ReportCard.toCanvas(model, null, {});
  const ctx = canvas.getContext('2d');
  const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
  // How much of the flyer is not blank paper. A layout bug that draws nothing,
  // or draws everything on top of itself, shows up here and nowhere else.
  let ink = 0;
  for (let i = 0; i < data.length; i += 4 * 97) {
    if (data[i] < 250 || data[i + 1] < 250 || data[i + 2] < 250) ink++;
  }
  const html = window.ReportCard.toHtml(model, null, {});
  const morning = window.ReportCard.parentMessage(model, { relation: 'mother' },
    new Date('2026-09-05T04:00:00'));
  const evening = window.ReportCard.parentMessage(model, { relation: 'father' },
    new Date('2026-09-05T19:00:00'));
  return {
    width: canvas.width, height: canvas.height,
    inkRatio: ink / (data.length / (4 * 97)),
    htmlText: html.textContent,
    morning, evening,
    suggestions: window.ReportCard.suggestions(model),
  };
});

check('the flyer is a portrait image with real content on it',
  flyer.width === 1080 && flyer.height > 700 && flyer.height < 2400 &&
  flyer.inkRatio > 0.02,
  `${flyer.width}x${flyer.height}, ink ${(flyer.inkRatio * 100).toFixed(1)}%`);
check('the flyer carries the student, the exam and the figures',
  ['Aarav Sharma', '2nd Internal Assessment', 'MBBS1800']
    .every((s) => flyer.htmlText.includes(s)) &&
  flyer.htmlText.includes('50%') && flyer.htmlText.includes('2 of 6'),
  flyer.htmlText.slice(0, 80));
check('an absence is written as an absence on the card',
  flyer.htmlText.includes('did not sit') && !/BIO\s*—\s*0/.test(flyer.htmlText));
check('the greeting follows the clock and the recipient',
  flyer.morning.startsWith('Good Morning Ma\'am,') &&
  flyer.evening.startsWith('Good Evening Sir,'),
  flyer.morning.split('\n')[0] + ' / ' + flyer.evening.split('\n')[0]);
check('the standard message states only figures from the payload',
  flyer.morning.includes('60 out of 120') && flyer.morning.includes('50%') &&
  flyer.morning.includes('ranked 2 of 6') && flyer.morning.includes('PHYSIO'),
  flyer.morning.replace(/\n/g, ' ').slice(0, 120));
check('suggestions are produced without a model',
  flyer.suggestions.length > 0 && flyer.suggestions.some((s) => s.includes('BIO')),
  flyer.suggestions.join(' | ').slice(0, 100));

check('nothing threw an uncaught exception while doing all of that',
  consoleErrors.length === 0, consoleErrors.slice(0, 2).join(' | '));

/* ── optional: the same run against a real sheet ────────────────────────── */
if (process.env.EXAM_SHEET && fs.existsSync(process.env.EXAM_SHEET)) {
  const real = fs.readFileSync(process.env.EXAM_SHEET);
  const out = await page.evaluate(async (b64) => {
    const bin = atob(b64);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    const book = await window.XlsxRead.readFile(new File([bytes], 'real.xlsx'));
    const map = window.ExamMapping.detect(book.sheets[0]);
    if (!map.ok) return { ok: false, reason: map.reason };
    const built = window.ExamMapping.buildPayload(book.sheets[0], map, {});
    return { ok: true, papers: map.papers.length, students: built.counts.students,
             errors: built.counts.errors };
  }, real.toString('base64'));
  check(`reads the supplied sheet (${path.basename(process.env.EXAM_SHEET)})`,
    out.ok && out.students > 0,
    out.ok ? `${out.students} students, ${out.papers} papers, ${out.errors} blocking issue(s)`
           : out.reason);
}

await browser.close();
server.close();

const failed = results.filter((r) => !r.pass);
for (const r of results) {
  console.log(`${r.pass ? '✅' : '❌'} ${r.name}${r.detail ? '  — ' + r.detail : ''}`);
}
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
process.exit(failed.length ? 1 : 0);
