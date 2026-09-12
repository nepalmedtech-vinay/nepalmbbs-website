// NepalMBBS.in — college-video.js
//
// Connects a college's own detail page to its real video record, if it has
// one — the same site_videos table /videos already reads, filtered to just
// this college's category (src/data/video-categories.json). Mirrors
// college-photo.js's own rule: renders only what is real. A college with a
// real, active video gets it, featured, exactly as /videos would show it. A
// college with none — which, as of this pass, is every college, since no
// video has been filed under any category yet — gets an explicit, honest
// "no video on file yet" state with a link into the fuller library, never a
// stock clip or a silent gap pretending nothing is missing here.
//
// Depends on sbR() (config.js) and vidCardHTML() (colleges.js), both loaded
// earlier in GlassLayout's script order.
(function () {
  function showEmpty(el, name, category) {
    el.innerHTML = '';
    const wrap = document.createElement('div');
    wrap.className = 'doc-empty';
    const title = document.createElement('p');
    title.className = 'doc-empty-title';
    title.textContent = 'No video on file yet for ' + name;
    const body = document.createElement('p');
    body.className = 'doc-empty-body';
    body.textContent = 'We publish footage only when we have filmed it ourselves or the college has supplied it.';
    const link = document.createElement('a');
    link.href = category ? ('/videos?college=' + encodeURIComponent(category)) : '/videos';
    link.className = 'college-link';
    link.style.cssText = 'margin-top:10px;display:inline-block';
    link.textContent = 'Browse the full video library →';
    wrap.append(title, body, link);
    el.appendChild(wrap);
    el.hidden = false;
  }

  async function run() {
    const el = document.getElementById('college-video');
    if (!el) return;
    const category = el.dataset.videoCategory || '';
    const name = el.dataset.collegeName || 'this college';

    if (!category || typeof sbR !== 'function' || typeof vidCardHTML !== 'function') {
      showEmpty(el, name, category);
      return;
    }

    try {
      const vids = await sbR(
        '/rest/v1/site_videos?select=*&category=eq.' + encodeURIComponent(category) +
        '&is_active=eq.true&order=sort_order.asc,created_at.asc'
      );
      if (Array.isArray(vids) && vids.length) {
        // Media-readiness follow-up: an explicit featured=true row leads,
        // same as /videos itself now does — sort_order still decides ties.
        const ordered = vids.slice().sort((a, b) => (b.featured ? 1 : 0) - (a.featured ? 1 : 0));
        el.innerHTML = '<div class="vid-featured">' + vidCardHTML(ordered[0], true) + '</div>';
        if (vids.length > 1) {
          const more = document.createElement('a');
          more.href = '/videos?college=' + encodeURIComponent(category);
          more.className = 'college-link';
          more.style.cssText = 'margin-top:14px;display:inline-block';
          more.textContent = 'Watch ' + (vids.length - 1) + ' more from ' + name + ' →';
          el.appendChild(more);
        }
        el.hidden = false;
      } else {
        showEmpty(el, name, category);
      }
    } catch (e) {
      showEmpty(el, name, category);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', run);
  } else {
    run();
  }
})();
