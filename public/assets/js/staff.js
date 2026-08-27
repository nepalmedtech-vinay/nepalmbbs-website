/* NepalMBBS.in — staff.js
   The counselor console: pipeline, task queue, documents, notes.

   Two rules this file follows throughout.

   First, it never builds markup from data. Every value that came out of the
   database goes into the page through textContent, never through innerHTML.
   The Content-Security-Policy already stops an injected <script> from running,
   but a student's name is not markup and should never be parsed as any, and
   defence that depends on one header holding is not defence.

   Second, it does not decide who may see what. Every request here goes out
   with the counselor's session JWT and the database answers according to the
   RLS policies in 0001/0002. If this file has a bug that asks for the wrong
   rows, the answer is still an empty list. The UI reflects permission; it does
   not enforce it. */

(function () {
  'use strict';

  var STAGES = ['enquiry', 'qualifying', 'eligible', 'applied', 'entrance',
                'counselling', 'allotted', 'admitted'];
  var CLOSED = ['deferred', 'withdrawn', 'ineligible'];
  var LABEL = {
    enquiry: 'Enquiry', qualifying: 'Qualifying', eligible: 'Eligible',
    applied: 'Applied', entrance: 'Entrance', counselling: 'Counselling',
    allotted: 'Allotted', admitted: 'Admitted', deferred: 'Deferred',
    withdrawn: 'Withdrawn', ineligible: 'Ineligible'
  };
  var DOC_LABEL = {
    neet_scorecard: 'NEET scorecard', marksheet_10: 'Class 10 marksheet',
    marksheet_12: 'Class 12 marksheet', passport: 'Passport', photo: 'Passport photo',
    birth_certificate: 'Birth certificate', migration_certificate: 'Migration certificate',
    character_certificate: 'Character certificate', medical_fitness: 'Medical fitness',
    affidavit: 'Affidavit', other: 'Other'
  };

  var apps = [], tasks = [], leads = [], me = null, openId = null;

  function $(id) { return document.getElementById(id); }
  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = String(text);
    return n;
  }
  function clear(n) { while (n.firstChild) n.removeChild(n.firstChild); }

  function when(iso) {
    if (!iso) return '';
    var d = new Date(iso); if (isNaN(d)) return '';
    var days = Math.round((d - new Date()) / 86400000);
    if (days === 0) return 'today';
    if (days === 1) return 'tomorrow';
    if (days === -1) return 'yesterday';
    // Relative phrasing only while it is still useful. Past a fortnight in
    // either direction "in 2430 days" tells a counselor nothing a date would
    // not tell them better.
    if (days > -14 && days < 0) return -days + ' days ago';
    if (days > 0 && days < 14) return 'in ' + days + ' days';
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  /* ── data access ────────────────────────────────────────────────────── */
  async function api(path, opts) {
    opts = opts || {};
    var res = await fetch(SB + '/rest/v1/' + path, {
      method: opts.method || 'GET',
      headers: Object.assign(
        { 'Content-Type': 'application/json' },
        Auth.headers(),
        opts.method && opts.method !== 'GET' ? { Prefer: 'return=representation' } : {}
      ),
      body: opts.body ? JSON.stringify(opts.body) : undefined
    });
    if (!res.ok) {
      var e = new Error(await res.text().catch(function () { return 'request failed'; }));
      e.status = res.status; throw e;
    }
    return res.status === 204 ? null : res.json();
  }

  function toast(msg, bad) {
    var t = $('s-toast');
    t.textContent = msg;
    t.className = bad ? 'cx-error' : 'cx-note';
    t.hidden = false;
    clearTimeout(toast._t);
    toast._t = setTimeout(function () { t.hidden = true; }, 3600);
  }

  async function guard(fn) {
    try { await fn(); }
    catch (e) {
      // 401/403 means the session lapsed or this account is not staff. Both
      // are "sign in again", not "something went wrong".
      if (e.status === 401 || e.status === 403) { await Auth.signOut(); showGate(); }
      else toast(e.status === 429 ? 'Too many requests — wait a moment.'
                                 : 'Could not save that. Please try again.', true);
    }
  }

  /* ── pipeline ───────────────────────────────────────────────────────── */
  function renderBoard() {
    var board = $('s-board');
    clear(board);
    var q = ($('s-search').value || '').trim().toLowerCase();
    var mineOnly = $('s-mine').checked;

    var shown = apps.filter(function (a) {
      if (mineOnly && me && a.assigned_to !== me.id) return false;
      if (!q) return true;
      return (a.student_name || '').toLowerCase().indexOf(q) >= 0 ||
             (a.contact_number || '').indexOf(q) >= 0 ||
             (a.city || '').toLowerCase().indexOf(q) >= 0;
    });

    var cols = STAGES.slice();
    // Closed stages only get a column when something is actually in one, so
    // the board is not three empty lanes wide on a normal day.
    CLOSED.forEach(function (s) {
      if (shown.some(function (a) { return a.stage === s; })) cols.push(s);
    });

    cols.forEach(function (stage) {
      var inStage = shown.filter(function (a) { return a.stage === stage; });
      var col = el('div', 'cx-col');
      var head = el('div', 'cx-col-head');
      head.appendChild(el('span', 'st st-' + stage, LABEL[stage]));
      head.appendChild(el('span', 'cx-col-count', inStage.length));
      col.appendChild(head);

      if (!inStage.length) {
        col.appendChild(el('div', 'cx-empty', '—'));
      } else {
        inStage.forEach(function (a) { col.appendChild(card(a)); });
      }
      board.appendChild(col);
    });

    $('s-count').textContent = shown.length + ' of ' + apps.length;
  }

  function card(a) {
    var b = el('button', 'cx-item');
    b.type = 'button';
    if (a.next_action_at && new Date(a.next_action_at) <= new Date()) {
      b.className += ' is-due';
    }
    b.appendChild(el('div', 'cx-item-name', a.student_name));
    var meta = el('div', 'cx-item-meta');
    if (a.city) meta.appendChild(el('span', null, a.city));
    if (a.neet_score != null) meta.appendChild(el('span', null, 'NEET ' + a.neet_score));
    if (a.next_action_at) meta.appendChild(el('span', null, 'next ' + when(a.next_action_at)));
    b.appendChild(meta);
    b.addEventListener('click', function () { openDrawer(a.id); });
    return b;
  }

  /* ── task queue ─────────────────────────────────────────────────────── */
  function renderTasks() {
    var body = $('s-tasks');
    clear(body);
    var now = new Date();
    var open = tasks.filter(function (t) { return t.state === 'open'; });

    if (!open.length) {
      body.appendChild(el('div', 'cx-empty', 'Nothing due. Good place to be.'));
      $('s-task-count').textContent = '0';
      return;
    }
    $('s-task-count').textContent = String(open.length);

    open.slice(0, 12).forEach(function (t) {
      var row = el('div', 'cx-doc');
      var overdue = new Date(t.due_at) < now;
      var mark = el('span', 'cx-doc-mark ' + (overdue ? 'd-rejected' : 'd-received'),
                    overdue ? '!' : '•');
      var name = el('div', 'cx-doc-name', t.title);
      var who = t.applications && t.applications.student_name;
      name.appendChild(el('span', 'cx-doc-note',
        (who ? who + ' · ' : '') + (t.channel ? t.channel + ' · ' : '') + 'due ' + when(t.due_at)));
      var done = el('button', 'gl-btn gl-btn--quiet', 'Done');
      done.type = 'button';
      done.addEventListener('click', function () {
        guard(async function () {
          await api('tasks?id=eq.' + encodeURIComponent(t.id), {
            method: 'PATCH', body: { state: 'done', completed_at: new Date().toISOString() }
          });
          t.state = 'done';
          renderTasks();
          toast('Task closed.');
        });
      });
      row.appendChild(mark); row.appendChild(name); row.appendChild(done);
      body.appendChild(row);
    });
  }

  /* ── enquiry queue ──────────────────────────────────────────────────── */
  /* Raw form submissions that nobody has picked up. Converting one creates the
     application, carries the free-text across as the first note, and — because
     the application arrives at stage 'enquiry' — starts the follow-up sequence
     on its own. All of that happens in convert_lead_to_application(); this
     button's only job is to call it once and show what came back. */
  function renderLeads() {
    var box = $('s-leads');
    clear(box);
    $('s-lead-count').textContent = String(leads.length);

    if (!leads.length) {
      box.appendChild(el('div', 'cx-empty', 'Every enquiry has been picked up.'));
      return;
    }

    leads.slice(0, 15).forEach(function (l) {
      var row = el('div', 'cx-doc');
      row.appendChild(el('span', 'cx-doc-mark d-pending', '•'));
      var n = el('div', 'cx-doc-name', l.student_name || 'Unnamed enquiry');
      n.appendChild(el('span', 'cx-doc-note',
        [l.contact_number, l.city, l.neet_score != null ? 'NEET ' + l.neet_score : null,
         when(l.created_at)].filter(Boolean).join(' · ')));
      row.appendChild(n);

      var go = el('button', 'gl-btn gl-btn--primary', 'Start application');
      go.type = 'button';
      go.addEventListener('click', function () {
        go.disabled = true;
        go.textContent = 'Starting…';
        guard(async function () {
          var id = await api('rpc/convert_lead_to_application', {
            method: 'POST', body: { p_lead_id: l.id }
          });
          leads = leads.filter(function (x) { return x.id !== l.id; });
          // Re-read rather than patching the board by hand: conversion creates
          // an application AND a set of tasks, and guessing at what the
          // database did is how a console drifts from the truth.
          await refresh();
          toast('Application started for ' + (l.student_name || 'this enquiry') + '.');
          if (id) openDrawer(typeof id === 'string' ? id : String(id));
        });
      });
      row.appendChild(go);
      box.appendChild(row);
    });
  }

  /* ── stats ──────────────────────────────────────────────────────────── */
  function renderStats() {
    var live = apps.filter(function (a) { return CLOSED.indexOf(a.stage) < 0; });
    var admitted = apps.filter(function (a) { return a.stage === 'admitted'; }).length;
    var due = apps.filter(function (a) {
      return a.next_action_at && new Date(a.next_action_at) <= new Date();
    }).length;
    $('s-stat-live').textContent = live.length;
    $('s-stat-admitted').textContent = admitted;
    $('s-stat-due').textContent = due;
  }

  /* ── detail drawer ──────────────────────────────────────────────────── */
  async function openDrawer(id) {
    openId = id;
    var dlg = $('s-drawer');
    var body = $('s-drawer-body');
    clear(body);
    body.appendChild(el('div', 'cx-skel'));
    if (!dlg.open) dlg.showModal();

    await guard(async function () {
      var a = apps.find(function (x) { return x.id === id; });
      var q = 'application_id=eq.' + encodeURIComponent(id);
      var results = await Promise.all([
        api('documents?select=id,kind,state,reject_reason,expires_on&' + q + '&order=kind'),
        api('notes?select=id,body,created_at&' + q + '&order=created_at.desc&limit=20'),
        api('application_events?select=kind,body,from_stage,to_stage,created_at&' + q +
            '&order=created_at.desc&limit=20')
      ]);
      drawDrawer(a, results[0], results[1], results[2]);
    });
  }

  function drawDrawer(a, docs, notes, events) {
    var body = $('s-drawer-body');
    clear(body);
    if (!a) { body.appendChild(el('div', 'cx-empty', 'Not found.')); return; }

    var head = el('div', 'cx-head');
    var title = el('div', 'cx-title');
    title.appendChild(el('h1', null, a.student_name));
    var sub = el('p', null, [a.city, a.state].filter(Boolean).join(', '));
    title.appendChild(sub);
    head.appendChild(title);
    var close = el('button', 'gl-btn gl-btn--quiet', 'Close');
    close.type = 'button';
    close.addEventListener('click', function () { $('s-drawer').close(); });
    head.appendChild(close);
    body.appendChild(head);

    /* contact — the counselor's most common next action is to call */
    var contact = el('div', 'cx-row');
    contact.style.marginBottom = '18px';
    if (a.contact_number) {
      var tel = el('a', 'gl-btn gl-btn--quiet', 'Call ' + a.contact_number);
      tel.href = 'tel:' + a.contact_number;
      var wa = el('a', 'gl-btn gl-btn--quiet', 'WhatsApp');
      wa.href = 'https://wa.me/' + a.contact_number.replace(/[^0-9]/g, '');
      wa.target = '_blank'; wa.rel = 'noopener';
      contact.appendChild(tel); contact.appendChild(wa);
    }
    if (a.email) {
      var mail = el('a', 'gl-btn gl-btn--quiet', 'Email');
      mail.href = 'mailto:' + a.email;
      contact.appendChild(mail);
    }
    body.appendChild(contact);

    /* stage */
    var stageBox = el('div', 'cx-field');
    stageBox.appendChild(el('label', null, 'Stage'));
    var sel = el('select', 'cx-select');
    STAGES.concat(CLOSED).forEach(function (s) {
      var o = el('option', null, LABEL[s]); o.value = s;
      if (s === a.stage) o.selected = true;
      sel.appendChild(o);
    });
    sel.addEventListener('change', function () {
      var next = sel.value;
      guard(async function () {
        await api('applications?id=eq.' + encodeURIComponent(a.id), {
          method: 'PATCH', body: { stage: next, updated_at: new Date().toISOString() }
        });
        a.stage = next;
        renderBoard(); renderStats();
        // The stage-change trigger writes the event row; re-open to show it.
        openDrawer(a.id);
        toast('Moved to ' + LABEL[next] + '.');
      });
    });
    stageBox.appendChild(sel);
    body.appendChild(stageBox);

    /* documents */
    var dsec = el('section');
    dsec.appendChild(el('h3', null, 'Documents'));
    var dbox = el('div', 'cx-docs');
    if (!docs.length) dbox.appendChild(el('div', 'cx-empty', 'None recorded yet.'));
    docs.forEach(function (d) {
      var row = el('div', 'cx-doc');
      row.appendChild(el('span', 'cx-doc-mark d-' + d.state,
        d.state === 'verified' ? '✓' : d.state === 'rejected' ? '✕' : '•'));
      var n = el('div', 'cx-doc-name', DOC_LABEL[d.kind] || d.kind);
      n.appendChild(el('span', 'cx-doc-note',
        d.state + (d.reject_reason ? ' — ' + d.reject_reason : '')));
      row.appendChild(n);
      if (d.state !== 'verified') {
        var ok = el('button', 'gl-btn gl-btn--quiet', 'Verify');
        ok.type = 'button';
        ok.addEventListener('click', function () {
          guard(async function () {
            await api('documents?id=eq.' + encodeURIComponent(d.id), {
              method: 'PATCH',
              body: { state: 'verified', verified_at: new Date().toISOString(),
                      verified_by: me && me.id }
            });
            openDrawer(a.id);
            toast('Marked verified.');
          });
        });
        row.appendChild(ok);
      }
      dbox.appendChild(row);
    });
    dsec.appendChild(dbox);
    body.appendChild(dsec);

    /* notes — internal, never in the portal projection */
    var nsec = el('section');
    nsec.style.marginTop = '22px';
    nsec.appendChild(el('h3', null, 'Internal notes'));
    nsec.appendChild(el('p', 'cx-sub', 'Only staff can read these. They are not in the student portal.'));
    var form = el('form');
    var ta = el('textarea', 'cx-input');
    ta.rows = 2; ta.placeholder = 'What happened on this call?';
    var add = el('button', 'gl-btn gl-btn--primary', 'Add note');
    add.type = 'submit'; add.style.marginTop = '8px';
    form.appendChild(ta); form.appendChild(add);
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var v = ta.value.trim();
      if (!v) return;
      guard(async function () {
        await api('notes', { method: 'POST',
          body: { application_id: a.id, body: v, author: me && me.id } });
        ta.value = '';
        openDrawer(a.id);
      });
    });
    nsec.appendChild(form);

    var nlist = el('ul', 'cx-tl');
    nlist.style.marginTop = '16px';
    if (!notes.length) nlist.appendChild(el('div', 'cx-empty', 'No notes yet.'));
    notes.forEach(function (n) {
      var li = el('li', 'on');
      li.appendChild(el('div', 'cx-tl-body', n.body));
      li.appendChild(el('div', 'cx-tl-when', when(n.created_at)));
      nlist.appendChild(li);
    });
    nsec.appendChild(nlist);
    body.appendChild(nsec);

    /* history */
    var hsec = el('section');
    hsec.style.marginTop = '22px';
    hsec.appendChild(el('h3', null, 'History'));
    var hlist = el('ul', 'cx-tl');
    if (!events.length) hlist.appendChild(el('div', 'cx-empty', 'Nothing recorded yet.'));
    events.forEach(function (ev) {
      var li = el('li', 'on');
      li.appendChild(el('div', 'cx-tl-title', ev.kind === 'stage_change'
        ? (LABEL[ev.from_stage] || '—') + ' → ' + (LABEL[ev.to_stage] || '—')
        : (ev.body || ev.kind)));
      li.appendChild(el('div', 'cx-tl-when', when(ev.created_at)));
      hlist.appendChild(li);
    });
    hsec.appendChild(hlist);
    body.appendChild(hsec);
  }

  /* ── refresh ────────────────────────────────────────────────────────── */
  async function refresh() {
    var results = await Promise.all([
      api('applications?select=id,student_name,contact_number,email,city,state,' +
          'neet_score,stage,allotted_college,assigned_to,next_action_at,updated_at' +
          '&order=updated_at.desc&limit=500'),
      api('tasks?select=id,title,channel,due_at,state,application_id,' +
          'applications(student_name)&state=eq.open&order=due_at.asc&limit=50'),
      // Only the ones nobody has started yet. A converted enquiry is an
      // application now and belongs on the board, not in this queue.
      api('leads?select=id,student_name,contact_number,city,neet_score,created_at' +
          '&converted_application_id=is.null&order=created_at.desc&limit=50')
    ]);
    apps = results[0] || [];
    tasks = results[1] || [];
    leads = results[2] || [];
    renderStats(); renderBoard(); renderTasks(); renderLeads();
  }

  /* ── auth ───────────────────────────────────────────────────────────── */
  function showGate() {
    $('s-gate').hidden = false;
    $('s-console').hidden = true;
  }

  async function enter() {
    me = await Auth.whoAmI();
    if (!me) {
      // A real account that is not on the team. The database would refuse it
      // anyway; saying so here is just clearer than an empty console.
      await Auth.signOut();
      $('s-gate-err').textContent = 'That account does not have console access.';
      $('s-gate-err').hidden = false;
      return showGate();
    }
    $('s-gate').hidden = true;
    $('s-console').hidden = false;
    $('s-who').textContent = me.full_name || me.email;

    await guard(refresh);
  }

  document.addEventListener('DOMContentLoaded', function () {
    $('s-gate-form').addEventListener('submit', function (e) {
      e.preventDefault();
      var err = $('s-gate-err');
      err.hidden = true;
      var btn = $('s-gate-btn');
      btn.disabled = true; btn.textContent = 'Signing in…';
      Auth.signIn($('s-email').value.trim(), $('s-pass').value)
        .then(enter)
        .catch(function () {
          // One message for a wrong password and for an unknown address: the
          // difference is exactly what an attacker wants to learn.
          err.textContent = 'That email and password do not match.';
          err.hidden = false;
        })
        .finally(function () { btn.disabled = false; btn.textContent = 'Sign in'; });
    });

    $('s-signout').addEventListener('click', function () {
      Auth.signOut().then(showGate);
    });
    $('s-search').addEventListener('input', renderBoard);
    $('s-mine').addEventListener('change', renderBoard);
    $('s-drawer').addEventListener('close', function () { openId = null; });

    if (Auth.isSignedIn) enter(); else showGate();
  });
})();
