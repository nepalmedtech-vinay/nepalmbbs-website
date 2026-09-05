/* NepalMBBS.in — report-card.js
   Turns one exam_report() payload into three things: a view model, a printable
   HTML card, and a flyer image.

   The flyer is the point. A parent on WhatsApp should see their child's result
   in the chat — not a link to open, not a PDF to download on a phone that may
   not have a reader. So the card is drawn onto a canvas and sent as an image
   with the greeting as its caption. The same view model also renders as HTML
   for the coordinator's screen and for Print → Save as PDF, so what the parent
   sees and what the office files are the same card.

   No figure is calculated here. Every number comes from the payload, which came
   from SQL. This file decides where a number goes, never what it is.

   Templates are data (report_templates.spec). Palette, typography, which blocks
   appear and the header style all come from the spec; adding a design is a row,
   not a release. */

(function (root) {
  'use strict';

  var SANS = 'system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';
  var SERIF = 'Georgia, "Times New Roman", serif';

  var FALLBACK_SPEC = {
    palette: { ink: '#1d2430', muted: '#5b6676', line: '#dfe4ec', paper: '#ffffff',
               band: '#f4f6fa', accent: '#0f5c4a', good: '#0f7a4f', warn: '#9a5b00', bad: '#a32222' },
    header: { style: 'centered', showLogo: true, showAddress: true, rule: 'double' },
    blocks: { photo: true, identity: true, subjectTable: true, paperSummary: true,
              totals: true, chart: true, strengths: true, attention: true,
              suggestions: true, remarks: true, signatures: true, footer: true },
    typography: { display: SERIF, body: SANS },
    footerNote: 'Computer-generated statement of internal assessment marks.'
  };

  function spec(template) {
    var s = (template && template.spec) || {};
    return {
      palette: Object.assign({}, FALLBACK_SPEC.palette, s.palette),
      header: Object.assign({}, FALLBACK_SPEC.header, s.header),
      blocks: Object.assign({}, FALLBACK_SPEC.blocks, s.blocks),
      typography: Object.assign({}, FALLBACK_SPEC.typography, s.typography),
      footerNote: s.footerNote || FALLBACK_SPEC.footerNote
    };
  }

  /* ── greeting ────────────────────────────────────────────────────────
     Local time on the coordinator's machine, which is the same country as the
     parent's in every case this platform serves. */
  function greeting(now) {
    var h = (now || new Date()).getHours();
    if (h < 12) return 'Good Morning';
    if (h < 17) return 'Good Afternoon';
    return 'Good Evening';
  }
  function addressFor(relation) {
    return relation === 'mother' ? "Ma'am" : relation === 'father' ? 'Sir' : 'Sir/Ma’am';
  }

  function num(v) { return v === null || v === undefined || v === '' ? null : Number(v); }
  function pct(v) { var n = num(v); return n === null ? '—' : n.toFixed(2).replace(/\.00$/, '') + '%'; }
  function mark(v, absent) {
    if (absent) return 'AB';
    var n = num(v); return n === null ? '—' : String(Math.round(n * 100) / 100);
  }

  /* ── view model ──────────────────────────────────────────────────────── */
  function buildModel(report) {
    var r = report || {};
    var inst = r.institution || {}, st = r.student || {}, ex = r.exam || {};
    var totals = r.totals || {}, prog = r.progress || {}, grade = r.grade || {};

    var rows = [];
    (r.papers || []).forEach(function (p) {
      rows.push({ kind: 'paper', name: p.name, max: num(p.max_marks), pass: num(p.pass_marks),
                  obtained: num(p.obtained), percentage: num(p.percentage),
                  passed: p.passed, declared: num(p.declared_total),
                  declaredResult: p.declared_result,
                  declaredMatches: p.declared_matches });
      (p.subjects || []).forEach(function (s) {
        rows.push({ kind: 'subject', name: s.name, max: num(s.max_marks),
                    obtained: num(s.obtained), absent: !!s.is_absent,
                    percentage: num(s.percentage), batchAvg: num(s.batch_avg),
                    delta: num(s.delta_percentage) });
      });
    });

    return {
      institution: { name: inst.name || '', address: inst.address || '',
                     logoPath: inst.logo_path || null, accent: inst.accent_color || null },
      student: { name: st.name || '', code: st.code || '', serial: st.serial_no,
                 category: st.category || '', batch: (st.batch || {}),
                 photoPath: st.photo_path || null },
      exam: { name: ex.name || '', held: ex.held_label || '', result: ex.result_label || '',
              kind: ex.kind || '' },
      rows: rows,
      totals: { obtained: num(totals.obtained), max: num(totals.max_marks),
                percentage: num(totals.percentage), rank: num(totals.rank),
                cohort: num(totals.cohort_size) },
      grade: { grade: grade.grade || null, label: grade.label || null },
      cohortAvg: num((r.cohort || {}).avg_percentage),
      progress: { prev: num(prog.prev_percentage), delta: num(prog.delta_percentage),
                  direction: prog.direction || 'first-exam', prevExam: prog.prev_exam || null },
      strengths: r.strengths || [],
      attention: r.attention || [],
      absences: r.absences || [],
      history: r.history || [],
      guardians: r.guardians || [],
      computedAt: r.computed_at || new Date().toISOString()
    };
  }

  /* Suggestions are rules over the computed figures, not prose from a model.
     The AI analyst writes richer text elsewhere; a report card must still be
     complete when no model was reachable. */
  function suggestions(m) {
    var out = [];
    m.attention.slice(0, 3).forEach(function (a) {
      out.push(a.subject + ': ' + pct(a.percentage) + ' of the paper. A fixed weekly slot and a ' +
               'retest before the next internal.');
    });
    if (m.absences.length) {
      out.push('Did not sit ' + m.absences.join(', ') + '. Arrange the make-up assessment with the department.');
    }
    if (m.progress.direction === 'declined') {
      out.push('Down ' + Math.abs(m.progress.delta) + ' points on ' + m.progress.prevExam +
               '. Worth a conversation about study routine before the next exam.');
    }
    if (m.progress.direction === 'improved') {
      out.push('Up ' + m.progress.delta + ' points on ' + m.progress.prevExam +
               '. Keep the same routine going into the next internal.');
    }
    if (!out.length && m.strengths.length) {
      out.push('No subject is below 40% of its paper. Hold the routine and extend it to ' +
               m.strengths[0].subject + '.');
    }
    return out.slice(0, 4);
  }

  function bandColor(p, palette) {
    if (p === null) return palette.muted;
    if (p >= 60) return palette.good;
    if (p >= 40) return palette.warn;
    return palette.bad;
  }

  /* ── HTML card ───────────────────────────────────────────────────────
     Built with the DOM API, not innerHTML: a student's name is data, and this
     file will never be the place a stray angle bracket becomes markup. */
  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text !== undefined && text !== null) n.textContent = String(text);
    return n;
  }

  function toHtml(m, template, assets) {
    var s = spec(template), p = s.palette;
    assets = assets || {};
    var card = el('article', 'rc');
    card.style.setProperty('--rc-ink', p.ink);
    card.style.setProperty('--rc-muted', p.muted);
    card.style.setProperty('--rc-line', p.line);
    card.style.setProperty('--rc-paper', p.paper);
    card.style.setProperty('--rc-band', p.band);
    card.style.setProperty('--rc-accent', m.institution.accent || p.accent);
    card.style.setProperty('--rc-display', s.typography.display);
    card.style.setProperty('--rc-body', s.typography.body);

    var head = el('header', 'rc-head rc-head--' + (s.header.style || 'centered'));
    if (s.header.showLogo && assets.logo) {
      var logo = el('img', 'rc-logo'); logo.src = assets.logo; logo.alt = '';
      head.appendChild(logo);
    }
    var headText = el('div', 'rc-head-text');
    headText.appendChild(el('h1', 'rc-inst', m.institution.name));
    if (s.header.showAddress && m.institution.address) {
      headText.appendChild(el('p', 'rc-addr', m.institution.address));
    }
    headText.appendChild(el('p', 'rc-doc', 'Statement of Internal Assessment'));
    head.appendChild(headText);
    if (s.blocks.photo && assets.photo) {
      var ph = el('img', 'rc-photo'); ph.src = assets.photo; ph.alt = '';
      head.appendChild(ph);
    }
    card.appendChild(head);

    if (s.blocks.identity) {
      var id = el('dl', 'rc-id');
      [['Student', m.student.name],
       ['Roll / ID', m.student.code],
       ['Batch', [m.student.batch.course, m.student.batch.year_label, m.student.batch.name]
                 .filter(Boolean).join(' · ')],
       ['Examination', m.exam.name],
       ['Held', m.exam.held || '—'],
       ['Result declared', m.exam.result || '—']].forEach(function (pair) {
        if (!pair[1]) return;
        id.appendChild(el('dt', null, pair[0]));
        id.appendChild(el('dd', null, pair[1]));
      });
      card.appendChild(id);
    }

    if (s.blocks.totals) {
      var stats = el('div', 'rc-stats');
      [['Total', m.totals.obtained === null ? '—' : m.totals.obtained + ' / ' + m.totals.max],
       ['Percentage', pct(m.totals.percentage)],
       ['Grade', m.grade.grade || '—'],
       ['Rank', m.totals.rank ? m.totals.rank + ' of ' + m.totals.cohort : '—']]
        .forEach(function (pair) {
          var box = el('div', 'rc-stat');
          box.appendChild(el('span', 'rc-stat-v', pair[1]));
          box.appendChild(el('span', 'rc-stat-k', pair[0]));
          stats.appendChild(box);
        });
      card.appendChild(stats);
    }

    if (s.blocks.subjectTable) {
      var table = el('table', 'rc-table');
      var thead = el('thead'), hr = el('tr');
      ['Subject', 'Max', 'Obtained', '%', 'Batch avg'].forEach(function (h) {
        hr.appendChild(el('th', null, h));
      });
      thead.appendChild(hr); table.appendChild(thead);
      var tb = el('tbody');
      m.rows.forEach(function (r) {
        var tr = el('tr', r.kind === 'paper' ? 'rc-row-paper' : null);
        tr.appendChild(el('td', 'rc-c-name', r.name));
        tr.appendChild(el('td', null, r.max === null ? '—' : r.max));
        tr.appendChild(el('td', null, mark(r.obtained, r.absent)));
        var tdPct = el('td', null, pct(r.percentage));
        tdPct.style.color = bandColor(r.percentage, p);
        tr.appendChild(tdPct);
        tr.appendChild(el('td', 'rc-c-avg',
          r.kind === 'subject' && r.batchAvg !== null ? String(r.batchAvg) : ''));
        tb.appendChild(tr);
      });
      table.appendChild(tb);
      card.appendChild(table);
    }

    if (s.blocks.paperSummary) {
      var mismatched = m.rows.filter(function (r) {
        return r.kind === 'paper' && r.declaredMatches === false;
      });
      if (mismatched.length) {
        var warn = el('p', 'rc-note rc-note--warn');
        warn.textContent = 'The source sheet declared a different total for ' +
          mismatched.map(function (r) { return r.name + ' (' + r.declared + ')'; }).join(', ') +
          '. The figures above are the sum of the subject marks on file.';
        card.appendChild(warn);
      }
    }

    var summary = el('div', 'rc-cols');
    if (s.blocks.strengths && m.strengths.length) {
      var sc = el('section', 'rc-col');
      sc.appendChild(el('h2', null, 'Strengths'));
      var sl = el('ul');
      m.strengths.forEach(function (x) {
        sl.appendChild(el('li', null, x.subject + ' — ' + pct(x.percentage)));
      });
      sc.appendChild(sl); summary.appendChild(sc);
    }
    if (s.blocks.attention && (m.attention.length || m.absences.length)) {
      var ac = el('section', 'rc-col');
      ac.appendChild(el('h2', null, 'Needs attention'));
      var al = el('ul');
      m.attention.forEach(function (x) {
        al.appendChild(el('li', null, x.subject + ' — ' + pct(x.percentage)));
      });
      m.absences.forEach(function (x) { al.appendChild(el('li', null, x + ' — did not sit')); });
      ac.appendChild(al); summary.appendChild(ac);
    }
    if (summary.childNodes.length) card.appendChild(summary);

    if (s.blocks.suggestions) {
      var sug = suggestions(m);
      if (sug.length) {
        var sec = el('section', 'rc-sug');
        sec.appendChild(el('h2', null, 'Suggested next steps'));
        var ul = el('ul');
        sug.forEach(function (t) { ul.appendChild(el('li', null, t)); });
        sec.appendChild(ul); card.appendChild(sec);
      }
    }

    if (s.blocks.remarks && assets.remarks) {
      var rem = el('section', 'rc-remarks');
      rem.appendChild(el('h2', null, 'Coordinator’s remarks'));
      rem.appendChild(el('p', null, assets.remarks));
      card.appendChild(rem);
    }

    if (s.blocks.signatures) {
      var sig = el('div', 'rc-sigs');
      ['Class coordinator', 'Head of department'].forEach(function (label) {
        var b = el('div', 'rc-sig');
        b.appendChild(el('span', 'rc-sig-line', ''));
        b.appendChild(el('span', 'rc-sig-label', label));
        sig.appendChild(b);
      });
      card.appendChild(sig);
    }

    if (s.blocks.footer) {
      var f = el('footer', 'rc-foot');
      f.appendChild(el('span', null, s.footerNote));
      f.appendChild(el('span', null, 'Generated ' +
        new Date(m.computedAt).toLocaleDateString('en-IN',
          { day: 'numeric', month: 'short', year: 'numeric' })));
      card.appendChild(f);
    }
    return card;
  }

  /* ── flyer ───────────────────────────────────────────────────────────
     Drawn by hand on a canvas rather than rasterised from the HTML. An
     SVG/foreignObject round-trip drops webfonts and taints the canvas in some
     browsers, and a flyer that silently comes out blank would be sent to a
     parent before anyone noticed.

     Two passes over the same layout function: the first runs against a
     throwaway context purely to learn the finished height (the content is
     variable — three papers or one, four absences or none), the second draws
     onto a canvas cut to that height. `dry` is the no-context path, kept for
     the tests, which measure without a DOM. */

  var W = 1080, PAD = 64;

  function drawFlyer(m, template, assets, ctxOrNull, dry) {
    var s = spec(template), p = s.palette;
    var accent = m.institution.accent || p.accent;
    var ctx = ctxOrNull;
    var y = 0;

    function font(size, weight, family) {
      return (weight || 400) + ' ' + size + 'px ' + (family || s.typography.body || SANS);
    }
    function set(f, color) { if (!dry) { ctx.font = f; ctx.fillStyle = color; } }
    function fill(text, x, yy, align) {
      if (dry) return;
      ctx.textAlign = align || 'left';
      ctx.textBaseline = 'alphabetic';
      ctx.fillText(String(text), x, yy);
      ctx.textAlign = 'left';
    }
    function rect(x, yy, w, h, color, radius) {
      if (dry) return;
      ctx.fillStyle = color;
      if (radius && ctx.roundRect) { ctx.beginPath(); ctx.roundRect(x, yy, w, h, radius); ctx.fill(); }
      else ctx.fillRect(x, yy, w, h);
    }
    function wrap(text, x, yy, maxWidth, lineHeight) {
      var words = String(text).split(/\s+/), line = '', lines = [];
      words.forEach(function (w) {
        var test = line ? line + ' ' + w : w;
        var width = dry ? test.length * 8.2 : ctx.measureText(test).width;
        if (width > maxWidth && line) { lines.push(line); line = w; } else line = test;
      });
      if (line) lines.push(line);
      lines.forEach(function (l, i) { fill(l, x, yy + i * lineHeight); });
      return lines.length * lineHeight;
    }

    /* header band */
    var headH = s.header.showAddress && m.institution.address ? 232 : 200;
    rect(0, 0, W, headH, accent);
    set(font(21, 600), 'rgba(255,255,255,0.82)');
    fill('STATEMENT OF INTERNAL ASSESSMENT', W / 2, 62, 'center');
    set(font(46, 700, s.typography.display || SERIF), '#ffffff');
    if (!dry && ctx.measureText(m.institution.name).width > W - PAD * 2) {
      // A long college name is set smaller rather than clipped at the edge.
      set(font(34, 700, s.typography.display || SERIF), '#ffffff');
    }
    fill(m.institution.name, W / 2, 122, 'center');
    if (s.header.showAddress && m.institution.address) {
      set(font(24, 400), 'rgba(255,255,255,0.86)');
      fill(m.institution.address, W / 2, 162, 'center');
    }
    set(font(26, 600), 'rgba(255,255,255,0.95)');
    fill(m.exam.name + (m.exam.held ? '  ·  ' + m.exam.held : ''), W / 2, headH - 30, 'center');
    y = headH + 40;

    /* identity */
    set(font(40, 700, s.typography.display || SERIF), p.ink);
    fill(m.student.name, PAD, y + 12);
    y += 46;
    set(font(24, 400), p.muted);
    var idBits = [m.student.code,
                  [m.student.batch.course, m.student.batch.year_label].filter(Boolean).join(' '),
                  m.student.batch.name ? 'Batch ' + m.student.batch.name : ''].filter(Boolean);
    fill(idBits.join('   ·   '), PAD, y + 10);
    y += 46;

    /* stat strip */
    var boxes = [
      ['Total', m.totals.obtained === null ? '—' : m.totals.obtained + ' / ' + m.totals.max, p.ink],
      ['Percentage', pct(m.totals.percentage), bandColor(m.totals.percentage, p)],
      ['Grade', m.grade.grade || '—', p.ink],
      ['Rank', m.totals.rank ? m.totals.rank + ' / ' + m.totals.cohort : '—', p.ink]
    ];
    var bw = (W - PAD * 2 - 24 * 3) / 4;
    rect(PAD, y, W - PAD * 2, 132, p.band, 18);
    boxes.forEach(function (b, i) {
      var x = PAD + i * (bw + 24);
      set(font(40, 700, s.typography.display || SERIF), b[2]);
      fill(b[1], x + bw / 2, y + 66, 'center');
      set(font(21, 500), p.muted);
      fill(b[0].toUpperCase(), x + bw / 2, y + 100, 'center');
    });
    y += 132 + 34;

    /* progress line */
    if (m.progress.direction !== 'first-exam' && m.progress.delta !== null) {
      var word = m.progress.delta > 0 ? 'up' : m.progress.delta < 0 ? 'down' : 'level';
      var col = m.progress.delta > 0 ? p.good : m.progress.delta < 0 ? p.bad : p.muted;
      set(font(24, 600), col);
      fill(Math.abs(m.progress.delta) + ' points ' + word + ' on ' + m.progress.prevExam +
           ' (' + pct(m.progress.prev) + ')', PAD, y);
      y += 40;
    }
    if (m.cohortAvg !== null) {
      set(font(23, 400), p.muted);
      fill('Batch average for this exam: ' + pct(m.cohortAvg), PAD, y);
      y += 38;
    }
    y += 10;

    /* subject table */
    var colName = PAD, colMax = 640, colGot = 760, colPct = 880, barX = 940;
    set(font(20, 600), p.muted);
    fill('SUBJECT', colName, y); fill('MAX', colMax, y);
    fill('MARKS', colGot, y);   fill('%', colPct, y);
    y += 14;
    rect(PAD, y, W - PAD * 2, 2, p.line);
    y += 26;

    m.rows.forEach(function (r) {
      if (r.kind === 'paper') {
        y += 6;
        rect(PAD - 14, y - 26, W - PAD * 2 + 28, 44, p.band, 10);
        set(font(24, 700), p.ink);
        fill(r.name, colName, y);
        set(font(23, 600), p.ink);
        fill(r.max === null ? '—' : String(r.max), colMax, y);
        fill(mark(r.obtained, false), colGot, y);
        set(font(23, 700), bandColor(r.percentage, p));
        fill(pct(r.percentage), colPct, y);
        if (r.pass !== null && r.passed !== null && r.passed !== undefined) {
          set(font(19, 700), r.passed ? p.good : p.bad);
          fill(r.passed ? 'PASS' : 'FAIL', W - PAD, y, 'right');
        }
        y += 42;
      } else {
        set(font(24, 400), p.ink);
        fill(r.name, colName + 18, y);
        set(font(23, 400), p.muted);
        fill(r.max === null ? '—' : String(r.max), colMax, y);
        set(font(23, 600), r.absent ? p.warn : p.ink);
        fill(mark(r.obtained, r.absent), colGot, y);
        set(font(23, 600), bandColor(r.percentage, p));
        fill(r.absent ? '—' : pct(r.percentage), colPct, y);
        if (!r.absent && r.percentage !== null) {
          rect(barX, y - 14, 76, 12, p.line, 6);
          rect(barX, y - 14, Math.max(3, 76 * Math.min(1, r.percentage / 100)), 12,
               bandColor(r.percentage, p), 6);
        }
        y += 38;
      }
    });
    y += 18;

    /* strengths / attention */
    var half = (W - PAD * 2 - 28) / 2;
    var listTop = y;
    if (m.strengths.length) {
      set(font(22, 700), p.good);
      fill('STRENGTHS', PAD, y); y += 32;
      set(font(23, 400), p.ink);
      m.strengths.slice(0, 4).forEach(function (x) {
        fill('· ' + x.subject + '  ' + pct(x.percentage), PAD, y); y += 32;
      });
    }
    var leftEnd = y;
    y = listTop;
    if (m.attention.length || m.absences.length) {
      var rx = PAD + half + 28;
      set(font(22, 700), p.bad);
      fill('NEEDS ATTENTION', rx, y); y += 32;
      set(font(23, 400), p.ink);
      m.attention.slice(0, 4).forEach(function (x) {
        fill('· ' + x.subject + '  ' + pct(x.percentage), rx, y); y += 32;
      });
      m.absences.slice(0, 3).forEach(function (x) {
        fill('· ' + x + '  did not sit', rx, y); y += 32;
      });
    }
    y = Math.max(leftEnd, y) + 18;

    /* next steps */
    var sug = suggestions(m);
    if (s.blocks.suggestions && sug.length) {
      rect(PAD, y - 8, W - PAD * 2, 2, p.line);
      y += 34;
      set(font(22, 700), accent);
      fill('SUGGESTED NEXT STEPS', PAD, y); y += 34;
      set(font(23, 400), p.ink);
      sug.slice(0, 3).forEach(function (t) {
        y += wrap('· ' + t, PAD, y, W - PAD * 2, 32) + 6;
      });
      y += 8;
    }

    /* footer */
    rect(0, y + 8, W, 96, p.band);
    set(font(20, 400), p.muted);
    fill(s.footerNote, PAD, y + 50);
    fill('Generated ' + new Date(m.computedAt).toLocaleDateString('en-IN',
         { day: 'numeric', month: 'short', year: 'numeric' }), W - PAD, y + 50, 'right');
    fill('Marks are as recorded by the college. Please contact the coordinator with any query.',
         PAD, y + 80);
    return y + 104;
  }

  async function toCanvas(m, template, assets) {
    if (document.fonts && document.fonts.ready) { try { await document.fonts.ready; } catch (e) {} }
    var probe = document.createElement('canvas').getContext('2d');
    var height = drawFlyer(m, template, assets, probe, false);   // measure with a real ctx
    var canvas = document.createElement('canvas');
    canvas.width = W; canvas.height = Math.ceil(height);
    var ctx = canvas.getContext('2d');
    ctx.fillStyle = spec(template).palette.paper;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    drawFlyer(m, template, assets, ctx, false);
    return canvas;
  }

  function toBlob(canvas) {
    return new Promise(function (resolve) {
      canvas.toBlob(function (b) { resolve(b); }, 'image/png', 0.92);
    });
  }

  /* ── the message that travels with the flyer ─────────────────────────
     Deterministic. The AI analyst can rewrite it and the coordinator can edit
     it, but this is what goes out if neither happens, and every figure in it
     is copied from the payload. */
  function parentMessage(m, guardian, now) {
    var g = greeting(now), a = addressFor(guardian && guardian.relation);
    var lines = [g + ' ' + a + ',', ''];
    lines.push('This is from ' + m.institution.name + ' regarding ' + m.student.name +
               '’s ' + m.exam.name + ' result.');
    if (m.totals.percentage !== null) {
      lines.push(m.student.name + ' scored ' + m.totals.obtained + ' out of ' + m.totals.max +
                 ' (' + pct(m.totals.percentage) + ')' +
                 (m.totals.rank ? ', ranked ' + m.totals.rank + ' of ' + m.totals.cohort : '') + '.');
    }
    if (m.strengths.length) {
      lines.push('The performance in ' + m.strengths.slice(0, 2).map(function (x) {
        return x.subject;
      }).join(' and ') + ' is encouraging.');
    }
    if (m.attention.length) {
      lines.push(m.attention.slice(0, 2).map(function (x) { return x.subject; }).join(' and ') +
                 ' needs regular attention over the coming weeks.');
    }
    if (m.absences.length) {
      lines.push(m.student.name + ' did not sit ' + m.absences.join(', ') + '.');
    }
    lines.push('');
    lines.push('The full report card is attached. Please feel free to call us to discuss it.');
    return lines.join('\n');
  }

  root.ReportCard = {
    spec: spec, buildModel: buildModel, toHtml: toHtml, toCanvas: toCanvas,
    toBlob: toBlob, suggestions: suggestions, parentMessage: parentMessage,
    greeting: greeting, addressFor: addressFor, pct: pct
  };
})(window);
