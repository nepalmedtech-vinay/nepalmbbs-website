// Phase 5C — /colleges search, filter, sort and compare-selection.
// Every row is already server-rendered from src/data/colleges.json; this
// script only ever hides/shows and reorders rows already in the DOM, and
// forwards a slug list to /colleges/compare via the same ?c= URL param
// compare.js already reads. No fetch, no client-side data model.
(function () {
  var root = document.getElementById('college-discovery');
  if (!root) return;

  var searchInput = document.getElementById('cd-search');
  var sortSelect = document.getElementById('cd-sort');
  var filterTabs = Array.prototype.slice.call(root.querySelectorAll('.g-tab'));
  var rows = Array.prototype.slice.call(document.getElementById('cd-rows').querySelectorAll('tr'));
  var countEl = document.getElementById('cd-count');
  var noteEl = document.getElementById('cd-note');
  var emptyEl = document.getElementById('cd-empty');
  var resetBtn = document.getElementById('cd-reset');
  var tbody = document.getElementById('cd-rows');

  var compareBar = document.getElementById('cd-compare-bar');
  var compareCount = document.getElementById('cd-compare-count');
  var compareLink = document.getElementById('cd-compare-link');
  var MAX_COMPARE = 4;

  var activeFilter = 'all';

  function applyFilterAndSearch() {
    var q = (searchInput.value || '').trim().toLowerCase();
    var shown = 0;
    rows.forEach(function (tr) {
      var matchesFilter = activeFilter === 'all' || tr.getAttribute('data-type') === activeFilter;
      var matchesSearch = !q ||
        tr.getAttribute('data-name').indexOf(q) !== -1 ||
        tr.getAttribute('data-location').indexOf(q) !== -1;
      var show = matchesFilter && matchesSearch;
      tr.hidden = !show;
      if (show) shown++;
    });
    countEl.textContent = shown + ' shown';
    emptyEl.hidden = shown !== 0;
  }

  function applySort() {
    var mode = sortSelect.value;
    var sorted = rows.slice().sort(function (a, b) {
      if (mode === 'name-asc') return a.getAttribute('data-name').localeCompare(b.getAttribute('data-name'));
      if (mode === 'name-desc') return b.getAttribute('data-name').localeCompare(a.getAttribute('data-name'));
      var sa = parseInt(a.getAttribute('data-seats'), 10) || 0;
      var sb = parseInt(b.getAttribute('data-seats'), 10) || 0;
      return mode === 'seats-asc' ? sa - sb : sb - sa;
    });
    sorted.forEach(function (tr) { tbody.appendChild(tr); });
  }

  function updateCompareBar() {
    var checked = Array.prototype.slice.call(root.querySelectorAll('.cd-check:checked'));
    document.body.classList.toggle('cd-compare-active', checked.length > 0);
    if (!checked.length) {
      compareBar.hidden = true;
      return;
    }
    compareBar.hidden = false;
    compareCount.textContent = checked.length + ' selected';
    var slugs = checked.map(function (c) { return c.value; });
    compareLink.href = '/colleges/compare?c=' + slugs.map(encodeURIComponent).join(',');
  }

  searchInput.addEventListener('input', applyFilterAndSearch);

  filterTabs.forEach(function (tab) {
    tab.addEventListener('click', function () {
      filterTabs.forEach(function (t) { t.classList.remove('on'); });
      tab.classList.add('on');
      activeFilter = tab.getAttribute('data-filter');
      noteEl.textContent = tab.getAttribute('data-note') || '';
      applyFilterAndSearch();
    });
  });

  sortSelect.addEventListener('change', applySort);

  root.addEventListener('change', function (e) {
    if (!e.target.classList.contains('cd-check')) return;
    var checked = root.querySelectorAll('.cd-check:checked');
    if (checked.length > MAX_COMPARE) {
      e.target.checked = false;
      return;
    }
    updateCompareBar();
  });

  if (resetBtn) {
    resetBtn.addEventListener('click', function () {
      searchInput.value = '';
      filterTabs.forEach(function (t) { t.classList.remove('on'); });
      filterTabs[0].classList.add('on');
      activeFilter = 'all';
      noteEl.textContent = filterTabs[0].getAttribute('data-note') || '';
      applyFilterAndSearch();
    });
  }

  applySort();
  applyFilterAndSearch();
})();
