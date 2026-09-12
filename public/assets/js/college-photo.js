// NepalMBBS.in — college-photo.js
//
// Renders a real college photo IF a staff member has uploaded one (Phase 4's
// photo-upload system, supabase/migrations/0006). Runs only on a college page
// that carries a #college-photo placeholder with a data-college-slug. Finds
// nothing, changes nothing: the element stays hidden and the page's existing
// non-photographic treatment is what the visitor sees — same as before this
// file existed. There is no path here that invents or guesses an image.
//
// Media-readiness follow-up (2026-09-12): prefers site_photos' metadata row
// (migration 0008) for this college's hero photo when one exists, since that
// carries a real caption/alt text/rights status the raw Storage listing never
// could. Falls back to listing Storage directly — this file's entire
// original behaviour — for a photo uploaded before this metadata layer
// existed, or if the metadata fetch fails for any reason. Either path can
// render the photo; only the alt text/caption differ.
(function () {
  async function run() {
    const el = document.getElementById('college-photo');
    if (!el) return;
    const slug = el.dataset.collegeSlug;
    if (!slug || typeof sbStorageList !== 'function') return;

    let path = null;
    let alt = '';
    let caption = '';

    if (typeof sbR === 'function') {
      const rows = await sbR(
        '/rest/v1/site_photos?select=*&college_slug=eq.' + encodeURIComponent(slug) +
        '&category=eq.hero&kind=eq.hosted&is_active=eq.true&limit=1'
      );
      const row = Array.isArray(rows) && rows[0];
      if (row && row.storage_path) {
        path = row.storage_path;
        alt = row.alt_text || '';
        caption = row.caption || '';
      }
    }

    if (!path) {
      const files = await sbStorageList('college-photos', slug + '/');
      if (!Array.isArray(files) || !files.length) return;
      path = slug + '/' + files[0].name;
    }

    const img = document.createElement('img');
    img.src = sbPublicUrl('college-photos', path);
    img.alt = alt;
    img.loading = 'eager';
    img.decoding = 'async';
    // If Storage says a file exists but it fails to actually load (deleted
    // between the two requests, a transient network error), leave the
    // placeholder hidden rather than showing a broken image icon.
    img.addEventListener('error', () => { el.hidden = true; el.textContent = ''; });
    el.appendChild(img);
    if (caption) {
      const cap = document.createElement('p');
      cap.className = 'cph-caption';
      cap.textContent = caption;
      el.appendChild(cap);
    }
    el.hidden = false;
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', run);
  } else {
    run();
  }
})();
