/* NepalMBBS.in — chatbot.js
   The admissions assistant.

   What changed and why
   --------------------
   This was 45 hard-coded question/answer pairs matched by substring. It could
   not answer anything about a specific college, because the college data lived
   in colleges.json and the assistant had no access to it — so "how many seats
   does Nobel Medical College have?" fell through to "book a counselling
   session", despite the site knowing the answer and publishing it on that
   college's own page.

   It now reads /api/knowledge.json, built from the same two files the site
   renders from (src/data/knowledge.json and src/data/colleges.json). Two
   consequences worth stating:

     - All 27 colleges became answerable without writing 27 answers, and they
       stay answerable when the data changes, because there is no second copy.
     - Every answer carries the source it rests on and the date that source was
       last checked, which is the same standard the rest of the site holds
       itself to.

   And when nothing matches, it says so. The previous default thanked the
   visitor and offered a counselling session, which reads as an answer without
   being one. On a site families use to make a five-and-a-half-year decision,
   an assistant that cannot admit ignorance is worse than one that stays quiet.

   Not an LLM. This is deterministic retrieval over a reviewed dataset — which
   is a deliberate choice, not a limitation to apologise for: a generative model
   over unverified admissions data would produce confident sentences about seat
   counts and deadlines, and being confidently wrong about those is the specific
   failure this project exists to avoid. */

(function () {
  'use strict';

  var KB = null;          // { reviewed, topics[], colleges[] }
  var kbPromise = null;
  var chatHistory = [];
  var chatOpen = false;

  /* ── data ─────────────────────────────────────────────────────────────── */

  function loadKB() {
    if (kbPromise) return kbPromise;
    kbPromise = fetch('/api/knowledge.json', { credentials: 'omit' })
      .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
      .then(function (d) { KB = d; return d; })
      .catch(function () {
        // Offline, or the file failed to deploy. Say so rather than answering
        // from nothing — a wrong answer here is worse than no answer.
        KB = { reviewed: '', topics: [], colleges: [], failed: true };
        return KB;
      });
    return kbPromise;
  }

  /* ── matching ─────────────────────────────────────────────────────────── */

  var STOP = /\b(what|which|is|are|the|a|an|of|for|in|at|to|do|does|i|my|me|can|about|tell|please|and|how|much|many)\b/g;

  function normalise(s) {
    return String(s || '').toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
  }

  // Identify the college a question names.
  //
  // An earlier version scored only the "distinctive" words, dropping generic
  // ones like `medical` and `college` so that they could not match all 27.
  // Its own test caught what that costs: five colleges are named almost
  // entirely from that generic vocabulary — College of Medical Sciences,
  // Nepal Medical College, National Medical College, B & C Medical College —
  // so they had no distinctive words left and became unreachable, while
  // "Kathmandu Medical College" resolved to Kathmandu University School of
  // Medical Sciences on the strength of the one word they share.
  //
  // People name a college by its short name, so match that directly: the name
  // up to the first bracket or comma. Where two short names both appear in a
  // question — "Manipal College of Medical Sciences" contains "College of
  // Medical Sciences" — the longer one is the more specific claim and wins.
  function findCollege(q) {
    if (!KB || !KB.colleges) return null;
    var text = ' ' + normalise(q) + ' ';
    var best = null, bestKey = 0;

    KB.colleges.forEach(function (c) {
      var short = normalise(c.name.split('(')[0].split(',')[0]);
      var acro = (c.name.match(/\(([A-Za-z]{2,})\)/) || [])[1];

      // The acronym is how people ask about BPKIHS, KUSMS, UCMS.
      if (acro && text.indexOf(' ' + acro.toLowerCase() + ' ') !== -1) {
        if (bestKey < 1000) { bestKey = 1000; best = c; }
        return;
      }

      // Guard against a stub like "medical college" swallowing everything.
      if (short.length >= 12 && text.indexOf(' ' + short + ' ') !== -1) {
        if (short.length > bestKey) { bestKey = short.length; best = c; }
      }
    });

    if (best) return best;

    // Nothing named outright. Fall back to word coverage over the full name,
    // which catches "Nobel" or "Devdaha" on their own.
    //
    // Coverage alone is not enough, and the test caught why: asked about
    // "Nobel Medical College", plain coverage answered about Nepalgunj
    // Medical College — Nepalgunj matched two of its three words on the
    // strength of "medical college", scoring 0.67 against Nobel's 0.60. A
    // shorter name made almost entirely of shared vocabulary will always win
    // a ratio it did nothing to earn.
    //
    // So a college counts as named only if something specific to it appeared.
    // The threshold stays high on top of that: naming the wrong college is
    // worse than naming none.
    var GENERIC = ['medical', 'college', 'institute', 'sciences', 'health',
                   'academy', 'school', 'university', 'teaching', 'hospital',
                   'and', 'the', 'for', 'research'];
    var bestScore = 0, bestHits = 0;
    best = null;

    KB.colleges.forEach(function (c) {
      var words = normalise(c.name).split(' ').filter(function (w) { return w.length > 2; });
      if (!words.length) return;

      var matched = words.filter(function (w) { return text.indexOf(' ' + w + ' ') !== -1; });
      if (!matched.length) return;

      var distinctive = matched.filter(function (w) { return GENERIC.indexOf(w) === -1; });
      if (!distinctive.length) return;

      var score = matched.length / words.length;
      if (score > bestScore || (score === bestScore && matched.length > bestHits)) {
        bestScore = score; bestHits = matched.length; best = c;
      }
    });

    return bestScore >= 0.5 ? best : null;
  }

  function findTopic(q) {
    if (!KB || !KB.topics) return null;
    // Padded on both sides so a key matches whole words only. Without this,
    // raw substring search makes "age" match "percentage" and "fee" match
    // "coffee" — the age topic was answering percentile questions.
    var text = ' ' + normalise(q) + ' ';
    var best = null, bestLen = 0;
    KB.topics.forEach(function (t) {
      (t.match || []).forEach(function (m) {
        var key = normalise(m);
        // Longest matching phrase wins, so "neet required" beats "neet".
        if (key && text.indexOf(' ' + key + ' ') !== -1 && key.length > bestLen) {
          bestLen = key.length; best = t;
        }
      });
    });
    return best;
  }

  /* ── rendering ────────────────────────────────────────────────────────── */

  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  var STATUS_LABEL = {
    official: 'Official source',
    estimate: 'Our estimate — not an official figure',
    general:  'General guidance'
  };

  function sourceLine(src, status) {
    if (!src) return '';
    var label = STATUS_LABEL[status] || 'Source';
    var name = esc(src.name || '');
    var where = src.url
      ? '<a href="' + esc(src.url) + '" target="_blank" rel="noopener">' + name + ' ↗</a>'
      : name;
    var when = src.checked ? ' · checked ' + esc(src.checked) : '';
    return '<span class="chat-src"><b>' + esc(label) + '</b> · ' + where + when + '</span>';
  }

  function collegeAnswer(c, q) {
    var text = normalise(q);
    var rows = [];
    var want = function (keys) { return keys.some(function (k) { return text.indexOf(k) !== -1; }); };

    // Answer the field actually asked about; fall back to the whole record.
    if (want(['seat', 'quota', 'intake'])) rows.push(['Foreign-quota seats', c.seats]);
    else if (want(['where', 'location', 'city', 'situated'])) rows.push(['Location', c.location]);
    else if (want(['affiliat', 'university'])) rows.push(['University affiliation', c.affiliation]);
    else if (want(['establish', 'founded', 'started', 'old'])) rows.push(['Established', c.established]);
    else if (want(['government', 'private', 'ownership'])) rows.push(['Ownership', c.ownership]);
    else {
      rows.push(['Ownership', c.ownership], ['Location', c.location],
                ['University affiliation', c.affiliation], ['Foreign-quota seats', c.seats],
                ['Course duration', c.duration], ['Admission route', c.admission]);
    }

    var body = rows.map(function (r) {
      var v = r[1] ? esc(r[1]) : '<i>not on record — ask us</i>';
      return '<span class="chat-row"><b>' + esc(r[0]) + '</b> ' + v + '</span>';
    }).join('');

    var fee = '<span class="chat-row"><b>Tuition fee</b> <i>set per intake — we confirm it in writing during counselling</i></span>';

    return '<b>' + esc(c.name) + '</b>' + body + fee +
      '<span class="chat-row"><a href="/colleges/' + esc(c.slug) + '">Full record for this college →</a></span>' +
      sourceLine({
        name: 'MEC Nepal intake data and the college’s own published information',
        url: c.website || 'https://mec.gov.np',
        checked: KB.reviewed
      }, 'official') +
      '<span class="chat-note">Recognition and seat allocation are set per intake year. Verify against the MEC notice for your own year before acting on this.</span>';
  }

  var NO_ANSWER =
    '<b>I don’t have a verified answer to that.</b>' +
    '<span class="chat-row">I only answer from information this site has checked against an official source, and that question is outside it. Rather than guess, let me put you to someone who can find out.</span>' +
    '<span class="chat-row"><a href="/counseling">Ask a counsellor →</a> · <a href="https://wa.me/917080800888" target="_blank" rel="noopener">WhatsApp ↗</a></span>';

  var LOAD_FAILED =
    '<b>I can’t reach my reference data right now.</b>' +
    '<span class="chat-row">Rather than answer from memory, here is the direct route: <a href="/counseling">ask a counsellor</a>, or check the official sources at <a href="https://mec.gov.np" target="_blank" rel="noopener">mec.gov.np</a> and <a href="https://nmc.org.in" target="_blank" rel="noopener">nmc.org.in</a>.</span>';

  function getBotReply(q) {
    if (!KB) return NO_ANSWER;
    if (KB.failed) return LOAD_FAILED;

    var college = findCollege(q);
    if (college) return collegeAnswer(college, q);

    var topic = findTopic(q);
    if (topic) return esc(topic.answer).replace(/\n/g, '<br>') + sourceLine(topic.source, topic.status);

    return NO_ANSWER;
  }

  /* ── ui ───────────────────────────────────────────────────────────────── */

  function addChatMsg(text, type) {
    var c = document.getElementById('chat-msgs');
    if (!c) return null;
    var d = document.createElement('div');
    d.className = 'chat-msg ' + type;
    // The visitor's own words are inserted as text, never as markup. The
    // previous version used innerHTML for both sides, which made the input box
    // an injection point into the page; CSP stopped it from executing, but the
    // right fix is not to build the node that way at all.
    if (type === 'user') d.textContent = text;
    else d.innerHTML = text;
    c.appendChild(d);
    c.scrollTop = c.scrollHeight;
    chatHistory.push({ type: type, text: text });
    return d;
  }

  function showTyping() {
    var d = addChatMsg('<div class="typing"><span></span><span></span><span></span></div>', 'bot');
    if (d) d.id = 'chat-typing';
    return d;
  }

  function askBot(q) {
    addChatMsg(q, 'user');
    var sugs = document.getElementById('chat-sugs');
    if (sugs) sugs.style.display = 'none';
    var td = showTyping();
    loadKB().then(function () {
      if (td && td.parentNode) td.remove();
      addChatMsg(getBotReply(q), 'bot');
    });
  }

  function sendMsg() {
    var i = document.getElementById('chat-input');
    if (!i) return;
    var msg = (i.value || '').trim();
    if (!msg) return;
    i.value = '';
    askBot(msg);
  }

  function toggleChat() {
    chatOpen = !chatOpen;
    var w = document.getElementById('chat-window');
    if (w) w.classList.toggle('open', chatOpen);
    if (chatOpen) loadKB();   // warm the data on open, not on page load
  }

  function closeChat() {
    chatOpen = false;
    var w = document.getElementById('chat-window');
    if (w) w.classList.remove('open');
  }

  function restartChat() {
    chatHistory = [];
    var c = document.getElementById('chat-msgs');
    if (c) {
      c.replaceChildren();
      addChatMsg('Ask about eligibility, the admission process, recognition, or any of the 27 colleges. Every answer names the source it came from, and I will tell you when I do not have one.', 'bot');
    }
    var sugs = document.getElementById('chat-sugs');
    if (sugs) sugs.style.display = 'flex';
  }

  function initChatSwipe() {
    var hd = document.getElementById('chat-header');
    if (!hd) return;
    var sy = 0, dragging = false;
    hd.addEventListener('touchstart', function (e) { sy = e.touches[0].clientY; dragging = true; }, { passive: true });
    hd.addEventListener('touchmove', function (e) {
      if (dragging && sy - e.touches[0].clientY > 50) { closeChat(); dragging = false; }
    }, { passive: true });
    hd.addEventListener('touchend', function () { dragging = false; }, { passive: true });
    hd.addEventListener('mousedown', function (e) { sy = e.clientY; dragging = true; });
    document.addEventListener('mousemove', function (e) {
      if (dragging && sy - e.clientY > 60) { closeChat(); dragging = false; }
    });
    document.addEventListener('mouseup', function () { dragging = false; });
  }

  // actions.js dispatches these by name through its allow-list, so they have
  // to stay on window.
  window.askBot = askBot;
  window.sendMsg = sendMsg;
  window.toggleChat = toggleChat;
  window.closeChat = closeChat;
  window.restartChat = restartChat;
  window.getBotReply = getBotReply;
  window.initChatSwipe = initChatSwipe;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initChatSwipe, { once: true });
  } else {
    initChatSwipe();
  }
})();
