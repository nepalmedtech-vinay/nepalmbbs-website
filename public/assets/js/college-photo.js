// NepalMBBS.in — college-photo.js
//
// Renders a real college photo IF a staff member has uploaded one (Phase 4's
// photo-upload system, supabase/migrations/0006). Runs only on a college page
// that carries a #college-photo placeholder with a data-college-slug. Finds
// nothing, changes nothing: the element stays hidden and the page's existing
// non-photographic treatment is what the visitor sees — same as before this
// file existed. There is no path here that invents or guesses an image.
(function () {
  async function run() {
    const el = document.getElementById('college-photo');
    if (!el) return;
    const slug = el.dataset.collegeSlug;
    if (!slug || typeof sbStorageList !== 'function') return;

    const files = await sbStorageList('college-photos', slug + '/');
    if (!Array.isArray(files) || !files.length) return;

    const img = document.createElement('img');
    img.src = sbPublicUrl('college-photos', slug + '/' + files[0].name);
    img.alt = '';
    img.loading = 'eager';
    img.decoding = 'async';
    // If the object list says a file exists but it fails to actually load
    // (deleted between the two requests, a transient network error), leave
    // the placeholder hidden rather than showing a broken image icon.
    img.addEventListener('error', () => { el.hidden = true; el.textContent = ''; });
    el.appendChild(img);
    el.hidden = false;
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', run);
  } else {
    run();
  }
})();
