// Builds a real .xlsx in memory — a zip of XML, written by hand.
//
// The alternative was committing a spreadsheet. The file this feature was built
// from holds 41 real students' marks and their parents' mobile numbers, and
// that does not belong in a repository; a redacted copy would still be a
// binary nobody can review in a diff. So the fixture is generated, from source
// anyone can read, with invented people in it.
//
// It mirrors the awkward parts of the real sheet exactly: three title rows, a
// merged paper-group row above the header, blank spacer columns between paper
// blocks, per-paper Total and Result columns, two parents each with their own
// "Cell Number" column, an absent candidate, a deliberately mistyped total, a
// handful of unusable phone numbers, and one paper whose four subjects carry no
// maximum marks at all.
//
// Entries are STORED, not deflated: a zip writer without a compressor is forty
// lines, and public/assets/js/xlsx-parse.js reads both.

const CRC = (() => {
  const t = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c;
  }
  return t;
})();

function crc32(buf) {
  let c = -1;
  for (let i = 0; i < buf.length; i++) c = CRC[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ -1) >>> 0;
}

function zip(files) {
  const chunks = [], central = [];
  let offset = 0;
  for (const { name, data } of files) {
    const nameBuf = Buffer.from(name, 'utf8');
    const body = Buffer.from(data, 'utf8');
    const crc = crc32(body);

    const local = Buffer.alloc(30 + nameBuf.length);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);          // version needed
    local.writeUInt16LE(0, 6);           // flags
    local.writeUInt16LE(0, 8);           // stored
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(body.length, 18);
    local.writeUInt32LE(body.length, 22);
    local.writeUInt16LE(nameBuf.length, 26);
    nameBuf.copy(local, 30);
    chunks.push(local, body);

    const cd = Buffer.alloc(46 + nameBuf.length);
    cd.writeUInt32LE(0x02014b50, 0);
    cd.writeUInt16LE(20, 4); cd.writeUInt16LE(20, 6);
    cd.writeUInt16LE(0, 8); cd.writeUInt16LE(0, 10);
    cd.writeUInt32LE(crc, 16);
    cd.writeUInt32LE(body.length, 20);
    cd.writeUInt32LE(body.length, 24);
    cd.writeUInt16LE(nameBuf.length, 28);
    cd.writeUInt32LE(offset, 42);
    nameBuf.copy(cd, 46);
    central.push(cd);

    offset += local.length + body.length;
  }
  const dir = Buffer.concat(central);
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);
  eocd.writeUInt16LE(files.length, 8);
  eocd.writeUInt16LE(files.length, 10);
  eocd.writeUInt32LE(dir.length, 12);
  eocd.writeUInt32LE(offset, 16);
  return Buffer.concat([...chunks, dir, eocd]);
}

const COL = (n) => {
  let s = '';
  n += 1;
  while (n > 0) { const r = (n - 1) % 26; s = String.fromCharCode(65 + r) + s; n = (n - r - 1) / 26; }
  return s;
};

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function sheetXml(rows, merges) {
  const body = rows.map((cells, r) => {
    const tds = cells.map((v, c) => {
      if (v === null || v === undefined || v === '') return '';
      const ref = COL(c) + (r + 1);
      return typeof v === 'number'
        ? `<c r="${ref}"><v>${v}</v></c>`
        : `<c r="${ref}" t="inlineStr"><is><t>${esc(v)}</t></is></c>`;
    }).join('');
    return `<row r="${r + 1}">${tds}</row>`;
  }).join('');
  const mc = merges.length
    ? `<mergeCells count="${merges.length}">` +
      merges.map((m) => `<mergeCell ref="${m}"/>`).join('') + '</mergeCells>'
    : '';
  return `<?xml version="1.0" encoding="UTF-8"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
<sheetData>${body}</sheetData>${mc}</worksheet>`;
}

/** The invented cohort. Marks are arbitrary but internally consistent. */
const STUDENTS = [
  // name, ANA PHYSIO BIO MICRO PATHO PHARM | EPI DEMO BIOSTAT | HPE FHN EOH MSA
  ['Aarav Sharma',   [8, 10.5, 6, 10, 12, 13.5], [20, 4, 3], [17, 11, 11.5, 5],
   'Rajesh Sharma', '+919812345678', 'Meena Sharma', '+919812345679'],
  ['Bhavna Iyer',    [16, 14, 15, 13, 12, 15],   [22, 9, 12], [21, 12, 14, 7],
   'Suresh Iyer', '+919812345680', 'Latha Iyer', '9812345681'],
  ['Chirag Patel',   [1.5, 2, 0, 0.5, 1.75, 0],  [18, 1, 4.5], [15, 12, 10, 6.5],
   'Mahesh Patel', '+9109960943724', 'Dipali Patel', ''],
  ['Divya Nair',     [10, 8.5, 10, 6, 7.25, 13.5], [7.5, 5, 3], [15, 4, 12, 7],
   'Ramesh Nair', '+919812345682', 'Sunita Nair', '+919812345683'],
  ['Esha Gupta',     ['AB', 'AB', 'AB', 'AB', 'AB', 'AB'], ['AB', 'AB', 'AB'], ['AB', 'AB', 'AB', 'AB'],
   'Sunil Gupta', '+919812345684', 'Rammi Gupta', '+919812345685'],
  ['Farhan Ali',     [10, 10, 12.5, 11, 13, 15.5], [28, 10.5, 12.5], [17.5, 12.5, 14, 7],
   'Imran Ali', '+919812345686', 'Nadia Ali', '+919812345687'],
];

export function buildFixture() {
  const header = ['S.N.', 'Batch', 'Student ID', 'Student Name', 'Category',
    'ANA(20)', 'PHYSIO(20)', 'BIO(20)', 'MICRO(20)', 'PATHO(20)', 'PHARM(20)',
    'Total(120)', 'Result', null,
    'EPIDEMIOLOGY(40)', 'DEMOGRAPHY(16)', 'BIO-STATISTICS(24)', 'Total(80)', 'Result', null,
    'HP&E', 'FH&N', 'E&OH', 'MS&A', 'Total(80)', 'Result',
    "Father's Name", 'Cell Number', "Mother's Name", 'Cell Number'];

  const group = new Array(30).fill(null);
  group[5] = 'IBMS-MSK(120/60)';
  group[14] = 'Com Med-I(80/40)';
  group[20] = 'Com Med-II(80/40)';

  const rows = [
    ['TEST MEDICAL COLLEGE'],
    ['Bharatpur-05 Chitwan'],
    ['MBBS 1st year 2nd internal Assessment exam 2083/04/15,19,22 Result:2083/05/18'],
    group,
    header,
  ];

  const sum = (a) => a.reduce((t, v) => t + (typeof v === 'number' ? v : 0), 0);

  STUDENTS.forEach((s, i) => {
    const [name, p1, p2, p3, fName, fPhone, mName, mPhone] = s;
    const row = new Array(30).fill(null);
    row[0] = i + 1; row[1] = '2025'; row[2] = 'MBBS' + (1800 + i); row[3] = name;
    row[4] = 'FOREIGNER';
    p1.forEach((v, j) => { row[5 + j] = v; });
    // Chirag's paper total is mistyped by 10 — the validator must catch it.
    row[11] = sum(p1) + (name === 'Chirag Patel' ? 10 : 0);
    row[12] = sum(p1) >= 60 ? 'Pass' : 'Fail';
    p2.forEach((v, j) => { row[14 + j] = v; });
    row[17] = sum(p2); row[18] = sum(p2) >= 40 ? 'Pass' : 'Fail';
    p3.forEach((v, j) => { row[20 + j] = v; });
    row[24] = sum(p3); row[25] = sum(p3) >= 40 ? 'Pass' : 'Fail';
    row[26] = fName; row[27] = fPhone; row[28] = mName; row[29] = mPhone;
    rows.push(row);
  });

  const files = [
    { name: '[Content_Types].xml', data: `<?xml version="1.0" encoding="UTF-8"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
<Default Extension="xml" ContentType="application/xml"/>
<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
</Types>` },
    { name: '_rels/.rels', data: `<?xml version="1.0" encoding="UTF-8"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>` },
    { name: 'xl/workbook.xml', data: `<?xml version="1.0" encoding="UTF-8"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
<sheets><sheet name="indian" sheetId="1" r:id="rId1"/></sheets></workbook>` },
    { name: 'xl/_rels/workbook.xml.rels', data: `<?xml version="1.0" encoding="UTF-8"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
</Relationships>` },
    { name: 'xl/worksheets/sheet1.xml',
      data: sheetXml(rows, ['A1:Y1', 'A2:Y2', 'A3:Y3', 'F4:M4', 'O4:S4', 'U4:Z4']) },
  ];
  return { buffer: zip(files), students: STUDENTS.length, subjects: 13 };
}
