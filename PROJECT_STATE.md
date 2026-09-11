# PROJECT_STATE.md

_Last updated: 2026-09-11. Read this file first in any new session before
doing implementation work — an earlier version of this file (last touched
2026-08-27) had drifted badly out of sync with reality and is not a
reliable starting point; if this one starts to feel that way too, verify
against the actual repo rather than trusting it._

## ⭐ 2026-09-11 — Phase 4 (full-site cinematic rollout) approved, in progress

The owner answered both questions `NEXT_TASK.md` had open (see that file's
top section for the full history): **Phase 4 rollout is approved**, and
the imagery policy is **use real/licensed photography where it exists,
never fabricate or pass off stock/AI imagery as a specific college's own
campus; where no real asset exists, build a premium non-photographic
placeholder (motion/data-viz/3D), document the exact missing asset, and
keep the slot swap-ready.** Working autonomously in page-priority order
(`/` → `/colleges` → `/admission-process` → `/documents` → remaining
public pages), each chunk: implement → build/targeted validation → visual
inspection (Playwright screenshots, desktop + mobile + reduced-motion) →
fix → update this file → commit → push. Full `npm run verify` is run at
checkpoints, not after every single chunk (~20 min/run makes that
impractical across dozens of pages) — see each chunk's own commit for
exactly what was checked.

**Chunk 1 — homepage, done:** Audited the three homepage sections Phase 3
didn't touch (hero/map/navbar were already done). `TrustSection.astro`
and `SectionNav.astro` turned out to already be at standard — both were
rebuilt into a ruled editorial index/rail (`premium.css` §4/§5) in the
pass *before* Phase 3, deliberately moving away from the card-grid pattern
the brief warns against; re-skinning them in hero-style glass would fight
that already-good, deliberate design rather than improve it. The real gap
was `MedicalGallery.astro`: three photo cards with zero cinematic
treatment, exactly the "clip-path/mask reveal" gap `DESIGN_AUDIT.md` §4
flagged as not built anywhere in the codebase. Added `.m-reveal` (a
clip-path wipe, `--mo`-scaled, `motion.css`) and extended the existing
unused `.m-para` parallax primitive with an optional `--m-para-scale` so
the drift never exposes a clipped edge — both zero-dependency
scroll-timeline CSS, the established pattern here, no new library. Applied
to all three gallery frames with a `--n` stagger. Verified: build clean
(44 routes), no layout/nav duplication, `prefers-reduced-motion` correctly
collapses `clip-path` to `none` (computed-style check, not assumed) so
reduced-motion visitors get the content immediately with no animation.
**Note for the next session:** this sandbox cannot reach `images.unsplash.com`
(same outbound restriction as `WebFetch`), so the gallery renders its
existing broken-image fallback gradient here — expected, pre-existing,
not something this chunk introduced or can verify visually in this
environment; confirm on a real network before assuming the photos
themselves render correctly.

**Chunk 2 — /colleges, done:** Audited before touching anything, since
premium.css's own §17 comment is explicit that Crystal CTA ("`.gl-crystal`,
the nav/hero glass button") is *deliberately* reserved for the site's two
highest-visibility conversion points and is "not a replacement for
`.gl-btn` everywhere" — the temptation to reskin `/colleges`' CTAs into
crystal glass would have been reversing a documented restraint, not
extending the benchmark. Checked instead: `/colleges` already carries the
Phase 3 signature (`PageHeader` with `threeD`, the same cinematic field +
WebGL medical-icons scene as the homepage hero), its body is the
pre-Phase-3 "Record" editorial system (`premium.css` §7/§9 — ruled panels,
sourced footnotes, responsive tables that stack on mobile rather than
overflow), and its CTAs are correctly on the secondary `.gl-btn`-family
system per that same restraint. **Conclusion: the index page was already
at standard: no change made there beyond verifying it.** The real,
non-redundant gap was `/colleges/compare` — the college picker
(`.cmp-option`, 27 checkboxes) had zero visual feedback for which colleges
were selected beyond the native tickbox itself, on a page whose entire
purpose is picking. Added a hover/checked wash reusing `.tab-card`'s own
brand-tint treatment (`compare.astro`'s scoped `<style>` — no new global
CSS). Verified visually: hover and multi-select both render correctly, the
"N selected" counter and the checked-state highlight agree. The dynamic
comparison table (`compare.js`) already emits `.doc-table` markup, so it
inherits the Record system automatically — nothing to do there.

**Chunk 3 — /admission-process, done — plus a real sitewide bug found by
screenshotting it:** This page turned out to already carry the *most*
sophisticated motion on the site outside the homepage (`premium.css` §8/§14
— a scroll-filling spine, cascading stagger via `.doc-steps > .doc-step`,
a slower-drifting sticky rail head), so there was nothing to add on the
content side. But taking the mobile screenshot this rollout's own process
calls for (visual inspection, not just a green build) surfaced something
the automated suite has apparently never caught: on a narrow viewport, the
WebGL medical-icons-scene mounted by `PageHeader`'s `threeD` prop (and by
this page's own hand-rolled copy of the same header) renders its five
icons large enough, and opaque enough (0.8), to sit directly over the
heading and lead paragraph rather than behind them as quiet decoration —
confirmed on **both** `/admission-process` and `/colleges`, i.e. every
`threeD` `PageHeader` mount, not something specific to one page. Root
cause: the scene's object layout (world-space x-offsets out to ~1.75,
camera distance 6.2, 38° vertical FOV) was tuned against the wide, short
canvas of the desktop-only hero band; `PageHeader`/`admission-process`
mount the identical scene into a canvas shaped like an entire page header
instead — often near-square or taller-than-wide on a phone — where the
same spread fills the frame edge to edge. `tests/audit.mjs`'s contrast
check reads DOM/CSS colours, not actual canvas pixels, so this was
invisible to it — 0 low-contrast across 44 routes was true and still
missed this; screenshotting is what caught it, which is the whole reason
this rollout's process asks for it every chunk.

Fix, in `src/lib/medical-icons-scene.js` (shared by every mount site —
footer, hero, page-header, admission-process): grouped the five objects
under one `THREE.Group` and scale the group down when the *canvas's own
aspect ratio* (not viewport width, so this also self-corrects
admission-process's narrower sticky-rail canvas on desktop) is narrower
than the wide ratio the layout was designed at, floored so nothing shrinks
to invisible. Paired with a `max-width: 48rem` opacity reduction
(0.8 → 0.32) on `.ph-3d.is-ready` in both `PageHeader.astro` and
`admission-process.astro`'s own copy of the rule, since even a smaller
opaque shape still read as clutter directly over body text. Verified with before/after screenshots at 390px on both affected pages —
the admission-process pair pixel-diffed to confirm the fix actually
changed rendered output, not just source — plus 1440px on the hero,
`/colleges` and `/admission-process` to visually confirm the wide-aspect
cases, where this was never broken, still look right (no automated diff
run against a pre-fix desktop baseline, but nothing in the fix's logic
touches the aspect ≥ 1.6 path — `field.scale` stays exactly 1 there).

**Chunk 4 — /documents, done.** This page already uses the Record system
(`.doc`/`.doc-table`) like `/colleges` and `/documents`' own `PageHeader`
usage doesn't pass `threeD`, so it was never exposed to chunk 3's WebGL
bug. The one under-designed spot: the three admission-stage blocks each
list their required documents as a bare default `<ul>` bullet list, the
only place on a page titled "document checklist" that didn't get the same
typographic care as the table and `.doc-note`s around it. Replaced the
native bullet with a small brand-tint tick (CSS-only, `::before`/`::after`
on `.dc-list li`, no new markup) — matches the page's own framing rather
than inventing a new visual language. **Process note for future
sessions:** this was committed ahead of its own screenshot check (the stop
hook fired while a background `npm run verify` was in flight, and
rebuilding mid-run would have corrupted it — committing is safe since git
doesn't touch `dist/`, so the commit went ahead and the visual check
followed once the verify run finished). The first screenshot attempt
afterward *also* looked wrong — turned out to be a stale/conflicting local
dist-server left over from a previous manual check, not a real bug; a
fresh server + computed-style check (`::before` width, background,
`list-style: none`) confirmed the CSS was correct all along. Lesson worth
keeping: when a screenshot contradicts a computed-style check on the same
build, trust the computed style and suspect the serving setup first.

**Verify checkpoint (after chunks 1-4):** `npm run verify` fails at
`build-verify.mjs`'s `wrc-tracker`/`cmc-tracker` byte-identical check —
confirmed as the pre-existing, documented issue (`CLAUDE.md`,
`docs/GOLIVE.md`): this session's fresh clone has **no local git tags at
all** (`git tag -l` returns nothing), so `phase1-static-rollback` doesn't
exist to compare against. Not something this session broke or can fix
(tag pushes return 403; recreating the tag from scratch risks it not
matching whatever historical commit it's actually supposed to pin).
Ran every other check individually instead, skipping only that one
assertion: `csp-verify`, `console-verify`, `auth-verify`, `a11y-verify`,
`compare-verify`, `assistant-verify` all exit 0; `audit.mjs` — **0
low-contrast elements, 0 mobile overflow, across all 43 routes + the
assistant, median 303 kB** — clean after the homepage gallery motion,
the compare picker, the medical-icons-scene fix, and this chunk's
checklist styling. Also cleaned up several stray local `node` dist-servers
this session's own manual screenshotting left running on ports
8103-8105 — worth checking `lsof -ti:8103` before the next `npm run
verify` if a future session hits the same `EADDRINUSE` this one did on
the first attempt.

**Chunk 5 — remaining public pages, in progress.** Screenshotted every
remaining route (desktop + mobile) before touching anything, to find the
real gaps rather than guess from source. Most were already fine:
`/guidelines`, `/videos`, `/faq`, `/colleges/[slug]`, `/404`, `/privacy`
all carry the Record system or the cinematic PageHeader already and
needed nothing. Two findings:

- **`/life-in-nepal`'s 8-card feature grid was the one icon language on
  the site still using raw emoji** (font-size:34px glyphs, `base.css`) —
  the page's own gallery comment already named this as wrong ("not
  another row of emoji cards") without fixing it. Replaced with inline
  SVG line icons matching the `.tab-svg`/trust-badge convention. The
  gallery's own image-badge emoji captions are a separate, deliberate,
  already-sitewide pattern (same as `/why-nepal` and the homepage
  gallery) and were left alone. Verified: desktop + mobile screenshots,
  `console-verify` and `audit.mjs` both green (0 low-contrast, 0 mobile
  overflow, 43 routes + assistant).
- **`/why-nepal` and `/counseling`** were audited and deliberately left
  unchanged. `/why-nepal` already has the cinematic `PageHeader threeD`
  and its `.why-card`/`.test-card` entrances technically carry two
  competing motion rules (`.rev`'s `pr-arrive` from `premium.css` wins
  over the shared `.why-card` selector's `m-rise` from `motion.css` by
  cascade order) — both are the same fade-rise family and the visible
  result is correct, so this is dead-code redundancy, not a bug; not
  touched, since editing the shared `.why-card`/`.rev` selectors risks
  every other page carrying them. `/counseling` is one of the three pages
  `PageHeader.astro`'s own comment names as an intended `threeD`
  recipient ("colleges list, why-nepal, counseling") but never actually
  received it — hand-rolled two-column layout instead. Deliberately not
  retrofitted: this is the site's highest-commercial-value page (its own
  `chrome.css` comment calls it "the page that matters most
  commercially"), the custom grid the enquiry form depends on has no
  header slot to insert PageHeader into without restructuring it, and the
  aspect-ratio bug chunk 3 just fixed is a fresh reminder of what
  reusing that component on an unfamiliar container shape can do. A
  session with time to test it thoroughly (not a squeeze between other
  pages) should be the one to pick this up, not this pass.

Still to look at: `/neet-calculator`.

## Status

- **CURRENT PHASE**: Phase 1 (experience foundation / technical clean-up),
  per `ULTRA_PREMIUM_ROADMAP.md`'s implementation order.
- **COMPLETED THIS PASS**: Phase 0 forensic audit; a real ~24% TBT cut
  (cheap PMREM environment, zero visual cost); Phase 1 blank-space audit
  (no genuine bugs, two screenshot-methodology false positives traced and
  corrected); the full 3D adaptive-mount architecture (see
  `3D_ARCHITECTURE.md`) — IntersectionObserver-gated mounting shared
  across all four scene sites, adaptive DPR cap, and a `lite` rendering
  mode (no PMREM, no transmission, halved geometry segments) for
  mobile/low-core devices — cutting TBT 92-97% across every measured
  route (6969-11708ms baseline down to 221-585ms).
- **IN PROGRESS / NOT YET DONE**: LCP reads over its 2.5s budget on
  every route in `perf-verify.mjs` (2.7-3.6s), including `/staff` and
  `/portal` which carry no WebGL at all — ruling out 3D as the cause,
  since it's uniform across routes with wildly different content.
  **Investigated, not fixed — see the finding below before touching
  this.** `perf-verify.mjs`'s local test server is plain `node:http`
  (line 15: `import http from 'node:http'`), i.e. HTTP/1.1. Netlify
  serves the real site over HTTP/2. `GlassLayout.astro`'s own comment
  (above its stylesheet `<link>` tags) documents that concatenating the
  site's nine render-blocking CSS files into one bundle was tried and
  **measured worse in production** (LCP 1632ms → 1916ms) specifically
  *because* HTTP/2 multiplexes many small parallel requests better than
  one large serialised one — `tools/bundle-css.mjs` exists and is
  deliberately not wired in for this reason. The likely read: this
  harness's own HTTP/1.1 connection-limit is inflating the LCP numbers
  it reports, the same class of "test methodology, not a real bug" trap
  as the two screenshot false positives found in the Phase 1 audit — do
  **not** re-attempt CSS bundling to chase this number down, that
  experiment already ran and its result is documented.
- **NEXT ACTION**: get a real LCP reading from something that actually
  serves HTTP/2 (Netlify's own deploy preview, or a Lighthouse/PSI run
  against the live site) before deciding whether there's a genuine LCP
  problem to fix at all, rather than trusting this harness's absolute
  number further. `perf-verify.mjs`'s TBT numbers don't have this
  caveat — TBT is a main-thread-blocking measure, not a
  network-transport one, so this session's TBT fixes and their
  before/after comparisons stand regardless. Independent of that:
  Decisions 2 (cost planner architecture) and 3 (asset-slot system +
  `CONTENT_ASSET_PLAN.md`) are both authorised and not yet started.
- **KNOWN ISSUES**: `tests/csp-verify.mjs` and `tests/a11y-verify.mjs`
  have been intermittently very slow in this sandbox this session (one
  csp-verify run exceeded 10 minutes without completing; a11y-verify
  needed ~3 minutes against a normal ~1-2) — confirmed as sandbox network
  flakiness during the run itself (the process was still making progress,
  not hung), not a regression, by re-running bounded and inspecting
  partial output rather than assuming a hang. Budget accordingly rather
  than treating a long wait alone as a failure signal. Separately: **never
  rebuild while a test suite is reading `dist/`** — this was violated once
  this session (an `npm run build` ran while a stale `audit.mjs` was still
  in flight), caught immediately, the corrupted run killed and redone
  clean. `dist/` itself is fine (each build overwrites it completely); the
  risk is only to whatever suite is mid-read when the overwrite happens.
- **DECISIONS**: see the three "DECISION N — ..." headings the owner sent
  2026-09-10, authoritative and superseding the three open questions
  `ULTRA_PREMIUM_ROADMAP.md` originally raised. Full text is in the
  conversation record; the operative points are captured in
  `3D_ARCHITECTURE.md` (Decision 1) and `ULTRA_PREMIUM_ROADMAP.md`
  (Decisions 2 and 3, not yet updated to reflect the authorised-but-not-
  fabricated cost-planner and asset-slot architectures — do that before
  starting either).
- **DEPENDENCIES**: unchanged — `astro`, `@astrojs/sitemap`, `three` in
  production; no new dependency added or currently justified.
- **TEST STATUS** (this pass): `npm run build` clean (44 pages);
  `tests/console-verify.mjs` 34/34 (twice, after each 3D-architecture
  edit); `tests/a11y-verify.mjs` 31-32/32 both times, the one failure
  each time the same pre-existing `.cx-input` `:focus-visible` timing
  flake on `/staff` or `/portal` documented earlier this session —
  neither route touches any file this pass changed; `tests/audit.mjs`
  (full) — see latest `DECISION_LOG.md` entry for the result of the run
  started alongside this update.
- **PERFORMANCE STATUS**: `tests/perf-verify.mjs`, 4x CPU throttle +
  slow-4G, 390×844 — every measured route's TBT now sits at 221-585ms
  against a 200ms budget (down from a 6969-11708ms starting point this
  session began at), effectively closing the regression that motivated
  this whole pass. LCP remains over budget (2.7-3.6s against 2.5s) on
  every route — untouched by this pass, the next thing to root-cause.

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
