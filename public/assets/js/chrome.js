/* NepalMBBS.in — chrome.js
   Reveals the owner's controls only to the owner.

   Two things are gated here on the same rule: the admin panel button, and
   the Appearance (theme) control in the navbar.

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

   The Appearance control was briefly public. That was wrong: the panel
   changes the site's own palette, type and motion, and those are the owner's
   decisions about their brand, not a per-visitor preference. A visitor
   pushing the brand colour somewhere else is not a threat — the panel writes
   only to their own localStorage — but it is a control that does not belong
   in a family's way while they are researching a medical degree. It follows
   the admin rule now, so the owner sees it everywhere they are signed in,
   and from #admin in a signed-out browser.

   Never removes either control from the DOM, and never disables them: a
   change here must not be able to lock an owner out of their own panel. */

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
    var on = wanted();

    var el = document.querySelector('.admin-access-btn');
    if (el) el.classList.toggle('admin-access-btn--shown', on);

    // The theme control. Hidden by default in CSS, so a visitor never sees
    // it even for the frame before this runs.
    var t = document.getElementById('theme-toggle');
    if (t) {
      t.classList.toggle('theme-toggle--shown', on);
      // Keep it out of the tab order while hidden, or a keyboard visitor
      // lands on a control they cannot see.
      if (on) t.removeAttribute('tabindex');
      else t.setAttribute('tabindex', '-1');
    }
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
