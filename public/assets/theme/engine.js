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
    twilight: {
      label: 'Twilight', hint: 'Champagne on deep slate — the default',
      /* Deep slate rather than near-black. #0A0E13 was tried first and read
         as pitch: at that luminance the glass has almost nothing to sit
         against, every pane collapses to the same flat grey, and the whole
         interface goes hard rather than deep. #1C232E is roughly four times
         the luminance — still unmistakably a dark theme, but with enough
         ground left for a pane to be lighter than it and for the champagne
         to read as warm light rather than as the only thing on screen. */
      brand: '#D9B26A', brand2: '#4FA88F', ink: '#F2F5F9', base: '#1C232E',
      /* Deep pools, not pastels. On a dark ground the aurora is the only
         thing giving the glass something to refract, so these carry more
         weight here than in any light preset — hence the higher opacity and
         the larger, softer blobs. */
      au1: '#1E4F49', au2: '#26365E', au3: '#4E3D22', au4: '#3A2C46',
      auOpacity: 0.72, auBlur: 92, auScale: 1.15, auSpeed: 38,
      mBlur: 30, mOpacity: 0.07, mSaturate: 145, mBorder: 0.17, mInner: 0.11,
      radius: 20, border: 1, shScale: 1, depth: 1,
      tyPair: 'editorial', tyScale: 1, tyWeight: 400, tyWeightD: 600, tyTrack: 0, tyA11y: 1,
      mo: 1, moTilt: 1, moParallax: 1,
      fxGlow: 1, fxFloat: 1, fxSheen: 1, fxGrain: 0.05, sp: 1,
    },
    dawn: {
      label: 'Dawn', hint: 'Jade on warm light — the previous default',
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
    nocturne: {
      label: 'Nocturne', hint: 'Dark — deep indigo ground, cool glass',
      brand: '#4FD1C5', brand2: '#F0956A', ink: '#EDF1FA', base: '#141A28',
      au1: '#2E5F63', au2: '#39406E', au3: '#5C4A50', au4: '#2C5A54',
      auOpacity: 0.62, auBlur: 76, auScale: 1.1, auSpeed: 40,
      mBlur: 30, mOpacity: 0.52, mSaturate: 150, mBorder: 0.34, mInner: 0.22,
      radius: 22, border: 1, shScale: 1, depth: 1,
      tyPair: 'editorial', tyScale: 1, tyWeight: 400, tyWeightD: 600, tyTrack: 0, tyA11y: 1,
      mo: 1, moTilt: 1, moParallax: 1,
      fxGlow: 1, fxFloat: 1, fxSheen: 1, fxGrain: 0.045, sp: 1,
    },
    graphite: {
      label: 'Graphite', hint: 'Dark — neutral, low chroma, maximum focus',
      brand: '#8FB4E8', brand2: '#D8A177', ink: '#E9ECF2', base: '#16181C',
      au1: '#2B3138', au2: '#333941', au3: '#3A3630', au4: '#2E3439',
      auOpacity: 0.55, auBlur: 88, auScale: 1.2, auSpeed: 50,
      mBlur: 22, mOpacity: 0.58, mSaturate: 128, mBorder: 0.3, mInner: 0.2,
      radius: 14, border: 1, shScale: 1, depth: 1,
      tyPair: 'precise', tyScale: 1, tyWeight: 400, tyWeightD: 700, tyTrack: 0, tyA11y: 1,
      mo: 0.8, moTilt: 0.6, moParallax: 0.7,
      fxGlow: 0, fxFloat: 1, fxSheen: 0, fxGrain: 0.04, sp: 1,
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
    return contrastRgb(ra, rb);
  }

  function contrastRgb(ra, rb) {
    var la = luminance(ra), lb = luminance(rb);
    return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
  }

  /* Mixing in oklab rather than sRGB, because that is what the stylesheets do
     and a ramp that disagrees with its own fallbacks is worse than no ramp.
     Doing it here rather than leaving color-mix() to the browser is what makes
     the result predictable enough to solve against a contrast target. */
  function srgbToOklab(c) {
    var lin = c.map(function (v) {
      v /= 255;
      return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    });
    var l = Math.cbrt(0.4122214708 * lin[0] + 0.5363325363 * lin[1] + 0.0514459929 * lin[2]);
    var m = Math.cbrt(0.2119034982 * lin[0] + 0.6806995451 * lin[1] + 0.1073969566 * lin[2]);
    var s = Math.cbrt(0.0883024619 * lin[0] + 0.2817188376 * lin[1] + 0.6299787005 * lin[2]);
    return [0.2104542553 * l + 0.7936177850 * m - 0.0040720468 * s,
            1.9779984951 * l - 2.4285922050 * m + 0.4505937099 * s,
            0.0259040371 * l + 0.7827717662 * m - 0.8086757660 * s];
  }

  function oklabToSrgb(o) {
    var l_ = o[0] + 0.3963377774 * o[1] + 0.2158037573 * o[2];
    var m_ = o[0] - 0.1055613458 * o[1] - 0.0638541728 * o[2];
    var s_ = o[0] - 0.0894841775 * o[1] - 1.2914855480 * o[2];
    var l = l_ * l_ * l_, m = m_ * m_ * m_, s = s_ * s_ * s_;
    return [ 4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
            -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
            -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s]
      .map(function (v) {
        v = v <= 0.0031308 ? 12.92 * v : 1.055 * Math.pow(Math.min(1, Math.max(0, v)), 1 / 2.4) - 0.055;
        return Math.round(Math.min(255, Math.max(0, v * 255)));
      });
  }

  function mixOklab(a, b, t) {
    var A = srgbToOklab(a), B = srgbToOklab(b);
    return oklabToSrgb([A[0] + (B[0] - A[0]) * t,
                        A[1] + (B[1] - A[1]) * t,
                        A[2] + (B[2] - A[2]) * t]);
  }

  function hex(rgb) {
    return '#' + rgb.map(function (v) { return ('0' + v.toString(16)).slice(-2); }).join('');
  }

  /* Brand text that misses the target is darkened along its own hue rather
     than greyed toward the ink, so a teal link stays teal instead of turning
     into another shade of slate. */
  function darkenToContrast(rgb, against, target) {
    // Which way is "more readable" depends on the ground. Mixing toward black
    // on a dark page makes the link LESS legible, and a binary search that
    // never reaches the target happily runs all the way to #000 -- which is
    // exactly what dark mode shipped as before this check existed.
    var toward = luminance(against) < 0.18 ? [255, 255, 255] : [0, 0, 0];
    var lo = 0, hi = 1;
    for (var i = 0; i < 20; i++) {
      var mid = (lo + hi) / 2;
      if (contrastRgb(mixOklab(rgb, toward, mid), against) >= target) hi = mid;
      else lo = mid;
    }
    var out = mixOklab(rgb, toward, hi);
    // If even the extreme misses the target, take the extreme rather than a
    // value that is both off-brand and still unreadable.
    return contrastRgb(out, against) >= target ? out : toward.slice();
  }

  /* How far can this ink fade toward the ground before it stops being legible?
     Answering that per theme is the whole point: a fixed 45% mix is 4.6:1 on
     one ground and 3.3:1 on the next, and the second one ships looking fine
     and failing AA on most of the page. */
  function fadeToContrast(inkRgb, baseRgb, target) {
    if (contrastRgb(inkRgb, baseRgb) < target) return inkRgb.slice();   // already as dark as it gets
    var lo = 0, hi = 1;
    for (var i = 0; i < 20; i++) {
      var mid = (lo + hi) / 2;
      if (contrastRgb(mixOklab(inkRgb, baseRgb, mid), baseRgb) >= target) lo = mid;
      else hi = mid;
    }
    return mixOklab(inkRgb, baseRgb, lo);
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
    // is the ground shifted by the pane — not the ground, and not white. This
    // checked against white unconditionally, which is right in light mode and
    // meaningless in dark mode, where it would pass a theme whose panes are
    // nearly black.
    var bRgb = hexToRgb(t.base) || [244, 246, 251];
    var isDark = luminance(bRgb) < 0.4;
    var lift = isDark ? 0.10 : 0.72;
    var glass = '#' + bRgb.map(function (c) {
      return Math.round(c + (255 - c) * lift).toString(16).padStart(2, '0');
    }).join('');
    var onGlass = contrast(t.ink, glass);
    if (onGlass < 4.5) {
      issues.push({ level: 'fail', ratio: onGlass,
        msg: 'Text on a glass pane is ' + onGlass.toFixed(1) + ':1. Below 4.5:1 it is unreadable for many people.' });
    }
    // Judge the button on the ink it will ACTUALLY get, not on white.
    // apply() flips --brand-ink to the ground when the brand is too light for
    // white — so a champagne brand renders dark-on-champagne at about 8:1,
    // while this check reported "White text on the brand colour is 2.0:1" and
    // warned about a combination the page never paints. A checker that
    // disagrees with the thing it is checking trains people to ignore it.
    var btnInk = contrast(t.brand, '#FFFFFF') >= 4.5 ? '#FFFFFF' : t.base;
    var btn = contrast(t.brand, btnInk);
    if (btn < 4.5) {
      issues.push({ level: 'warn', ratio: btn,
        msg: 'Button text on the brand colour is ' + btn.toFixed(1) +
             ':1, using ' + (btnInk === '#FFFFFF' ? 'white' : 'the page ground') +
             '. Buttons may be hard to read.' });
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
    var t = Object.assign({}, PRESETS.twilight, theme || {});
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

    // ── Mode ──────────────────────────────────────────────────────────
    // There is no dark-mode flag. The mode IS the ground colour: pick a dark
    // base and everything below follows. A separate switch would be a second
    // source of truth that can disagree with the palette it is meant to
    // describe.
    var baseRgb = hexToRgb(t.base) || [244, 246, 251];
    var inkRgb  = hexToRgb(t.ink)  || [15, 20, 32];
    var dark = luminance(baseRgb) < 0.4;
    el.setAttribute('data-mode', dark ? 'dark' : 'light');

    // Glass tint follows the ground, so a warm theme gets warm glass rather
    // than a grey pane sitting on a warm page. On a dark ground the pane must
    // be a LIGHTER DARK, not a light pane — lifting 72% toward white there
    // would drop a white card onto a black page.
    var lift = dark ? 0.10 : 0.72;
    set('--m-tint', baseRgb.map(function (c) {
      return Math.round(c + (255 - c) * lift);
    }).join(' '));

    // A hairline has to contrast with the pane it edges, so it flips.
    set('--m-hairline', dark ? 'rgba(255 255 255 / 0.10)' : 'rgba(15 20 32 / 0.07)');

    // Shadows are always dark. Deriving them from the ink made them LIGHT in
    // dark mode, which is not a shadow — it is a glow, and it made every card
    // look like it was lit from underneath.
    set('--dp-hue', dark ? '0 0 0' : inkRgb.join(' '));
    set('--dp', dark ? String((parseFloat(t.depth) || 1) * 1.6) : String(t.depth));

    // The secondary ink steps fade from ink toward the ground, so a preset only
    // names two colours and the ramp follows in either direction.
    //
    // They used to fade by fixed fractions — 32%, 55%, 72% — which is how the
    // site shipped with roughly 890 pieces of text below WCAG AA without anyone
    // seeing it: the same 55% that measures 4.6:1 on one ground measures 3.3:1
    // on another, and the second one still looks like a considered grey. So the
    // fraction is solved per theme against a contrast target instead of chosen.
    //
    // ink-4 targets 3:1 because it is for placeholders and disabled states, not
    // body copy. Anything that must be READ uses ink-3 or darker.
    // Solved against the darkest surface text actually sits on, not the page
    // ground. Glass panes are a shade deeper than the page, so a ramp solved
    // against the page alone is correct in the margins and fails inside every
    // card -- which is where nearly all the text is.
    var deepest = mixOklab(baseRgb, inkRgb, 0.16);
    // Targets sit a hair above the line: mixOklab rounds to whole channels,
    // and a solve that lands exactly on 4.50 can round down to 4.45.
    [['--g-ink-2', 7.15], ['--g-ink-3', 4.65], ['--g-ink-4', 3.1]].forEach(function (pair) {
      set(pair[0], hex(fadeToContrast(inkRgb, deepest, pair[1])));
    });

    // Brand-as-text is a separate question from brand-as-fill: #0E7C6B clears
    // 4.5:1 on the page and misses it on a glass pane. Links get their own
    // token rather than borrowing the fill colour and hoping.
    var brandRgb = hexToRgb(t.brand) || [14, 124, 107];
    set('--brand-text', contrastRgb(brandRgb, deepest) >= 4.5
      ? t.brand
      : hex(darkenToContrast(brandRgb, deepest, 4.5)));

    // WhatsApp is the one colour on this site that cannot follow the theme:
    // the green IS the recognition cue, and a champagne WhatsApp button is
    // not a WhatsApp button. But the SHADE still has to be legible, and
    // chrome.css had pinned a deepened #076046 chosen against a near-white
    // page — which measured about 1.5:1 once the ground went to midnight.
    // Same solve as --brand-text: keep the hue, move it until it clears AA
    // on whatever ground the theme picked. darkenToContrast already mixes
    // toward white on a dark ground and toward black on a light one.
    var waRgb = [37, 211, 102];
    set('--wa', '#25D366');
    // Solved at 5:1 rather than 4.5. This label sits on a button that tints
    // its OWN background with the same green, so the surface it lands on is
    // a step further from the pane the solve measures against. Measured at
    // 4.42:1 with a 4.5 target — passing the solve and failing the page.
    set('--wa-text', contrastRgb(waRgb, deepest) >= 5
      ? '#25D366'
      : hex(darkenToContrast(waRgb, deepest, 5)));

    // Text on the brand fill flips to dark when the brand is light.
    //
    // The fallback used to be `t.ink`, which is right only while the ink is
    // dark — i.e. only on a light theme. Give it a light brand on a dark
    // ground (champagne on midnight, which is now the default) and it put
    // near-white text on a near-white button at about 1.8:1. The dark option
    // has to be the GROUND, which is dark exactly when the ink is light.
    set('--brand-ink', contrast(t.brand, '#FFFFFF') >= 4.5 ? '#FFFFFF' : t.base);

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
    else if (!l) apply(PRESETS.twilight);
  }

  /* Saved looks. Kept in the same admin_settings row family as the theme so
     one place holds everything the panel can restore. */
  async function pullLooks() {
    if (typeof sbR !== 'function') return [];
    try {
      var rows = await sbR('/rest/v1/admin_settings?key=eq.site_looks&select=value');
      if (rows && rows.length && rows[0].value) return JSON.parse(rows[0].value) || [];
    } catch (e) {}
    try { return JSON.parse(localStorage.getItem('nmb_looks_v1') || '[]'); } catch (e) { return []; }
  }

  async function saveLook(name, theme) {
    var looks = await pullLooks();
    looks = looks.filter(function (l) { return l.name !== name; });
    looks.push({ name: name, theme: theme, at: new Date().toISOString() });
    try { localStorage.setItem('nmb_looks_v1', JSON.stringify(looks)); } catch (e) {}
    if (typeof sbW !== 'function') return looks;
    var payload = { value: JSON.stringify(looks), updated_at: new Date().toISOString() };
    var ok = await sbW('/rest/v1/admin_settings?key=eq.site_looks', payload, 'PATCH');
    if (!ok) await sbW('/rest/v1/admin_settings', { key: 'site_looks', value: payload.value });
    return looks;
  }

  async function deleteLook(name) {
    var looks = (await pullLooks()).filter(function (l) { return l.name !== name; });
    try { localStorage.setItem('nmb_looks_v1', JSON.stringify(looks)); } catch (e) {}
    if (typeof sbW === 'function') {
      await sbW('/rest/v1/admin_settings?key=eq.site_looks',
        { value: JSON.stringify(looks), updated_at: new Date().toISOString() }, 'PATCH');
    }
    return looks;
  }

  root.Theme = {
    pullLooks: pullLooks, saveLook: saveLook, deleteLook: deleteLook,
    SCHEMA: SCHEMA, PRESETS: PRESETS, PAIRS: PAIRS,
    apply: apply, audit: audit, contrast: contrast,
    pull: pull, push: push, init: init,
    get: function () { return Object.assign({}, PRESETS.twilight, current || local() || {}); },
    reset: function () { try { localStorage.removeItem(LS_KEY); } catch (e) {} apply(PRESETS.twilight); },
  };
})(window);
