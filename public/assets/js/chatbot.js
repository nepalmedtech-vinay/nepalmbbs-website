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

  // The last college the visitor named, so "and its seats?" has a subject.
  // Deliberately the only piece of conversation state there is: anything more
  // and the assistant starts inferring what was meant, which is the failure
  // mode this whole component is built to avoid.
  var lastCollege = null;

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

  /* ── comparison ───────────────────────────────────────────────────────
     "IOM vs KMC", "compare Manipal and Nobel". The site already has a
     side-by-side tool at /colleges/compare; this answers the two-college
     case inline and points at the tool for anything larger.

     Same fields, same records, same source line as a single-college answer —
     a comparison is two lookups printed next to each other, not a new claim.
     Fees are absent here for exactly the reason they are absent everywhere. */

  function comparisonAnswer(list) {
    var FIELDS = [
      ['Ownership', 'ownership'], ['Location', 'location'],
      ['University', 'affiliation'], ['Foreign-quota seats', 'seats'],
      ['Established', 'established']
    ];

    var head = '<span class="chat-cmp-row chat-cmp-head"><b></b>' +
      list.map(function (c) {
        return '<b>' + esc(c.name.split('(')[0].split(',')[0].trim()) + '</b>';
      }).join('') + '</span>';

    var body = FIELDS.map(function (f) {
      return '<span class="chat-cmp-row"><b>' + esc(f[0]) + '</b>' +
        list.map(function (c) {
          return '<span>' + (c[f[1]] ? esc(c[f[1]]) : '—') + '</span>';
        }).join('') + '</span>';
    }).join('');

    return '<b>Comparing ' + list.length + ' colleges</b>' +
      '<span class="chat-cmp">' + head + body + '</span>' +
      '<span class="chat-row"><b>Tuition fee</b> <i>set per intake — not published here for either; we confirm in writing during counselling</i></span>' +
      '<span class="chat-row"><a href="/colleges/compare">Compare these side by side, with every field →</a></span>' +
      sourceLine({
        name: 'MEC Nepal intake data and each college’s own published information',
        url: 'https://mec.gov.np',
        checked: KB.reviewed
      }, 'official') +
      '<span class="chat-note">Recognition and seat allocation are set per intake year. Verify against the MEC notice for your own year before acting on this.</span>';
  }

  /* ── questions about the set, not about one college ───────────────────
     "Which college has the most seats?", "how many government colleges are
     there?", "which colleges are in Kathmandu?"

     Every one of these is arithmetic over the same committed records the
     pages render from. Nothing is estimated and nothing is ranked by a
     quality judgement the site has no basis for — the only orderings offered
     are ones the data literally contains. */

  function aggregateAnswer(q) {
    var text = normalise(q);
    var cols = KB.colleges || [];
    if (!cols.length) return null;

    var num = function (c) { return parseInt(c.seats, 10) || 0; };
    var isGovt = function (c) { return /govern/i.test(c.ownership || ''); };
    var wrap = function (title, body, note) {
      return '<b>' + esc(title) + '</b>' + body +
        sourceLine({
          name: 'Counted from this site’s own college records (MEC Nepal intake data)',
          url: 'https://mec.gov.np',
          checked: KB.reviewed
        }, 'official') +
        '<span class="chat-note">' + esc(note ||
          'Seat allocation is set per intake year. Verify against the MEC notice for your own year.') +
        '</span>';
    };
    var list = function (arr) {
      return '<span class="chat-row">' + arr.slice(0, 12).map(function (c) {
        return '<a href="/colleges/' + esc(c.slug) + '">' + esc(c.name) + '</a>';
      }).join(' · ') + (arr.length > 12 ? ' … and ' + (arr.length - 12) + ' more' : '') + '</span>';
    };

    // Most / fewest seats.
    if (/\b(most|highest|maximum|largest|biggest)\b/.test(text) && /seat|quota|intake/.test(text)) {
      var top = cols.slice().sort(function (a, b) { return num(b) - num(a); })[0];
      return wrap('Most foreign-quota seats',
        '<span class="chat-row"><b>' + esc(top.name) + '</b> — ' + num(top) + ' seats, ' + esc(top.location) + '</span>' +
        '<span class="chat-row"><a href="/colleges/' + esc(top.slug) + '">Full record →</a></span>');
    }
    if (/\b(fewest|least|lowest|smallest|minimum)\b/.test(text) && /seat|quota|intake/.test(text)) {
      var low = cols.slice().filter(function (c) { return num(c) > 0; })
        .sort(function (a, b) { return num(a) - num(b); })[0];
      return wrap('Fewest foreign-quota seats',
        '<span class="chat-row"><b>' + esc(low.name) + '</b> — ' + num(low) + ' seats, ' + esc(low.location) + '</span>' +
        '<span class="chat-row"><a href="/colleges/' + esc(low.slug) + '">Full record →</a></span>');
    }

    // Counts and totals.
    if (/how many|number of|total|count/.test(text) && /college|seat|quota/.test(text)) {
      var govt = cols.filter(isGovt), priv = cols.filter(function (c) { return !isGovt(c); });
      var sum = function (a) { return a.reduce(function (n, c) { return n + num(c); }, 0); };
      return wrap('The list, counted',
        '<span class="chat-row"><b>Colleges</b> ' + cols.length + ' admitting Indian students</span>' +
        '<span class="chat-row"><b>Foreign-quota seats</b> ' + sum(cols) + ' between them</span>' +
        '<span class="chat-row"><b>Government</b> ' + govt.length + ' colleges · ' + sum(govt) + ' seats</span>' +
        '<span class="chat-row"><b>Private</b> ' + priv.length + ' colleges · ' + sum(priv) + ' seats</span>' +
        '<span class="chat-row"><a href="/colleges">The full list →</a></span>');
    }

    // Government / private subsets.
    if (/\bgovernment\b/.test(text) && /college|list|which/.test(text)) {
      var g = cols.filter(isGovt);
      return wrap(g.length + ' government colleges', list(g));
    }
    if (/\bprivate\b/.test(text) && /college|list|which/.test(text)) {
      var pv = cols.filter(function (c) { return !isGovt(c); });
      return wrap(pv.length + ' private colleges', list(pv));
    }

    // By town or by university — matched against the values actually on the
    // records, so this cannot name a place the data does not contain.
    if (/\b(in|at|near|around)\b/.test(text) || /which colleges/.test(text)) {
      var places = {};
      cols.forEach(function (c) { if (c.location) places[normalise(c.location)] = c.location; });
      var hitPlace = null;
      Object.keys(places).forEach(function (k) {
        k.split(' ').forEach(function (word) {
          if (word.length > 3 && text.indexOf(word) !== -1) hitPlace = word;
        });
      });
      if (hitPlace) {
        var inPlace = cols.filter(function (c) { return normalise(c.location).indexOf(hitPlace) !== -1; });
        if (inPlace.length) {
          return wrap(inPlace.length + ' college' + (inPlace.length > 1 ? 's' : '') +
            ' in ' + hitPlace.charAt(0).toUpperCase() + hitPlace.slice(1), list(inPlace));
        }
      }

      var unis = {};
      cols.forEach(function (c) { if (c.affiliation) unis[normalise(c.affiliation)] = c.affiliation; });
      var hitUni = null;
      Object.keys(unis).forEach(function (k) {
        if (k.length > 6 && text.indexOf(k.split(' ')[0]) !== -1 && /universit|affiliat/.test(text)) hitUni = k;
      });
      if (hitUni) {
        var underUni = cols.filter(function (c) { return normalise(c.affiliation) === hitUni; });
        if (underUni.length) return wrap(underUni.length + ' colleges under ' + unis[hitUni], list(underUni));
      }
    }

    return null;
  }

  /* ── a NEET score in the question ─────────────────────────────────────
     "I got 420 in NEET, can I get in?"

     What this must NOT do is convert that number into a percentile or a
     verdict. The qualifying percentile is published per year by the NTA and
     the site does not hold this year's cut-off, so any specific answer would
     be an invented fact — the exact thing rule one forbids. It states the
     rule that does apply, and hands over to the tool built for it. */

  function neetScoreAnswer(q) {
    var m = String(q).match(/\b(\d{2,3})\b/);
    if (!m) return null;
    if (!/neet|score|marks|percentile|rank/.test(normalise(q))) return null;
    var topic = (KB.topics || []).filter(function (t) { return t.id === 'neet-requirement'; })[0];

    return '<b>On a NEET score of ' + esc(m[1]) + '</b>' +
      '<span class="chat-row">I will not turn that number into a yes or a no, because the qualifying percentile is set per year by the NTA and this site does not publish a cut-off it cannot source. Guessing one would be worse than not answering.</span>' +
      '<span class="chat-row">What does apply: a <b>qualified</b> NEET result is mandatory, at the 50th percentile for General/OBC and the 40th for SC/ST/OBC-PwD, under the NMC’s Foreign Medical Graduate Licentiate Regulations 2021. Whether a given score qualifies depends on that year’s percentile boundary.</span>' +
      '<span class="chat-row"><a href="/neet-calculator">Check your score against the published rule →</a> · <a href="/counseling">Ask a counsellor →</a></span>' +
      (topic ? sourceLine(topic.source, topic.status)
             : sourceLine({ name: 'National Medical Commission, India', url: 'https://nmc.org.in', checked: KB.reviewed }, 'official'));
  }

  var NO_ANSWER =
    '<b>I don’t have a verified answer to that.</b>' +
    '<span class="chat-row">I only answer from information this site has checked against an official source, and that question is outside it. Rather than guess, let me put you to someone who can find out.</span>' +
    '<span class="chat-row"><a href="/counseling">Ask a counsellor →</a> · <a href="https://wa.me/917080800888" target="_blank" rel="noopener">WhatsApp ↗</a></span>';

  var LOAD_FAILED =
    '<b>I can’t reach my reference data right now.</b>' +
    '<span class="chat-row">Rather than answer from memory, here is the direct route: <a href="/counseling">ask a counsellor</a>, or check the official sources at <a href="https://mec.gov.np" target="_blank" rel="noopener">mec.gov.np</a> and <a href="https://nmc.org.in" target="_blank" rel="noopener">nmc.org.in</a>.</span>';

  /* Every college named in the question, longest name first, so "Manipal
     College of Medical Sciences vs College of Medical Sciences" resolves to
     two records rather than one twice. */
  function findColleges(q) {
    if (!KB || !KB.colleges) return [];
    var text = ' ' + normalise(q) + ' ';
    var hits = [];
    KB.colleges.forEach(function (c) {
      var short = normalise(c.name.split('(')[0].split(',')[0]);
      var acro = (c.name.match(/\(([A-Za-z]{2,})\)/) || [])[1];
      if ((acro && text.indexOf(' ' + acro.toLowerCase() + ' ') !== -1) ||
          (short.length >= 12 && text.indexOf(' ' + short + ' ') !== -1)) hits.push(c);
    });
    return hits;
  }

  function getBotReply(q) {
    if (!KB) return NO_ANSWER;
    if (KB.failed) return LOAD_FAILED;

    var text = normalise(q);

    // Two or more colleges named, and a word asking them to be set against
    // each other. Both halves are required: "IOM and KMC both take NEET" is
    // not a comparison request.
    var named = findColleges(q);
    if (named.length >= 2 && /\bvs\b|versus|compare|comparison|difference|better|between/.test(text)) {
      lastCollege = named[0];
      return comparisonAnswer(named.slice(0, 3));
    }

    var college = findCollege(q);
    if (college) { lastCollege = college; return collegeAnswer(college, q); }

    // A question about the set as a whole is tried before a topic, because
    // "how many government colleges are there" would otherwise match the
    // topic keyed on "government".
    var agg = aggregateAnswer(q);
    if (agg) return agg;

    var topic = findTopic(q);
    if (topic) return esc(topic.answer).replace(/\n/g, '<br>') + sourceLine(topic.source, topic.status);

    var neet = neetScoreAnswer(q);
    if (neet) return neet;

    // A follow-up with no subject of its own — "and its seats?", "what about
    // the fees there?" — is answered about the college last named. Only when
    // the question actually asks for a field, so a bare "thanks" does not
    // re-print a college record.
    if (lastCollege && /\b(it|its|there|that one|this college|same)\b/.test(text) &&
        /seat|quota|location|where|affiliat|universit|establish|founded|ownership|fee|duration/.test(text)) {
      return collegeAnswer(lastCollege, q);
    }

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
    lastCollege = null;
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
