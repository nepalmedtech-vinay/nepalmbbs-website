/* NepalMBBS.in — premium.js
   The three things the premium layer needs that CSS cannot do on its own.

   Deliberately small, and deliberately last in the load order. Everything
   here is an enhancement of something that already works: if this file never
   runs, the site loses a moving highlight, a current-page mark and a scroll
   affordance, and loses nothing else. Nothing here is required to read a
   page, submit the form or follow a link.

   No inline handlers — script-src carries no 'unsafe-inline'. */

(function () {
  'use strict';

  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

  /* ── 1. Where you are ─────────────────────────────────────────────
     switchTab() marks a section card as current, but only when it is called.
     On a normal page load nothing was marked, so the section index — which
     appears at the foot of every page and links to nine of them — never
     showed which of the nine you were reading. Same for the navbar.

     aria-current alongside the class, because the mark is information and a
     screen reader gets none of it from a background colour. */

  var here = location.pathname.replace(/\/+$/, '') || '/';

  document.querySelectorAll('.tab-card, #navbar .nl-btn, .mob-link').forEach(function (a) {
    var href = a.getAttribute('href');
    if (!href || href.charAt(0) !== '/') return;
    if ((href.replace(/\/+$/, '') || '/') !== here) return;
    a.classList.add('on');
    a.setAttribute('aria-current', 'page');
  });

  /* ── 2. The specular ──────────────────────────────────────────────
     glass.css already carries a pointer-following highlight, but only for
     .gl--live panes — which the legacy card families are not. Rather than
     re-classing several hundred cards across 44 routes, the same two custom
     properties are written here and premium.css draws the highlight.

     Pointer-only and rAF-throttled: on touch there is no hover, and running
     this on touchmove would spend battery on an effect nobody can see. */

  if (fine && !reduce) {
    var SEL = '.college-card, .why-card, .life-card, .off-card, .guide-card, .cx-card';
    var raf = 0, pending = null;

    document.addEventListener('pointermove', function (e) {
      var card = e.target.closest && e.target.closest(SEL);
      if (!card) return;
      pending = { card: card, x: e.clientX, y: e.clientY };
      if (raf) return;
      raf = requestAnimationFrame(function () {
        raf = 0;
        if (!pending) return;
        var r = pending.card.getBoundingClientRect();
        pending.card.style.setProperty('--px', (((pending.x - r.left) / r.width) * 100).toFixed(1) + '%');
        pending.card.style.setProperty('--py', (((pending.y - r.top) / r.height) * 100).toFixed(1) + '%');
        pending = null;
      });
    }, { passive: true });
  }

  /* ── 3. Tables that are wider than their column ───────────────────
     A comparison table at 390px is wider than the screen, and a table that
     overflows takes the whole page sideways with it — tests/audit.mjs
     measures exactly that. Wrapping is done here rather than in eleven page
     templates so a table added later is covered without anyone remembering.

     Only tables that are not already inside a scroller, and the wrapper is
     focusable with a label, or a keyboard user has no way to scroll it. */

  document.querySelectorAll('.compare-table, .doc-table').forEach(function (t) {
    if (t.closest('.pr-scroll')) return;
    var box = document.createElement('div');
    box.className = 'pr-scroll';
    box.setAttribute('tabindex', '0');
    box.setAttribute('role', 'region');
    var cap = t.querySelector('caption');
    box.setAttribute('aria-label', (cap && cap.textContent.trim()) || 'Comparison table, scrollable');
    t.parentNode.insertBefore(box, t);
    box.appendChild(t);
  });
})();
