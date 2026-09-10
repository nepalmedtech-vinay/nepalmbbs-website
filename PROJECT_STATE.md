# PROJECT_STATE.md

_Last updated: 2026-09-10, after a Phase 0 forensic audit for the
"ultra-premium experience transformation" effort. Read this file first in
any new session before doing implementation work — the previous version of
this file (last touched 2026-08-27) had drifted badly out of sync with
reality and is not a reliable starting point._

## What this project actually is, right now

`nepalmbbs.in` is **live in production** on Netlify, served from `main`,
deployed via GitHub PR merges (the owner merges; Claude Code never pushes
to `main` directly — see `CLAUDE.md` rule 5). The most recent production
deploy is PR #5 (merged 2026-09-10), on top of PR #4 (merged 2026-09-09,
the "editorial, enterprise-grade finish" pass).

Development happens on `claude/website-premium-design-j6mphw`. This is
**not** the `redesign/premium-ecosystem` branch the previous version of
this file described — that description (unpublished site, `docs/GOLIVE.md`
runbook, rollback tags, a from-scratch Phase 0-4 plan) belongs to an
earlier, separate effort and should not be assumed current. Verify branch
and deploy state directly (`git log origin/main`, the Netlify MCP reader
tools) rather than trusting a stale doc — this file included.

## Architecture snapshot (verified 2026-09-10)

- **Framework:** Astro 7, static output, **44 routes** (`src/pages/`,
  including `src/pages/colleges/[slug].astro`, `compare.astro`, `index.astro`
  for the 27 college records, plus `src/pages/api/knowledge.json.js`).
- **Dependencies are minimal by design:** `astro`, `@astrojs/sitemap`,
  `three` — that's the entire production dependency list. No GSAP, no
  Lenis, no Mapbox/MapLibre, no Lottie/Rive. `playwright` is a dev
  dependency for the test suite only. Any new dependency should have a
  concrete justification; the codebase has deliberately stayed light.
- **CSS cascade, in actual load order** (confirmed from the built
  `<head>`, not assumed from file names):
  `engine.css → base.css → components.css → sections.css → trust.css →
  bridge.css → glass.css → motion.css → panel.css → chrome.css →
  premium.css`, then per-page Astro-scoped component styles (which win on
  specificity via Astro's `[data-astro-cid-*]` attribute, regardless of
  load order). `engine.css` holds the design tokens. `base.css` /
  `components.css` / `sections.css` are the **original 2023 dark-theme
  build** and still contain a lot of dead/overridden gold-accent and
  dark-on-dark styling — `chrome.css` and `premium.css` are where the
  current, correct treatment actually lives. This cascade has already
  produced several real bugs this session (a duplicated `@keyframes
  cx-sweep` name between `premium.css` and `console.css`, two colour
  tokens shadowing legacy names, several un-neutralized gold-literal
  selectors) — see `DECISION_LOG.md`'s 2026-09-09/10 entries for the full
  diagnostic trail before assuming a colour is "just CSS."
- **3D:** `src/lib/medical-icons-scene.js`, a single reusable Three.js
  scene (stethoscope, pulse trace, capsule, DNA helix, cross — real
  geometry, `MeshPhysicalMaterial` glass/metal, not sprites) mounted via
  `PageHeader.astro`'s `threeD` prop (five pages), a hand-rolled instance
  on `admission-process.astro`, and `Footer.astro` (all 44 routes). As of
  2026-09-10 this runs on **both desktop and mobile** — the viewport-width
  gate (`min-width: 62rem`) was deliberately removed at the owner's
  request, trading a documented bandwidth cost (median page weight
  ~353 kB → ~863 kB) for motion parity. **This decision needs revisiting
  in light of today's performance baseline — see below.**
- **The "college map" is a real, custom, zero-dependency SVG data
  visualization** (`src/components/CollegeMap.astro`), not a third-party
  map library: colleges plotted by actual lon/lat from `src/data/places.json`,
  circle area proportional to real seat counts, keyboard-accessible,
  IntersectionObserver-gated draw-in. This is a genuine existing asset —
  prefer extending it over introducing Mapbox/MapLibre, which would add a
  paid-service dependency for a capability that already exists.
- **Backend:** Supabase (`fpzgcijbryvddtpegcmm`), RLS-first. Build-time
  college data merge (`src/lib/colleges.js`) — `src/data/colleges.json` is
  the committed baseline (27 colleges), optionally overridden by a
  `site_colleges` Supabase table, additive-merge-only, non-fatal if
  unreachable. **Lead capture, the counselor console (`/staff`), and the
  student portal (`/portal`) are real, working, and tested** —
  `public/assets/js/leads.js`/`staff.js`/`portal.js`/`admin.js`/`auth.js`,
  verified by `tests/console-verify.mjs` (34 checks: lead intake, stage
  changes, conversion, drawer detail, search/filter — all currently
  passing). This is not a gap to build; it is a gap to **visually surface**
  on the public-facing pages, which currently undersell how much dynamic
  system sits behind them.
- **Existing decision tools, contrary to what an outside brief might
  assume:** `/neet-calculator` (NEET score + category + state →
  indicative eligibility, sourced caveats, NMC/MEC links — functionally
  most of what an "eligibility guidance" tool would need) and
  `/colleges/compare` (side-by-side comparison, deliberately excludes a
  fee column — see below) **already exist**.
- **Photography is 100% Unsplash stock hotlinks** — 13 images across
  `why-nepal.astro` (6), `life-in-nepal.astro` (4), and
  `MedicalGallery.astro` (3). None are real photographs of any of the 27
  actual Nepal colleges, campuses, or hospitals. This sandbox cannot fetch
  or verify these URLs resolve (egress is blocked to image CDNs), and
  cannot source or generate real campus photography — that requires the
  owner supplying actual photos/video. A sitewide broken-image fallback
  (`chrome.js` + `.img-broken` in `chrome.css`) exists specifically to
  fail safely if a hotlink goes dead.
- **Testing:** `tests/*.mjs` — `build-verify`, `csp-verify`,
  `console-verify` (34 checks), `a11y-verify` (32 checks: keyboard
  reachability, focus visibility, heading structure, landmarks),
  `audit.mjs` (WCAG AA contrast + 390px overflow across all 44 routes,
  currently 0/0), `perf-verify.mjs` (real Core Web Vitals under 4x CPU
  throttle + slow-4G, **currently failing — see below**), `compare-verify`,
  `assistant-verify`, `auth-verify`, `regression.mjs`, `visual-diff.mjs`.
  `npm run verify` is the full gate; `tools/gen-csp.mjs` regenerates the
  CSP and must be re-run after any inline-script change.

## Critical finding: performance baseline is failing, and it's worse than it looks

`node tests/perf-verify.mjs` (4x CPU throttle, ~1.6 Mbps/150ms RTT, 390×844
— i.e. a realistic budget Android phone on Indian mobile data, the site's
actual stated audience), measured 2026-09-10 against the current production
build:

```
route                              FCP     LCP     CLS     TBT
/                                  2500ms 3808ms!  0.000  9357ms!
/colleges                          2208ms 3084ms!  0.000 11708ms!
/colleges/institute-of-medicine    2308ms 3156ms!  0.000  6568ms!
/faq                               2264ms 3004ms!  0.000 11104ms!
/neet-calculator                   2260ms 3172ms!  0.000  6440ms!
/staff                             2760ms 2760ms!  0.000    43ms
/portal                            2080ms 2700ms!  0.000    33ms
```

12 of 14 thresholds missed. LCP is ~20-25% over budget across the
WebGL-carrying pages, which is bad but recoverable. **Total Blocking Time
is 30-58x the 200ms budget on every page that mounts a Three.js scene**
(`/`, `/colleges`, `/faq`, `/neet-calculator` all carry the footer's scene;
`/colleges/institute-of-medicine` too). `/staff` and `/portal` — which use
`bare={true}` and skip the footer/3D entirely — have near-zero TBT (43ms,
33ms), which isolates the cause cleanly: **the WebGL mount is blocking the
main thread for multiple seconds on a throttled device.**

This directly contradicts two of the transformation brief's own
non-negotiable rules ("The site must NEVER become slower simply to look
premium"; "WOW must never mean... excessive CPU/GPU usage"). It also
lands squarely on the mobile-3D-parity decision made earlier this session
(2026-09-10, "Enable cinematic 3D scenes on mobile viewports") — that
decision traded bandwidth for motion parity, but was made **without this
throttled-CPU data**, which shows the cost is not just bandwidth, it's
multi-second main-thread blocking on the hardware this audience actually
uses.

**This needs the owner's input before Phase 3 (cinematic hero/3D) work
proceeds**, and is flagged as such in `ULTRA_PREMIUM_ROADMAP.md` rather
than silently re-adding a gate that was just explicitly removed at their
request.

## Two direct conflicts between the transformation brief and standing project rules

1. **"MBBS Cost Planner"** (brief's Phase 5) directly conflicts with
   `CLAUDE.md` rule 2 — *"Fees are deliberately not published... Do not
   build a fee calculator"* — a decision already argued out in
   `DECISION_LOG.md` (2026-08-28: no sourced fee data exists, and a
   comparison table was deliberately built to show "Tuition fee: set per
   intake — ask us" rather than fabricate figures). Not building this
   unless the owner explicitly overrides that standing decision.
2. **Real campus/hospital/hostel photography** the brief asks for
   throughout (`PHOTOGRAPHY + GRAPHICS`, hero composition, video
   experience posters) does not exist in this repo and cannot be sourced
   or fabricated by this session — see above. Treated as a
   "missing proprietary asset that cannot be fabricated," per the brief's
   own stated exception category for stopping to ask rather than
   guessing.

## Where to look before changing something

- `CLAUDE.md` — the five non-negotiable rules (facts must be sourced, no
  fee calculator, RLS decides access not the UI, no inline handlers, owner
  merges to `main`) and the CSS-cascade gotcha above.
- `DECISION_LOG.md` — chronological record of every non-obvious decision
  and bug found this session and earlier ones; read before re-deciding
  something already argued out.
- `DESIGN_SYSTEM.md` (root) — token/component reference; verify against
  `engine.css` directly for anything colour-critical, since this doc can
  drift the same way this file just did.
- `ULTRA_PREMIUM_ROADMAP.md` — the Phase 0 audit output and phased plan
  for the current transformation effort.
- `CONTENT_SOURCE_LOG.md` — every factual claim (seats, recognition,
  deadlines) and its source; never invent a number not recorded here.
