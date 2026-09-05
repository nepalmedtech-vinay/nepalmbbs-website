/* NepalMBBS.in — exam-mapping.js
   Turns a parsed spreadsheet into an import payload, and says what is wrong
   with it before anything is written.

   The sheets this reads are real ones. The file that shaped this layer has a
   college name on row 1, an address on row 2, an exam title with Bikram Sambat
   dates on row 3, a merged row of PAPER headings on row 4 ("IBMS-MSK(120/60)"
   spanning eight columns), the actual column headings on row 5, and blank
   spacer columns between the paper blocks. None of that is unusual for a
   college result sheet and none of it survives a naive "first row is the
   header" reader.

   Two rules hold throughout:

   - Nothing is guessed silently. Every inference this file makes is returned
     in the mapping object for the coordinator to see and change before the
     import runs, and anything it could not work out is an issue, not a
     default.
   - No academic value is ever rewritten. A mark that is out of range, or not a
     number, is reported and left alone. It is never clamped, rounded or
     dropped to make the import succeed.

   Pure functions only: no DOM, no network. The console loads this as a classic
   script; tests/exam-verify.mjs evaluates the same file in a vm context and
   runs it over the real spreadsheet a coordinator would upload. (The package is
   type:module, so this file cannot also be a CommonJS module — hence vm rather
   than require.) */

(function (root) {
  'use strict';

  /* ── vocabulary ──────────────────────────────────────────────────────── */

  var FIELD_PATTERNS = [
    ['serial',       /^(s\.?\s*n\.?|sr\.?\s*no\.?|serial(\s*no\.?)?|#)$/i],
    ['student_code', /(student\s*(id|code)|roll\s*(no\.?|number)?|reg(istration)?\s*(no\.?)?|enroll?ment(\s*no\.?)?|adm(ission)?\s*no\.?)/i],
    ['full_name',    /^(student(\'s)?\s*name|name\s*of\s*(the\s*)?student|candidate(\'s)?\s*name|name)$/i],
    ['batch',        /^(batch|session|admission\s*year|intake)$/i],
    ['category',     /^(category|quota|nationality|type)$/i],
    ['father_name',  /father/i],
    ['mother_name',  /mother/i],
    ['guardian_name',/(guardian|parent)(\'s)?\s*name/i],
    ['phone',        /(cell|mobile|phone|contact|whats\s*app|whatsapp)(\s*(no\.?|number))?/i],
    ['total',        /^total(\s*\(.*\))?$/i],
    ['result',       /^(result|remarks?|status|grade)$/i]
  ];

  var ABSENT = /^(ab|absent|a\.?b\.?|--|-|n\/?a)$/i;

  function clean(v) { return v == null ? '' : String(v).replace(/\s+/g, ' ').trim(); }
  function isBlank(v) { return clean(v) === ''; }

  /* 'ANA(20)' -> { name: 'ANA', max: 20 }
     'Total(120)' -> { name: 'Total', max: 120 }
     'IBMS-MSK(120/60)' -> { name: 'IBMS-MSK', max: 120, pass: 60 } */
  function splitHeading(text) {
    var t = clean(text);
    var m = t.match(/^(.*?)\s*[\(\[]\s*([\d.]+)\s*(?:\/\s*([\d.]+)\s*)?[\)\]]\s*$/);
    if (!m) return { name: t, max: null, pass: null };
    return {
      name: clean(m[1]) || t,
      max: m[2] === undefined ? null : Number(m[2]),
      pass: m[3] === undefined ? null : Number(m[3])
    };
  }

  function fieldOf(text) {
    var t = clean(text);
    if (!t) return null;
    for (var i = 0; i < FIELD_PATTERNS.length; i++) {
      if (FIELD_PATTERNS[i][1].test(t)) return FIELD_PATTERNS[i][0];
    }
    return null;
  }

  /* ── phone numbers ───────────────────────────────────────────────────
     India and Nepal only, because those are the two countries this platform's
     families are in. A number that does not clearly fit one of them is kept
     exactly as written and marked 'suspect' — it is not repaired. The console
     shows the raw value next to the parent's name before anyone can send to it.

     A bare ten-digit Indian mobile is normalised to +91 for dialling but is
     still 'suspect', because the country code was assumed rather than read. */
  function normalisePhone(raw) {
    var text = clean(raw);
    if (!text) return { raw: null, e164: null, status: 'missing', note: 'no number on the sheet' };
    var digits = text.replace(/[^\d+]/g, '');
    var plus = digits.charAt(0) === '+';
    var d = digits.replace(/\D/g, '');

    if (plus && /^91[6-9]\d{9}$/.test(d))  return ok('+' + d);
    if (plus && /^977[9]\d{8,9}$/.test(d)) return ok('+' + d);
    if (!plus && /^91[6-9]\d{9}$/.test(d) && d.length === 12) return ok('+' + d);
    if (!plus && /^977[9]\d{8,9}$/.test(d)) return ok('+' + d);
    if (/^[6-9]\d{9}$/.test(d)) {
      return { raw: text, e164: '+91' + d, status: 'suspect',
               note: 'ten digits with no country code — +91 assumed, confirm before sending' };
    }
    if (/^0[6-9]\d{9}$/.test(d)) {
      return { raw: text, e164: null, status: 'suspect',
               note: 'starts with a trunk 0 — confirm the number' };
    }
    return { raw: text, e164: null, status: 'suspect',
             note: 'not a recognisable Indian or Nepali mobile number' };

    function ok(e164) { return { raw: text, e164: e164, status: 'valid', note: null }; }
  }

  /* ── exam title ──────────────────────────────────────────────────────
     'MBBS 1st year 2nd internal Assessment exam 2083/04/15,19,22 Result:2083/05/18'
     Dates are Bikram Sambat here, so they are kept as the label they were
     written as rather than parsed into a Date that would be wrong by 57 years. */
  var ORDINALS = { '1st': 1, '2nd': 2, '3rd': 3, '4th': 4, '5th': 5, '6th': 6,
                   'first': 1, 'second': 2, 'third': 3, 'fourth': 4, 'final': 99 };

  function parseExamTitle(text) {
    var t = clean(text);
    var out = { raw: t, name: null, year_label: null, held_label: null,
                result_label: null, sequence_no: null, kind: 'internal' };
    if (!t) return out;

    var yr = t.match(/((?:MBBS|BDS|B\.?Sc\.?[A-Za-z. ]*|MD|MS)\s*(?:\d(?:st|nd|rd|th))?\s*year)/i);
    if (yr) out.year_label = clean(yr[1]).replace(/\b\w/g, function (c) { return c.toUpperCase(); });

    var res = t.match(/result\s*[:\-]?\s*([0-9]{4}[\/\-][0-9]{1,2}[\/\-][0-9,\/\-]+|[0-9]{1,2}[\/\-][0-9]{1,2}[\/\-][0-9]{2,4})/i);
    if (res) out.result_label = clean(res[1]);

    var body = res ? t.slice(0, res.index) : t;
    var held = body.match(/([0-9]{4}[\/\-][0-9]{1,2}[\/\-][0-9]{1,2}(?:\s*,\s*[0-9]{1,2})*)/);
    if (held) out.held_label = clean(held[1]).replace(/\s*,\s*/g, ',');

    var ex = body.match(/(\d(?:st|nd|rd|th)|first|second|third|fourth|final)?\s*(internal\s*assessment|internal|terminal|sessional|pre[\s\-]?board|unit\s*test|send\s*up|final(?:\s*exam)?|board)/i);
    if (ex) {
      var ord = ex[1] ? String(ex[1]).toLowerCase() : null;
      var what = clean(ex[2]).replace(/\s+/g, ' ');
      what = what.replace(/^internal$/i, 'Internal Assessment');
      what = what.replace(/\b\w/g, function (c) { return c.toUpperCase(); });
      out.name = (ord ? ord + ' ' : '') + what;
      out.sequence_no = ord ? (ORDINALS[ord] || null) : null;
      if (/pre[\s-]?board|board|final/i.test(what)) out.kind = 'final';
    } else {
      // No recognisable exam word. The title row is still the best label there
      // is; the coordinator can correct it in the preview.
      out.name = clean(body.replace(/^.*year\s*/i, '')) || t;
    }
    return out;
  }

  /* ── merged ranges ───────────────────────────────────────────────────── */
  function colIndex(ref) {
    var n = 0;
    for (var i = 0; i < ref.length; i++) {
      var c = ref.toUpperCase().charCodeAt(i);
      if (c < 65 || c > 90) break;
      n = n * 26 + (c - 64);
    }
    return n - 1;
  }
  function parseMerges(merges) {
    return (merges || []).map(function (ref) {
      var parts = String(ref).split(':');
      var a = parts[0], b = parts[1] || parts[0];
      return {
        row: parseInt(a.replace(/[A-Z]/gi, ''), 10) - 1,
        rowEnd: parseInt(b.replace(/[A-Z]/gi, ''), 10) - 1,
        col: colIndex(a), colEnd: colIndex(b)
      };
    });
  }

  /* ── detection ───────────────────────────────────────────────────────── */

  function scoreHeaderRow(row) {
    var named = 0, maxed = 0, filled = 0;
    for (var i = 0; i < row.length; i++) {
      var v = clean(row[i]);
      if (!v) continue;
      filled++;
      if (fieldOf(v)) named++;
      if (/[\(\[]\s*[\d.]+\s*[\)\]]\s*$/.test(v)) maxed++;
    }
    // A header row is wide, mostly labels, and carries maxima. A data row is
    // wide too, which is why `named` is weighted hardest.
    return named * 3 + maxed * 2 + Math.min(filled, 12) * 0.1;
  }

  function detect(sheet) {
    var rows = sheet.rows || [];
    var merges = parseMerges(sheet.merges);
    var limit = Math.min(rows.length, 20);
    var headerRow = -1, best = 0;
    for (var r = 0; r < limit; r++) {
      var s = scoreHeaderRow(rows[r] || []);
      if (s > best) { best = s; headerRow = r; }
    }
    if (headerRow < 0 || best < 6) {
      return { ok: false, reason: 'No header row found. The sheet needs a row naming the columns.' };
    }

    var header = rows[headerRow] || [];

    /* Paper grouping. The row above the header carries the paper names when
       there is one; it is recognisable because its cells are merged across
       several of the header's columns, or carry a max/pass pair. */
    var groupRow = -1;
    for (var g = headerRow - 1; g >= 0 && g >= headerRow - 3; g--) {
      var cells = rows[g] || [];
      var spans = merges.filter(function (m) { return m.row === g && m.colEnd > m.col + 1; });
      var pairs = cells.filter(function (c) { return /[\(\[]\s*[\d.]+\s*\/\s*[\d.]+\s*[\)\]]/.test(clean(c)); });
      if (spans.length >= 1 && cells.filter(function (c) { return !isBlank(c); }).length >= 1
          && (pairs.length >= 1 || spans.length >= 2)) { groupRow = g; break; }
    }

    /* Title block: everything above the group/header row that has content. */
    var titleTop = groupRow >= 0 ? groupRow : headerRow;
    var titles = [];
    for (var t = 0; t < titleTop; t++) {
      var joined = (rows[t] || []).map(clean).filter(Boolean).join(' ');
      if (joined) titles.push({ row: t, text: joined });
    }

    var institution = { name: titles[0] ? titles[0].text : '', address: titles[1] ? titles[1].text : '' };
    // The exam line is whichever title row talks about an exam or a result.
    var examLine = titles.filter(function (x) {
      return /exam|assessment|result|terminal|test|board/i.test(x.text);
    }).pop();
    // An address row misread as the exam line would put "Bharatpur-05" on every
    // report card, so if the second row was consumed as the exam line it is not
    // also the address.
    if (examLine && titles[1] && examLine.row === 1) institution.address = '';
    var exam = parseExamTitle(examLine ? examLine.text : '');

    /* Column roles. */
    var fields = {}, subjectCols = [], totalCols = [], resultCols = [];
    var lastParent = null;
    for (var c = 0; c < header.length; c++) {
      var text = clean(header[c]);
      if (!text) continue;
      var role = fieldOf(text);
      var head = splitHeading(text);

      if (role === 'total') { totalCols.push({ col: c, max: head.max }); continue; }
      if (role === 'result') { resultCols.push({ col: c }); continue; }
      if (role === 'father_name')   { fields.father_name = c; lastParent = 'father';   continue; }
      if (role === 'mother_name')   { fields.mother_name = c; lastParent = 'mother';   continue; }
      if (role === 'guardian_name') { fields.guardian_name = c; lastParent = 'guardian'; continue; }
      if (role === 'phone') {
        // 'Cell Number' twice over, once after each parent's name column. The
        // column on its own says nothing about whose number it is; its position
        // does.
        if (lastParent === 'father')        fields.father_phone = c;
        else if (lastParent === 'mother')   fields.mother_phone = c;
        else if (lastParent === 'guardian') fields.guardian_phone = c;
        else fields.contact_phone = c;
        continue;
      }
      if (role) { if (fields[role] === undefined) fields[role] = c; continue; }

      // Anything left that carries a maximum is a subject.
      if (head.max !== null && head.max > 0) subjectCols.push({ col: c, name: head.name, max: head.max });
    }

    /* Papers: one per cell in the group row, each owning the subject columns
       inside its merged span. With no group row the whole sheet is one paper
       whose maximum is the sum of its subjects'. */
    var papers = [];
    if (groupRow >= 0) {
      var gcells = rows[groupRow] || [];
      var anchors = [];
      for (var q = 0; q < gcells.length; q++) if (!isBlank(gcells[q])) anchors.push(q);
      anchors.forEach(function (col, i) {
        var head = splitHeading(gcells[col]);
        var span = merges.filter(function (m) { return m.row === groupRow && m.col === col; })[0];
        var endCol = span ? span.colEnd
                          : (i + 1 < anchors.length ? anchors[i + 1] - 1 : header.length - 1);
        var totalCol  = (totalCols.filter(function (x) { return x.col >= col && x.col <= endCol; })[0] || {}).col;
        var resultCol = (resultCols.filter(function (x) { return x.col >= col && x.col <= endCol; })[0] || {}).col;

        /* Inside a paper's span, a headed column that is not the total, the
           result or a recognised field is a subject — even when its heading
           carries no maximum. The file this was built against has a paper whose
           four subjects are written 'HP&E', 'FH&N', 'E&OH', 'MS&A' with the 80
           marks stated only once, on the paper.

           Such a subject is kept with a null maximum and the import refuses to
           run until someone supplies it. Splitting the paper's 80 evenly across
           four columns would produce percentages that look right and are not:
           the marks in that block plainly do not share one maximum. */
        var claimed = {};
        subjectCols.forEach(function (s) { claimed[s.col] = true; });
        if (totalCol !== undefined) claimed[totalCol] = true;
        if (resultCol !== undefined) claimed[resultCol] = true;
        Object.keys(fields).forEach(function (k) { claimed[fields[k]] = true; });

        var subs = [];
        for (var c2 = col; c2 <= endCol && c2 < header.length; c2++) {
          var known = subjectCols.filter(function (s) { return s.col === c2; })[0];
          if (known) { subs.push({ name: known.name, max_marks: known.max, col: c2 }); continue; }
          if (claimed[c2]) continue;
          var label = splitHeading(header[c2]);
          if (!label.name) continue;
          subs.push({ name: label.name, max_marks: null, col: c2, needsMax: true });
        }
        subs.forEach(function (s, j) { s.position = j; });

        papers.push({
          name: head.name, max_marks: head.max, pass_marks: head.pass,
          position: i, startCol: col, endCol: endCol,
          subjects: subs, totalCol: totalCol, resultCol: resultCol
        });
      });
    }
    if (!papers.length && subjectCols.length) {
      papers.push({
        name: exam.name || 'Assessment',
        max_marks: subjectCols.reduce(function (a, s) { return a + s.max; }, 0),
        pass_marks: null, position: 0,
        startCol: subjectCols[0].col, endCol: subjectCols[subjectCols.length - 1].col,
        subjects: subjectCols.map(function (s, j) {
          return { name: s.name, max_marks: s.max, col: s.col, position: j };
        }),
        totalCol: (totalCols[0] || {}).col, resultCol: (resultCols[0] || {}).col
      });
    }
    papers = papers.filter(function (p) { return p.subjects.length > 0; });

    /* Data rows: from just under the header to the last row carrying either a
       name or a code. Signature rows and totals footers stop it. */
    var firstDataRow = headerRow + 1, lastDataRow = firstDataRow - 1;
    for (var d = firstDataRow; d < rows.length; d++) {
      var row = rows[d] || [];
      var hasName = fields.full_name !== undefined && !isBlank(row[fields.full_name]);
      var hasCode = fields.student_code !== undefined && !isBlank(row[fields.student_code]);
      if (hasName || hasCode) lastDataRow = d;
    }

    return {
      ok: true,
      sheetName: sheet.name,
      headerRow: headerRow, groupRow: groupRow >= 0 ? groupRow : null,
      firstDataRow: firstDataRow, lastDataRow: lastDataRow,
      titles: titles, institution: institution, exam: exam,
      fields: fields, papers: papers,
      batch: { name: null, course: 'MBBS', year_label: exam.year_label || null }
    };
  }

  /* ── payload + validation ────────────────────────────────────────────── */

  function buildPayload(sheet, map, meta) {
    meta = meta || {};
    var rows = sheet.rows || [];
    var issues = [];
    var seenCodes = {}, seenNames = {};
    var students = [];
    var batchValues = {};

    function issue(severity, kind, detail) {
      issues.push(Object.assign({ severity: severity, kind: kind }, detail));
    }

    for (var r = map.firstDataRow; r <= map.lastDataRow; r++) {
      var row = rows[r] || [];
      var line = r + 1;                       // spreadsheet row number, for the human
      var code = clean(row[map.fields.student_code]);
      var name = clean(row[map.fields.full_name]);

      if (!name && !code) continue;
      if (!name) { issue('error', 'missing_name', { row: line, student_code: code }); continue; }
      if (!code) { issue('error', 'missing_code', { row: line, name: name }); continue; }

      if (seenCodes[code] !== undefined) {
        issue('error', 'duplicate_code',
              { row: line, student_code: code, name: name, first_row: seenCodes[code] });
        continue;
      }
      seenCodes[code] = line;

      var nameKey = name.toLowerCase().replace(/\s+/g, ' ');
      if (seenNames[nameKey] !== undefined) {
        // Two people can share a name; this is a warning so the coordinator
        // looks, not an error that blocks a legitimate import.
        issue('warning', 'duplicate_name',
              { row: line, name: name, student_code: code, first_row: seenNames[nameKey] });
      } else seenNames[nameKey] = line;

      var batch = map.fields.batch !== undefined ? clean(row[map.fields.batch]) : '';
      if (batch) batchValues[batch] = (batchValues[batch] || 0) + 1;

      var guardians = [];
      [['father', 'father_name', 'father_phone'],
       ['mother', 'mother_name', 'mother_phone'],
       ['guardian', 'guardian_name', 'guardian_phone']].forEach(function (spec) {
        var nCol = map.fields[spec[1]], pCol = map.fields[spec[2]];
        if (nCol === undefined && pCol === undefined) return;
        var gName = nCol === undefined ? '' : clean(row[nCol]);
        var phone = normalisePhone(pCol === undefined ? '' : row[pCol]);
        if (!gName && phone.status === 'missing') return;
        guardians.push({ relation: spec[0], full_name: gName || null,
                         phone_raw: phone.raw, phone_e164: phone.e164,
                         phone_status: phone.status });
        if (phone.status === 'missing') {
          issue('warning', 'parent_phone_missing',
                { row: line, name: name, student_code: code, relation: spec[0] });
        } else if (phone.status === 'suspect') {
          issue('warning', 'parent_phone_suspect',
                { row: line, name: name, student_code: code, relation: spec[0],
                  value: phone.raw, note: phone.note });
        }
      });
      if (!guardians.some(function (g) { return g.phone_status === 'valid'; })) {
        issue('warning', 'no_reachable_parent', { row: line, name: name, student_code: code });
      }

      var marks = [], paperResults = [];
      map.papers.forEach(function (p) {
        var computed = 0, counted = 0;
        p.subjects.forEach(function (s) {
          var cell = row[s.col];
          var text = clean(cell);
          if (s.max_marks == null) return;      // reported once per subject, below
          if (text === '') {
            issue('error', 'missing_mark',
                  { row: line, name: name, student_code: code, paper: p.name, subject: s.name });
            return;
          }
          if (ABSENT.test(text)) {
            marks.push({ paper: p.name, subject: s.name, obtained: null, is_absent: true });
            return;
          }
          var num = Number(text);
          if (!isFinite(num)) {
            issue('error', 'not_a_number',
                  { row: line, name: name, student_code: code, paper: p.name,
                    subject: s.name, value: text });
            return;
          }
          if (num < 0) {
            issue('error', 'negative_mark',
                  { row: line, name: name, student_code: code, paper: p.name,
                    subject: s.name, value: num });
            return;
          }
          if (s.max_marks != null && num > s.max_marks) {
            issue('error', 'above_maximum',
                  { row: line, name: name, student_code: code, paper: p.name,
                    subject: s.name, value: num, max_marks: s.max_marks });
            return;
          }
          computed += num; counted++;
          marks.push({ paper: p.name, subject: s.name, obtained: num, is_absent: false });
        });

        // Number('') is 0, so a blank total cell would otherwise be read as a
        // declared zero and reported as a mismatch against every real sum.
        var totalText = p.totalCol === undefined ? '' : clean(row[p.totalCol]);
        var declaredTotal = totalText === '' ? null : Number(totalText);
        var declaredResult = p.resultCol === undefined ? null : clean(row[p.resultCol]) || null;
        if (declaredTotal !== null && isFinite(declaredTotal)) {
          if (counted === p.subjects.length && Math.abs(declaredTotal - computed) >= 0.005) {
            // The sheet's own total disagreeing with the sum of its own columns
            // is the single most useful thing this validator finds: it means a
            // mark was mistyped somewhere.
            issue('error', 'total_mismatch',
                  { row: line, name: name, student_code: code, paper: p.name,
                    declared: declaredTotal, computed: Math.round(computed * 100) / 100 });
          }
          paperResults.push({ paper: p.name, declared_total: declaredTotal,
                              declared_result: declaredResult });
        } else if (totalText !== '' && !isFinite(declaredTotal)) {
          issue('warning', 'total_not_a_number',
                { row: line, name: name, student_code: code, paper: p.name, value: totalText });
        } else if (declaredResult) {
          paperResults.push({ paper: p.name, declared_total: null, declared_result: declaredResult });
        }
      });

      students.push({
        student_code: code,
        serial_no: map.fields.serial !== undefined ? clean(row[map.fields.serial]) : null,
        full_name: name,
        category: map.fields.category !== undefined ? clean(row[map.fields.category]) || null : null,
        batch: batch || null,
        guardians: guardians, marks: marks, paper_results: paperResults
      });
    }

    var batchKeys = Object.keys(batchValues);
    if (batchKeys.length > 1) {
      issue('warning', 'mixed_batches', { values: batchKeys });
    }
    if (!students.length) issue('error', 'no_students', {});
    map.papers.forEach(function (p) {
      p.subjects.forEach(function (s) {
        if (s.max_marks != null) return;
        // Show the largest mark actually present in the column. It is a hint for
        // whoever fills the maximum in, never a value this file applies.
        var seen = null;
        for (var rr = map.firstDataRow; rr <= map.lastDataRow; rr++) {
          var v = Number(clean((rows[rr] || [])[s.col]));
          if (isFinite(v) && (seen === null || v > seen)) seen = v;
        }
        issue('error', 'subject_max_unknown',
              { paper: p.name, subject: s.name, column: s.col,
                paper_max: p.max_marks, observed_max: seen,
                siblings: p.subjects.length });
      });
      if (p.max_marks != null) {
        var sum = p.subjects.reduce(function (a, s) { return a + (s.max_marks || 0); }, 0);
        if (Math.abs(sum - p.max_marks) >= 0.005) {
          issue('warning', 'paper_max_mismatch',
                { paper: p.name, declared: p.max_marks, subject_sum: sum });
        }
      }
    });

    var batchName = meta.batchName || batchKeys.sort(function (a, b) {
      return batchValues[b] - batchValues[a];
    })[0] || '';

    var payload = {
      filename: meta.filename || null,
      digest: meta.digest || null,
      mapping: {
        sheet: sheet.name, headerRow: map.headerRow, groupRow: map.groupRow,
        fields: map.fields,
        papers: map.papers.map(function (p) {
          return { name: p.name, max_marks: p.max_marks, pass_marks: p.pass_marks,
                   subjects: p.subjects.map(function (s) { return { name: s.name, col: s.col }; }) };
        })
      },
      institution: { name: meta.institutionName || map.institution.name,
                     address: meta.institutionAddress !== undefined
                              ? meta.institutionAddress : map.institution.address },
      batch: { name: batchName, course: meta.course || map.batch.course || 'MBBS',
               year_label: meta.yearLabel !== undefined ? meta.yearLabel : map.batch.year_label },
      exam: { name: meta.examName || map.exam.name,
              kind: meta.examKind || map.exam.kind,
              held_label: meta.heldLabel !== undefined ? meta.heldLabel : map.exam.held_label,
              result_label: meta.resultLabel !== undefined ? meta.resultLabel : map.exam.result_label,
              sequence_no: meta.sequenceNo !== undefined ? meta.sequenceNo : map.exam.sequence_no,
              source_file: meta.filename || null },
      papers: map.papers.map(function (p) {
        return { name: p.name,
                 max_marks: p.max_marks != null ? p.max_marks
                            : p.subjects.reduce(function (a, s) { return a + (s.max_marks || 0); }, 0),
                 pass_marks: p.pass_marks, position: p.position,
                 subjects: p.subjects.map(function (s) {
                   return { name: s.name, max_marks: s.max_marks, position: s.position };
                 }) };
      }),
      students: students
    };

    if (!payload.institution.name) issue('error', 'missing_institution', {});
    if (!payload.exam.name)        issue('error', 'missing_exam_name', {});
    if (!payload.batch.name)       issue('error', 'missing_batch', {});

    return {
      payload: payload,
      issues: issues,
      counts: {
        students: students.length,
        marks: students.reduce(function (a, s) { return a + s.marks.length; }, 0),
        errors: issues.filter(function (i) { return i.severity === 'error'; }).length,
        warnings: issues.filter(function (i) { return i.severity === 'warning'; }).length
      }
    };
  }

  var api = { detect: detect, buildPayload: buildPayload, normalisePhone: normalisePhone,
              parseExamTitle: parseExamTitle, splitHeading: splitHeading, colIndex: colIndex };
  root.ExamMapping = api;
})(typeof window !== 'undefined' ? window : globalThis);
