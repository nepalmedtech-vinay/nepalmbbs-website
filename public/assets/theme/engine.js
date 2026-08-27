/* NepalMBBS.in — theme/engine.js
   The theme runtime.

   One object in, CSS custom properties out. Nothing else on the site knows a
   theme exists: every rule reads tokens, this file writes them, and the admin
   panel is just a UI over the same two functions.

   Storage is deliberately two-tier:
     - localStorage paints instantly on the next visit, so a returning visitor
       never sees the default theme flash before the saved one arrives.
     - Supabase is the source of truth across devices and visitors.
   A read failure falls back to local, then to the CSS defaults. The site must
   look finished with no network at all. */

(function (root) {
  'use strict';

  var LS_KEY = 'nmb_theme_v1';

  /* ══ Control schema ═══════════════════════════════════════════════════
     The panel is GENERATED from this, so adding a control here is the only
     step needed to expose a new knob. `v` is the CSS variable it writes. */

  var SCHEMA = [
    { group: 'Material', icon: 'layers', note: 'What the glass is made of. These four decide whether a surface reads as glass, plastic or paper.', items: [
      { k: 'mBlur',     v: '--m-blur',     label: 'Frost',            type: 'range', min: 0,   max: 60,  step: 1,    unit: 'px' },
      { k: 'mOpacity',  v: '--m-opacity',  label: 'Body',             type: 'range', min: 0.2, max: 1,   step: 0.02 },
      { k: 'mSaturate', v: '--m-saturate', label: 'Colour through',   type: 'range', min: 100, max: 260, step: 4,    unit: '%' },
      { k: 'mBorder',   v: '--m-border',   label: 'Lit edge',         type: 'range', min: 0,   max: 1,   step: 0.02 },
      { k: 'mInner',    v: '--m-inner',    label: 'Thickness',        type: 'range', min: 0,   max: 1,   step: 0.02 },
    ]},
    { group: 'Colour', icon: 'palette', note: 'Two hues drive everything. The rest of the palette is mixed from them.', items: [
      { k: 'brand',   v: '--brand',   label: 'Brand',        type: 'color' },
      { k: 'brand2',  v: '--brand-2', label: 'Accent',       type: 'color' },
      { k: 'ink',     v: '--g-ink',   label: 'Text',         type: 'color' },
      { k: 'base',    v: '--g-base',  label: 'Ground',       type: 'color' },
    ]},
    { group: 'Aurora', icon: 'sparkles', note: 'The colour field behind the glass. Without it there is nothing to refract.', items: [
      { k: 'au1',       v: '--au-1',       label: 'Field 1',   type: 'color' },
      { k: 'au2',       v: '--au-2',       label: 'Field 2',   type: 'color' },
      { k: 'au3',       v: '--au-3',       label: 'Field 3',   type: 'color' },
      { k: 'au4',       v: '--au-4',       label: 'Field 4',   type: 'color' },
      { k: 'auOpacity', v: '--au-opacity', label: 'Intensity', type: 'range', min: 0, max: 1,  step: 0.02 },
      { k: 'auBlur',    v: '--au-blur',    label: 'Softness',  type: 'range', min: 20, max: 160, step: 4, unit: 'px' },
      { k: 'auScale',   v: '--au-scale',   label: 'Scale',     type: 'range', min: 0.5, max: 1.8, step: 0.05 },
      { k: 'auSpeed',   v: '--au-speed',   label: 'Drift',     type: 'range', min: 0, max: 90, step: 2, unit: 's' },
    ]},
    { group: 'Shape', icon: 'square', note: null, items: [
      { k: 'radius',  v: '--sh-radius', label: 'Corner',    type: 'range', min: 0, max: 40, step: 1, unit: 'px' },
      { k: 'border',  v: '--sh-border', label: 'Edge width',type: 'range', min: 0, max: 3,  step: 0.5, unit: 'px' },
      { k: 'shScale', v: '--sh-scale',  label: 'Size',      type: 'range', min: 0.8, max: 1.3, step: 0.05 },
      { k: 'depth',   v: '--dp',        label: 'Depth',     type: 'range', min: 0, max: 2, step: 0.1 },
    ]},
    { group: 'Type', icon: 'type', note: null, items: [
      { k: 'tyPair',   v: null,            label: 'Pairing',  type: 'pair' },
      { k: 'tyScale',  v: '--ty-scale',    label: 'Size',     type: 'range', min: 0.85, max: 1.25, step: 0.01 },
      { k: 'tyWeight', v: '--ty-weight',   label: 'Weight',   type: 'range', min: 300, max: 600, step: 100 },
      { k: 'tyWeightD',v: '--ty-weight-d', label: 'Display weight', type: 'range', min: 400, max: 900, step: 100 },
      { k: 'tyTrack',  v: '--ty-track',    label: 'Tracking', type: 'range', min: -0.02, max: 0.06, step: 0.005, unit: 'em' },
      { k: 'tyA11y',   v: '--ty-a11y',     label: 'Accessibility scale', type: 'range', min: 1, max: 1.4, step: 0.05,
        help: 'Stacks on top of Size, for anyone who needs everything larger.' },
    ]},
    { group: 'Motion', icon: 'wand', note: 'All of it collapses automatically when the device asks for reduced motion.', items: [
      { k: 'mo',         v: '--mo',           label: 'Intensity', type: 'range', min: 0, max: 1.5, step: 0.05 },
      { k: 'moTilt',     v: '--mo-tilt',      label: 'Card tilt', type: 'range', min: 0, max: 2, step: 0.1 },
      { k: 'moParallax', v: '--mo-parallax',  label: 'Parallax',  type: 'range', min: 0, max: 2, step: 0.1 },
    ]},
    { group: 'Effects', icon: 'stars', note: null, items: [
      { k: 'fxGlow',  v: '--fx-glow',  label: 'Glow',     type: 'toggle' },
      { k: 'fxFloat', v: '--fx-float', label: 'Float',    type: 'toggle' },
      { k: 'fxSheen', v: '--fx-sheen', label: 'Sheen',    type: 'toggle' },
      { k: 'fxGrain', v: '--fx-grain', label: 'Grain',    type: 'range', min: 0, max: 0.09, step: 0.005 },
    ]},
    { group: 'Layout', icon: 'rows', note: null, items: [
      { k: 'sp', v: '--sp', label: 'Spacing', type: 'segment', options: [
        { label: 'Compact', value: 0.85 }, { label: 'Standard', value: 1 }, { label: 'Comfortable', value: 1.2 } ] },
    ]},
  ];

  /* Font pairings. Loaded from Google Fonts on demand — only the chosen pair
     is fetched, so switching costs one request and the default costs none
     beyond what the page already loads. */
  var PAIRS = {
    editorial: { label: 'Editorial',  display: "'Fraunces', Georgia, serif",              body: "'Geist', system-ui, sans-serif",   google: 'Fraunces:opsz,wght@9..144,400..900|Geist:wght@300..800' },
    precise:   { label: 'Precise',    display: "'Geist', system-ui, sans-serif",          body: "'Geist', system-ui, sans-serif",   google: 'Geist:wght@300..800' },
    literary:  { label: 'Literary',   display: "'Instrument Serif', Georgia, serif",      body: "'Geist', system-ui, sans-serif",   google: 'Instrument+Serif:ital@0;1|Geist:wght@300..800' },
    journal:   { label: 'Journal',    display: "'Newsreader', Georgia, serif",            body: "'Inter', system-ui, sans-serif",   google: 'Newsreader:opsz,wght@6..72,300..700|Inter:wght@300..700' },
    grotesk:   { label: 'Grotesk',    display: "'Space Grotesk', system-ui, sans-serif",  body: "'Inter', system-ui, sans-serif",   google: 'Space+Grotesk:wght@400..700|Inter:wght@300..700' },
  };

  /* ══ Presets ══════════════════════════════════════════════════════════
     "Quick Looks". Each is a complete, checked theme — not a colour swap. */

  var PRESETS = {
    dawn: {
      label: 'Dawn', hint: 'Jade on warm light — the default',
      brand: '#0E7C6B', brand2: '#E2703A', ink: '#0F1420', base: '#F4F6FB',
      au1: '#BCE4DA', au2: '#C9D3F2', au3: '#F3DCC8', au4: '#E7D2E0',
      auOpacity: 0.5, auBlur: 84, auScale: 1, auSpeed: 34,
      mBlur: 26, mOpacity: 0.62, mSaturate: 172, mBorder: 0.62, mInner: 0.42,
      radius: 22, border: 1, shScale: 1, depth: 1,
      tyPair: 'editorial', tyScale: 1, tyWeight: 400, tyWeightD: 600, tyTrack: 0, tyA11y: 1,
      mo: 1, moTilt: 1, moParallax: 1,
      fxGlow: 1, fxFloat: 1, fxSheen: 1, fxGrain: 0.03, sp: 1,
    },
    porcelain: {
      label: 'Porcelain', hint: 'Near-white, minimal colour, maximum clarity',
      brand: '#1F5F8B', brand2: '#B4632F', ink: '#111722', base: '#FAFBFD',
      au1: '#CFE3F2', au2: '#DCE4F5', au3: '#F3E3D4', au4: '#E6E9F0',
      auOpacity: 0.7, auBlur: 96, auScale: 1.15, auSpeed: 44,
      mBlur: 18, mOpacity: 0.74, mSaturate: 130, mBorder: 0.78, mInner: 0.5,
      radius: 14, border: 1, shScale: 1, depth: 0.8,
      tyPair: 'precise', tyScale: 1, tyWeight: 400, tyWeightD: 700, tyTrack: 0, tyA11y: 1,
      mo: 0.8, moTilt: 0.6, moParallax: 0.7,
      fxGlow: 0, fxFloat: 0, fxSheen: 0, fxGrain: 0.02, sp: 1,
    },
    monsoon: {
      label: 'Monsoon', hint: 'Cooler, deeper field, heavier frost',
      brand: '#2563A8', brand2: '#4FA5A0', ink: '#0D1526', base: '#EEF2F9',
      au1: '#8FB6E8', au2: '#9FD8DA', au3: '#C3C9F0', au4: '#B7E0D4',
      auOpacity: 0.72, auBlur: 76, auScale: 1.1, auSpeed: 28,
      mBlur: 34, mOpacity: 0.56, mSaturate: 190, mBorder: 0.7, mInner: 0.46,
      radius: 26, border: 1, shScale: 1, depth: 1.1,
      tyPair: 'literary', tyScale: 1, tyWeight: 400, tyWeightD: 400, tyTrack: 0, tyA11y: 1,
      mo: 1.1, moTilt: 1.2, moParallax: 1.2,
      fxGlow: 1, fxFloat: 1, fxSheen: 1, fxGrain: 0.035, sp: 1,
    },
    saffron: {
      label: 'Saffron', hint: 'Warm, high-contrast, closer to the old brand',
      brand: '#B4541E', brand2: '#0E7C6B', ink: '#1A1410', base: '#FBF6EE',
      au1: '#F6CFA0', au2: '#F0B8A0', au3: '#E8D9B8', au4: '#D8C0A8',
      auOpacity: 0.66, auBlur: 88, auScale: 1.05, auSpeed: 38,
      mBlur: 22, mOpacity: 0.68, mSaturate: 160, mBorder: 0.66, mInner: 0.44,
      radius: 18, border: 1, shScale: 1, depth: 1,
      tyPair: 'journal', tyScale: 1, tyWeight: 400, tyWeightD: 600, tyTrack: 0, tyA11y: 1,
      mo: 1, moTilt: 0.9, moParallax: 1,
      fxGlow: 1, fxFloat: 1, fxSheen: 1, fxGrain: 0.04, sp: 1,
    },
    slate: {
      label: 'Slate', hint: 'Dimmed light mode — cooler and lower key, still not dark',
      brand: '#3B7A9E', brand2: '#C2703F', ink: '#0C121C', base: '#E4E9F1',
      au1: '#A9C4D8', au2: '#B8C2D9', au3: '#D3CBC0', au4: '#C0CBD6',
      auOpacity: 0.62, auBlur: 92, auScale: 1.2, auSpeed: 46,
      mBlur: 28, mOpacity: 0.66, mSaturate: 145, mBorder: 0.72, mInner: 0.48,
      radius: 20, border: 1, shScale: 1, depth: 1.2,
      tyPair: 'grotesk', tyScale: 1, tyWeight: 400, tyWeightD: 700, tyTrack: 0, tyA11y: 1,
      mo: 0.9, moTilt: 0.8, moParallax: 0.9,
      fxGlow: 0, fxFloat: 1, fxSheen: 0, fxGrain: 0.03, sp: 1,
    },
  };

  /* ══ Colour helpers ═══════════════════════════════════════════════════ */

  function hexToRgb(h) {
    h = String(h || '').trim().replace('#', '');
    if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    if (!/^[0-9a-f]{6}$/i.test(h)) return null;
    return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
  }

  function luminance(rgb) {
    var a = rgb.map(function (v) {
      v /= 255;
      return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * a[0] + 0.7152 * a[1] + 0.0722 * a[2];
  }

  function contrast(a, b) {
    var ra = hexToRgb(a), rb = hexToRgb(b);
    if (!ra || !rb) return 21;
    var la = luminance(ra), lb = luminance(rb);
    return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
  }

  /* A theme that looks lovely and cannot be read is a broken theme. Anything
     the panel or a preset produces goes through here first, and the two
     ratios that actually matter get reported back so the UI can warn. */
  function audit(t) {
    var issues = [];
    var inkOnBase = contrast(t.ink, t.base);
    if (inkOnBase < 7) {
      issues.push({ level: inkOnBase < 4.5 ? 'fail' : 'warn', ratio: inkOnBase,
        msg: 'Text on the page ground is ' + inkOnBase.toFixed(1) + ':1. Aim for 7:1.' });
    }
    // Glass panes sit over the aurora, so the effective background behind text
    // is the ground lightened by the pane, not the ground itself.
    var onGlass = contrast(t.ink, '#FFFFFF');
    if (onGlass < 4.5) {
      issues.push({ level: 'fail', ratio: onGlass,
        msg: 'Text on a glass pane is ' + onGlass.toFixed(1) + ':1. Below 4.5:1 it is unreadable for many people.' });
    }
    var btn = contrast(t.brand, '#FFFFFF');
    if (btn < 4.5) {
      issues.push({ level: 'warn', ratio: btn,
        msg: 'White text on the brand colour is ' + btn.toFixed(1) + ':1. Buttons may be hard to read.' });
    }
    return issues;
  }

  /* ══ Apply ════════════════════════════════════════════════════════════ */

  var loadedPairs = {};

  function loadPair(key) {
    var p = PAIRS[key];
    if (!p || loadedPairs[key] || !p.google) return;
    loadedPairs[key] = true;
    var fams = p.google.split('|').map(function (f) { return 'family=' + f; }).join('&');
    var l = document.createElement('link');
    l.rel = 'stylesheet';
    l.href = 'https://fonts.googleapis.com/css2?' + fams + '&display=swap';
    document.head.appendChild(l);
  }

  function apply(theme, target) {
    var t = Object.assign({}, PRESETS.dawn, theme || {});
    var el = (target || document.documentElement);
    var s = el.style;

    function set(v, val) { if (v && val !== undefined && val !== null && val !== '') s.setProperty(v, String(val)); }

    SCHEMA.forEach(function (g) {
      g.items.forEach(function (it) {
        if (!it.v) return;
        var val = t[it.k];
        if (val === undefined) return;
        set(it.v, it.unit ? val + it.unit : val);
      });
    });

    // Glass tint follows the ground, so a warm theme gets warm glass rather
    // than a grey pane sitting on a warm page.
    var baseRgb = hexToRgb(t.base);
    if (baseRgb) {
      var lifted = baseRgb.map(function (c) { return Math.round(c + (255 - c) * 0.72); });
      set('--m-tint', lifted.join(' '));
      set('--dp-hue', hexToRgb(t.ink).join(' '));
    }

    // Text on the brand fill flips to dark when the brand is light.
    set('--brand-ink', contrast(t.brand, '#FFFFFF') >= 4.5 ? '#FFFFFF' : t.ink);

    var pair = PAIRS[t.tyPair] || PAIRS.editorial;
    set('--ty-display', pair.display);
    set('--ty-body', pair.body);
    loadPair(t.tyPair);

    if (!target) {
      current = t;
      try { localStorage.setItem(LS_KEY, JSON.stringify(t)); } catch (e) {}
      root.dispatchEvent(new CustomEvent('themechange', { detail: t }));
    }
    return t;
  }

  /* ══ Persistence ══════════════════════════════════════════════════════ */

  var current = null;

  function local() {
    try { return JSON.parse(localStorage.getItem(LS_KEY) || 'null'); } catch (e) { return null; }
  }

  async function pull() {
    // sbR is defined by config.js and already carries the anon key.
    if (typeof sbR !== 'function') return null;
    try {
      var rows = await sbR('/rest/v1/admin_settings?key=eq.site_theme&select=value');
      if (rows && rows.length && rows[0].value) return JSON.parse(rows[0].value);
    } catch (e) {}
    return null;
  }

  async function push(theme) {
    if (typeof sbW !== 'function') return false;
    var payload = { value: JSON.stringify(theme), updated_at: new Date().toISOString() };
    var ok = await sbW('/rest/v1/admin_settings?key=eq.site_theme', payload, 'PATCH');
    if (!ok) ok = await sbW('/rest/v1/admin_settings', { key: 'site_theme', value: payload.value });
    return ok;
  }

  async function init() {
    // Local first so the paint is immediate, then reconcile with the server.
    var l = local();
    if (l) apply(l);
    var remote = await pull();
    if (remote) apply(remote);
    else if (!l) apply(PRESETS.dawn);
  }

  root.Theme = {
    SCHEMA: SCHEMA, PRESETS: PRESETS, PAIRS: PAIRS,
    apply: apply, audit: audit, contrast: contrast,
    pull: pull, push: push, init: init,
    get: function () { return Object.assign({}, PRESETS.dawn, current || local() || {}); },
    reset: function () { try { localStorage.removeItem(LS_KEY); } catch (e) {} apply(PRESETS.dawn); },
  };
})(window);
