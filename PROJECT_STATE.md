# PROJECT_STATE.md

_Last updated: 2026-08-29 (chunk 7: page interiors), by an autonomous Claude Code session on
`redesign/premium-ecosystem`. Read this file first in any new session before
doing implementation work._

## What this project actually is

**Read this before assuming the site needs a ground-up redesign — it doesn't.**
`nepalmbbs.in` has already been through four prior autonomous development
phases (visible in `git log`, oldest first):

- **Phase 0** — closed a hardcoded admin-password backdoor, fixed a stray
  service worker, added a real robots.txt/sitemap foundation.
- **Phase 1** — extracted CSS/JS out of a single 1105-line `index.html`,
  added a design-token foundation, ran a full design-system audit
  (`docs/DESIGN-SYSTEM.md`).
- **Phase 2** — rebuilt the site as a 37→40-route Astro static build (one
  page per section instead of tab-panels), applied a real trust register,
  replaced stock-photo "campuses" with honest non-photographic treatments,
  added a generated-graphics visual system and a college map.
- **Phase 3/4** — built a full "luminous glass" theme engine (tokens,
  glassmorphism, WebGL aurora background, scroll-driven motion, view
  transitions), rolled it across all pages, added dark mode + a live theme
  generator + saved looks, then did a full security/platform pass: Supabase
  Auth replacing the client-side admin gate, RLS-backed admission-platform
  schema (leads → applications → counselor console → student portal), a
  real CSP with zero `unsafe-inline` on `script-src` (117+ inline handlers
  converted to a `data-act`/`data-do` dispatcher with an allowlist), a
  1140-item WCAG AA text-contrast fix, and a Core Web Vitals pass.

**Nothing on this branch is deployed.** Production (`nepalmbbs.in` on
Netlify) still serves the pre-Phase-2 static build. The owner unpublished
the live site specifically to allow further work without exposing it.
`docs/GOLIVE.md` is the ordered go-live runbook — read it before ever
suggesting a deploy or a database migration.

## Architecture snapshot

- **Framework:** Astro 7, static output (`output: 'static'`), 40 routes.
- **Styling:** hand-maintained CSS in `public/assets/css/` (legacy Phase-1
  layer) + `public/assets/theme/` (the live token/glass/motion engine —
  `engine.css`, `glass.css`, `motion.css`, `panel.css`, `bridge.css`,
  then `chrome.css` and `interiors.css` last, which finish the dark→light
  migration for the site chrome and for the page interiors respectively) + `public/assets/theme/*.js` (engine runtime, aurora WebGL
  background, theme generator, admin theme panel).
- **JS:** classic scripts (not modules) in `public/assets/js/` —
  `auth.js` (Supabase session), `admin.js` (admin panel), `actions.js`
  (the `data-act`/`data-do` CSP-safe event dispatcher), `leads.js`,
  `colleges.js`, `portal.js`, `staff.js`, `chatbot.js`, `i18n.js`
  (EN/HI), `navigation.js`, `effects.js`, `boot.js`.
- **Data:** `src/data/colleges.json` — 27 Nepali medical colleges,
  committed and build-time-authoritative. No `fees` field exists yet.
  Optionally overridable at build time from a Supabase `site_colleges`
  table (additive merge only — see `docs/DEPLOYMENT.md`).
- **Backend:** Supabase project `fpzgcijbryvddtpegcmm`. Migrations
  `0001`–`0005` in `supabase/migrations/`, applied in order, each with an
  `AFTER RUNNING` verification block. RLS-first: the database, not the
  UI, decides who sees what (`staff` table + `is_staff()`/`is_admin()`).
  Proven against a real Postgres via `supabase/test/` (not mocked).
- **Admin:** `src/components/AdminPanel.astro` + `public/assets/js/admin.js`
  — talks to Supabase Auth directly via REST (`auth.js`), signs requests
  with a real JWT, no client-side password gate. **Do not reintroduce a
  client-side auth check** — the whole point of the Phase-4 security pass
  was removing that class of bug.
- **Platform features already built:** counselor console (`/staff`),
  student portal (`/portal`, token-based, no login), lead→application
  conversion with auto-seeded follow-up task sequences, rate limiting,
  private document-storage bucket (upload URL exists; no upload UI yet —
  documented as deliberately unbuilt in `docs/GOLIVE.md`).
- **Two standalone legacy apps**, deliberately untouched, copied verbatim:
  `public/wrc-tracker/` and `public/cmc-tracker/`, each with their own
  relaxed CSP. `cmc-tracker` talks to a *different* Supabase project
  (`tgsiltcuisgejmdkovxz`) never audited here.
- **Testing:** `tests/*.mjs` (Playwright, launched against the pre-installed
  chromium at `/opt/pw-browsers/chromium-1194/chrome-linux/chrome`),
  `supabase/test/` (pgTAP-style SQL assertions), `tools/gen-csp.mjs`
  (regenerates `netlify.toml`'s CSP from the build — never hand-edit the
  generated block). `npm run verify` is the full gate and must be green
  before pushing, per `README.md`.
- **Rollback tags** (documented in `docs/GOLIVE.md`, restored this
  session after being found missing — see `DECISION_LOG.md`):
  `pre-phase0-baseline`, `phase1-static-rollback`, `phase2-rollback`,
  `pre-premium-rollback`, `pre-glass-rollback`.

## Real gaps against the master brief (verified by reading the code, not assumed)

- No side-by-side **college comparison** tool (§10.D of the brief) — only
  a heading that says "before you compare this list" on `/colleges`.
- No **fee/cost planner or calculator** (§10.E/§10.I) — `colleges.json` has
  no fee data at all. The only calculator is NEET-eligibility, not cost.
- No standalone **deadline center** or **document center** (§10.G/§10.H) as
  first-class pages — `guidelines.astro` and `admission-process.astro`
  partially cover adjacent ground at 71 and 44 lines respectively.
- No `CONTENT_SOURCE_LOG.md` — no per-claim source/URL/date-checked record
  exists yet for the 27 college profiles' seats/admission-route/affiliation
  claims. This is the biggest gap against the brief's zero-fabrication
  standard (§11) and should be treated as content-research work, not
  something to fill in by inference.
- `docs/GOLIVE.md` records known, deliberate debt: `style-src` still
  allows `unsafe-inline` (153 inline `style` attributes remain), student
  document upload has no UI, sequence messages are not actually sent.

## Where to look before changing something

- `README.md` — layout map, the two things to know before changing
  anything (RLS decides access, not the UI; no inline handlers).
- `docs/GOLIVE.md` — go-live runbook, deliberate gaps, rollback tags.
- `docs/DEPLOYMENT.md` — Netlify specifics, caching policy, SEO notes.
- `docs/DESIGN-SYSTEM.md` — **historical**, written at the end of Phase 1.
  Describes the pre-glass-engine CSS. Still useful for the debt inventory
  (§4 of that file) but do not treat its architecture section as current.
- `docs/SECURITY-PHASE0.md` — the admin-password fix and the RLS warning
  that later phases acted on.
