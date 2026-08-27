/* NepalMBBS.in — theme/runtime.js
   Behaviour for the glass layer: scroll reveals, pointer tilt and specular,
   sticky nav state, stat counters.

   Everything here is additive. With this file blocked the page still renders
   complete and readable — nothing depends on JS to become visible, which is
   why the hidden states all live in keyframes with `backwards` fill rather
   than on the elements themselves. */

(function () {
  'use strict';

  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

  // Pull the saved theme and reconcile with the server.
  if (window.Theme) Theme.init();

  /* ── Scroll reveals ─────────────────────────────────────────────── */

  var reveals = document.querySelectorAll('.reveal');
  if (reduce || !('IntersectionObserver' in window)) {
    reveals.forEach(function (el) { el.classList.add('in'); });
  } else {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        e.target.classList.add('in');
        io.unobserve(e.target);
      });
    }, { threshold: 0.1, rootMargin: '0px 0px -6% 0px' });

    reveals.forEach(function (el) {
      // Stagger within a group of siblings only. A global index would make the
      // last element on a long page wait seconds before appearing.
      if (!el.style.getPropertyValue('--delay') && el.parentElement) {
        var sibs = [].slice.call(el.parentElement.children).filter(function (n) {
          return n.classList && n.classList.contains('reveal');
        });
        var i = sibs.indexOf(el);
        if (i > 0) el.style.setProperty('--delay', Math.min(i, 6) * 65 + 'ms');
      }
      io.observe(el);
    });
  }

  /* ── Pointer tilt + specular ────────────────────────────────────── */

  if (fine && !reduce) {
    document.querySelectorAll('.gl--live').forEach(function (el) {
      if (!el.querySelector('.gl-spec')) {
        var s = document.createElement('span');
        s.className = 'gl-spec';
        el.appendChild(s);
      }
      var raf = 0, gx = 0, gy = 0, px = 50, py = 50;
      el.addEventListener('pointermove', function (e) {
        var r = el.getBoundingClientRect();
        px = ((e.clientX - r.left) / r.width) * 100;
        py = ((e.clientY - r.top) / r.height) * 100;
        gx = (px - 50) / 50;
        gy = (py - 50) / 50;
        if (raf) return;
        // pointermove fires far faster than the compositor can use, so
        // coalesce to one style write per frame.
        raf = requestAnimationFrame(function () {
          raf = 0;
          el.style.setProperty('--gx', gx.toFixed(3));
          el.style.setProperty('--gy', gy.toFixed(3));
          el.style.setProperty('--px', px.toFixed(1) + '%');
          el.style.setProperty('--py', py.toFixed(1) + '%');
        });
      });
      el.addEventListener('pointerleave', function () {
        el.style.setProperty('--gx', '0');
        el.style.setProperty('--gy', '0');
      });
    });
  }

  /* ── Sticky nav ─────────────────────────────────────────────────── */

  var nav = document.querySelector('.gl-nav');
  if (nav) {
    var ticking = false;
    window.addEventListener('scroll', function () {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(function () {
        ticking = false;
        nav.classList.toggle('is-stuck', window.scrollY > 12);
      });
    }, { passive: true });
  }

  /* ── Counters ───────────────────────────────────────────────────── */

  var counters = document.querySelectorAll('[data-count]');
  if (counters.length) {
    if (reduce || !('IntersectionObserver' in window)) {
      counters.forEach(function (el) { el.textContent = el.dataset.count; });
    } else {
      var cio = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          if (!e.isIntersecting) return;
          cio.unobserve(e.target);
          var el = e.target, to = parseInt(el.dataset.count, 10) || 0, t0 = 0;
          (function tick(t) {
            if (!t0) t0 = t;
            var p = Math.min((t - t0) / 1100, 1);
            // Ease out, so the number settles rather than snapping — the last
            // digits reading as a stutter is what makes counters look cheap.
            el.textContent = Math.round(to * (1 - Math.pow(1 - p, 3)));
            if (p < 1) requestAnimationFrame(tick);
          })(performance.now());
        });
      }, { threshold: 0.4 });
      counters.forEach(function (el) { cio.observe(el); });
    }
  }

  /* ── Panel mount ────────────────────────────────────────────────── */

  var host = document.getElementById('theme-panel');
  var toggle = document.getElementById('theme-toggle');
  if (host && toggle && window.ThemePanel) {
    toggle.addEventListener('click', function () {
      var open = host.hasAttribute('hidden');
      if (open) {
        host.removeAttribute('hidden');
        ThemePanel.mount(host);
      } else {
        host.setAttribute('hidden', '');
      }
      toggle.setAttribute('aria-expanded', String(open));
    });
  }
})();
