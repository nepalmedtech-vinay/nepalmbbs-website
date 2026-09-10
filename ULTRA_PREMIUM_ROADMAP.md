# ULTRA_PREMIUM_ROADMAP.md

Phase 0 forensic audit and phased plan for the "ultra-premium, cinematic,
interactive" transformation of NepalMBBS.in, requested 2026-09-10. No code
was changed during this audit — see `PROJECT_STATE.md` for the verified
architecture snapshot this report is built on.

**Read `PROJECT_STATE.md` first.** It corrects several assumptions a
generic brief for this kind of transformation would reasonably make: a
real college map already exists (SVG, not a paid map library), an
eligibility calculator and a college-comparison tool already exist, lead
capture/counselor console/student portal are real and tested (not "fake
automation" to add), and the performance baseline is currently failing
in a way that directly affects the mobile-3D work already shipped this
week.

## A. Top problems (verified, not assumed)

Ranked by actual impact, confirmed against code/tests/measurements rather
than by re-reading the brief's own list back:

1. **Total Blocking Time is 30-58x over budget on every WebGL-carrying
   page**, measured under realistic throttling (see `PROJECT_STATE.md`).
   This is the single most important problem to fix before any further
   "cinematic" work — more 3D on top of a blocked main thread makes this
   worse, not better.
2. **`PROJECT_STATE.md` was 2 weeks stale and described a different
   branch's reality** (unpublished site, missing features that actually
   exist). Fixed as part of this audit; flagging the failure mode so it
   isn't repeated — these docs need updating as part of *every* phase's
   commit, not as a separate cleanup task.
3. **All photography is generic Unsplash stock**, zero real campus/
   hospital/hostel photography of the actual 27 colleges. This under-
   mines exactly the "medical credibility + trust" the brief asks for —
   a premium feel built on stock photography reads as generic no matter
   how good the surrounding motion is.
4. **The dynamic backend (leads, counselor console, student portal,
   NEET calculator, college comparison) is real and working but
   invisible from the public marketing pages.** A visitor has no signal
   that a functioning admissions pipeline exists behind "Get Free
   Counselling" — this is a genuine "doesn't communicate its own
   sophistication" problem, and it's cheaper to fix than building new
   automation from scratch would be.
5. **The CSS cascade has produced real, repeated bugs this week** (a
   duplicated animation-keyframe name, colour-token name collisions,
   un-neutralized legacy gold selectors on live elements) — see
   `DECISION_LOG.md`. Any new visual system work should audit against
   computed styles, not source, or it will re-introduce this class of
   bug.
6. **The video page (`/videos`) is a filter grid, not a featured/hero
   experience** — true. But **correction to an earlier draft of this
   report**: the "no verified footage yet" state the brief asks for
   (§ VIDEO EXPERIENCE) is not missing — it already exists, close to
   verbatim ("No video for this college yet... Ask us and we will tell
   you what we have on this college — including what we do not," with
   WhatsApp/email CTAs). Confirmed by direct screenshot. What's actually
   missing is only the featured/cinematic wrapper around it — a smaller
   task than originally scoped.
7. **The homepage has no clear narrative arc between sections** — Hero →
   Map → Trust → Gallery → SectionNav is a stack of good individual
   pieces, not a scene sequence. Confirmed by direct inspection of
   `index.astro`.
8. **`--brand-2` (teal, `#20B78E`) is the site's original, deliberate
   second hue**, used in select glows and accents since before this
   session's work — worth a design decision on whether it stays as a
   secondary accent or gets folded into the navy/sky system built this
   week, so the palette doesn't read as three unrelated hue families
   layered by different sessions.
9. **`/colleges/[slug]` detail pages are 155 lines** — likely thinner
   than the "premium detail experience" (hero → identity → location →
   recognition → seats → hospital → imagery → video → facts → admission
   → compare → CTA) the brief describes. Needs a direct read before
   redesigning, not an assumption.
10. **No `docs/CONTENT_ASSET_PLAN.md` or equivalent exists** cataloguing
    exactly what real photography/video is missing per college — needed
    before the owner can be asked for the right assets in the right
    shapes/counts.

(A full top-20 pass needs per-page visual audits beyond what Phase 0's
time budget covered — Phase 1 opens with a page-by-page blank-space audit
that will surface the rest concretely, against real screenshots, rather
than padding this list with guesses.)

## B. Top opportunities

1. **Fix the TBT problem first — it's the highest-leverage single change.**
   Likely candidates: defer Three.js mount further behind
   `requestIdleCallback` + a longer idle budget, reduce geometry/material
   complexity for the footer's ambient scene specifically (it runs on all
   44 routes, unlike the five `threeD` header scenes), or gate by an
   actual capability signal (`navigator.hardwareConcurrency`,
   `deviceMemory`) rather than reintroducing a blanket viewport gate.
2. **Surface the real backend** (lead pipeline, counselor console,
   admission progress) as visible product moments on the public pages
   — this directly serves the brief's "visibly behaves like a dynamic
   system" criterion using what already exists, no new integration work.
3. **Extend `CollegeMap.astro` rather than replace it** — it's already
   real, honest, fast, and zero-dependency. A "meaningful 3D/interactive"
   requirement can be met by adding depth/motion to this existing
   component instead of a second, heavier map system.
4. **`/neet-calculator` and `/colleges/compare` need a visual pass, not
   a rebuild** — the brief's "Decision Tools" phase is substantially
   already-built functionality that needs the same design-language pass
   the rest of the site got, not new engineering.
5. **The video page's "no verified footage yet" state is cheap to build
   well** and directly serves the brief's own explicit spec for it.
6. **A real "last verified" / evidence-source component**, generalizing
   the pattern `CONTENT_SOURCE_LOG.md` already tracks, would strengthen
   trust without new data work — it's a presentation layer over records
   that already exist.

## C. Architecture recommendation

Keep the current stack (Astro static, vanilla CSS cascade, one shared
Three.js scene module, `data-act`/`data-do` CSP-safe dispatch). It is
lean, fast to build in, and the perf problem is an *implementation*
problem (blocking main-thread work), not an *architecture* problem —
rewriting the framework or CSS approach would not fix TBT and would cost
weeks re-earning the accessibility/CSP/contrast guarantees already
verified across 44 routes.

## D. Dependency recommendation

Add nothing yet. Specifically:

- **No Mapbox/MapLibre** — `CollegeMap.astro` already covers this need
  without a paid-service dependency.
- **GSAP**: justified only if the scroll-choreography work in Phase 3
  genuinely can't be done with native CSS scroll-driven animations
  (`animation-timeline`) — the codebase already gates equivalent effects
  behind `@supports(animation-timeline)` with a static fallback
  (`admission-process.astro`'s progress spine). Evaluate that pattern's
  ceiling before adding a ~60 kB dependency.
- **Lenis**: only if native smooth-scroll + `scroll-behavior` genuinely
  can't deliver the intended feel, and only with a proven
  accessibility/reduced-motion story — smooth-scroll libraries are a
  common source of scroll-hijacking complaints on exactly the kind of
  content-heavy pages (FAQ, guidelines) this site has many of.
- **Lottie/Rive**: no current use case identified; revisit if Phase 6's
  video/photo work surfaces one.

## E. 3D recommendation

1. Root-cause and fix the TBT regression before adding any new 3D scene.
2. The existing `medical-icons-scene.js` module (five object types, two-
   material glass/metal rendering) is genuinely well-built — reuse its
   patterns (shared material factory, `colorVars` options object,
   `webglcontextlost` handling, reduced-motion gate) for any new scene
   rather than starting a second architecture.
3. "Admission Journey" (NEET → admission → MBBS) is better served as a
   2D/SVG choreographed path in the same language as `CollegeMap.astro`
   than as a fourth WebGL scene — it's inherently a linear, labelled
   sequence, which SVG does more legibly and far more cheaply than 3D.
4. Any genuinely new WebGL work (a hero environment, if the owner wants
   to go further than the existing medical-icons ambient layer) needs a
   fresh TBT measurement before and after, not just an LCP check.

## F. Motion recommendation

- Native CSS (transitions, `@keyframes`, `animation-timeline` where
  supported) already carries most of the site's current motion
  (`--mo` motion-multiplier token, `prefers-reduced-motion` respected
  throughout, verified in `a11y`/`audit` runs). Extend this system before
  reaching for a JS animation library.
- Define a small set of **named motion tokens** (entrance, reveal,
  hover-lift, shine-sweep — several already exist as `cx-sweep`/
  `gl-sheen`/`m-rise`/`m-stagger`) in one documented place so future
  work reuses rather than reinvents timing curves, matching the brief's
  own ask for a coherent motion language rather than "fade everything."

## G. Photography/graphics requirements

Real assets needed from the owner (cannot be sourced or fabricated by
this session — see `PROJECT_STATE.md`):

- Per-college: campus exterior, one classroom/lab interior, one hospital/
  clinical-exposure shot, hostel exterior or interior, ideally one
  student-life shot — even 2-3 of these per college (not all 27 need the
  full set on day one) would let the college detail pages and video page
  drop their stock-photo dependency where it matters most.
- General Nepal/life-in-Nepal imagery currently on `life-in-nepal.astro`
  and `why-nepal.astro` (10 images) — lower priority than college-specific
  photography, since generic Nepal scenery is less trust-critical than a
  specific college's own campus.
- Video: confirm exactly which of the 27 colleges the site already has
  real video for (`videos.astro`'s current data) before designing the
  "no verified footage yet" state, so the featured/fallback ratio is
  known rather than assumed.

Until real assets arrive, the honest options are: keep clearly-generic
stock (current state), or replace stock photography with the site's own
generated-graphics language (the map, the crystal-glass cards, the
Three.js scenes) in image-shaped slots — i.e. lean further into "honest
non-photographic treatment," a pattern `PROJECT_STATE.md`'s history notes
this project has used before for exactly this reason.

## H. Automation roadmap

Already built and tested (`tests/console-verify.mjs`, 34/34): lead
intake, stage tracking, lead→application conversion, counselor console
board/drawer, search/filter. **Not a build task — a visibility task.**
Recommended: a "how this works" moment on the counselling/CTA flow that
signals a real system exists (e.g., a lightweight, honest status
indicator after a counselling request — no fabricated activity, no fake
"3 people are viewing this"), and preparing (not yet wiring, per the
brief's own "paid service" exception) a clear integration point for
WhatsApp Business API / a CRM, documented for when the owner is ready to
provide those credentials.

## I. Performance risks

- **The TBT regression is the immediate risk** — see Critical Finding in
  `PROJECT_STATE.md`. Any further motion/3D work compounds it until
  fixed.
- **`backdrop-filter` usage** across the glass-card system is a known
  GPU cost on lower-end devices; worth auditing alongside the TBT fix
  rather than as a separate pass, since both are "how much are we asking
  a budget Android phone to do" questions.
- **Adding real photography will add real image weight** — needs
  responsive `srcset`/AVIF-WebP treatment from day one, not retrofitted
  later, given `perf-verify.mjs` already measures under throttled
  network as well as CPU.

## J. Exact implementation order

1. **Fix the TBT regression** (root-cause first, per the brief's own
   investigation checklist — not a padding cut). Partially done 2026-09-10
   (see `DECISION_LOG.md`): a real, free ~24% cut with zero visual cost,
   real cost identified as architectural rather than tunable. Re-run
   `perf-verify.mjs` until every route is green once the scope question
   (§ I.1 of this doc) is settled.
2. **Phase 1: blank-space and bug audit** — done for a first pass
   (2026-09-10), 8+ pages screenshotted full-page and inspected. Finding:
   **no genuine blank-space bugs.** Two apparent ones turned out to be
   screenshot-methodology artifacts, not real bugs, both verified rather
   than assumed: (a) `fullPage: true` captures do not reliably trigger
   the site's IntersectionObserver-based scroll-reveal (`.rev`/`.vis`),
   making below-the-fold content look "missing" in a screenshot when a
   real visitor scrolling normally sees it fine — confirmed by an actual
   scroll-through test, and separately confirmed that
   `prefers-reduced-motion` visitors already get every `.rev` element at
   full opacity immediately (`base.css` line 671), which is the real
   accessibility contract and was already correct; (b) a stray duplicate
   text fragment in one screenshot traced to the built HTML and found to
   occur exactly once in the DOM, so not a real duplication either —
   most likely a capture-time compositing artifact. **Lesson for any
   future automated visual audit of this site: re-screenshot with
   `reducedMotion: 'reduce'` context emulation, not a bare `fullPage`
   capture**, or scroll-reveal timing will produce false positives.
   The one real content gap found is the same one already flagged in
   §A.3/§G — generic stock photography, visible as the sitewide
   broken-image-fallback gradient wherever a hotlink doesn't resolve in
   a network-restricted context. Remaining pages (5 of 13, lower-traffic)
   not yet spot-checked; low expectation of new findings given the
   consistent pattern across the 8 checked.
3. **Surface the existing backend/decision-tools** visually (§B.2, §B.4)
   — highest ratio of impact to new engineering, since the functionality
   already exists and is tested.
4. **Homepage narrative pass** — sequence the existing sections into a
   scene arc rather than a stack, informed by #1-3 rather than in
   parallel with the perf fix.
5. **Video page and college-detail redesign**, gated on knowing the real
   photo/video asset situation (§G) so the design isn't built around
   placeholders that get thrown away.
6. **New/extended 3D and motion work** (§E, §F) — deliberately last among
   the visual work, since it's the most expensive to redo if the perf
   fix changes what's affordable.
7. **Mobile-specific interaction pass**, independently at 390/412/768,
   after the desktop direction is settled enough not to be redone.
8. **Full `npm run verify` + `perf-verify.mjs` + a real Creative-Director
   pass** against the acceptance criteria before calling any phase done.

Each step above is its own commit (or small set of commits) with
`DECISION_LOG.md`/`PROJECT_STATE.md` updated alongside — not batched into
one giant change, consistent with this project's established practice.
