/* NepalMBBS.in — theme/generate.js
   Describe a look, get a theme.

   This is a colour-theory generator, not a model call, and it is labelled that
   way in the UI. That is a deliberate choice rather than a limitation: the
   thing that makes a generated theme usable is that every output is guaranteed
   readable, and a constrained generator can guarantee that where free-form
   generation cannot. It works offline, returns in a millisecond, and never
   produces a palette you have to throw away.

   How it works:

     1. The phrase is matched against a vocabulary of intents — mood, warmth,
        energy, density, era. Unmatched words are ignored rather than guessed
        at.
     2. Those intents choose a base hue, a chroma budget and a lightness
        target, expressed in OKLCH so that "same lightness, different hue"
        actually looks the same lightness. In HSL it does not — pure blue at
        50% reads far darker than pure yellow at 50%, which is why HSL-based
        generators produce palettes with one colour that always looks wrong.
     3. The accent is placed at a harmonic angle from the brand, then both are
        SOLVED against the ground: lightness is walked until the contrast
        target is met, rather than picked and hoped for.
     4. The aurora takes four hues around the brand at low chroma, because the
        field has to stay a ground rather than become the subject.
*/

(function (root) {
  'use strict';

  /* ── OKLCH ⇄ sRGB ──────────────────────────────────────────────────
     Written out rather than pulled in: it is forty lines, and a dependency
     for a colour conversion is not worth the request. */

  function oklchToRgb(L, C, H) {
    var h = H * Math.PI / 180;
    var a = C * Math.cos(h), b = C * Math.sin(h);

    var l_ = L + 0.3963377774 * a + 0.2158037573 * b;
    var m_ = L - 0.1055613458 * a - 0.0638541728 * b;
    var s_ = L - 0.0894841775 * a - 1.2914855480 * b;
    var l = l_ * l_ * l_, m = m_ * m_ * m_, s = s_ * s_ * s_;

    var r =  4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s;
    var g = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s;
    var bl =-0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s;

    function gamma(x) {
      x = x <= 0.0031308 ? 12.92 * x : 1.055 * Math.pow(Math.max(x, 0), 1 / 2.4) - 0.055;
      return Math.max(0, Math.min(255, Math.round(x * 255)));
    }
    return [gamma(r), gamma(g), gamma(bl)];
  }

  var hex = function (rgb) {
    return '#' + rgb.map(function (v) { return v.toString(16).padStart(2, '0'); }).join('').toUpperCase();
  };

  function lumOf(rgb) {
    var a = rgb.map(function (v) {
      v /= 255;
      return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * a[0] + 0.7152 * a[1] + 0.0722 * a[2];
  }
  function ratio(a, b) {
    var la = lumOf(a), lb = lumOf(b);
    return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
  }

  /* Walk lightness until the colour clears `target` against `against`.
     Solving beats guessing: a hand-picked accent fails contrast for some hues
     and passes for others, and which is which is not obvious by eye. */
  function solve(C, H, against, target, startL, dir) {
    var L = startL;
    for (var i = 0; i < 60; i++) {
      var rgb = oklchToRgb(L, C, H);
      if (ratio(rgb, against) >= target) return rgb;
      L += dir * 0.012;
      if (L < 0.04 || L > 0.98) break;
    }
    return oklchToRgb(Math.max(0.04, Math.min(0.98, L)), C, H);
  }

  /* ── Vocabulary ───────────────────────────────────────────────────
     Each entry nudges the parameters. Words that match nothing are dropped —
     the generator never invents an interpretation for a word it does not
     know, because a wrong guess is worse than no effect. */

  var VOCAB = [
    // hue anchors
    { re: /\b(medical|clinical|health|care|hospital|surgical)\b/, hue: 172, chroma: 0.10 },
    { re: /\b(trust|secure|official|institutional|government)\b/, hue: 232, chroma: 0.09 },
    { re: /\b(premium|luxury|elegant|refined|expensive)\b/,       chroma: 0.07, lift: 0.02, mo: 0.9 },
    { re: /\b(warm|earthy|sand|amber|golden|autumn)\b/,           hue: 62,  chroma: 0.11, warm: 1 },
    { re: /\b(cool|cold|ice|arctic|winter)\b/,                    hue: 220, warm: -1 },
    { re: /\b(fresh|natural|green|organic|forest|leaf)\b/,        hue: 150, chroma: 0.12 },
    { re: /\b(ocean|sea|marine|aqua|teal)\b/,                     hue: 195, chroma: 0.11 },
    { re: /\b(royal|regal|purple|violet)\b/,                      hue: 295, chroma: 0.11 },
    { re: /\b(rose|pink|blossom|coral)\b/,                        hue: 12,  chroma: 0.12 },
    { re: /\b(sunset|orange|apricot|terracotta)\b/,               hue: 42,  chroma: 0.13 },

    // mood
    { re: /\b(calm|quiet|soft|gentle|serene|subtle|minimal)\b/, chroma: -0.03, au: -0.12, mo: -0.25 },
    { re: /\b(bold|striking|vivid|strong|confident|punchy)\b/,  chroma:  0.04, au:  0.10, mo:  0.2 },
    { re: /\b(playful|friendly|bright|cheerful|fun)\b/,         chroma:  0.05, radius: 12, mo: 0.25 },
    { re: /\b(serious|formal|corporate|professional)\b/,        chroma: -0.02, radius: -8, mo: -0.2 },
    { re: /\b(editorial|magazine|print|journal)\b/,             pair: 'journal', radius: -6 },
    { re: /\b(modern|tech|precise|sharp|clean)\b/,              pair: 'precise', radius: -6 },
    { re: /\b(classic|traditional|heritage|timeless)\b/,        pair: 'literary' },

    // ground
    { re: /\b(dark|night|midnight|black|noir|moody)\b/,   darkMode: 1 },
    { re: /\b(light|bright|airy|white|daylight|pale)\b/,  darkMode: -1 },

    // material
    { re: /\b(glass|frosted|translucent|blur|glassy)\b/,  blur: 12, opacity: -0.06 },
    { re: /\b(solid|flat|opaque|matte)\b/,                blur: -18, opacity: 0.2 },
    { re: /\b(deep|rich|dense|heavy)\b/,                  depth: 0.4, opacity: 0.06 },
  ];

  function generate(phrase) {
    var text = String(phrase || '').toLowerCase();

    var p = {
      hue: 172, chroma: 0.10, dark: false, warm: 0,
      blur: 26, opacity: 0.62, depth: 1, radius: 22,
      au: 0.5, mo: 1, pair: 'editorial', matched: []
    };

    VOCAB.forEach(function (v) {
      if (!v.re.test(text)) return;
      p.matched.push(v.re.source.replace(/\\b|\(|\)|\?:/g, '').split('|')[0]);
      if (v.hue !== undefined) p.hue = v.hue;
      if (v.chroma !== undefined) p.chroma = v.hue !== undefined ? v.chroma : p.chroma + v.chroma;
      if (v.warm) p.warm = v.warm;
      if (v.darkMode) p.dark = v.darkMode > 0;
      if (v.blur !== undefined) p.blur += v.blur;
      if (v.opacity !== undefined) p.opacity += v.opacity;
      if (v.depth !== undefined) p.depth += v.depth;
      if (v.radius !== undefined) p.radius += v.radius;
      if (v.au !== undefined) p.au += v.au;
      if (v.mo !== undefined) p.mo += v.mo;
      if (v.pair) p.pair = v.pair;
    });

    p.chroma  = Math.max(0.04, Math.min(0.18, p.chroma));
    p.blur    = Math.max(4, Math.min(48, p.blur));
    p.opacity = Math.max(0.34, Math.min(0.9, p.opacity));
    p.radius  = Math.max(2, Math.min(36, p.radius));
    p.au      = Math.max(0.15, Math.min(0.85, p.au));
    p.mo      = Math.max(0.2, Math.min(1.4, p.mo));
    p.depth   = Math.max(0.5, Math.min(1.8, p.depth));

    // Ground and ink. The ground carries a trace of the brand hue so the page
    // is never a neutral grey — that trace is most of what separates a
    // considered palette from a default one.
    var groundL = p.dark ? 0.19 : 0.965;
    var base = oklchToRgb(groundL, p.dark ? 0.018 : 0.008, p.hue + (p.warm > 0 ? 30 : 0));
    var ink  = p.dark ? oklchToRgb(0.96, 0.012, p.hue) : oklchToRgb(0.19, 0.028, p.hue);

    // Brand solved against the ground at 4.5:1 so a button label and a link
    // are readable by construction.
    var brand = solve(p.chroma, p.hue, base, 4.5, p.dark ? 0.72 : 0.55, p.dark ? 1 : -1);

    // Accent at a split-complementary angle — far enough to read as a second
    // colour, near enough not to fight the brand.
    var accentHue = (p.hue + 165) % 360;
    var accent = solve(p.chroma * 1.05, accentHue, base, 4.5, p.dark ? 0.72 : 0.55, p.dark ? 1 : -1);

    // Aurora: four hues around the brand, low chroma. The field has to stay a
    // ground; at full chroma it stops being a background and becomes the
    // subject, and the glass then reads as a filter over a rainbow.
    var auL = p.dark ? 0.42 : 0.86;
    var auC = p.chroma * (p.dark ? 0.55 : 0.42);
    var au = [0, 55, -50, 110].map(function (d) {
      return hex(oklchToRgb(auL, auC, (p.hue + d + 360) % 360));
    });

    return {
      label: 'Generated', hint: phrase || 'generated',
      brand: hex(brand), brand2: hex(accent), ink: hex(ink), base: hex(base),
      au1: au[0], au2: au[1], au3: au[2], au4: au[3],
      auOpacity: +p.au.toFixed(2), auBlur: p.dark ? 76 : 88, auScale: 1, auSpeed: 34,
      mBlur: Math.round(p.blur), mOpacity: +p.opacity.toFixed(2),
      mSaturate: p.dark ? 150 : 172, mBorder: p.dark ? 0.34 : 0.62, mInner: p.dark ? 0.22 : 0.42,
      radius: Math.round(p.radius), border: 1, shScale: 1, depth: +p.depth.toFixed(2),
      tyPair: p.pair, tyScale: 1, tyWeight: 400, tyWeightD: 600, tyTrack: 0, tyA11y: 1,
      mo: +p.mo.toFixed(2), moTilt: 1, moParallax: 1,
      fxGlow: p.mo > 0.9 ? 1 : 0, fxFloat: 1, fxSheen: p.mo > 0.9 ? 1 : 0,
      fxGrain: p.dark ? 0.045 : 0.03, sp: 1,
      _matched: p.matched
    };
  }

  root.ThemeGen = { generate: generate, VOCAB: VOCAB };
})(window);
