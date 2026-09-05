/* NepalMBBS.in — xlsx-parse.js
   Reads .xlsx / .xls(x-as-zip) / .csv / .tsv in the browser, with no library.

   Why not SheetJS: the Content-Security-Policy on this site allows no CDN and
   the build ships no bundler, so a dependency here would mean either vendoring
   a large file nobody in this repo maintains, or loosening script-src. An
   .xlsx is a ZIP of XML, the browser can inflate a raw deflate stream itself,
   and DOMParser reads the XML. That is the whole of what follows.

   What it deliberately does NOT do: evaluate formulas, apply number formats,
   or convert Excel serial dates. Cell values come out as they are stored, and
   the mapping layer decides what they mean. A parser that silently reinterprets
   a mark is a parser that can silently change one.

   Exposes window.XlsxRead.readFile(File) -> Promise<{ sheets: [...] }>
     sheet = { name, rows: [[value|null, ...], ...], merges: ['A1:Y1', ...] }
   Cell values are strings, or null for an empty cell. Row and column gaps are
   filled with null so a row's array index is its column index. */

(function (root) {
  'use strict';

  /* ── ZIP ─────────────────────────────────────────────────────────────
     Central directory only. Local headers lie about sizes when bit 3 of the
     general-purpose flag is set, and the central directory never does. */

  function u16(v, p) { return v.getUint16(p, true); }
  function u32(v, p) { return v.getUint32(p, true); }

  function findEOCD(view) {
    // The end-of-central-directory record is last, but a zip comment can push
    // it up to 64KB from the end.
    var max = Math.min(view.byteLength, 66000);
    for (var i = view.byteLength - 22; i >= view.byteLength - max && i >= 0; i--) {
      if (u32(view, i) === 0x06054b50) return i;
    }
    return -1;
  }

  function entries(buf) {
    var view = new DataView(buf);
    var eocd = findEOCD(view);
    if (eocd < 0) throw new Error('Not a zip file — is this really an .xlsx?');
    var count = u16(view, eocd + 10);
    var start = u32(view, eocd + 16);
    var out = [], p = start;
    for (var i = 0; i < count; i++) {
      if (u32(view, p) !== 0x02014b50) break;
      var method   = u16(view, p + 10);
      var compSize = u32(view, p + 20);
      var nameLen  = u16(view, p + 28);
      var extraLen = u16(view, p + 30);
      var cmtLen   = u16(view, p + 32);
      var localOff = u32(view, p + 42);
      var name = new TextDecoder().decode(new Uint8Array(buf, p + 46, nameLen));
      out.push({ name: name, method: method, compSize: compSize, localOff: localOff });
      p += 46 + nameLen + extraLen + cmtLen;
    }
    return out;
  }

  async function readEntry(buf, e) {
    var view = new DataView(buf);
    if (u32(view, e.localOff) !== 0x04034b50) throw new Error('Corrupt zip entry');
    var nameLen = u16(view, e.localOff + 26);
    var extraLen = u16(view, e.localOff + 28);
    var dataStart = e.localOff + 30 + nameLen + extraLen;
    var bytes = new Uint8Array(buf, dataStart, e.compSize);
    if (e.method === 0) return new TextDecoder().decode(bytes);
    if (e.method !== 8) throw new Error('Unsupported compression in the workbook');
    if (typeof DecompressionStream === 'undefined') {
      throw new Error('This browser cannot unzip the file. Save the sheet as CSV and upload that.');
    }
    var ds = new DecompressionStream('deflate-raw');
    var stream = new Blob([bytes]).stream().pipeThrough(ds);
    return new TextDecoder().decode(new Uint8Array(await new Response(stream).arrayBuffer()));
  }

  /* ── Sheet XML ───────────────────────────────────────────────────────── */

  function colIndex(ref) {
    // 'AB12' -> 27 (zero-based column)
    var n = 0;
    for (var i = 0; i < ref.length; i++) {
      var c = ref.charCodeAt(i);
      if (c < 65 || c > 90) break;
      n = n * 26 + (c - 64);
    }
    return n - 1;
  }

  function textOf(node) {
    // Shared strings can be split across runs (<r><t>Ann</t></r><r><t>a</t></r>)
    // and a <rPh> phonetic block must not be concatenated into the value.
    var out = '', ts = node.getElementsByTagName('t');
    for (var i = 0; i < ts.length; i++) {
      if (ts[i].parentNode && ts[i].parentNode.nodeName === 'rPh') continue;
      out += ts[i].textContent;
    }
    return out;
  }

  function parseSheet(xml, shared) {
    var doc = new DOMParser().parseFromString(xml, 'application/xml');
    if (doc.getElementsByTagName('parsererror').length) throw new Error('Unreadable sheet XML');
    var rowsEl = doc.getElementsByTagName('row');
    var rows = [], maxCol = 0;
    for (var i = 0; i < rowsEl.length; i++) {
      var r = rowsEl[i];
      var rowNum = parseInt(r.getAttribute('r') || String(rows.length + 1), 10);
      var cells = [];
      var cs = r.getElementsByTagName('c');
      for (var j = 0; j < cs.length; j++) {
        var c = cs[j];
        var ref = c.getAttribute('r') || '';
        var ci = ref ? colIndex(ref) : j;
        var t = c.getAttribute('t');
        var val = null;
        if (t === 's') {
          var vEl = c.getElementsByTagName('v')[0];
          if (vEl) val = shared[parseInt(vEl.textContent, 10)] || '';
        } else if (t === 'inlineStr') {
          var isEl = c.getElementsByTagName('is')[0];
          if (isEl) val = textOf(isEl);
        } else {
          var v = c.getElementsByTagName('v')[0];
          if (v) val = v.textContent;
        }
        if (val !== null && val !== '') { cells[ci] = String(val); if (ci > maxCol) maxCol = ci; }
      }
      // Excel omits empty rows entirely; keep the row number meaningful.
      while (rows.length < rowNum - 1) rows.push([]);
      rows.push(cells);
    }
    for (var k = 0; k < rows.length; k++) {
      for (var m = 0; m <= maxCol; m++) if (rows[k][m] === undefined) rows[k][m] = null;
      rows[k].length = maxCol + 1;
    }
    var merges = [], me = doc.getElementsByTagName('mergeCell');
    for (var n = 0; n < me.length; n++) merges.push(me[n].getAttribute('ref'));
    return { rows: rows, merges: merges };
  }

  async function readXlsx(buf) {
    var list = entries(buf);
    var byName = {};
    list.forEach(function (e) { byName[e.name] = e; });

    var shared = [];
    if (byName['xl/sharedStrings.xml']) {
      var sdoc = new DOMParser().parseFromString(
        await readEntry(buf, byName['xl/sharedStrings.xml']), 'application/xml');
      var sis = sdoc.getElementsByTagName('si');
      for (var i = 0; i < sis.length; i++) shared.push(textOf(sis[i]));
    }

    // Sheet order and names live in workbook.xml; the r:id maps to a target in
    // workbook.xml.rels. Falling back to filename order loses the names.
    var names = [], rels = {};
    if (byName['xl/_rels/workbook.xml.rels']) {
      var rdoc = new DOMParser().parseFromString(
        await readEntry(buf, byName['xl/_rels/workbook.xml.rels']), 'application/xml');
      var rs = rdoc.getElementsByTagName('Relationship');
      for (var r = 0; r < rs.length; r++) {
        rels[rs[r].getAttribute('Id')] = rs[r].getAttribute('Target').replace(/^\/?xl\//, '');
      }
    }
    if (byName['xl/workbook.xml']) {
      var wdoc = new DOMParser().parseFromString(
        await readEntry(buf, byName['xl/workbook.xml']), 'application/xml');
      var sh = wdoc.getElementsByTagName('sheet');
      for (var s = 0; s < sh.length; s++) {
        var rid = sh[s].getAttribute('r:id') ||
                  sh[s].getAttributeNS('http://schemas.openxmlformats.org/officeDocument/2006/relationships', 'id');
        names.push({ name: sh[s].getAttribute('name') || ('Sheet' + (s + 1)),
                     path: 'xl/' + (rels[rid] || ('worksheets/sheet' + (s + 1) + '.xml')) });
      }
    }
    if (!names.length) {
      Object.keys(byName).filter(function (n) { return /^xl\/worksheets\/.*\.xml$/.test(n); })
        .sort().forEach(function (n, i) { names.push({ name: 'Sheet' + (i + 1), path: n }); });
    }

    var sheets = [];
    for (var q = 0; q < names.length; q++) {
      var entry = byName[names[q].path];
      if (!entry) continue;
      var parsed = parseSheet(await readEntry(buf, entry), shared);
      sheets.push({ name: names[q].name, rows: parsed.rows, merges: parsed.merges });
    }
    if (!sheets.length) throw new Error('No worksheets found in the file');
    return { sheets: sheets };
  }

  /* ── CSV / TSV ───────────────────────────────────────────────────────── */

  function splitDelimited(text, delim) {
    var rows = [], row = [], field = '', inQ = false;
    for (var i = 0; i < text.length; i++) {
      var ch = text[i];
      if (inQ) {
        if (ch === '"') {
          if (text[i + 1] === '"') { field += '"'; i++; } else inQ = false;
        } else field += ch;
      } else if (ch === '"') inQ = true;
      else if (ch === delim) { row.push(field); field = ''; }
      else if (ch === '\n') { row.push(field); rows.push(row); row = []; field = ''; }
      else if (ch === '\r') { /* CRLF: the \n does the work */ }
      else field += ch;
    }
    if (field !== '' || row.length) { row.push(field); rows.push(row); }
    var width = rows.reduce(function (m, r) { return Math.max(m, r.length); }, 0);
    return rows.map(function (r) {
      var out = [];
      for (var c = 0; c < width; c++) out.push(r[c] === undefined || r[c] === '' ? null : r[c]);
      return out;
    });
  }

  function readText(text, filename) {
    // Count both on the first non-empty line rather than trusting the
    // extension: plenty of "csv" exports from Excel are tab-separated.
    var first = text.split('\n').find(function (l) { return l.trim(); }) || '';
    var delim = (first.split('\t').length > first.split(',').length) ? '\t' : ',';
    return { sheets: [{ name: filename || 'Sheet1', rows: splitDelimited(text, delim), merges: [] }] };
  }

  async function readFile(file) {
    var name = (file.name || '').toLowerCase();
    if (/\.(csv|tsv|txt)$/.test(name)) return readText(await file.text(), file.name);
    var buf = await file.arrayBuffer();
    var head = new Uint8Array(buf, 0, Math.min(4, buf.byteLength));
    if (head[0] === 0x50 && head[1] === 0x4b) return readXlsx(buf);
    if (head[0] === 0xd0 && head[1] === 0xcf) {
      // The old binary .xls (OLE2 compound file). Reading it properly is a
      // second parser; saying so is more useful than half-reading it.
      throw new Error('This is the older .xls format. Open it in Excel and save as .xlsx or .csv.');
    }
    return readText(new TextDecoder().decode(new Uint8Array(buf)), file.name);
  }

  root.XlsxRead = { readFile: readFile, readText: readText, colIndex: colIndex };
})(window);
