/* NepalMBBS.in — theme/motion.js
   The behaviour scroll-driven CSS cannot express on its own.

   Deliberately small. Anything that CAN be a scroll timeline IS one, in
   motion.css, because those run off the main thread. What is left here needs
   pointer position or DOM work that CSS has no access to. */

(function () {
  'use strict';

  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  var scrollDriven = CSS.supports('animation-timeline: view()');

  /* ── Stagger indices ──────────────────────────────────────────────
     The CSS stagger reads --n per child. Setting it here keeps the markup
     clean — no hand-numbered inline styles to drift out of order. */

  document.querySelectorAll('.m-stagger').forEach(function (g) {
    [].forEach.call(g.children, function (c, i) { c.style.setProperty('--n', Math.min(i, 8)); });
  });

  /* ── Magnetic ─────────────────────────────────────────────────────
     Pointer-only. On touch there is no hover, and running this on touchmove
     would spend battery on an effect nobody can see. */

  if (fine && !reduce) {
    document.querySelectorAll('.m-magnet').forEach(function (el) {
      var raf = 0, x = 0, y = 0;
      var pull = parseFloat(el.dataset.pull || '0.28');

      el.addEventListener('pointermove', function (e) {
        var r = el.getBoundingClientRect();
        x = (e.clientX - (r.left + r.width / 2)) * pull;
        y = (e.clientY - (r.top + r.height / 2)) * pull;
        if (raf) return;
        raf = requestAnimationFrame(function () {
          raf = 0;
          el.style.setProperty('--mgx', x.toFixed(2));
          el.style.setProperty('--mgy', y.toFixed(2));
        });
      });

      el.addEventListener('pointerleave', function () {
        el.style.setProperty('--mgx', '0');
        el.style.setProperty('--mgy', '0');
      });
    });
  }

  /* ── Fallback reveals ─────────────────────────────────────────────
     Only for browsers without scroll timelines. Where they exist, adding an
     observer on top would animate the same elements twice. */

  if (!scrollDriven && !reduce && 'IntersectionObserver' in window) {
    var targets = document.querySelectorAll('.m-rise, .m-scale, .m-focus, .m-stagger > *');
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (!e.isIntersecting) return;
        e.target.classList.add('in');
        io.unobserve(e.target);
      });
    }, { threshold: 0.1, rootMargin: '0px 0px -8% 0px' });
    targets.forEach(function (t) { io.observe(t); });
  } else if (!scrollDriven) {
    document.querySelectorAll('.m-rise, .m-scale, .m-focus, .m-stagger > *')
      .forEach(function (t) { t.classList.add('in'); });
  }

  /* ── Aurora shader ────────────────────────────────────────────────
     Mounted last and entirely optional: the CSS field underneath is already
     painted, so a failure here costs nothing. */

  if (window.AuroraGL) window.AuroraGL.mount();

  /* ── Cross-document view transitions ──────────────────────────────
     Chrome drives these from CSS alone (@view-transition). This only guards
     the case the spec does not: a same-page anchor would otherwise trigger a
     full transition for a scroll. */

  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a[href^="#"]');
    if (!a) return;
    var id = a.getAttribute('href').slice(1);
    if (!id) return;
    var t = document.getElementById(id);
    if (!t) return;
    e.preventDefault();
    t.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
    // Move focus too, or a keyboard user is scrolled somewhere their tab
    // order has not followed.
    t.setAttribute('tabindex', '-1');
    t.focus({ preventScroll: true });
  });
})();
