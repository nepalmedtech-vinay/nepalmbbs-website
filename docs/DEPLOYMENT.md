# Deployment — Phase 2

**Nothing has been deployed. Production still serves the old single-page build.**
This describes how to switch when you decide to, and what to check first.

---

## What changed

The site went from one hand-edited `index.html` to an Astro build that emits 37
pages. Netlify runs `npm run build` and publishes `dist/`.

`legacy/index.html` is the previous single-page build, kept in the repository as
a readable reference. It is not served. The real rollback point is the git tag
`phase1-static-rollback`.

---

## Before connecting the repository

The current live site is deployed from a **different Netlify account** than the
one available during this work, so its build settings could not be inspected.
Check these in the Netlify UI before connecting:

1. **Existing build settings.** `netlify.toml` overrides anything configured in
   the UI. If the site has a build command, publish directory, or header rules
   set there, note them first — connecting this repository replaces them.
2. **Domain and DNS.** `nepalmbbs.in` uses Netlify DNS (`dns1-4.p04.nsone.net`).
   Do not change nameservers.
3. **Environment variables.** Optional, see below.

---

## Deploy sequence — preview first

```bash
npm ci
npm run build          # must print "37 page(s) built"
npm test               # must print "98/98 passed"
```

Then:

1. Push the branch. **Do not** point production at it yet.
2. In Netlify, create a **branch deploy** or **deploy preview** for
   `phase2/build-architecture`.
3. Walk the preview and check, on a phone as well as a desktop:
   - every route in the map below loads
   - the lead form submits and the lead appears in Supabase
   - WhatsApp, Calendly and the chat widget work
   - EN/HI switching works on a sub-page, not just the home page
   - the admin panel opens and saves a setting
   - `/wrc-tracker/` and `/cmc-tracker/` still work
4. Only then switch production.

After switching, request indexing for `https://nepalmbbs.in/sitemap-index.xml`
in Google Search Console.

---

## Environment variables (optional)

Without these the build uses `src/data/colleges.json`, which is committed and
complete. Set them only if you want the admin panel's `site_colleges` table to
feed the build:

| Variable | Value |
|---|---|
| `SUPABASE_URL` | `https://fpzgcijbryvddtpegcmm.supabase.co` |
| `SUPABASE_ANON_KEY` | the anon key already public in the page |

The merge is one-directional — Supabase can override a field or add a college,
never remove one. An empty, unreachable, or RLS-blocked table falls back to the
committed data rather than deleting 27 pages from the sitemap.

Because these are read at **build** time, a change in the admin panel does not
appear on the site until the next deploy. Trigger a Netlify build hook from the
admin panel later if that becomes annoying.

---

## SEO: what is and is not at risk

**Not at risk.** Every URL the site has ever had still resolves. All content
lived at `/`, and `/` is still the home page. No redirects are needed, and
nothing can 404 — the usual danger in a restructure does not apply here.

**The actual change** is that nine sections which search engines could never
reach — they were `onclick` handlers, not links — are now crawlable URLs with
their own titles, descriptions and canonicals, plus 27 college pages that did
not exist as URLs at all.

**Expect a lag.** New URLs take roughly 4–8 weeks to establish. Do not read the
first fortnight as a regression.

---

## Caching

`netlify.toml` sets two different policies on purpose:

- `/_assets/*` — emitted by Astro with a content hash, so `immutable` is safe.
- `/assets/css/*`, `/assets/js/*` — hand-maintained, stable filenames. These
  **must revalidate**. A long `max-age` here would strand visitors on an old
  stylesheet after every deploy, which is the same failure mode as the stray
  root service worker fixed in Phase 0.
- `/sw.js` — never cached. It is the self-unregistering worker that flushes
  visitors still holding the old root-scope registration.

---

## Rollback

```bash
git checkout phase1-static-rollback
```

That tag is the last commit before the build system, with the site as one
static `index.html` and no build step. In Netlify, clear the build command and
set the publish directory to the repository root.

Netlify's own "publish deploy" on a previous deploy is faster and does not
require a push — prefer that for an emergency.
