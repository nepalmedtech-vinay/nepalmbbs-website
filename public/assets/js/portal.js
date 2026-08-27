/* NepalMBBS.in — portal.js
   The student's view of their own application.

   No account, no password. The link they were sent carries a token, and
   public.portal_application(token) returns a fixed projection of the
   application -- name, stage, timeline, documents -- and nothing else. The
   counselor's private notes are not in that projection and cannot be reached
   from here, which is why the portal reads through a function instead of
   selecting from the table with a policy.

   Three things about the token are deliberate:

     - it is lifted out of the URL on arrival (history.replaceState) and kept
       in sessionStorage. A token sitting in the address bar ends up in
       screenshots, in shared links and in shoulder-surfing distance; a reload
       still works, and closing the tab still ends the session.
     - /portal/* is served with Referrer-Policy: no-referrer, so following any
       outbound link from this page does not hand the token to that site.
     - it is never logged. If the lookup fails the message says the link is
       invalid; it does not echo what was tried. */

(function () {
  'use strict';

  var KEY = 'nmb_portal_token';
  var STAGES = [
    ['enquiry',     'Enquiry received',      'We have your details and will be in touch.'],
    ['qualifying',  'Checking eligibility',  'Your NEET result and documents are being reviewed.'],
    ['eligible',    'Eligible',              'You meet the requirements to apply this cycle.'],
    ['applied',     'Applied to MEC',        'Your application has gone to the Medical Education Commission.'],
    ['entrance',    'Entrance',              'MECEE-BL entrance stage.'],
    ['counselling', 'In MEC counselling',    'Seat matching is underway.'],
    ['allotted',    'Seat allotted',         'A seat has been allotted to you.'],
    ['admitted',    'Admitted',              'You have joined. Congratulations.']
  ];
  var ENDED = { deferred: 'Deferred to the next intake', withdrawn: 'Withdrawn',
                ineligible: 'Not eligible this cycle' };

  var DOC_LABEL = {
    neet_scorecard: 'NEET scorecard', marksheet_10: 'Class 10 marksheet',
    marksheet_12: 'Class 12 marksheet', passport: 'Passport', photo: 'Passport photo',
    birth_certificate: 'Birth certificate', migration_certificate: 'Migration certificate',
    character_certificate: 'Character certificate', medical_fitness: 'Medical fitness',
    affidavit: 'Affidavit', other: 'Other document'
  };
  var DOC_MARK = { verified: '✓', received: '•', pending: '', rejected: '✕', expired: '!' };
  var DOC_NOTE = {
    verified: 'Verified', received: 'Received, awaiting verification',
    pending: 'Not received yet', rejected: 'Needs to be sent again',
    expired: 'Expired — a current copy is needed'
  };

  function $(id) { return document.getElementById(id); }
  function txt(el, s) { el.textContent = s == null ? '' : String(s); }

  function when(iso) {
    if (!iso) return '';
    var d = new Date(iso);
    if (isNaN(d)) return '';
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  /* ── token handling ─────────────────────────────────────────────────── */
  function readToken() {
    var q = new URLSearchParams(location.search).get('t');
    if (q) {
      try { sessionStorage.setItem(KEY, q); } catch (e) {}
      // Take it out of the address bar without adding a history entry.
      history.replaceState(null, '', location.pathname);
      return q;
    }
    try { return sessionStorage.getItem(KEY) || ''; } catch (e) { return ''; }
  }

  function forget() {
    try { sessionStorage.removeItem(KEY); } catch (e) {}
    location.reload();
  }

  /* ── data ───────────────────────────────────────────────────────────── */
  async function fetchApplication(token) {
    var res = await fetch(SB + '/rest/v1/rpc/portal_application', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', apikey: AK,
                 Authorization: 'Bearer ' + AK },
      body: JSON.stringify({ p_token: token })
    });
    if (!res.ok) {
      var e = new Error('lookup failed'); e.status = res.status; throw e;
    }
    var rows = await res.json();
    return Array.isArray(rows) ? rows[0] : rows;
  }

  /* ── render ─────────────────────────────────────────────────────────── */
  function renderTimeline(app) {
    var ul = $('p-timeline');
    ul.innerHTML = '';

    var ended = ENDED[app.stage];
    var reached = STAGES.findIndex(function (s) { return s[0] === app.stage; });

    STAGES.forEach(function (s, i) {
      var li = document.createElement('li');
      // Everything up to and including the current stage is marked done. When
      // the application has left the pipeline (deferred/withdrawn/ineligible)
      // nothing is marked, because we no longer know where it stopped.
      if (!ended && reached >= 0 && i <= reached) li.className = 'on';
      var t = document.createElement('div'); t.className = 'cx-tl-title'; txt(t, s[1]);
      var b = document.createElement('div'); b.className = 'cx-tl-body'; txt(b, s[2]);
      li.appendChild(t); li.appendChild(b);
      if (i === reached) {
        var w = document.createElement('div'); w.className = 'cx-tl-when';
        txt(w, 'Updated ' + when(app.updated_at));
        li.appendChild(w);
      }
      ul.appendChild(li);
    });

    if (ended) {
      var li = document.createElement('li'); li.className = 'on';
      var t = document.createElement('div'); t.className = 'cx-tl-title'; txt(t, ended);
      li.appendChild(t); ul.appendChild(li);
    }

    // Counselor updates marked visible, newest first, above the stage list.
    var feed = $('p-updates');
    feed.innerHTML = '';
    var events = Array.isArray(app.timeline) ? app.timeline : [];
    var feedHead = $('p-updates-head');
    if (!events.length) { feed.hidden = true; feedHead.hidden = true; return; }
    feed.hidden = false; feedHead.hidden = false;
    events.slice(0, 8).forEach(function (ev) {
      var li = document.createElement('li'); li.className = 'on';
      var t = document.createElement('div'); t.className = 'cx-tl-title';
      txt(t, ev.body || ev.kind);
      var w = document.createElement('div'); w.className = 'cx-tl-when';
      txt(w, when(ev.at || ev.created_at));
      li.appendChild(t); li.appendChild(w); feed.appendChild(li);
    });
  }

  function renderDocs(app) {
    var box = $('p-docs');
    box.innerHTML = '';
    var docs = Array.isArray(app.documents) ? app.documents : [];
    if (!docs.length) {
      var p = document.createElement('div'); p.className = 'cx-empty';
      txt(p, 'No documents have been requested yet. Your counselor will tell you what is needed.');
      box.appendChild(p);
      return;
    }
    docs.forEach(function (d) {
      var row = document.createElement('div'); row.className = 'cx-doc';
      var mark = document.createElement('span');
      mark.className = 'cx-doc-mark d-' + (d.state || 'pending');
      txt(mark, DOC_MARK[d.state] || '');
      var name = document.createElement('div'); name.className = 'cx-doc-name';
      txt(name, DOC_LABEL[d.kind] || d.kind);
      var note = document.createElement('span'); note.className = 'cx-doc-note';
      var n = DOC_NOTE[d.state] || '';
      if (d.state === 'rejected' && d.rejectReason) n += ' — ' + d.rejectReason;
      if (d.state === 'expired' && d.expiresOn) n += ' (expired ' + when(d.expiresOn) + ')';
      txt(note, n);
      name.appendChild(note);
      row.appendChild(mark); row.appendChild(name);
      box.appendChild(row);
    });

    var outstanding = docs.filter(function (d) {
      return d.state === 'pending' || d.state === 'rejected' || d.state === 'expired';
    }).length;
    var s = $('p-doc-summary');
    txt(s, outstanding
      ? outstanding + ' document' + (outstanding > 1 ? 's' : '') + ' still needed'
      : 'All documents are in.');
  }

  function show(app) {
    $('p-gate').hidden = true;
    $('p-loading').hidden = true;
    $('p-app').hidden = false;

    txt($('p-name'), app.student_name || 'Your application');
    txt($('p-intake'), app.intake_year ? 'Intake ' + app.intake_year : '');

    var pill = $('p-stage');
    pill.className = 'st st-' + app.stage;
    var known = STAGES.find(function (s) { return s[0] === app.stage; });
    txt(pill, known ? known[1] : (ENDED[app.stage] || app.stage));

    var col = $('p-college');
    if (app.allotted_college) {
      col.hidden = false;
      txt($('p-college-name'), app.allotted_college);
    } else { col.hidden = true; }

    renderTimeline(app);
    renderDocs(app);
  }

  function fail(msg) {
    $('p-loading').hidden = true;
    $('p-app').hidden = true;
    $('p-gate').hidden = false;
    var e = $('p-gate-err');
    txt(e, msg || '');
    e.hidden = !msg;
  }

  /* ── boot ───────────────────────────────────────────────────────────── */
  async function load(token) {
    if (!token) return fail('');
    $('p-gate').hidden = true;
    $('p-loading').hidden = false;
    try {
      var app = await fetchApplication(token);
      if (!app || !app.student_name) {
        // The function returns no rows for a wrong or expired token. Both get
        // the same message: telling them which it was is telling them whether
        // the token exists.
        return fail('That link is not valid, or it has expired. Please ask your counselor for a new one.');
      }
      show(app);
    } catch (err) {
      fail(err.status === 429 || err.status === 500
        ? 'Too many attempts just now. Please wait a minute and try again.'
        : 'Could not reach the server. Please check your connection and try again.');
    }
  }

  document.addEventListener('DOMContentLoaded', function () {
    var form = $('p-gate-form');
    if (form) {
      form.addEventListener('submit', function (e) {
        e.preventDefault();
        var v = ($('p-gate-input').value || '').trim();
        // Accept a pasted full link as readily as a bare token; people paste
        // whatever they were sent.
        var m = v.match(/[?&]t=([^&\s]+)/);
        if (m) v = decodeURIComponent(m[1]);
        if (!v) return;
        try { sessionStorage.setItem(KEY, v); } catch (e2) {}
        load(v);
      });
    }
    var out = $('p-signout');
    if (out) out.addEventListener('click', forget);

    load(readToken());
  });
})();
