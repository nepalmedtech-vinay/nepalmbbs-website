/* NepalMBBS.in — live.js
   The dynamic layer: content the owner can change without a redeploy.

   Why this exists, and why it is deliberately small
   ------------------------------------------------
   The site has two content paths on purpose, and it is worth being clear
   about which is which before adding to either.

   BUILD TIME. `src/lib/colleges.js` merges `site_colleges` onto the committed
   colleges.json when the site is built. That is where facts live: seat
   counts, affiliation, recognition. A figure that decides where somebody
   spends five and a half years should pass through a build, where the verify
   suite and a person both get a look at it before a visitor does.

   RUNTIME. This file. Photos, videos and notices, read from Supabase by the
   browser on page load. A notice that a counselling date has moved is
   worthless if it waits for a deploy, and a campus photo is not a claim that
   needs a review step.

   The split is the whole design. Nothing in this file can change a seat
   count, a recognition status or a source line. If a future change makes it
   possible to, that is the moment to stop and reconsider, not a convenience
   to add.

   Three rules it holds to:

     1. Failure is silent and total. The site is built to work with no
        network — the build itself is. If Supabase is unreachable, slow, or
        the tables do not exist yet, every function here does nothing and the
        statically-rendered page stands on its own. There is no spinner, no
        error box, and no layout that reserves space for content that may
        never come.

     2. Nothing is written with innerHTML. Every value here was typed by a
        member of staff into an admin field, which is a smaller threat than
        the open internet but is not zero — a compromised staff account
        should not become stored XSS on 27 college pages. Text goes in with
        textContent and attributes through setAttribute, so there is no
        parse step to exploit.

     3. Only http(s) URLs are ever put in an href or src. `javascript:` in a
        link is the other half of the same problem.

   CSP: no inline handlers, no eval, no injected <script>. Everything is
   addEventListener on nodes this file created. */

(function () {
  'use strict';

  /* ── plumbing ─────────────────────────────────────────────────────────── */

  // config.js defines SB and AK, and sbHeaders() adds the signed-in staff JWT
  // when there is one. Reusing them means a signed-in owner previewing the
  // site reads through their own policies, and a visitor reads as anon.
  function ready() {
    return typeof SB === 'string' && SB && typeof sbHeaders === 'function';
  }

  function get(path) {
    if (!ready()) return Promise.resolve([]);
    return fetch(SB + path, { headers: sbHeaders(), signal: AbortSignal.timeout(8000) })
      .then(function (r) { return r.ok ? r.json() : []; })
      .then(function (rows) { return Array.isArray(rows) ? rows : []; })
      .catch(function () { return []; });
  }

  // A URL is only allowed into the document if it is http(s). Anything else —
  // javascript:, data:, a relative path that is really a protocol — is
  // dropped rather than sanitised, because a link the owner cannot see is
  // better than one that runs.
  function safeUrl(u) {
    if (!u) return null;
    try {
      var parsed = new URL(u, location.origin);
      return (parsed.protocol === 'http:' || parsed.protocol === 'https:') ? parsed.href : null;
    } catch (e) { return null; }
  }

  // Public storage object -> its public URL.
  function mediaUrl(row) {
    if (row.external_url) return safeUrl(row.external_url);
    if (!row.storage_path) return null;
    return safeUrl(SB + '/storage/v1/object/public/media/' +
      String(row.storage_path).split('/').map(encodeURIComponent).join('/'));
  }

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = String(text);
    return n;
  }

  /* ── notices ──────────────────────────────────────────────────────────── */

  /* The policy already filters by published and by the start/end window, so
     this asks for what it wants and trusts the database to withhold the rest.
     Doing the window check here as well would look more careful and would
     mean the rule lived in two places, one of which anybody can edit. */
  function renderNotices(host, slug) {
    var q = '/rest/v1/college_notices?select=title,body,level,link_url,link_label' +
            '&order=starts_at.desc&limit=4&college_slug=' +
            (slug ? 'eq.' + encodeURIComponent(slug) : 'is.null');

    get(q).then(function (rows) {
      if (!rows.length) return;              // nothing to say, so say nothing

      rows.forEach(function (row) {
        var lvl = ['info', 'provisional', 'caution'].indexOf(row.level) !== -1 ? row.level : 'info';
        var box = el('div', 'live-notice live-notice--' + lvl);

        box.appendChild(el('strong', 'live-notice-title', row.title));
        if (row.body) box.appendChild(el('p', 'live-notice-body', row.body));

        var href = safeUrl(row.link_url);
        if (href) {
          var a = el('a', 'live-notice-link', row.link_label || 'Read more');
          a.setAttribute('href', href);
          if (new URL(href).origin !== location.origin) {
            a.setAttribute('target', '_blank');
            a.setAttribute('rel', 'noopener');
          }
          box.appendChild(a);
        }
        host.appendChild(box);
      });

      // Revealed only once it has something in it, so an empty container
      // never occupies space or shifts the layout after paint.
      host.hidden = false;
    });
  }

  /* ── college media ────────────────────────────────────────────────────── */

  function renderMedia(host, slug) {
    var q = '/rest/v1/college_media?select=kind,storage_path,external_url,caption,credit' +
            '&order=sort_order.asc&college_slug=eq.' + encodeURIComponent(slug);

    get(q).then(function (rows) {
      var items = rows.map(function (r) { return { row: r, url: mediaUrl(r) }; })
                      .filter(function (i) { return i.url; });
      if (!items.length) return;

      var head = el('div', 'doc-head');
      head.appendChild(el('h2', 'doc-title', 'Photos and video'));
      head.appendChild(el('span', 'doc-kicker',
        items.length + (items.length === 1 ? ' item' : ' items')));
      host.appendChild(head);

      var body = el('div', 'doc-body');
      var grid = el('div', 'live-media');

      items.forEach(function (item) {
        var fig = el('figure', 'live-media-item');

        if (item.row.kind === 'video') {
          // Not an auto-playing embed. A link out is honest about leaving the
          // site and costs no third-party frame on a page a family is
          // reading, which is also what keeps the CSP as tight as it is.
          var a = el('a', 'live-media-video', item.row.caption || 'Watch video');
          a.setAttribute('href', item.url);
          a.setAttribute('target', '_blank');
          a.setAttribute('rel', 'noopener');
          fig.appendChild(a);
        } else {
          var img = el('img', 'live-media-img');
          img.setAttribute('src', item.url);
          img.setAttribute('loading', 'lazy');
          img.setAttribute('decoding', 'async');
          // Alt text is the caption when there is one. An empty alt is
          // correct for a decorative image and wrong for a campus photo, so
          // a missing caption falls back to naming what it is.
          img.setAttribute('alt', item.row.caption || 'Photograph supplied for this college');
          fig.appendChild(img);
        }

        if (item.row.caption || item.row.credit) {
          var cap = el('figcaption', 'live-media-cap');
          if (item.row.caption) cap.appendChild(el('span', null, item.row.caption));
          // The credit is the site keeping its own rule: it says where a
          // picture came from, the same way every fact says where it came
          // from.
          if (item.row.credit) cap.appendChild(el('span', 'live-media-credit', item.row.credit));
          fig.appendChild(cap);
        }

        grid.appendChild(fig);
      });

      body.appendChild(grid);
      host.appendChild(body);
      host.hidden = false;
    });
  }

  /* ── mount ────────────────────────────────────────────────────────────── */

  function mount() {
    var notices = document.getElementById('live-notices');
    if (notices) renderNotices(notices, notices.getAttribute('data-college') || null);

    var media = document.getElementById('live-media');
    if (media) {
      var slug = media.getAttribute('data-college');
      if (slug) renderMedia(media, slug);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mount, { once: true });
  } else {
    mount();
  }
})();
