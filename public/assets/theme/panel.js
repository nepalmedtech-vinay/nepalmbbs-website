/* NepalMBBS.in — theme/panel.js
   The Customize panel.

   Generated entirely from Theme.SCHEMA, so a new control is one schema entry
   and nothing here changes. Three things it does that a plain settings form
   does not:

     - Live preview. Every input writes to the real page immediately, because
       a glass material cannot be judged from a swatch — you have to see it
       over the actual aurora with the actual type on it.
     - Draft vs published. Editing is local until Publish, so the admin can
       explore without visitors seeing half-finished states.
     - Contrast audit, always visible. Not a validation error after the fact:
       the ratio updates as the sliders move, so an unreadable combination is
       obvious before it is saved.
*/

(function () {
  'use strict';

  var ICONS = {
    layers:  'M12 2 2 7l10 5 10-5-10-5ZM2 17l10 5 10-5M2 12l10 5 10-5',
    palette: 'M12 22a10 10 0 1 1 10-10c0 2-1 3-3 3h-2a2 2 0 0 0-1 4 2 2 0 0 1-1 3h-3Z',
    sparkles:'m12 3 1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9L12 3ZM19 3v4M17 5h4',
    square:  'M3 3h18v18H3z',
    type:    'M4 7V5h16v2M9 19h6M12 5v14',
    wand:    'm15 4 5 5L9 20H4v-5L15 4ZM14 5l5 5',
    stars:   'm12 3 2 5 5 2-5 2-2 5-2-5-5-2 5-2 2-5Z',
    rows:    'M3 5h18v6H3zM3 13h18v6H3z',
  };

  function icon(name) {
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" ' +
      'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="' +
      (ICONS[name] || ICONS.square) + '"/></svg>';
  }

  var draft = null;
  var mounted = false;

  function h(tag, cls, html) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html != null) e.innerHTML = html;
    return e;
  }

  /* ── Controls ─────────────────────────────────────────────────────── */

  function control(item) {
    var wrap = h('div', 'tp-ctl');
    var val = draft[item.k];

    if (item.type === 'toggle') {
      wrap.classList.add('tp-ctl--row');
      wrap.innerHTML =
        '<span class="tp-lbl">' + item.label + '</span>' +
        '<button class="tp-sw' + (Number(val) ? ' on' : '') + '" role="switch" aria-checked="' +
        (Number(val) ? 'true' : 'false') + '"><i></i></button>';
      wrap.querySelector('.tp-sw').addEventListener('click', function () {
        var on = !this.classList.contains('on');
        this.classList.toggle('on', on);
        this.setAttribute('aria-checked', String(on));
        change(item.k, on ? 1 : 0);
      });
      return wrap;
    }

    if (item.type === 'color') {
      wrap.classList.add('tp-ctl--row');
      wrap.innerHTML =
        '<span class="tp-lbl">' + item.label + '</span>' +
        '<span class="tp-col"><input type="color" value="' + val + '" aria-label="' + item.label + '">' +
        '<code>' + String(val).toUpperCase() + '</code></span>';
      var inp = wrap.querySelector('input');
      inp.addEventListener('input', function () {
        wrap.querySelector('code').textContent = this.value.toUpperCase();
        change(item.k, this.value);
      });
      return wrap;
    }

    if (item.type === 'segment') {
      wrap.innerHTML = '<span class="tp-lbl">' + item.label + '</span><div class="tp-seg"></div>';
      var seg = wrap.querySelector('.tp-seg');
      item.options.forEach(function (o) {
        var b = h('button', Number(val) === o.value ? 'on' : '', o.label);
        b.addEventListener('click', function () {
          seg.querySelectorAll('button').forEach(function (x) { x.classList.remove('on'); });
          b.classList.add('on');
          change(item.k, o.value);
        });
        seg.appendChild(b);
      });
      return wrap;
    }

    if (item.type === 'pair') {
      wrap.innerHTML = '<span class="tp-lbl">' + item.label + '</span><div class="tp-pairs"></div>';
      var box = wrap.querySelector('.tp-pairs');
      Object.keys(Theme.PAIRS).forEach(function (k) {
        var p = Theme.PAIRS[k];
        var b = h('button', 'tp-pair' + (val === k ? ' on' : ''),
          '<span style="font-family:' + p.display + '">Ag</span><em>' + p.label + '</em>');
        b.addEventListener('click', function () {
          box.querySelectorAll('.tp-pair').forEach(function (x) { x.classList.remove('on'); });
          b.classList.add('on');
          change(item.k, k);
        });
        box.appendChild(b);
      });
      return wrap;
    }

    // range
    var shown = item.unit === 's' ? val + 's' : (item.unit ? val + item.unit : val);
    wrap.innerHTML =
      '<div class="tp-lbl-row"><span class="tp-lbl">' + item.label + '</span>' +
      '<output>' + shown + '</output></div>' +
      '<input type="range" min="' + item.min + '" max="' + item.max + '" step="' + item.step +
      '" value="' + parseFloat(val) + '" aria-label="' + item.label + '">' +
      (item.help ? '<p class="tp-help">' + item.help + '</p>' : '');
    var r = wrap.querySelector('input');
    r.addEventListener('input', function () {
      var v = parseFloat(this.value);
      wrap.querySelector('output').textContent = item.unit ? v + item.unit : v;
      change(item.k, v);
    });
    return wrap;
  }

  function change(key, value) {
    draft[key] = value;
    Theme.apply(draft);
    renderAudit();
    dirty(true);
  }

  /* ── Audit ────────────────────────────────────────────────────────── */

  function renderAudit() {
    var box = document.getElementById('tp-audit');
    if (!box) return;
    var issues = Theme.audit(draft);
    if (!issues.length) {
      box.className = 'tp-audit ok';
      box.innerHTML = '<strong>Readable.</strong> Text passes contrast on the ground, on glass and on buttons.';
      return;
    }
    var worst = issues.some(function (i) { return i.level === 'fail'; }) ? 'fail' : 'warn';
    box.className = 'tp-audit ' + worst;
    box.innerHTML = '<strong>' + (worst === 'fail' ? 'Hard to read.' : 'Check this.') + '</strong> ' +
      issues.map(function (i) { return i.msg; }).join(' ');
  }

  function dirty(on) {
    var b = document.getElementById('tp-publish');
    if (b) { b.disabled = !on; b.textContent = on ? 'Publish to site' : 'Published'; }
  }

  /* ── Mount ────────────────────────────────────────────────────────── */

  function mount(host) {
    if (mounted) return;
    mounted = true;
    draft = Theme.get();

    host.innerHTML =
      '<div class="tp">' +
        '<div class="tp-head">' +
          '<div><h3>Appearance</h3><p>Changes preview live on the page behind this panel.</p></div>' +
          '<div class="tp-actions">' +
            '<button class="tp-btn tp-btn--quiet" id="tp-reset">Reset</button>' +
            '<button class="tp-btn tp-btn--primary" id="tp-publish" disabled>Published</button>' +
          '</div>' +
        '</div>' +
        '<div class="tp-audit ok" id="tp-audit"></div>' +
        '<div class="tp-looks"><span class="tp-lbl">Quick looks</span><div class="tp-look-row" id="tp-looks"></div></div>' +
        '<div class="tp-groups" id="tp-groups"></div>' +
        '<p class="tp-foot" id="tp-status"></p>' +
      '</div>';

    // Presets
    var looks = host.querySelector('#tp-looks');
    Object.keys(Theme.PRESETS).forEach(function (k) {
      var p = Theme.PRESETS[k];
      var b = h('button', 'tp-look',
        '<span class="tp-chip" style="background:linear-gradient(135deg,' + p.au1 + ',' + p.au2 + ' 45%,' + p.au3 + ')">' +
        '<i style="background:' + p.brand + '"></i></span>' +
        '<b>' + p.label + '</b><em>' + p.hint + '</em>');
      b.addEventListener('click', function () {
        draft = Object.assign({}, p);
        Theme.apply(draft);
        rebuild();
        renderAudit();
        dirty(true);
      });
      looks.appendChild(b);
    });

    rebuild();
    renderAudit();

    host.querySelector('#tp-reset').addEventListener('click', function () {
      draft = Object.assign({}, Theme.PRESETS.dawn);
      Theme.apply(draft);
      rebuild();
      renderAudit();
      dirty(true);
    });

    host.querySelector('#tp-publish').addEventListener('click', async function () {
      var st = document.getElementById('tp-status');
      this.disabled = true;
      this.textContent = 'Publishing…';
      var ok = await Theme.push(draft);
      this.textContent = ok ? 'Published' : 'Publish to site';
      this.disabled = ok;
      st.textContent = ok
        ? 'Live for everyone. Visitors see it on their next page load.'
        : 'Could not save. The theme is still applied on this device — check the admin_settings write policy in Supabase.';
      st.className = 'tp-foot' + (ok ? ' ok' : ' err');
    });
  }

  function rebuild() {
    var box = document.getElementById('tp-groups');
    if (!box) return;
    box.innerHTML = '';
    Theme.SCHEMA.forEach(function (g, gi) {
      var sec = h('section', 'tp-group' + (gi === 0 ? ' open' : ''));
      sec.innerHTML =
        '<button class="tp-group-head">' + icon(g.icon) +
        '<span>' + g.group + '</span>' +
        '<svg class="tp-caret" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" ' +
        'stroke-linecap="round"><path d="m6 9 6 6 6-6"/></svg></button>' +
        '<div class="tp-group-body">' + (g.note ? '<p class="tp-note">' + g.note + '</p>' : '') + '</div>';
      var body = sec.querySelector('.tp-group-body');
      g.items.forEach(function (it) { body.appendChild(control(it)); });
      sec.querySelector('.tp-group-head').addEventListener('click', function () {
        sec.classList.toggle('open');
      });
      box.appendChild(sec);
    });
  }

  window.ThemePanel = { mount: mount };
})();
