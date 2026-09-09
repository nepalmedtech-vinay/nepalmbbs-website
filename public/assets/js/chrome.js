/* NepalMBBS.in — chrome.js
   Reveals the admin entry point only to people who need it.

   The admin button was a fixed pill in the corner of every public page. It
   told every visitor the site has an admin panel and where it is, and it sat
   in the corner of every screenshot and every phone view. RLS is what
   actually protects the data, so this was never the security boundary — but
   advertising the door on an admissions site read as unfinished, and it was
   the first thing in the bottom-left of the page.

   It is hidden by default now, and revealed when either is true:

     1. Someone already has a Supabase session — staff who signed in earlier
        see their own way back in, with no extra step.
     2. The URL carries #admin (or ?admin). This is the deliberate way in
        from a signed-out browser: https://nepalmbbs.in/#admin

   Deliberately NOT a secret: #admin is a convenience, not a lock. Anyone can
   guess it, and that is fine — the sign-in form and the database policies are
   what refuse them. The point is to stop showing the door to families
   researching a medical degree, not to hide it from an attacker.

   Never removes the button from the DOM, and never disables it: a change here
   must not be able to lock an owner out of their own panel. */

(function () {
  'use strict';

  function wanted() {
    try {
      if (location.hash.toLowerCase().indexOf('admin') !== -1) return true;
      if (/[?&]admin\b/i.test(location.search)) return true;
    } catch (e) {}
    try {
      return !!(window.Auth && window.Auth.isSignedIn);
    } catch (e) { return false; }
  }

  function apply() {
    var el = document.querySelector('.admin-access-btn');
    if (!el) return;
    el.classList.toggle('admin-access-btn--shown', wanted());
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', apply, { once: true });
  } else {
    apply();
  }

  // auth.js announces sign-in and sign-out; follow it so the button appears
  // the moment a session exists and goes away again on sign-out.
  window.addEventListener('authchange', apply);
  window.addEventListener('hashchange', apply);
})();


/* ── Broken-image fallback ────────────────────────────────────────────────
   Every photograph on the site is hotlinked from Unsplash (CSP's img-src
   only allows images.unsplash.com beyond 'self') — a third-party CDN this
   site does not control. A photo ID going dead, a network hiccup, or a
   visitor's ad-blocker treating an image host as trackable is not this
   site's bug to prevent, but a broken-image glyph sitting in a card is
   still the wrong thing for a visitor to see. `error` does not bubble, so
   this listens on the capture phase at the document root instead of
   wiring a handler onto every <img> — one listener covers every image on
   every page, including ones added later.

   Never removes the surrounding card or its text — only the broken <img>
   itself, replaced by the tokened gradient the design system already uses
   for empty imagery elsewhere, so a dead photo degrades to "considered
   placeholder" rather than "obviously missing asset". */
(function () {
  'use strict';
  document.addEventListener('error', function (e) {
    var img = e.target;
    if (!img || img.tagName !== 'IMG' || img.dataset.fallbackApplied) return;
    img.dataset.fallbackApplied = '1';
    img.classList.add('img-broken');
  }, true);
})();
