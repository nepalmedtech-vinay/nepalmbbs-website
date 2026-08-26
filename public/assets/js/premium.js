// NepalMBBS.in — premium.js
// Runtime for the premium visual layer: scroll reveals and the cursor
// spotlight. Both are progressive — with this file blocked the page renders
// fully, just without the motion.

(function () {
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ── Scroll reveals ────────────────────────────────────────────────────
  // .pm-in starts at opacity 0, so if IntersectionObserver is unavailable or
  // the user asked for no motion, everything must be shown immediately rather
  // than left invisible. Failing open is not optional here — failing closed
  // means a blank page.
  var reveals = document.querySelectorAll('.pm-in');

  if (reduce || !('IntersectionObserver' in window)) {
    reveals.forEach(function (el) { el.style.opacity = '1'; });
  } else {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        e.target.classList.add('is-visible');
        io.unobserve(e.target);
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });

    reveals.forEach(function (el, i) {
      // Stagger only within a group of siblings; a global index would leave
      // the last element on a long page waiting seconds to appear.
      if (!el.style.getPropertyValue('--pm-delay')) {
        var sibs = el.parentElement ? [].slice.call(el.parentElement.children).filter(function (n) {
          return n.classList && n.classList.contains('pm-in');
        }) : [];
        var idx = sibs.indexOf(el);
        if (idx > 0) el.style.setProperty('--pm-delay', Math.min(idx, 6) * 70 + 'ms');
      }
      io.observe(el);
    });
  }

  // ── Cursor spotlight ──────────────────────────────────────────────────
  // Pointer-driven only. A touch device has no hover, and running this on
  // touchmove would cost battery for an effect nobody can see.
  if (!reduce && window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
    var surfaces = document.querySelectorAll('.pm-surface');
    surfaces.forEach(function (el) {
      var raf = 0, px = 0, py = 0;
      el.addEventListener('pointermove', function (e) {
        var r = el.getBoundingClientRect();
        px = ((e.clientX - r.left) / r.width) * 100;
        py = ((e.clientY - r.top) / r.height) * 100;
        if (raf) return;
        // Coalesce to one write per frame: pointermove fires far faster than
        // the compositor can use, and every write invalidates style.
        raf = requestAnimationFrame(function () {
          raf = 0;
          el.style.setProperty('--mx', px.toFixed(1) + '%');
          el.style.setProperty('--my', py.toFixed(1) + '%');
        });
      });
    });
  }
})();
