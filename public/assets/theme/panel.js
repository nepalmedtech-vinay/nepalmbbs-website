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

        // Describe-a-look. Labelled a generator, not AI, because that is what
        // it is — and because the constraint is the feature: every result is
        // solved against the ground for contrast before it is applied.
        '<div class="tp-gen">' +
          '<label class="tp-lbl" for="tp-gen-in">Describe a look</label>' +
          '<div class="tp-gen-row">' +
            '<input id="tp-gen-in" type="text" placeholder="calm premium medical, light" autocomplete="off">' +
            '<button class="tp-btn tp-btn--primary" id="tp-gen-go">Generate</button>' +
          '</div>' +
          '<p class="tp-help" id="tp-gen-note">Colour-theory generator — works offline, and every result is contrast-solved before it is applied.</p>' +
        '</div>' +

        // Viewport preview. A glass material and a fluid type scale both
        // behave differently at 390px than at 1440, and judging either from a
        // desktop window is how a design ships broken on phones.
        '<div class="tp-vp">' +
          '<span class="tp-lbl">Preview at</span>' +
          '<div class="tp-seg" id="tp-vp">' +
            '<button data-w="390">Phone</button>' +
            '<button data-w="820">Tablet</button>' +
            '<button class="on" data-w="0">Full</button>' +
          '</div>' +
        '</div>' +

        '<div class="tp-looks"><span class="tp-lbl">Quick looks</span><div class="tp-look-row" id="tp-looks"></div></div>' +
        '<div class="tp-looks"><div class="tp-lbl-row"><span class="tp-lbl">Saved looks</span>' +
          '<button class="tp-btn tp-btn--quiet" id="tp-save">Save current…</button></div>' +
          '<div class="tp-look-row" id="tp-saved"></div></div>' +
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
    renderSaved();

    // ── Generator ────────────────────────────────────────────────────
    var genIn = host.querySelector('#tp-gen-in');
    function runGen() {
      if (!window.ThemeGen) return;
      var out = ThemeGen.generate(genIn.value);
      var note = host.querySelector('#tp-gen-note');
      var m = out._matched || [];
      delete out._matched;
      draft = out;
      Theme.apply(draft);
      rebuild();
      renderAudit();
      dirty(true);
      note.textContent = m.length
        ? 'Read as: ' + m.join(', ') + '. Words it does not know are ignored rather than guessed at.'
        : 'No known words in that phrase, so this is the neutral starting point. Try words like calm, bold, dark, warm, medical, editorial, glassy.';
    }
    host.querySelector('#tp-gen-go').addEventListener('click', runGen);
    genIn.addEventListener('keydown', function (e) { if (e.key === 'Enter') runGen(); });

    // ── Viewport preview ─────────────────────────────────────────────
    host.querySelector('#tp-vp').addEventListener('click', function (e) {
      var b = e.target.closest('button'); if (!b) return;
      this.querySelectorAll('button').forEach(function (x) { x.classList.remove('on'); });
      b.classList.add('on');
      var w = parseInt(b.dataset.w, 10);
      var doc = document.documentElement;
      if (!w) { doc.removeAttribute('data-vp'); doc.style.removeProperty('--vp-w'); }
      else { doc.setAttribute('data-vp', ''); doc.style.setProperty('--vp-w', w + 'px'); }
    });

    // ── Save current ─────────────────────────────────────────────────
    host.querySelector('#tp-save').addEventListener('click', async function () {
      var name = prompt('Name this look');
      if (!name) return;
      await Theme.saveLook(name.trim(), draft);
      renderSaved();
    });

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

  async function renderSaved() {
    var box = document.getElementById('tp-saved');
    if (!box || !window.Theme.pullLooks) return;
    var looks = await Theme.pullLooks();
    box.innerHTML = '';
    if (!looks.length) {
      box.innerHTML = '<p class="tp-help" style="grid-column:1/-1">Nothing saved yet. Tune the controls, then Save current.</p>';
      return;
    }
    looks.forEach(function (l) {
      var t = l.theme || {};
      var b = h('button', 'tp-look',
        '<span class="tp-chip" style="background:linear-gradient(135deg,' + (t.au1 || '#ccc') + ',' +
          (t.au2 || '#ddd') + ' 45%,' + (t.au3 || '#eee') + ')"><i style="background:' + (t.brand || '#888') + '"></i></span>' +
        '<b>' + l.name + '</b><em>saved look</em>');
      b.addEventListener('click', function () {
        draft = Object.assign({}, t);
        Theme.apply(draft); rebuild(); renderAudit(); dirty(true);
      });
      var del = h('button', 'tp-look-del', '×');
      del.title = 'Delete ' + l.name;
      del.addEventListener('click', async function (e) {
        e.stopPropagation();
        await Theme.deleteLook(l.name);
        renderSaved();
      });
      var wrap = h('div', 'tp-look-wrap');
      wrap.append(b, del);
      box.appendChild(wrap);
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
