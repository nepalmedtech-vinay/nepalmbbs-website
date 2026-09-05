/* NepalMBBS.in — exams.js
   The exam-intelligence console: import, cohort, student, report card, parent.

   It follows the two rules staff.js set and for the same reasons. It never
   builds markup from data — a student's name and a parent's number go into the
   page through textContent, never innerHTML. And it does not decide who may see
   what: every request carries the counselor's JWT and 0006's policies answer.

   It adds a third. It never computes a mark. Percentages, ranks, averages and
   deltas are read from exam_report()/exam_cohort() and displayed; if a figure
   is not in the payload, this file shows a dash rather than working one out. */

(function () {
  'use strict';

  var S = {
    me: null, institutions: [], institution: null,
    dashboard: null, exams: [], batches: [],
    exam: null, cohort: null,
    student: null, report: null, model: null,
    templates: [], template: null,
    analysis: null,
    imp: null,                    // the import wizard's working state
    assets: { logo: null, photo: null }
  };

  function $(id) { return document.getElementById(id); }
  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text !== undefined && text !== null) n.textContent = String(text);
    return n;
  }
  function clear(n) { while (n && n.firstChild) n.removeChild(n.firstChild); }
  function show(n, on) { if (n) n.hidden = !on; }

  function toast(msg, bad) {
    var t = $('x-toast');
    t.textContent = msg;
    t.className = bad ? 'cx-error' : 'cx-note';
    t.hidden = false;
    clearTimeout(toast._t);
    toast._t = setTimeout(function () { t.hidden = true; }, 5000);
  }
  function busy(node, label) {
    clear(node);
    node.appendChild(el('span', 'xm-busy', label || 'Working…'));
  }
  function empty(node, label) {
    clear(node);
    node.appendChild(el('p', 'xm-empty', label));
  }
  function fail(node, e) {
    clear(node);
    node.appendChild(el('p', 'cx-error', e && e.message ? e.message : 'Something went wrong.'));
  }

  function pct(v) { return v === null || v === undefined ? '—' : Number(v) + '%'; }
  function band(v) {
    if (v === null || v === undefined) return 'xm-pill--mute';
    return v >= 60 ? 'xm-pill--good' : v >= 40 ? 'xm-pill--warn' : 'xm-pill--bad';
  }
  function when(iso) {
    if (!iso) return '';
    var d = new Date(iso);
    return isNaN(d) ? '' : d.toLocaleDateString('en-IN',
      { day: 'numeric', month: 'short', year: 'numeric' });
  }

  /* ── tabs ────────────────────────────────────────────────────────────── */
  var TABS = ['overview', 'import', 'exams', 'students', 'templates'];
  function selectTab(name) {
    TABS.forEach(function (t) {
      var btn = $('x-tab-' + t), panel = $('x-panel-' + t);
      if (!btn || !panel) return;
      var on = t === name;
      btn.setAttribute('aria-selected', on ? 'true' : 'false');
      panel.hidden = !on;
    });
    if (name === 'overview') renderOverview();
    if (name === 'exams') renderExamsTab();
    if (name === 'templates') renderTemplates();
  }

  /* ── institution ─────────────────────────────────────────────────────── */
  async function loadInstitutions() {
    S.institutions = await ExamApi.institutions();
    var sel = $('x-institution');
    clear(sel);
    if (!S.institutions.length) {
      sel.appendChild(new Option('No college on file yet — import a result sheet', ''));
      S.institution = null;
      return;
    }
    S.institutions.forEach(function (i) { sel.appendChild(new Option(i.name, i.id)); });
    var saved = null;
    try { saved = sessionStorage.getItem('x_institution'); } catch (e) {}
    var pick = S.institutions.filter(function (i) { return i.id === saved; })[0] || S.institutions[0];
    sel.value = pick.id;
    await setInstitution(pick.id);
  }

  async function setInstitution(id) {
    S.institution = S.institutions.filter(function (i) { return i.id === id; })[0] || null;
    try { sessionStorage.setItem('x_institution', id); } catch (e) {}
    S.exam = null; S.cohort = null; S.student = null; S.report = null;
    S.assets.logo = null;
    if (!S.institution) return;
    var results = await Promise.all([
      ExamApi.exams(id).catch(function () { return []; }),
      ExamApi.batches(id).catch(function () { return []; }),
      ExamApi.templates(id).catch(function () { return []; })
    ]);
    S.exams = results[0]; S.batches = results[1]; S.templates = results[2];
    S.template = S.templates.filter(function (t) { return t.is_default; })[0] || S.templates[0] || null;
    if (S.institution.logo_path) {
      S.assets.logo = await objectUrl(S.institution.logo_path).catch(function () { return null; });
    }
    fillExamSelect($('x-exam-select'));
    fillTemplateSelects();
  }

  /* Private buckets: an <img src> cannot carry an Authorization header, so the
     object is fetched with the JWT and turned into a blob URL. */
  var urlCache = {};
  async function objectUrl(path) {
    if (!path) return null;
    if (urlCache[path]) return urlCache[path];
    var res = await fetch(SB + '/storage/v1/object/' + path, { headers: Auth.headers() });
    if (!res.ok) throw new Error('Could not load ' + path);
    var url = URL.createObjectURL(await res.blob());
    urlCache[path] = url;
    return url;
  }

  function fillExamSelect(sel) {
    if (!sel) return;
    clear(sel);
    sel.appendChild(new Option('Select an exam…', ''));
    S.exams.forEach(function (e) {
      var batch = S.batches.filter(function (b) { return b.id === e.batch_id; })[0];
      sel.appendChild(new Option(
        e.name + (batch ? ' — ' + [batch.course, batch.year_label, batch.name]
          .filter(Boolean).join(' ') : ''), e.id));
    });
  }

  function fillTemplateSelects() {
    ['x-template', 'x-studio-template'].forEach(function (id) {
      var sel = $(id);
      if (!sel) return;
      clear(sel);
      S.templates.forEach(function (t) {
        sel.appendChild(new Option(t.name + (t.institution_id ? '' : ' (stock)'), t.id));
      });
      if (S.template) sel.value = S.template.id;
    });
  }

  /* ── overview ────────────────────────────────────────────────────────── */
  async function renderOverview() {
    var host = $('x-overview');
    if (!S.institution) { empty(host, 'Import a result sheet to get started.'); return; }
    busy(host, 'Loading the dashboard…');
    try {
      var d = await ExamApi.dashboard(S.institution.id);
      S.dashboard = d;
      clear(host);

      var stats = el('div', 'cx-grid cx-grid--stats');
      [['Students', d.students], ['Batches', d.batches], ['Exams', d.exams],
       ['Average', d.avg_percentage === null ? '—' : d.avg_percentage + '%'],
       ['Report cards', d.reports_generated]].forEach(function (pair) {
        var c = el('div', 'gl cx-card');
        c.appendChild(el('div', 'cx-stat', pair[1] === null || pair[1] === undefined ? '—' : pair[1]));
        c.appendChild(el('div', 'cx-stat-label', pair[0]));
        stats.appendChild(c);
      });
      host.appendChild(stats);

      var cols = el('div', 'xm-grid xm-grid--2');
      cols.style.marginTop = '18px';

      /* data health — the things that will bite later, counted */
      var health = el('section', 'gl cx-card');
      health.appendChild(el('h3', null, 'Data health'));
      health.appendChild(el('p', 'cx-sub',
        'Counted from the records, not estimated. Each of these needs a person, not a fix in code.'));
      var hl = el('div', 'xm-issues');
      var h = d.data_health || {};
      [[h.students_without_valid_parent, 'student(s) have no parent number this system can dial. ' +
        'Open the student and correct the number before sending anything.', 'warning'],
       [h.declared_mismatches, 'paper total(s) on the source sheet disagree with the sum of ' +
        'their own subject marks. Both figures are kept; the report card shows the sum.', 'error'],
       [h.amended_marks, 'mark(s) have been amended since import. Each carries a reason and a name.',
        'warning']].forEach(function (row) {
        if (!row[0]) return;
        var n = el('div', 'xm-issue xm-issue--' + row[2]);
        n.appendChild(el('b', null, row[0]));
        n.appendChild(el('span', null, row[1]));
        hl.appendChild(n);
      });
      if (!hl.childNodes.length) {
        hl.appendChild(el('p', 'xm-empty', 'Nothing outstanding — every student has a reachable ' +
          'parent and every total agrees with its subjects.'));
      }
      health.appendChild(hl);
      cols.appendChild(health);

      /* communication */
      var comms = el('section', 'gl cx-card');
      comms.appendChild(el('h3', null, 'Parent communication'));
      var m = d.messages || {};
      var keys = Object.keys(m);
      if (!keys.length) {
        comms.appendChild(el('p', 'xm-empty', 'No messages sent yet.'));
      } else {
        var wrap = el('div', 'xm-scroll');
        var t = el('table', 'xm-table');
        var tb = el('tbody');
        keys.sort().forEach(function (k) {
          var tr = el('tr');
          tr.appendChild(el('td', null, k));
          var td = el('td', 'xm-num'); td.appendChild(el('span', 'xm-pill ' +
            (k === 'failed' ? 'xm-pill--bad' : k === 'read' || k === 'delivered'
             ? 'xm-pill--good' : 'xm-pill--mute'), m[k]));
          tr.appendChild(td);
          tb.appendChild(tr);
        });
        t.appendChild(tb); wrap.appendChild(t); comms.appendChild(wrap);
      }
      cols.appendChild(comms);
      host.appendChild(cols);

      /* the latest exam, read three ways */
      var L = d.latest || {};
      if (L.exam_id) {
        var latest = el('section', 'gl cx-card');
        latest.style.marginTop = '18px';
        latest.appendChild(el('h3', null, L.exam));
        var move = el('p', 'cx-sub');
        move.textContent = L.improved + ' improved, ' + L.steady + ' steady, ' +
          L.declined + ' declined' +
          (L.first_exam ? ', ' + L.first_exam + ' sitting a first exam' : '') +
          ' — measured against each student\u2019s own previous exam, not against each other.';
        latest.appendChild(move);

        var two = el('div', 'xm-grid xm-grid--2');
        [['Top of the exam', L.top || [], 'xm-pill--good'],
         ['Needing attention', L.attention || [], 'xm-pill--bad']].forEach(function (pair) {
          var col = el('section');
          col.appendChild(el('h4', null, pair[0]));
          if (!pair[1].length) { col.appendChild(el('p', 'xm-empty', 'Nothing to show.')); }
          var wrap = el('div', 'cx-docs');
          pair[1].forEach(function (r) {
            var b = el('button', 'cx-item');
            b.type = 'button';
            b.appendChild(el('span', 'cx-item-name', r.name));
            var meta = el('span', 'cx-item-meta');
            meta.textContent = r.code + ' · rank ' + r.rank +
              (r.delta_percentage === null || r.delta_percentage === undefined ? ''
                : ' · ' + (r.delta_percentage > 0 ? '+' : '') + r.delta_percentage);
            b.appendChild(meta);
            var pill = el('span', 'xm-pill ' + band(r.percentage), pct(r.percentage));
            b.appendChild(pill);
            b.addEventListener('click', function () { openStudent(r.student_id, L.exam_id); });
            wrap.appendChild(b);
          });
          col.appendChild(wrap);
          two.appendChild(col);
        });
        latest.appendChild(two);
        host.appendChild(latest);
      }

      /* exams list */
      var list = el('section', 'gl cx-card');
      list.style.marginTop = '18px';
      list.appendChild(el('h3', null, 'Exams'));
      var ew = el('div', 'xm-scroll');
      var et = el('table', 'xm-table');
      var eh = el('thead'), ehr = el('tr');
      ['Exam', 'Students', 'Average'].forEach(function (x, i) {
        ehr.appendChild(el('th', i ? 'xm-num' : null, x));
      });
      eh.appendChild(ehr); et.appendChild(eh);
      var etb = el('tbody');
      (d.exams_list || []).forEach(function (x) {
        var tr = el('tr');
        var td = el('td');
        var b = el('button', 'xm-rowbtn', x.name);
        b.type = 'button';
        b.addEventListener('click', function () {
          $('x-exam-select').value = x.exam_id;
          selectTab('exams');
          loadCohort(x.exam_id);
        });
        td.appendChild(b); tr.appendChild(td);
        tr.appendChild(el('td', 'xm-num', x.students));
        tr.appendChild(el('td', 'xm-num', x.avg_percentage === null ? '—' : x.avg_percentage + '%'));
        etb.appendChild(tr);
      });
      et.appendChild(etb); ew.appendChild(et); list.appendChild(ew);
      if (!(d.exams_list || []).length) empty(ew, 'No exams imported yet.');
      host.appendChild(list);

      renderAiUsage();
    } catch (e) { fail(host, e); }
  }

  async function renderAiUsage() {
    var host = $('x-ai-usage');
    if (!host) return;
    try {
      var rows = await ExamApi.aiUsage(S.institution && S.institution.id);
      clear(host);
      if (!rows.length) {
        host.appendChild(el('p', 'xm-empty', 'No model calls in the last seven days.'));
        return;
      }
      var byProvider = {};
      var cached = 0, failed = 0, tokens = 0;
      rows.forEach(function (r) {
        var k = (r.provider || 'none') + ' · ' + (r.model || '—');
        byProvider[k] = (byProvider[k] || 0) + 1;
        if (r.cache_hit) cached++;
        if (!r.ok) failed++;
        tokens += (r.prompt_tokens || 0) + (r.completion_tokens || 0);
      });
      var p = el('p', 'cx-sub');
      p.textContent = rows.length + ' call(s) in seven days · ' + cached + ' served from cache · ' +
        failed + ' failed · ' + tokens.toLocaleString('en-IN') + ' tokens.';
      host.appendChild(p);
      var ul = el('ul');
      Object.keys(byProvider).sort().forEach(function (k) {
        ul.appendChild(el('li', null, k + ' — ' + byProvider[k]));
      });
      host.appendChild(ul);
    } catch (e) { fail(host, e); }
  }

  /* ── import wizard ───────────────────────────────────────────────────── */
  function setStep(n) {
    ['file', 'map', 'check', 'commit'].forEach(function (name, i) {
      var s = $('x-step-' + name);
      if (s) s.setAttribute('data-state', i < n ? 'done' : i === n ? 'active' : '');
    });
  }

  async function onFile(file) {
    var host = $('x-import-body');
    busy(host, 'Reading ' + file.name + '…');
    try {
      var book = await XlsxRead.readFile(file);
      S.imp = { file: file, book: book, sheetIndex: 0 };
      // A workbook with several sheets is common; the coordinator picks.
      if (book.sheets.length > 1) {
        clear(host);
        var pickWrap = el('div');
        pickWrap.appendChild(el('h3', null, 'Which sheet?'));
        var sel = el('select', 'cx-input');
        book.sheets.forEach(function (s, i) {
          sel.appendChild(new Option(s.name + ' (' + s.rows.length + ' rows)', String(i)));
        });
        var go = el('button', 'gl-btn gl-btn--primary', 'Use this sheet');
        go.type = 'button';
        go.addEventListener('click', function () {
          S.imp.sheetIndex = Number(sel.value);
          detectSheet();
        });
        pickWrap.appendChild(sel);
        pickWrap.appendChild(go);
        host.appendChild(pickWrap);
        return;
      }
      detectSheet();
    } catch (e) { fail(host, e); setStep(0); }
  }

  function detectSheet() {
    var host = $('x-import-body');
    var sheet = S.imp.book.sheets[S.imp.sheetIndex];
    var map = ExamMapping.detect(sheet);
    if (!map.ok) {
      clear(host);
      host.appendChild(el('p', 'cx-error', map.reason));
      setStep(0);
      return;
    }
    S.imp.sheet = sheet; S.imp.map = map;
    setStep(1);
    renderMapping();
  }

  function renderMapping() {
    var host = $('x-import-body');
    var map = S.imp.map;
    clear(host);

    var intro = el('p', 'cx-sub');
    intro.textContent = 'Read from ' + S.imp.file.name + ', sheet "' + S.imp.sheet.name +
      '". Header on row ' + (map.headerRow + 1) + ', data rows ' + (map.firstDataRow + 1) +
      '–' + (map.lastDataRow + 1) + '. Everything below was inferred — correct anything that is wrong ' +
      'before importing.';
    host.appendChild(intro);

    var form = el('div', 'xm-fixgrid');
    function field(id, label, value, hint) {
      var wrap = el('div', 'cx-field');
      var l = el('label', null, label); l.setAttribute('for', id);
      var i = el('input', 'cx-input'); i.id = id; i.type = 'text'; i.value = value || '';
      wrap.appendChild(l); wrap.appendChild(i);
      if (hint) wrap.appendChild(el('small', null, hint));
      form.appendChild(wrap);
      return i;
    }
    S.imp.fields = {
      institution: field('x-f-inst', 'College', map.institution.name, 'From row 1 of the sheet.'),
      address: field('x-f-addr', 'Address', map.institution.address),
      course: field('x-f-course', 'Course', map.batch.course || 'MBBS'),
      yearLabel: field('x-f-year', 'Year', map.batch.year_label),
      batch: field('x-f-batch', 'Batch', ''),
      exam: field('x-f-exam', 'Examination', map.exam.name),
      held: field('x-f-held', 'Held on', map.exam.held_label, 'Kept exactly as written — these are BS dates.'),
      result: field('x-f-result', 'Result declared', map.exam.result_label),
      sequence: field('x-f-seq', 'Position in the year', map.exam.sequence_no || '',
        'Used to compare against the previous exam. 1 for the first internal, 2 for the second.')
    };
    S.imp.fields.batch.placeholder = 'from the Batch column';
    host.appendChild(form);

    var papers = el('section');
    papers.style.marginTop = '20px';
    papers.appendChild(el('h3', null, 'Papers and subjects'));
    S.imp.maxInputs = [];
    map.papers.forEach(function (p) {
      var box = el('div', 'gl cx-card');
      box.style.marginBottom = '12px';
      var title = el('h4', null, p.name +
        (p.max_marks != null ? '  ·  ' + p.max_marks + ' marks' : '') +
        (p.pass_marks != null ? ', pass ' + p.pass_marks : ''));
      box.appendChild(title);
      var grid = el('div', 'xm-fixgrid');
      p.subjects.forEach(function (s) {
        var row = el('div', 'xm-fix');
        var lab = el('label', null, s.name);
        lab.setAttribute('for', 'x-max-' + p.position + '-' + s.position);
        if (s.max_marks == null) {
          lab.appendChild(el('small', null, 'no maximum on the sheet — required'));
        }
        var inp = el('input', 'cx-input');
        inp.id = 'x-max-' + p.position + '-' + s.position;
        inp.type = 'number'; inp.min = '1'; inp.step = '0.5';
        inp.value = s.max_marks == null ? '' : s.max_marks;
        inp.addEventListener('input', function () {
          s.max_marks = inp.value === '' ? null : Number(inp.value);
        });
        S.imp.maxInputs.push(inp);
        row.appendChild(lab); row.appendChild(inp);
        grid.appendChild(row);
      });
      box.appendChild(grid);
      papers.appendChild(box);
    });
    host.appendChild(papers);

    var actions = el('div', 'xm-bar');
    actions.style.marginTop = '16px';
    var check = el('button', 'gl-btn gl-btn--primary', 'Check the sheet');
    check.type = 'button';
    check.addEventListener('click', runValidation);
    actions.appendChild(check);
    host.appendChild(actions);

    S.imp.issuesHost = el('div');
    host.appendChild(S.imp.issuesHost);
  }

  function metaFromFields() {
    var f = S.imp.fields;
    return {
      filename: S.imp.file.name,
      institutionName: f.institution.value.trim(),
      institutionAddress: f.address.value.trim(),
      course: f.course.value.trim() || 'MBBS',
      yearLabel: f.yearLabel.value.trim() || null,
      batchName: f.batch.value.trim() || undefined,
      examName: f.exam.value.trim(),
      heldLabel: f.held.value.trim() || null,
      resultLabel: f.result.value.trim() || null,
      sequenceNo: f.sequence.value === '' ? null : Number(f.sequence.value)
    };
  }

  function runValidation() {
    var host = S.imp.issuesHost;
    busy(host, 'Checking every row…');
    // Yield first so the spinner paints before a large sheet blocks the thread.
    setTimeout(function () {
      var out;
      try {
        out = ExamMapping.buildPayload(S.imp.sheet, S.imp.map, metaFromFields());
      } catch (e) { fail(host, e); return; }
      S.imp.result = out;
      setStep(out.counts.errors ? 1 : 2);
      renderIssues(out);
    }, 16);
  }

  var ISSUE_TEXT = {
    subject_max_unknown: function (i) {
      return i.paper + ' → ' + i.subject + ' has no maximum on the sheet. The paper is out of ' +
        i.paper_max + ' across ' + i.siblings + ' subjects and the highest mark in this column is ' +
        i.observed_max + '. Type the correct maximum above — it is not safe to guess it.';
    },
    above_maximum: function (i) {
      return 'Row ' + i.row + ' (' + i.name + '): ' + i.subject + ' is ' + i.value +
        ' out of ' + i.max_marks + '. Correct the sheet; this is not imported.';
    },
    total_not_a_number: function (i) {
      return 'Row ' + i.row + ' (' + i.name + '): the ' + i.paper + ' total reads "' + i.value +
        '". The subject marks are used instead.';
    },
    total_mismatch: function (i) {
      return 'Row ' + i.row + ' (' + i.name + '): the sheet says ' + i.paper + ' totals ' +
        i.declared + ', but its own subject marks add up to ' + i.computed + '.';
    },
    not_a_number: function (i) {
      return 'Row ' + i.row + ' (' + i.name + '): ' + i.subject + ' reads "' + i.value +
        '". Use a number, or AB for absent.';
    },
    negative_mark: function (i) { return 'Row ' + i.row + ': ' + i.subject + ' is negative.'; },
    missing_mark: function (i) {
      return 'Row ' + i.row + ' (' + i.name + '): ' + i.subject + ' is blank. Enter the mark, or AB.';
    },
    duplicate_code: function (i) {
      return 'Row ' + i.row + ': roll number ' + i.student_code + ' already appears on row ' +
        i.first_row + '.';
    },
    duplicate_name: function (i) {
      return 'Row ' + i.row + ': "' + i.name + '" also appears on row ' + i.first_row +
        '. Two students can share a name — check the roll numbers.';
    },
    missing_name: function (i) { return 'Row ' + i.row + ' has a roll number but no name.'; },
    missing_code: function (i) { return 'Row ' + i.row + ' (' + i.name + ') has no roll number.'; },
    parent_phone_missing: function (i) {
      return 'Row ' + i.row + ' (' + i.name + '): no ' + i.relation + '\'s number.';
    },
    parent_phone_suspect: function (i) {
      return 'Row ' + i.row + ' (' + i.name + '): ' + i.relation + '\'s number "' + i.value +
        '" — ' + i.note;
    },
    no_reachable_parent: function (i) {
      return 'Row ' + i.row + ' (' + i.name + '): no usable parent number at all.';
    },
    mixed_batches: function (i) { return 'The Batch column holds more than one value: ' +
      i.values.join(', ') + '. Set the batch above if they should all import as one.'; },
    paper_max_mismatch: function (i) {
      return i.paper + ' is marked out of ' + i.declared + ' but its subjects add up to ' +
        i.subject_sum + '.';
    },
    missing_institution: function () { return 'The college name is empty.'; },
    missing_exam_name: function () { return 'The examination name is empty.'; },
    missing_batch: function () { return 'No batch — set one above.'; },
    no_students: function () { return 'No student rows were found under the header.'; }
  };

  function describe(i) {
    var f = ISSUE_TEXT[i.kind];
    return f ? f(i) : i.kind.replace(/_/g, ' ');
  }

  function renderIssues(out) {
    var host = S.imp.issuesHost;
    clear(host);
    var head = el('h3', null, 'What the check found');
    host.appendChild(head);

    var sum = el('p', 'cx-sub');
    sum.textContent = out.counts.students + ' student(s), ' + out.counts.marks + ' mark(s), ' +
      out.counts.errors + ' problem(s) that block the import, ' + out.counts.warnings +
      ' to be aware of.';
    host.appendChild(sum);

    var list = el('div', 'xm-issues');
    ['error', 'warning'].forEach(function (sev) {
      var group = out.issues.filter(function (i) { return i.severity === sev; });
      // Grouped by kind so forty missing numbers read as one line, not forty.
      var byKind = {};
      group.forEach(function (i) { (byKind[i.kind] = byKind[i.kind] || []).push(i); });
      Object.keys(byKind).forEach(function (kind) {
        var items = byKind[kind];
        items.slice(0, 6).forEach(function (i) {
          var n = el('div', 'xm-issue xm-issue--' + sev);
          n.appendChild(el('b', null, sev === 'error' ? '!' : '?'));
          n.appendChild(el('span', null, describe(i)));
          list.appendChild(n);
        });
        if (items.length > 6) {
          list.appendChild(el('p', 'xm-issue-more',
            'and ' + (items.length - 6) + ' more of the same.'));
        }
      });
    });
    if (!out.issues.length) {
      list.appendChild(el('p', 'xm-empty', 'Nothing wrong found.'));
    }
    host.appendChild(list);

    var bar = el('div', 'xm-bar');
    bar.style.marginTop = '16px';
    var go = el('button', 'gl-btn gl-btn--primary',
      out.counts.errors ? 'Fix the problems above first' : 'Import ' + out.counts.students + ' students');
    go.type = 'button';
    go.disabled = out.counts.errors > 0;
    go.addEventListener('click', function () { commitImport('strict'); });
    bar.appendChild(go);

    var again = el('button', 'gl-btn gl-btn--quiet', 'Re-check');
    again.type = 'button';
    again.addEventListener('click', runValidation);
    bar.appendChild(again);
    host.appendChild(bar);

    S.imp.commitHost = el('div');
    host.appendChild(S.imp.commitHost);
  }

  async function commitImport(mode, reason) {
    var host = S.imp.commitHost;
    busy(host, 'Importing…');
    setStep(3);
    try {
      var res = await ExamApi.importBatch(S.imp.result.payload, mode, reason);
      clear(host);
      var ok = el('div', 'cx-note');
      ok.textContent = res.students_created + ' student(s) created, ' + res.students_matched +
        ' matched, ' + res.marks_inserted + ' mark(s) stored' +
        (res.marks_amended ? ', ' + res.marks_amended + ' amended' : '') + '.';
      host.appendChild(ok);

      var conflicts = res.conflicts || [];
      if (conflicts.length) {
        var warn = el('section');
        warn.style.marginTop = '14px';
        warn.appendChild(el('h3', null, conflicts.length + ' mark(s) were not written'));
        warn.appendChild(el('p', 'cx-sub',
          'A mark already on file disagrees with this sheet. Nothing was overwritten. ' +
          'To replace them, say why — the old value is kept alongside the new one with your name on it.'));
        var cl = el('div', 'xm-issues');
        conflicts.slice(0, 12).forEach(function (c) {
          var n = el('div', 'xm-issue xm-issue--error');
          n.appendChild(el('b', null, '!'));
          n.appendChild(el('span', null, c.kind === 'above_maximum'
            ? c.student_code + ' · ' + c.subject + ': ' + c.incoming + ' is above the maximum of ' + c.max_marks
            : c.student_code + ' · ' + c.subject + ': on file ' + c.stored + ', sheet says ' + c.incoming));
          cl.appendChild(n);
        });
        if (conflicts.length > 12) {
          cl.appendChild(el('p', 'xm-issue-more', 'and ' + (conflicts.length - 12) + ' more.'));
        }
        warn.appendChild(cl);

        var amendable = conflicts.filter(function (c) { return c.kind === 'mark_conflict'; });
        if (amendable.length) {
          var field = el('div', 'cx-field');
          var lab = el('label', null, 'Reason for the amendment');
          lab.setAttribute('for', 'x-amend-reason');
          var inp = el('input', 'cx-input');
          inp.id = 'x-amend-reason'; inp.type = 'text';
          inp.placeholder = 'e.g. re-checked against the answer scripts on 2083/05/20';
          field.appendChild(lab); field.appendChild(inp);
          warn.appendChild(field);
          var amend = el('button', 'gl-btn', 'Amend ' + amendable.length + ' mark(s)');
          amend.type = 'button';
          amend.addEventListener('click', function () {
            var r = inp.value.trim();
            if (r.length < 8) { toast('Write a reason first — it goes on the record.', true); return; }
            commitImport('amend', r);
          });
          warn.appendChild(amend);
        }
        host.appendChild(warn);
      }

      (res.warnings || []).length && host.appendChild(el('p', 'cx-sub',
        (res.warnings || []).length + ' note(s) recorded with the import — see the overview\'s data health.'));

      await loadInstitutions();
      toast('Imported. The exam is on the Exams tab.');
    } catch (e) { fail(host, e); }
  }

  /* ── exams / cohort ──────────────────────────────────────────────────── */
  function renderExamsTab() {
    if (!S.exams.length) empty($('x-cohort'), 'No exams yet. Import a result sheet first.');
  }

  async function loadCohort(examId) {
    var host = $('x-cohort');
    if (!examId) { empty(host, 'Pick an exam.'); return; }
    busy(host, 'Loading the cohort…');
    try {
      var c = await ExamApi.cohort(examId);
      S.exam = examId; S.cohort = c;
      clear(host);

      var s = c.summary || {};
      var stats = el('div', 'cx-grid cx-grid--stats');
      [['Students', s.students], ['Average', s.avg_percentage === null ? '—' : s.avg_percentage + '%'],
       ['Highest', s.top_percentage === null ? '—' : s.top_percentage + '%'],
       ['Lowest', s.low_percentage === null ? '—' : s.low_percentage + '%']].forEach(function (p) {
        var b = el('div', 'gl cx-card');
        b.appendChild(el('div', 'cx-stat', p[1] === null || p[1] === undefined ? '—' : p[1]));
        b.appendChild(el('div', 'cx-stat-label', p[0]));
        stats.appendChild(b);
      });
      host.appendChild(stats);

      var bar = el('div', 'xm-bar');
      bar.style.marginTop = '16px';
      var an = el('button', 'gl-btn', 'Read the cohort');
      an.type = 'button';
      an.addEventListener('click', function () { cohortAnalysis(c); });
      bar.appendChild(an);
      host.appendChild(bar);
      var anHost = el('div'); anHost.id = 'x-cohort-analysis';
      host.appendChild(anHost);

      /* subject averages */
      var subj = el('section', 'gl cx-card');
      subj.style.marginTop = '16px';
      subj.appendChild(el('h3', null, 'Subject averages'));
      var sw = el('div', 'xm-scroll');
      var stab = el('table', 'xm-table');
      var sth = el('thead'), sthr = el('tr');
      ['Subject', 'Max', 'Average', 'Average %', 'Sat', 'Absent'].forEach(function (x, i) {
        sthr.appendChild(el('th', i ? 'xm-num' : null, x));
      });
      sth.appendChild(sthr); stab.appendChild(sth);
      var stb = el('tbody');
      (c.subjects || []).forEach(function (x) {
        var tr = el('tr');
        tr.appendChild(el('td', null, x.subject_name));
        tr.appendChild(el('td', 'xm-num', x.max_marks));
        tr.appendChild(el('td', 'xm-num', x.avg_obtained === null ? '—' : x.avg_obtained));
        var td = el('td', 'xm-num');
        td.appendChild(el('span', 'xm-pill ' + band(x.avg_percentage),
          x.avg_percentage === null ? '—' : x.avg_percentage + '%'));
        tr.appendChild(td);
        tr.appendChild(el('td', 'xm-num', x.sat_count));
        tr.appendChild(el('td', 'xm-num', x.absent_count));
        stb.appendChild(tr);
      });
      stab.appendChild(stb); sw.appendChild(stab); subj.appendChild(sw);
      host.appendChild(subj);

      /* students */
      var list = el('section', 'gl cx-card');
      list.style.marginTop = '16px';
      list.appendChild(el('h3', null, 'Students'));
      list.appendChild(el('p', 'cx-sub',
        'Ranked. A row without a reachable parent cannot be messaged until the number is fixed.'));
      var lw = el('div', 'xm-scroll');
      var t = el('table', 'xm-table');
      var th = el('thead'), thr = el('tr');
      ['#', 'Student', 'Roll', 'Total', '%', 'Grade', 'Change', 'Parent', 'Card', 'Message']
        .forEach(function (x, i) { thr.appendChild(el('th', i >= 3 && i <= 6 ? 'xm-num' : null, x)); });
      th.appendChild(thr); t.appendChild(th);
      var tb = el('tbody');
      (c.students || []).forEach(function (r) {
        var tr = el('tr');
        tr.appendChild(el('td', 'xm-num', r.rank));
        var nameTd = el('td');
        var btn = el('button', 'xm-rowbtn', r.name);
        btn.type = 'button';
        btn.addEventListener('click', function () { openStudent(r.student_id, examId); });
        nameTd.appendChild(btn);
        tr.appendChild(nameTd);
        tr.appendChild(el('td', null, r.code));
        tr.appendChild(el('td', 'xm-num', r.obtained + ' / ' + r.max_marks));
        var pctTd = el('td', 'xm-num');
        pctTd.appendChild(el('span', 'xm-pill ' + band(r.percentage), pct(r.percentage)));
        tr.appendChild(pctTd);
        tr.appendChild(el('td', 'xm-num', r.grade || '—'));
        var d = el('td', 'xm-num');
        d.textContent = r.delta_percentage === null || r.delta_percentage === undefined
          ? 'first exam'
          : (r.delta_percentage > 0 ? '+' : '') + r.delta_percentage;
        d.className = 'xm-num ' + (r.direction === 'improved' ? 'xm-good'
          : r.direction === 'declined' ? 'xm-bad' : '');
        tr.appendChild(d);
        var pt = el('td');
        pt.appendChild(el('span', 'xm-pill ' + (r.has_valid_parent ? 'xm-pill--good' : 'xm-pill--bad'),
          r.has_valid_parent ? 'ok' : 'check'));
        tr.appendChild(pt);
        tr.appendChild(el('td', null, r.report_versions ? 'v' + r.report_versions : '—'));
        tr.appendChild(el('td', null, r.last_message ? r.last_message.status : '—'));
        tb.appendChild(tr);
      });
      t.appendChild(tb); lw.appendChild(t); list.appendChild(lw);
      host.appendChild(list);
    } catch (e) { fail(host, e); }
  }

  async function cohortAnalysis(c) {
    var host = $('x-cohort-analysis');
    busy(host, 'Reading the cohort…');
    try {
      // Aggregates only. No individual marks and no names leave the browser for
      // this call — the model is asked about the batch, not about children.
      var input = {
        exam: (c.exam || {}).name,
        summary: c.summary,
        subjects: (c.subjects || []).map(function (s) {
          return { subject: s.subject_name, max: s.max_marks, avg: s.avg_obtained,
                   avg_percentage: s.avg_percentage, sat: s.sat_count, absent: s.absent_count };
        })
      };
      var out = await ExamApi.ai('cohort_synthesis', input, S.institution.id);
      renderAnalysis(host, out, ['themes']);
    } catch (e) { fail(host, e); }
  }

  function renderAnalysis(host, out, keys) {
    clear(host);
    var r = out.result || {};
    if (out.degraded) host.appendChild(el('p', 'xm-degraded', out.degraded));
    if (r.headline) host.appendChild(el('p', null, r.headline));
    var items = [];
    keys.forEach(function (k) { items = items.concat(r[k] || []); });
    var list = el('div', 'xm-obs');
    items.forEach(function (o) {
      var dl = el('dl', 'xm-ob');
      dl.appendChild(el('dt', null, 'Observed'));  dl.appendChild(el('dd', null, o.observed));
      dl.appendChild(el('dt', null, 'Insight'));   dl.appendChild(el('dd', null, o.insight));
      dl.appendChild(el('dt', null, 'Action'));    dl.appendChild(el('dd', null, o.action));
      list.appendChild(dl);
    });
    host.appendChild(list);
    var by = el('p', 'cx-sub');
    by.textContent = out.provider === 'none'
      ? 'Computed from the marks — no model was used.'
      : 'Written by ' + out.model + (out.cached ? ' (from cache)' : '') +
        ' from figures this system calculated.';
    host.appendChild(by);
  }

  /* ── students ────────────────────────────────────────────────────────── */
  var searchTimer = 0;
  async function runSearch() {
    var host = $('x-student-list');
    if (!S.institution) { empty(host, 'No college selected.'); return; }
    busy(host, 'Searching…');
    try {
      var rows = await ExamApi.searchStudents(S.institution.id, $('x-student-search').value);
      clear(host);
      if (!rows.length) { empty(host, 'No student matches that.'); return; }
      var ul = el('div', 'cx-docs');
      rows.forEach(function (r) {
        var b = el('button', 'cx-item');
        b.type = 'button';
        b.appendChild(el('span', 'cx-item-name', r.full_name));
        var meta = [r.student_code];
        if (r.batches) meta.push([r.batches.course, r.batches.year_label, r.batches.name]
          .filter(Boolean).join(' '));
        b.appendChild(el('span', 'cx-item-meta', meta.filter(Boolean).join(' · ')));
        b.addEventListener('click', function () { openStudent(r.id, null); });
        ul.appendChild(b);
      });
      host.appendChild(ul);
    } catch (e) { fail(host, e); }
  }

  async function openStudent(studentId, examId) {
    selectTab('students');
    var host = $('x-student-detail');
    busy(host, 'Loading the student…');
    try {
      var student = await ExamApi.student(studentId);
      if (!student) { empty(host, 'That student is not on file.'); return; }
      S.student = student;
      var exam = examId || S.exam ||
        (S.exams[0] ? S.exams[0].id : null);
      clear(host);

      var head = el('div', 'cx-head');
      var title = el('div', 'cx-title');
      title.appendChild(el('span', 'gl-eyebrow', student.student_code));
      title.appendChild(el('h2', null, student.full_name));
      var b = student.batches || {};
      title.appendChild(el('p', null,
        [b.course, b.year_label, b.name ? 'Batch ' + b.name : '', student.category]
          .filter(Boolean).join(' · ')));
      head.appendChild(title);

      var actions = el('div', 'cx-actions');
      var sel = el('select', 'cx-input');
      sel.id = 'x-student-exam';
      fillExamSelect(sel);
      sel.value = exam || '';
      sel.addEventListener('change', function () { loadStudentExam(sel.value); });
      actions.appendChild(sel);
      head.appendChild(actions);
      host.appendChild(head);

      /* guardians — the numbers, plainly, always visible */
      var gs = el('section', 'gl cx-card');
      gs.appendChild(el('h3', null, 'Parents on file'));
      gs.appendChild(el('p', 'cx-sub',
        'These are the numbers this system will dial. Correct one here and the change is recorded.'));
      var glist = el('div', 'xm-recipients');
      (student.guardians || []).forEach(function (g) {
        glist.appendChild(guardianRow(g, false));
      });
      if (!(student.guardians || []).length) {
        glist.appendChild(el('p', 'xm-empty', 'No parent is recorded for this student.'));
      }
      gs.appendChild(glist);
      host.appendChild(gs);

      var examHost = el('div');
      examHost.id = 'x-student-exam-body';
      examHost.style.marginTop = '16px';
      host.appendChild(examHost);
      if (exam) loadStudentExam(exam);
      else empty(examHost, 'Pick an exam to see the marks.');
    } catch (e) { fail(host, e); }
  }

  function guardianRow(g, selectable) {
    var row = el('label', 'xm-recipient');
    row.setAttribute('data-status', g.phone_status);
    if (selectable) {
      var cb = el('input');
      cb.type = 'checkbox'; cb.value = g.id;
      cb.className = 'x-recipient-check';
      cb.disabled = g.phone_status === 'missing';
      row.appendChild(cb);
    } else {
      row.appendChild(el('span', 'xm-recipient-rel', g.relation));
    }
    var mid = el('span');
    mid.appendChild(el('span', 'xm-recipient-name', g.full_name || '(name not recorded)'));
    mid.appendChild(document.createElement('br'));
    var phone = el('span', 'xm-recipient-phone',
      g.phone_e164 || g.phone_raw || 'no number on file');
    mid.appendChild(phone);
    if (g.phone_e164 && g.phone_raw && g.phone_e164 !== g.phone_raw) {
      mid.appendChild(el('span', 'xm-recipient-rel', '  (sheet: ' + g.phone_raw + ')'));
    }
    row.appendChild(mid);

    var right = el('span');
    right.appendChild(el('span', 'xm-pill ' + (g.phone_status === 'valid' ? 'xm-pill--good'
      : g.phone_status === 'suspect' ? 'xm-pill--warn' : 'xm-pill--mute'), g.phone_status));
    if (!selectable) {
      var edit = el('button', 'gl-btn gl-btn--quiet', 'Correct');
      edit.type = 'button';
      edit.addEventListener('click', function (ev) {
        // The row is a <label>; without this the click also toggles whatever
        // control the label owns.
        ev.preventDefault();
        correctGuardian(g, row, phone, right);
      });
      right.appendChild(edit);
    }
    row.appendChild(right);
    return row;
  }

  /* Correcting a parent's number is a core flow, not an edge case, so it is an
     inline form rather than a browser prompt(): the person doing it needs to
     see what is on file, what the new value normalises to, and why it is being
     called suspect, all at once and all still on screen. */
  function correctGuardian(g, row, phoneNode, statusNode) {
    if (row.querySelector('.x-edit')) return;
    var box = el('div', 'x-edit xm-fix');
    box.style.gridColumn = '1 / -1';
    box.style.marginTop = '10px';

    var input = el('input', 'cx-input');
    input.type = 'tel';
    input.id = 'x-guardian-' + g.id;
    input.value = g.phone_e164 || g.phone_raw || '';
    input.placeholder = '+919812345678';
    var label = el('label', null, 'Number for ' + (g.full_name || g.relation));
    label.setAttribute('for', input.id);
    label.appendChild(el('small', null, 'On file: ' + (g.phone_raw || 'nothing') +
      '. Enter it with the country code.'));

    var note = el('p', 'xm-count');
    var save = el('button', 'gl-btn gl-btn--primary', 'Save');
    save.type = 'button';
    var cancel = el('button', 'gl-btn gl-btn--quiet', 'Cancel');
    cancel.type = 'button';

    function preview() {
      var n = ExamMapping.normalisePhone(input.value);
      note.textContent = n.status === 'valid'
        ? 'Will be dialled as ' + n.e164 + '.'
        : n.status === 'missing'
          ? 'No number — this parent will not be contactable.'
          : 'Saved as written and flagged: ' + n.note;
      note.className = 'xm-count ' + (n.status === 'valid' ? 'xm-good' : 'xm-warn');
      return n;
    }
    input.addEventListener('input', preview);
    preview();

    save.addEventListener('click', async function () {
      var norm = preview();
      save.disabled = true;
      try {
        await ExamApi.updateGuardian(g.id, {
          phone_raw: norm.raw, phone_e164: norm.e164, phone_status: norm.status
        });
        g.phone_raw = norm.raw; g.phone_e164 = norm.e164; g.phone_status = norm.status;
        phoneNode.textContent = norm.e164 || norm.raw || 'no number on file';
        row.setAttribute('data-status', norm.status);
        var pill = statusNode.querySelector('.xm-pill');
        if (pill) {
          pill.textContent = norm.status;
          pill.className = 'xm-pill ' + (norm.status === 'valid' ? 'xm-pill--good'
            : norm.status === 'suspect' ? 'xm-pill--warn' : 'xm-pill--mute');
        }
        box.remove();
        toast(norm.status === 'valid' ? 'Number updated.'
          : 'Saved, and still flagged — check it before sending.');
      } catch (e) { toast(e.message, true); save.disabled = false; }
    });
    cancel.addEventListener('click', function () { box.remove(); });

    var wrap = el('div');
    wrap.appendChild(label);
    wrap.appendChild(input);
    wrap.appendChild(note);
    var bar = el('div', 'xm-bar');
    bar.style.margin = '0';
    bar.appendChild(save); bar.appendChild(cancel);
    box.appendChild(wrap); box.appendChild(bar);
    row.appendChild(box);
    input.focus();
  }

  async function loadStudentExam(examId) {
    var host = $('x-student-exam-body');
    if (!examId) { empty(host, 'Pick an exam.'); return; }
    busy(host, 'Loading the result…');
    try {
      var report = await ExamApi.report(S.student.id, examId);
      S.report = report; S.exam = examId;
      S.model = ReportCard.buildModel(report);
      var m = S.model;
      clear(host);

      var stats = el('div', 'cx-grid cx-grid--stats');
      [['Total', m.totals.obtained === null ? '—' : m.totals.obtained + ' / ' + m.totals.max],
       ['Percentage', ReportCard.pct(m.totals.percentage)],
       ['Grade', m.grade.grade || '—'],
       ['Rank', m.totals.rank ? m.totals.rank + ' of ' + m.totals.cohort : '—'],
       ['Vs last exam', m.progress.delta === null ? 'first exam'
          : (m.progress.delta > 0 ? '+' : '') + m.progress.delta]].forEach(function (p) {
        var c = el('div', 'gl cx-card');
        c.appendChild(el('div', 'cx-stat', p[1]));
        c.appendChild(el('div', 'cx-stat-label', p[0]));
        stats.appendChild(c);
      });
      host.appendChild(stats);

      if (m.history.length > 1) host.appendChild(sparkline(m.history));

      var marks = el('section', 'gl cx-card');
      marks.style.marginTop = '16px';
      marks.appendChild(el('h3', null, 'Marks'));
      var w = el('div', 'xm-scroll');
      var t = el('table', 'xm-table');
      var th = el('thead'), thr = el('tr');
      ['Subject', 'Max', 'Obtained', '%', 'Batch avg', 'Vs last exam'].forEach(function (x, i) {
        thr.appendChild(el('th', i ? 'xm-num' : null, x));
      });
      th.appendChild(thr); t.appendChild(th);
      var tb = el('tbody');
      m.rows.forEach(function (r) {
        var tr = el('tr', r.kind === 'paper' ? 'xm-row-paper' : null);
        tr.appendChild(el('td', null, r.name));
        tr.appendChild(el('td', 'xm-num', r.max === null ? '—' : r.max));
        tr.appendChild(el('td', 'xm-num', r.absent ? 'AB'
          : (r.obtained === null ? '—' : r.obtained)));
        var p = el('td', 'xm-num');
        p.appendChild(el('span', 'xm-pill ' + band(r.percentage),
          r.absent ? 'absent' : ReportCard.pct(r.percentage)));
        tr.appendChild(p);
        tr.appendChild(el('td', 'xm-num', r.batchAvg === null || r.batchAvg === undefined
          ? '' : r.batchAvg));
        var d = el('td', 'xm-num');
        if (r.delta !== null && r.delta !== undefined) {
          d.textContent = (r.delta > 0 ? '+' : '') + r.delta;
          d.className = 'xm-num ' + (r.delta > 0 ? 'xm-good' : r.delta < 0 ? 'xm-bad' : '');
        }
        tr.appendChild(d);
        tb.appendChild(tr);
      });
      t.appendChild(tb); w.appendChild(t); marks.appendChild(w);
      host.appendChild(marks);

      var bar = el('div', 'xm-bar');
      bar.style.marginTop = '16px';
      [['Analyse', studentAnalysis],
       ['Report card', openCard],
       ['Send to parent', openSend]].forEach(function (pair, i) {
        var b = el('button', 'gl-btn' + (i === 2 ? ' gl-btn--primary' : ''), pair[0]);
        b.type = 'button';
        b.addEventListener('click', pair[1]);
        bar.appendChild(b);
      });
      host.appendChild(bar);
      var an = el('div'); an.id = 'x-student-analysis';
      host.appendChild(an);
    } catch (e) { fail(host, e); }
  }

  /* A sparkline, not a chart library: six exam percentages need a line and a
     scale, and a dependency for that is not worth the bytes or the licence. */
  function sparkline(history) {
    var box = el('section', 'gl cx-card');
    box.style.marginTop = '16px';
    box.appendChild(el('h3', null, 'Across exams'));
    var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('class', 'xm-spark');
    svg.setAttribute('viewBox', '0 0 300 90');
    svg.setAttribute('preserveAspectRatio', 'none');
    svg.setAttribute('role', 'img');
    var pts = history.filter(function (h) { return h.percentage !== null; });
    svg.setAttribute('aria-label', 'Percentage in each exam: ' + pts.map(function (h) {
      return h.exam + ' ' + h.percentage + '%';
    }).join(', '));
    var basel = document.createElementNS(svg.namespaceURI, 'line');
    basel.setAttribute('x1', 0); basel.setAttribute('x2', 300);
    basel.setAttribute('y1', 85); basel.setAttribute('y2', 85);
    basel.setAttribute('class', 'xm-spark-base');
    svg.appendChild(basel);
    if (pts.length > 1) {
      var step = 300 / (pts.length - 1);
      var d = pts.map(function (h, i) {
        var y = 85 - (Math.max(0, Math.min(100, h.percentage)) / 100) * 78;
        return (i ? 'L' : 'M') + (i * step).toFixed(1) + ' ' + y.toFixed(1);
      }).join(' ');
      var path = document.createElementNS(svg.namespaceURI, 'path');
      path.setAttribute('d', d);
      path.setAttribute('class', 'xm-spark-line');
      svg.appendChild(path);
      pts.forEach(function (h, i) {
        var c = document.createElementNS(svg.namespaceURI, 'circle');
        c.setAttribute('cx', (i * step).toFixed(1));
        c.setAttribute('cy', (85 - (h.percentage / 100) * 78).toFixed(1));
        c.setAttribute('r', 3.5);
        c.setAttribute('class', 'xm-spark-dot');
        svg.appendChild(c);
      });
    }
    box.appendChild(svg);
    var legend = el('p', 'cx-sub');
    legend.textContent = pts.map(function (h) { return h.exam + ' ' + h.percentage + '%'; }).join('   ·   ');
    box.appendChild(legend);
    return box;
  }

  async function studentAnalysis() {
    var host = $('x-student-analysis');
    busy(host, 'Reading the marks…');
    try {
      var out = await ExamApi.ai('student_analysis', analysisInput(), S.institution.id);
      S.analysis = out.result;
      renderAnalysis(host, out, ['observations']);
    } catch (e) { fail(host, e); }
  }

  /* What the model is given: the computed figures and the subject names, and
     nothing else. No parent's number, no other student, no free text. */
  function analysisInput() {
    var m = S.model;
    return {
      student: m.student.name, exam: m.exam.name,
      totals: { obtained: m.totals.obtained, max_marks: m.totals.max,
                percentage: m.totals.percentage, rank: m.totals.rank,
                cohort_size: m.totals.cohort },
      grade: m.grade.grade,
      batch_average: m.cohortAvg,
      progress: m.progress,
      subjects: m.rows.filter(function (r) { return r.kind === 'subject'; })
        .map(function (r) {
          return { subject: r.name, obtained: r.obtained, max_marks: r.max,
                   percentage: r.percentage, batch_average: r.batchAvg,
                   change: r.delta, absent: r.absent };
        }),
      papers: m.rows.filter(function (r) { return r.kind === 'paper'; })
        .map(function (r) {
          return { paper: r.name, obtained: r.obtained, max_marks: r.max,
                   percentage: r.percentage, passed: r.passed };
        }),
      strengths: m.strengths, attention: m.attention, absences: m.absences
    };
  }

  /* ── report card ─────────────────────────────────────────────────────── */
  function currentTemplate() {
    var sel = $('x-template');
    var id = sel && sel.value;
    return S.templates.filter(function (t) { return t.id === id; })[0] || S.template;
  }

  async function renderCardPreview() {
    var host = $('x-card-preview');
    busy(host, 'Drawing the card…');
    try {
      var assets = { logo: S.assets.logo, photo: null, remarks: $('x-remarks').value.trim() };
      if (S.student.photo_path) {
        assets.photo = await objectUrl(S.student.photo_path).catch(function () { return null; });
      }
      var tpl = currentTemplate();
      clear(host);
      if ($('x-card-mode').value === 'flyer') {
        var canvas = await ReportCard.toCanvas(S.model, tpl, assets);
        var img = new Image();
        img.alt = 'Report card for ' + S.model.student.name;
        img.src = canvas.toDataURL('image/png');
        host.appendChild(img);
        S.flyer = canvas;
      } else {
        host.appendChild(ReportCard.toHtml(S.model, tpl, assets));
        S.flyer = null;
      }
    } catch (e) { fail(host, e); }
  }

  function openCard() {
    if (!S.model) { toast('Load an exam first.', true); return; }
    $('x-card-title').textContent = S.model.student.name + ' — ' + S.model.exam.name;
    $('x-card').showModal();
    renderCardPreview();
  }

  async function generateAndStore() {
    // One image per send, stored once and reused for both parents. The version
    // number goes up rather than the file being replaced, so a message sent
    // last week still points at the card that was actually sent.
    var tpl = currentTemplate();
    var assets = { logo: S.assets.logo, photo: null, remarks: $('x-remarks').value.trim() };
    if (S.student.photo_path) {
      assets.photo = await objectUrl(S.student.photo_path).catch(function () { return null; });
    }
    var canvas = await ReportCard.toCanvas(S.model, tpl, assets);
    var blob = await ReportCard.toBlob(canvas);
    var existing = await ExamApi.reportCards(S.student.id, S.exam);
    var version = existing.length ? existing[0].version + 1 : 1;
    var path = S.institution.id + '/' + S.exam + '/' + S.student.id + '-v' + version + '.png';
    var stored = await ExamApi.upload('report-cards', path, blob, 'image/png');
    var rows = await ExamApi.saveReportCard({
      student_id: S.student.id, exam_id: S.exam,
      template_id: tpl ? tpl.id : null,
      version: version, payload: S.report, image_path: stored
    });
    return { card: rows[0], blob: blob, canvas: canvas, path: stored };
  }

  function downloadCanvas(canvas, name) {
    var a = document.createElement('a');
    a.href = canvas.toDataURL('image/png');
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  /* ── send ────────────────────────────────────────────────────────────── */
  function openSend() {
    if (!S.model) { toast('Load an exam first.', true); return; }
    var host = $('x-send-body');
    clear(host);

    host.appendChild(el('p', 'cx-sub',
      'Choose who receives it. The number shown is the one the message will go to — ' +
      'read it before sending.'));

    var list = el('div', 'xm-recipients');
    var guardians = (S.student.guardians || []);
    guardians.forEach(function (g) { list.appendChild(guardianRow(g, true)); });
    if (!guardians.length) {
      list.appendChild(el('p', 'cx-error', 'No parent is on file for this student. ' +
        'Add one before sending.'));
    }
    host.appendChild(list);

    var field = el('div', 'cx-field');
    var lab = el('label', null, 'Message');
    lab.setAttribute('for', 'x-message');
    var ta = el('textarea', 'xm-compose');
    ta.id = 'x-message';
    ta.value = ReportCard.parentMessage(S.model, guardians[0], new Date());
    field.appendChild(lab); field.appendChild(ta);
    host.appendChild(field);

    var count = el('p', 'xm-count');
    function updateCount() {
      count.textContent = ta.value.trim().split(/\s+/).filter(Boolean).length + ' words · ' +
        ta.value.length + ' characters';
    }
    ta.addEventListener('input', updateCount);
    updateCount();
    host.appendChild(count);

    var bar = el('div', 'xm-bar');
    var ai = el('button', 'gl-btn', 'Write it with AI');
    ai.type = 'button';
    ai.addEventListener('click', async function () {
      var checked = host.querySelectorAll('.x-recipient-check:checked');
      var g = guardians.filter(function (x) {
        return checked.length ? x.id === checked[0].value : true;
      })[0];
      ai.disabled = true;
      var old = ai.textContent;
      ai.textContent = 'Writing…';
      try {
        var input = Object.assign(analysisInput(), {
          institution: S.institution.name,
          greeting: ReportCard.greeting(new Date()),
          address: ReportCard.addressFor(g && g.relation),
          parent_name: g && g.full_name,
          relation: g && g.relation
        });
        var out = await ExamApi.ai('parent_message', input, S.institution.id);
        if (out.result && out.result.message) {
          ta.value = out.result.message;
          updateCount();
        }
        if (out.degraded) toast(out.degraded);
      } catch (e) { toast(e.message, true); }
      ai.disabled = false; ai.textContent = old;
    });
    bar.appendChild(ai);

    var reset = el('button', 'gl-btn gl-btn--quiet', 'Reset to the standard wording');
    reset.type = 'button';
    reset.addEventListener('click', function () {
      var checked = host.querySelectorAll('.x-recipient-check:checked');
      var g = guardians.filter(function (x) {
        return checked.length ? x.id === checked[0].value : true;
      })[0];
      ta.value = ReportCard.parentMessage(S.model, g, new Date());
      updateCount();
    });
    bar.appendChild(reset);
    host.appendChild(bar);

    /* The last gate before a child's marks leave the building. */
    var confirmWrap = el('label', 'cx-row');
    confirmWrap.style.gap = '8px';
    var confirmBox = el('input');
    confirmBox.type = 'checkbox'; confirmBox.id = 'x-confirm';
    confirmWrap.appendChild(confirmBox);
    confirmWrap.appendChild(el('span', null,
      'I have read the number(s) above and they belong to ' + S.model.student.name + '’s parents.'));
    host.appendChild(confirmWrap);

    var send = el('button', 'gl-btn gl-btn--primary', 'Generate the card and send');
    send.type = 'button';
    send.style.marginTop = '12px';
    send.addEventListener('click', function () { doSend(host, guardians, ta, confirmBox, send); });
    host.appendChild(send);

    S.sendResult = el('div');
    S.sendResult.style.marginTop = '14px';
    host.appendChild(S.sendResult);

    $('x-send-title').textContent = 'Send ' + S.model.student.name + '’s ' + S.model.exam.name +
      ' report card';
    $('x-send').showModal();
  }

  async function doSend(host, guardians, ta, confirmBox, button) {
    var checked = Array.prototype.slice.call(host.querySelectorAll('.x-recipient-check:checked'));
    if (!checked.length) { toast('Choose at least one parent.', true); return; }
    if (!confirmBox.checked) { toast('Confirm the number first.', true); return; }
    var body = ta.value.trim();
    if (body.length < 30) { toast('The message looks too short to send.', true); return; }

    button.disabled = true;
    var out = S.sendResult;
    busy(out, 'Generating the report card…');
    try {
      var made = await generateAndStore();
      clear(out);
      for (var i = 0; i < checked.length; i++) {
        var g = guardians.filter(function (x) { return x.id === checked[i].value; })[0];
        var line = el('div', 'xm-issue xm-issue--warning');
        line.appendChild(el('b', null, '…'));
        var text = el('span', null, 'Sending to ' + (g.full_name || g.relation) + ' — ' +
          (g.phone_e164 || g.phone_raw));
        line.appendChild(text);
        out.appendChild(line);
        try {
          var rows = await ExamApi.queueMessage({
            report_card_id: made.card.id, student_id: S.student.id, exam_id: S.exam,
            guardian_id: g.id, recipient_name: g.full_name, recipient_relation: g.relation,
            to_phone: g.phone_e164 || g.phone_raw, channel: 'whatsapp',
            body: body, media_path: made.path, status: 'queued'
          });
          var res = await ExamApi.sendMessage(rows[0].id);
          clear(line);
          if (res.sent) {
            line.className = 'xm-issue xm-issue--warning';
            line.style.background = 'transparent';
            line.appendChild(el('b', null, '✓'));
            line.appendChild(el('span', null, 'Sent to ' + (g.full_name || g.relation) +
              ' on ' + (g.phone_e164 || g.phone_raw) + '.'));
          } else {
            line.appendChild(el('b', null, '!'));
            var span = el('span');
            span.appendChild(document.createTextNode(res.note ||
              'Prepared but not sent automatically.'));
            span.appendChild(document.createElement('br'));
            var open = el('a', null, 'Open WhatsApp for ' + (g.full_name || g.relation));
            open.href = res.wa_link;
            open.target = '_blank';
            open.rel = 'noopener';
            span.appendChild(open);
            span.appendChild(document.createTextNode('  ·  '));
            var dl = el('button', 'xm-rowbtn', 'Download the card to attach');
            dl.type = 'button';
            dl.addEventListener('click', function () {
              downloadCanvas(made.canvas, S.model.student.name.replace(/\s+/g, '-') + '.png');
            });
            span.appendChild(dl);
            line.appendChild(span);
          }
        } catch (e) {
          clear(line);
          line.className = 'xm-issue xm-issue--error';
          line.appendChild(el('b', null, '!'));
          line.appendChild(el('span', null, 'Could not send to ' + (g.full_name || g.relation) +
            ': ' + e.message));
        }
      }
      toast('Done. The result of each send is recorded against the student.');
    } catch (e) { fail(out, e); }
    button.disabled = false;
  }

  /* ── template studio ─────────────────────────────────────────────────── */
  var COLOR_KEYS = [['accent', 'Accent'], ['ink', 'Text'], ['band', 'Panels'], ['line', 'Rules']];

  function renderTemplates() {
    var host = $('x-studio');
    if (!S.institution) { empty(host, 'Import a result sheet first.'); return; }
    clear(host);

    var tpl = S.templates.filter(function (t) {
      return t.id === ($('x-studio-template') || {}).value;
    })[0] || S.template;
    if (!tpl) { empty(host, 'No templates found.'); return; }
    var spec = ReportCard.spec(tpl);

    var form = el('div');
    form.appendChild(el('h3', null, tpl.name + (tpl.institution_id ? '' : ' (stock — saving makes your own copy)')));

    var name = el('input', 'cx-input');
    name.type = 'text'; name.value = tpl.institution_id ? tpl.name : tpl.name + ' (our version)';
    var nf = el('div', 'cx-field');
    var nl = el('label', null, 'Name'); nl.setAttribute('for', 'x-tpl-name');
    name.id = 'x-tpl-name';
    nf.appendChild(nl); nf.appendChild(name);
    form.appendChild(nf);

    var swatches = el('div', 'xm-swatches');
    var colorInputs = {};
    COLOR_KEYS.forEach(function (pair) {
      var w = el('label', 'xm-swatch', pair[1]);
      var i = el('input');
      i.type = 'color'; i.value = toHex(spec.palette[pair[0]]);
      colorInputs[pair[0]] = i;
      w.appendChild(i);
      swatches.appendChild(w);
    });
    form.appendChild(swatches);

    var blocks = el('div', 'xm-fixgrid');
    blocks.style.marginTop = '14px';
    var blockInputs = {};
    [['photo', 'Student photo'], ['chart', 'Progress line'], ['strengths', 'Strengths'],
     ['attention', 'Needs attention'], ['suggestions', 'Suggested next steps'],
     ['remarks', 'Coordinator’s remarks'], ['signatures', 'Signature lines']]
      .forEach(function (pair) {
        var w = el('label', 'cx-row');
        w.style.gap = '8px';
        var i = el('input'); i.type = 'checkbox'; i.checked = spec.blocks[pair[0]] !== false;
        blockInputs[pair[0]] = i;
        w.appendChild(i); w.appendChild(el('span', null, pair[1]));
        blocks.appendChild(w);
      });
    form.appendChild(blocks);

    var foot = el('div', 'cx-field');
    var fl = el('label', null, 'Footer note'); fl.setAttribute('for', 'x-tpl-foot');
    var fi = el('input', 'cx-input'); fi.id = 'x-tpl-foot'; fi.type = 'text';
    fi.value = spec.footerNote;
    foot.appendChild(fl); foot.appendChild(fi);
    form.appendChild(foot);

    var logoField = el('div', 'cx-field');
    var ll = el('label', null, 'College logo'); ll.setAttribute('for', 'x-tpl-logo');
    var li = el('input', 'cx-input'); li.id = 'x-tpl-logo'; li.type = 'file';
    li.accept = 'image/png,image/jpeg,image/webp,image/svg+xml';
    logoField.appendChild(ll); logoField.appendChild(li);
    logoField.appendChild(el('small', null,
      'Stored privately against this college and used on every card.'));
    li.addEventListener('change', async function () {
      var f = li.files && li.files[0];
      if (!f) return;
      try {
        var path = S.institution.id + '/logo-' + Date.now() + '.' + (f.name.split('.').pop() || 'png');
        var stored = await ExamApi.upload('branding', path, f, f.type);
        await ExamApi.rest('institutions?id=eq.' + S.institution.id,
          { method: 'PATCH', body: { logo_path: stored } });
        S.institution.logo_path = stored;
        S.assets.logo = await objectUrl(stored);
        toast('Logo saved.');
      } catch (e) { toast(e.message, true); }
    });
    form.appendChild(logoField);

    var save = el('button', 'gl-btn gl-btn--primary', 'Save this template');
    save.type = 'button';
    save.style.marginTop = '14px';
    save.addEventListener('click', async function () {
      var next = JSON.parse(JSON.stringify(spec));
      Object.keys(colorInputs).forEach(function (k) { next.palette[k] = colorInputs[k].value; });
      Object.keys(blockInputs).forEach(function (k) { next.blocks[k] = blockInputs[k].checked; });
      next.footerNote = fi.value.trim();
      try {
        var rows = await ExamApi.saveTemplate({
          institution_id: S.institution.id,
          key: (tpl.key || 'custom') + (tpl.institution_id ? '' : '-local'),
          name: name.value.trim() || tpl.name,
          spec: next, is_default: true
        });
        S.templates = await ExamApi.templates(S.institution.id);
        S.template = rows[0] || S.template;
        fillTemplateSelects();
        toast('Template saved. New report cards will use it.');
      } catch (e) { toast(e.message, true); }
    });
    form.appendChild(save);
    host.appendChild(form);
  }

  function toHex(color) {
    if (/^#[0-9a-f]{6}$/i.test(color || '')) return color;
    return '#0f5c4a';
  }

  /* ── boot ────────────────────────────────────────────────────────────── */
  async function start() {
    S.me = await Auth.whoAmI();
    if (!S.me) {
      show($('x-gate'), true);
      show($('x-console'), false);
      $('x-gate-err').textContent = 'That account is not on the staff list.';
      $('x-gate-err').hidden = false;
      return;
    }
    $('x-who').textContent = S.me.full_name || S.me.email;
    show($('x-gate'), false);
    show($('x-console'), true);
    await loadInstitutions();
    selectTab('overview');
  }

  document.addEventListener('DOMContentLoaded', function () {
    TABS.forEach(function (t) {
      var b = $('x-tab-' + t);
      if (b) b.addEventListener('click', function () { selectTab(t); });
    });

    $('x-gate-form').addEventListener('submit', async function (e) {
      e.preventDefault();
      var err = $('x-gate-err');
      err.hidden = true;
      var btn = $('x-gate-btn');
      btn.disabled = true;
      try {
        await Auth.signIn($('x-email').value, $('x-pass').value);
        await start();
      } catch (ex) {
        err.textContent = ex.message || 'Could not sign in.';
        err.hidden = false;
      }
      btn.disabled = false;
    });

    $('x-signout').addEventListener('click', function () {
      Auth.signOut().then(function () { location.reload(); });
    });

    $('x-institution').addEventListener('change', async function () {
      await setInstitution($('x-institution').value);
      selectTab('overview');
    });

    var drop = $('x-drop');
    var file = $('x-file');
    file.addEventListener('change', function () {
      if (file.files && file.files[0]) onFile(file.files[0]);
    });
    ['dragenter', 'dragover'].forEach(function (ev) {
      drop.addEventListener(ev, function (e) {
        e.preventDefault(); drop.setAttribute('data-over', 'true');
      });
    });
    ['dragleave', 'drop'].forEach(function (ev) {
      drop.addEventListener(ev, function (e) {
        e.preventDefault(); drop.setAttribute('data-over', 'false');
      });
    });
    drop.addEventListener('drop', function (e) {
      var f = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
      if (f) onFile(f);
    });

    $('x-exam-select').addEventListener('change', function () {
      loadCohort($('x-exam-select').value);
    });

    $('x-student-search').addEventListener('input', function () {
      clearTimeout(searchTimer);
      searchTimer = setTimeout(runSearch, 220);
    });

    $('x-card-close').addEventListener('click', function () { $('x-card').close(); });
    $('x-send-close').addEventListener('click', function () { $('x-send').close(); });
    $('x-card-mode').addEventListener('change', renderCardPreview);
    $('x-template').addEventListener('change', renderCardPreview);
    $('x-remarks').addEventListener('change', renderCardPreview);
    $('x-card-print').addEventListener('click', function () { window.print(); });
    $('x-card-download').addEventListener('click', async function () {
      if (!S.flyer) { $('x-card-mode').value = 'flyer'; await renderCardPreview(); }
      if (S.flyer) downloadCanvas(S.flyer, S.model.student.name.replace(/\s+/g, '-') + '.png');
    });
    $('x-card-store').addEventListener('click', async function () {
      try {
        var made = await generateAndStore();
        toast('Report card v' + made.card.version + ' stored.');
      } catch (e) { toast(e.message, true); }
    });
    var studioSel = $('x-studio-template');
    if (studioSel) studioSel.addEventListener('change', renderTemplates);

    if (Auth.isSignedIn) start();
    else { show($('x-gate'), true); show($('x-console'), false); }
  });
})();
