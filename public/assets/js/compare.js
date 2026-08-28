/* NepalMBBS.in — compare.js
   The college comparison table on /colleges/compare.

   Self-contained: no dependency on actions.js's data-act dispatcher (that
   exists to replace legacy inline on* handlers; this is new code, so it just
   uses addEventListener directly, the way public/assets/theme/*.js already
   does). Nothing here reads from or writes to Supabase — the data is the
   same static record already published per college on /colleges/[slug],
   embedded once as JSON rather than duplicated into this file. */

(function () {
  'use strict';

  var MAX = 4;

  var dataEl = document.getElementById('cmp-data');
  var result = document.getElementById('cmp-result');
  if (!dataEl || !result) return;

  var colleges;
  try { colleges = JSON.parse(dataEl.textContent || '[]'); }
  catch (e) { colleges = []; }
  var bySlug = {};
  colleges.forEach(function (c) { bySlug[c.slug] = c; });

  var checks = Array.prototype.slice.call(document.querySelectorAll('.cmp-check'));
  var countEl = document.getElementById('cmp-count');

  var FIELDS = [
    ['Ownership', 'ownership'],
    ['Location', 'location'],
    ['University affiliation', 'affiliation'],
    ['Established', 'established'],
    ['Foreign-quota seats', 'seats'],
    ['Course duration', 'duration'],
    ['Admission route', 'admission'],
  ];

  function selected() {
    return checks.filter(function (c) { return c.checked; }).map(function (c) { return c.value; });
  }

  function render() {
    var slugs = selected();

    checks.forEach(function (c) {
      c.disabled = !c.checked && slugs.length >= MAX;
    });
    if (countEl) {
      countEl.textContent = slugs.length + ' selected' + (slugs.length >= MAX ? ' (max ' + MAX + ')' : '');
    }

    if (slugs.length < 2) {
      var empty = document.createElement('p');
      empty.className = 'cmp-empty';
      empty.textContent = slugs.length === 0
        ? 'Pick 2 or more colleges above to compare them here.'
        : 'Pick at least one more college to compare.';
      result.replaceChildren(empty);
      return;
    }

    var picked = slugs.map(function (s) { return bySlug[s]; }).filter(Boolean);

    var wrap = document.createElement('div');
    wrap.className = 'doc';
    var head = document.createElement('div');
    head.className = 'doc-head';
    var title = document.createElement('h2');
    title.className = 'doc-title';
    title.textContent = 'Side by side';
    var kicker = document.createElement('span');
    kicker.className = 'doc-kicker';
    kicker.textContent = picked.length + ' colleges';
    head.append(title, kicker);

    var body = document.createElement('div');
    body.className = 'doc-body';
    var table = document.createElement('table');
    table.className = 'doc-table';

    var thead = document.createElement('thead');
    var headRow = document.createElement('tr');
    var thField = document.createElement('th');
    thField.textContent = '';
    headRow.appendChild(thField);
    picked.forEach(function (c) {
      var th = document.createElement('th');
      var a = document.createElement('a');
      a.href = '/colleges/' + c.slug;
      a.textContent = c.name;
      th.appendChild(a);
      headRow.appendChild(th);
    });
    thead.appendChild(headRow);

    var tbody = document.createElement('tbody');
    FIELDS.forEach(function (f) {
      var label = f[0], key = f[1];
      var tr = document.createElement('tr');
      var th = document.createElement('th');
      th.setAttribute('scope', 'row');
      th.textContent = label;
      tr.appendChild(th);
      picked.forEach(function (c) {
        var td = document.createElement('td');
        td.setAttribute('data-label', label);
        var v = c[key];
        if (v) {
          td.textContent = v;
        } else {
          td.textContent = 'Not on record — ask us';
          td.className = 'doc-value--unknown';
        }
        tr.appendChild(td);
      });
      tbody.appendChild(tr);
    });

    // Tuition is a row every college's own page shows as "ask us" — same
    // treatment here, not a blank the table implies could be filled in.
    var feeRow = document.createElement('tr');
    var feeTh = document.createElement('th');
    feeTh.setAttribute('scope', 'row');
    feeTh.textContent = 'Tuition fee';
    feeRow.appendChild(feeTh);
    picked.forEach(function () {
      var td = document.createElement('td');
      td.setAttribute('data-label', 'Tuition fee');
      td.className = 'doc-value--unknown';
      td.textContent = 'Set per intake — ask us';
      feeRow.appendChild(td);
    });
    tbody.appendChild(feeRow);

    var siteRow = document.createElement('tr');
    var siteTh = document.createElement('th');
    siteTh.setAttribute('scope', 'row');
    siteTh.textContent = 'Official website';
    siteRow.appendChild(siteTh);
    picked.forEach(function (c) {
      var td = document.createElement('td');
      td.setAttribute('data-label', 'Official website');
      if (c.website) {
        var a = document.createElement('a');
        a.href = c.website;
        a.target = '_blank';
        a.rel = 'noopener';
        a.textContent = c.website.replace(/^https?:\/\//, '') + ' ↗';
        td.appendChild(a);
      } else {
        td.textContent = 'Not on record — ask us';
        td.className = 'doc-value--unknown';
      }
      siteRow.appendChild(td);
    });
    tbody.appendChild(siteRow);

    table.append(thead, tbody);
    body.appendChild(table);
    wrap.append(head, body);
    result.replaceChildren(wrap);
  }

  function syncURL() {
    var slugs = selected();
    var url = new URL(window.location.href);
    if (slugs.length) url.searchParams.set('c', slugs.join(','));
    else url.searchParams.delete('c');
    window.history.replaceState(null, '', url.pathname + url.search);
  }

  checks.forEach(function (c) {
    c.addEventListener('change', function () { render(); syncURL(); });
  });

  // Pre-select from ?c=slug1,slug2 on load, ignoring anything that is not a
  // real slug rather than failing the whole page over one bad value.
  var params = new URLSearchParams(window.location.search);
  var fromURL = (params.get('c') || '').split(',').map(function (s) { return s.trim(); }).filter(Boolean);
  if (fromURL.length) {
    var picked = 0;
    checks.forEach(function (c) {
      if (fromURL.indexOf(c.value) !== -1 && picked < MAX) { c.checked = true; picked++; }
    });
  }

  render();
})();
