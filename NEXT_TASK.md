# NEXT_TASK.md

_Read this after `CLAUDE.md` (which loads itself) and `PROJECT_STATE.md`.
It is overwritten at the end of every chunk to point at the next one._

## ⭐ Status as of 2026-09-13 (cinematic spatial escalation, round 2) — read this section first

The owner's follow-up brief was explicit that round 1 (below) was a good
foundation but not the final level wanted: real scroll parallax between
background/foreground, "several" noticeable spatial-3D moments, richer
scroll choreography. Delivered two concrete additions, both CSS/DOM-only —
still zero new JS, zero new WebGL beyond what round 1 already had.

**Real scroll parallax on all three atmospheric fields.** Added
`.m-para-shift` to `motion.css` — a translate-only sibling of the existing
`.m-para` (which combines scale+translate; SVG's `scale()` and these
edge-to-edge fields don't need the scale term, and `.m-para`'s comment
explains why a plain-translate variant earns its own class rather than
reusing that one with `--m-para-scale: 1`). Driven by `animation-timeline:
view()` / `animation-range: cover` like every other scroll effect in this
codebase — no scroll listener. Applied it plus a `--m-depth` to `.gh-field`
(hero, 34px), `.map-field` (26px) and `.practice-field` (22px): the
background grid now visibly lags the foreground copy as you scroll, instead
of moving in lockstep with it. Verified via a 6-position scroll-and-
screenshot pass (y = 0/400/900/1400/2200/2800) with `reducedMotion` off —
no seam or edge ever became visible, because the lattice pattern repeats
infinitely and each field's own radial mask already fades it out before
its physical edge would show.

**The map got a real "dimensional data surface"** — `CollegeMap.astro`'s
SVG now tilts toward the pointer via `glass.css`'s existing `.gl--live`
(the same pointer-tilt + moving-specular system used elsewhere, no new
JS). Two things had to be got right that a naive `class="gl--live"` on
`.map-figure` would have gotten wrong, both confirmed by instrumenting the
actual computed style rather than trusting a screenshot:

1. **`.gl--live` cannot live on the same element as `.m-focus`.**
   `.m-focus` (the section's own scroll-driven entrance blur-in) ends its
   keyframe with `transform: none` and `animation-fill-mode: both` — and a
   running/filled CSS Animation's value for a property always wins over a
   plain declared value on the same element, full stop, regardless of
   selector specificity or source order. Confirmed by reading
   `getComputedStyle(...).transform` after a real pointer move: `--gx`/
   `--gy` were updating correctly (proving the pointermove listener was
   firing) but `transform` stayed `matrix(1, 0, 0, 1, 0, 0)` — the tilt was
   computed and then silently discarded every frame. Fixed the same way
   `GlassHero.astro`'s stat cards already solve this exact conflict:
   `.m-focus` stays on `<figure class="map-figure">`, `.gl--live` moves to
   a new inner `<div class="map-tilt">` wrapping just the `<svg>` — the
   readout card and legend stay outside it, both because they don't need
   `position: relative` juggling to keep `.gl-spec` (`inset: 0`) anchored
   in the naive scope. This means the readout card and legend do **not**
   tilt with the map — deliberate: tilting the text panel that names the
   point you're hovering would hurt legibility for no gain.
2. **`.gl--live:hover`'s box-shadow assumes a panel with a background.**
   The map figure is bare SVG over the page's own field, so left alone
   that shadow renders as a vague dark rectangle floating behind the
   graticule on hover. One override in `premium.css`:
   `.map-tilt.gl--live:hover { box-shadow: none; }`, keeping the tilt and
   specular, dropping only the ill-fitting shadow.

Confirmed the fix genuinely engages (real `matrix3d(...)` at opposite
corners, opposite sign — not the identity matrix the first attempt
produced) and that the point-hover readout card, click-through, and the
`highlight` prop (college detail pages' compact reuse) all still work
correctly with the new wrapper — tested on a real college detail page
(`/colleges/college-of-medical-sciences`), not assumed from the homepage
alone.

**Verified**: build clean (44 routes); CSP unaffected (`gen-csp.mjs
--check` — pure CSS/markup, no inline-script change);
`console-verify` 34/34; `a11y-verify` 32/32; `auth-verify` 12/12;
`compare-verify` 13/13; `assistant-verify` 18/18; `csp-verify` and
`audit.mjs` re-run clean against the final build after the `.map-tilt`
fix (see the run this session logged — do not trust an audit run started
before a later rebuild; one was killed mid-run this session for exactly
that reason, see the process-hygiene note below).

**Process note, for the next session**: this session accidentally started
`csp-verify.mjs`/`audit.mjs` twice in parallel (a `run_in_background: true`
Bash call combined with a trailing shell `&` inside the command backgrounds
it twice, leaving duplicate processes) and then rebuilt `dist/` while both
were still reading it — exactly the failure mode `CLAUDE.md` warns about
("Never rebuild while a suite is running"). Caught via `ps aux` before
trusting either run's result, killed everything, and re-ran clean once the
build was final. `run_in_background: true` already backgrounds the whole
command; do not also append `&` inside it.

**Not done from the round-2 brief**: further hero "dimensional typography"
beyond what round 1 already shipped (line-by-line reveal, gradient text,
3D-tumbling icon field, the existing Three.js medical scene); "warm
editorial highlights" (no warm token exists in `engine.css`'s palette —
inventing one was judged out of scope for a targeted cinematic pass, not
a "the brand needs a new colour" decision to make unilaterally); further
scroll-story typography transforms beyond the parallax now in place.

## ⭐ Status as of 2026-09-12 (cinematic depth pass) — read this section first

The owner asked for a step up from "premium editorial" toward "cinematic
digital experience" — richer per-section colour, spatial/3D interaction,
scroll choreography — explicitly ruling out new WebGL/heavy animation
libraries unless "genuinely superior AND performance remains acceptable."
Given this project's own documented history (`PROJECT_STATE.md`'s
"Critical finding" section: TBT was 30-58x over budget on every
WebGL-carrying route before Phase 1's mount-gating rework), the judgment
call was to deliver this entirely in CSS/SVG plus the site's own existing,
already-running pointer-tilt system — zero new JS, zero new WebGL —
rather than add a second 3D system on top of one the codebase has
already had to fight for performance once.

**Three atmospheric fields, one per homepage chapter that didn't have
one**: Hero (Promise) and Trust (Proof) already had their own tinted
grid-field (`.gh-field`/`.trust-field`); Place (the map) and Practice
(the new `AcademicJourney` section) did not, reading as a flat drop
between two atmospheric ones. Added `.map-field` (teal, `--brand-2` —
the same colour the hero's own bottom-edge glow already previews, so
Place arriving in it reads as a continuation) and `.practice-field`
(navy, `--navy-accent` — the same pair `Footer.astro`'s WebGL scene
already uses "on the owner's explicit ask", so the homepage's last two
chapters close in the colour the footer then continues in). Same
zero-dependency recipe as the existing two fields: two `linear-gradient`
layers forming a lattice, radially masked so each is strongest in one
corner and gone elsewhere, `pointer-events: none`. No new CSS technique,
no new colours beyond tokens already in `engine.css` and already used
elsewhere in this exact code for exactly this reason.

**Mobile got more atmosphere, not less** — a real reversal of standing
practice, made because this pass's own brief was explicit about it
("mobile is not a shrunk desktop... 390px must still feel premium").
`.trust-field` and `.gh-glow--handoff` previously `display: none`d below
48rem entirely, on a documented "a phone-width field competes with the
text more than it adds depth" rationale from an earlier session. Changed
to a reduced opacity instead of removed — confirmed via screenshot at
390px that the atmosphere is visible without crowding the text; the two
new fields ship at a mobile-reduced opacity from the start, never fully
off.

**One genuine spatial-interaction addition**: `CollegeHero.astro`'s
identity-mark panel (the "IM" monogram every college page leads with)
now carries `.gl--live` — the pointer-tilt + moving-specular system
`glass.css`/`runtime.js` already run sitewide (first built for the hero's
own stat panes), extended to one more static element rather than a
second implementation. Deliberately `gl--live` alone, not the base `.gl`
class, which would have brought its own background/border over this
panel's already-distinct ownership-tinted design. One correctness fix
alongside it: `.gl-spec`'s default z-index (2) sat level with `.cph`
(the real-photo slot, also z-index 2, later in the DOM) — without an
explicit `z-index: 3` on `.gl-spec`, the shine would render *under* a
real photo once any college finally has one uploaded, a bug that
wouldn't have surfaced until then. Fixed before it could.

**Verified**: build clean; CSP unaffected (pure CSS/markup, no new
inline scripts); `console-verify` 34/34; `a11y-verify` 32/32 (twice);
`auth-verify` 12/12; `compare-verify` 13/13; `assistant-verify` 18/18;
`csp-verify` 11/11 (3118/3118 handlers); `audit.mjs` 0 low-contrast / 0
overflow across 43 routes + assistant; `perf-verify.mjs` run and read
carefully rather than skipped — TBT and LCP numbers are in the same
shape already documented (LCP over budget everywhere, a known sandbox
HTTP/1.1 artifact; TBT elevated only on routes mounting the existing
Three.js footer scene, near-zero on `/staff`/`/portal` which don't) —
consistent with this pass adding no new JS or render-blocking resource,
so there is no mechanism by which it could have moved these numbers, the
same reasoning this codebase has applied to CSS-only changes before
(Phase 5B's own record explicitly skipped a redundant perf run on the
same grounds). Additionally confirmed the pointer-tilt panel and both new
fields render correctly at 390px with zero overflow and zero console
errors.

**Not done**: literal WebGL/3D additions (a spinning object, a depth-
mapped image, a new Three.js scene) — ruled out deliberately, not
overlooked, given this project's own performance history with exactly
that category of effect. If a specific 3D moment is wanted badly enough
to justify revisiting that trade-off, it needs the owner's explicit
sign-off on the performance cost first, the same gate `PROJECT_STATE.md`
already applies to the existing WebGL scenes.

## Status as of 2026-09-12 (autonomous execution mandate — continued design pass) — still current, read next

The owner handed over full autonomous execution authority ("you own the
remaining execution... decide and execute... stop only when genuinely
nothing meaningful remains") after the design pass below. Continued the
same screenshot → computed-style-verify → fix discipline across the rest
of the site rather than stopping at the four fixes already shipped.

**Three more real fixes shipped, plus one page confirmed already solid:**

1. **Homepage "Clinical Training" gallery replaced entirely**, not just
   given a better fallback. It was three Unsplash stock photos — the
   homepage's own hero copy already promises "no stock photographs
   standing in for a campus," a conflict this codebase's own design
   history had flagged as unresolved (`DESIGN_AUDIT.md` §7) and this pass
   finally closed. New `AcademicJourney.astro` (replacing the deleted
   `MedicalGallery.astro`) reuses the exact four-stage academic sequence
   `colleges/[slug].astro` already builds from `knowledge.json`'s sourced
   topics (true of every MEC-approved college, not page-specific
   content), rendered with the same `.doc-steps` scroll-spine component
   `admission-process.astro` and every college detail page already use —
   a third use of an established signature, needing no photography and
   therefore nothing that can go dead as a hotlink. The section keeps its
   `id="hp-practice"` exactly where the homepage's own Promise→Place→
   Proof→Practice→Path chapter rail expects it; verified the rail still
   highlights "Practice" correctly at this scroll position.
2. **`/videos`' two emoji icons (🏛️ "All Videos", 📂 "Full Video
   Library") replaced with inline SVG**, the same fix already applied to
   `/life-in-nepal` and `Footer.astro` for the same reason (renders
   differently per platform, sits on the baseline rather than optically
   centred). The 27-college filter pill grid itself was checked via
   computed style first and found to be a legitimate filter control
   (`border-radius:999px`, no shadow at rest) — not the card-fatigue
   anti-pattern, so left alone.
3. **`/faq`'s 13 questions were each an individually-shadowed, rounded,
   8px-margined card** — confirmed via computed style
   (`border-radius:18px`, a real box-shadow, `margin-bottom:8px`) before
   touching anything, unlike two false alarms earlier this session.
   Converted to one shared panel (`.faq-wrap`, reusing this site's own
   `.doc` "record" language) with the existing `.faq-cat` category labels
   as internal section headers and each `.faq-item` a flush ruled row —
   the `:has(+ .faq-cat)` selector (already used elsewhere in this
   codebase, `chrome.css`'s broken-image fallback) picks out which item
   in each category needs no bottom divider. The accordion behaviour
   itself (click to expand, `toggleFaq()`) is completely unchanged.
4. **`/colleges/[slug]` and `/admission-process` spot-checked and found
   already at standard** — the college detail page's Record panel,
   highlighted map, and `.doc-steps` academic timeline, and the
   admission page's own numbered spine + comparison table, both already
   match everything this pass has been fixing elsewhere. No changes
   made; recorded so a future pass doesn't re-audit pages nothing is
   wrong with.

**Verified after all three fixes**: build clean (44 routes, one file
deleted — `MedicalGallery.astro` — one added — `AcademicJourney.astro`);
CSP unaffected (`gen-csp.mjs --check` current, no inline-script changes);
`console-verify` 34/34; `a11y-verify` 32/32 (the `/staff` flake did not
recur, twice in a row now); `auth-verify` 12/12; `compare-verify` 13/13;
`assistant-verify` 18/18; `csp-verify` 11/11 (45 routes, 3118/3118
handlers); `audit.mjs` **0 low-contrast, 0 mobile overflow, across all 43
routes + the assistant** (median 384 kB — down slightly, consistent with
the stock-photo band's removal).

**Deliberately not touched**: `/why-nepal` (6 Unsplash photos) and
`/life-in-nepal` (4) carry the same external-hotlink fragility the
homepage gallery did, and share the exact same broken-image risk this
sandbox happens to trigger every time. Not replaced this pass: unlike the
homepage's small supplementary band, photography is these two pages'
entire structural content, not a substitutable section — replacing it
would be a genuine content/architecture decision (what replaces a
page built around a photo grid), not a targeted visual fix, and both
already have a real, working `:has(img.img-broken)` fallback for the one
failure mode a production hotlink can actually have (this sandbox's own
network-stall behavior, confirmed earlier this session, is a distinct,
non-representative failure mode). Flagged here rather than silently
skipped, in case a future session is tempted to "finish the job" — this
was a considered stop, not an oversight.

## Status as of 2026-09-12 (design-led visual reconstruction pass) — still current, read next

The owner reviewed real mobile screenshots after Phase 5F/5G shipped and
found the visual bar not yet met — "too many bordered cards... too much
form/dashboard feeling... premium personality is not strong enough" — and
asked for a design audit followed by 5-10 high-impact fixes, not a
rewrite. Full design audit, evidence for each finding, and exactly what
shipped is below; `PROJECT_STATE.md` has the short version.

**Method, since it matters for how much to trust the findings below**:
screenshotted home/counseling/colleges/college-detail/videos at 390 and
1440 first, then verified every suspected problem against **computed
style**, not the screenshot — this caught two false positives before any
code changed (see items 5 below), which is exactly the discipline
`DECISION_LOG.md` has needed before on this codebase (a naive screenshot
and a real computed style have disagreed here more than once).

### Design audit

1. **Homepage hero stat tiles (27 / 734 / 10) are three individually-
   glowing glass cards, stacked full-width on mobile.** Confirmed via
   computed style (37.8px border-radius, layered coloured box-shadows,
   28px backdrop-blur) — not a screenshot misread. Reads as three
   dashboard KPI tiles directly under the headline, not a confident
   editorial statement. *Principle: reduce card fatigue, let typography
   carry hierarchy.* Affected: `GlassHero.astro`, mobile only (≤40rem).
   **Fixed** — reused this site's own already-existing `.stat-box` "no
   box, a rule, and a number" language (built for the admin console's
   dashboard, never brought to the public site) instead of inventing a
   second de-carded-stat pattern. Desktop's glass-pane treatment — a real
   spinning conic-gradient rim light per stat, genuinely well-built — is
   completely untouched; verified unchanged at 768/1024/1440.

2. **Footer links carry an always-on crystal-glass pill (background,
   border, shadow) at rest, not just on hover.** On a single mobile
   column this is ~20 identically-styled rounded buttons stacked
   end to end — the literal "link farm" the brief named, on the one
   component every one of the 44 routes shares. *Principle: elevation
   should be earned (hover/focus), not permanent chrome.* Affected:
   `Footer.astro`, all routes.
   **Fixed** — moved the crystal treatment to `:hover`/`:focus-visible`
   only; the material itself (already well-designed — internal light
   gradient, lit ring, a one-pass shine sweep) is unchanged, just no
   longer shown at rest. This also un-shadowed a dead rule already
   sitting in `premium.css` with the exact right intent ("the footer was
   a four-column link farm... this turns it into a masthead") that a
   later, more specific scoped style had been silently overriding the
   whole time — confirmed by checking cascade/specificity, not guessed.

3. **`/counseling`'s three contact options (Calendly / WhatsApp Chat /
   WhatsApp Call) are three separately bordered, shadowed cards in a
   column**, directly under the eligibility-checker card — "card → card
   → card → card" on the site's single highest-commercial-value page.
   *Principle: reuse an established visual signature instead of
   repeating a card a fourth time.* Affected: `counseling.astro` /
   `chrome.css`.
   **Fixed** — the three options now sit inside one shared panel as
   ruled rows (the same "one shared border, hairline row dividers"
   language `SectionNav`'s `.tab-card` and `TrustSection`'s
   `.trust-badge` already established), collapsing 4 separate cards in
   that column to 2.

4. **`/colleges`' 27-college mobile list gives every one of 6 fields per
   college (Compare/College/Location/Affiliation/Ownership/Seats) its
   own 16px padding and its own bottom hairline**, instead of one border
   per college. Confirmed via computed style
   (`padding: 16px; border-bottom: 1px solid …` on every `<td>`) — this
   is a **real bug, not a style choice**: `trust.css` already had the
   correct one-border-per-college mobile design (`padding: var(--s-1) 0;
   border: 0`), but a later, equally-specific `!important` rule in
   `premium.css` was silently winning over it. *Principle: let one
   shared border carry the grouping on data-dense sections.* Affected:
   `.doc-table`, shared with `/colleges/compare` and any future list
   using the same component.
   **Fixed** — restored `trust.css`'s original intent from the layer
   that was actually winning, rather than editing the losing rule.
   Verified `/colleges/compare` and `/documents` (both also use
   `.doc-table`/similar) render correctly after the change.

5. **Two suspected problems, checked and found to already be correct —
   no change made.** The homepage's "Navigate Sections" (9-row list) and
   "Verified & Trusted Sources" (6-badge row) looked like stacked
   bordered cards in a compressed screenshot. Direct computed-style
   checks on both (`background: transparent`, `border-radius: 0px`,
   `box-shadow: none` on every item) showed they are **already** a
   deliberate "ruled index"/"masthead credit" pattern — one shared
   border, hairline dividers, no per-item card — with the codebase's own
   comments explaining exactly this as a considered fix to an earlier
   "badge wall"/"row of pills" version. Fixes 3 and 4 above deliberately
   borrow this same already-proven language rather than inventing a
   fourth version of it. Worth recording so a future pass doesn't
   "fix" these two again on a screenshot alone.

6. **Homepage's "Clinical Training" gallery renders as flat grey
   gradient boxes with no photo, in this sandbox specifically.** Checked
   directly (`img.complete === false`, `naturalWidth: 0`, `.img-broken`
   class never applied even after an 8s wait) — the network egress
   proxy here stalls the Unsplash request rather than failing it
   cleanly, so the sitewide broken-image fallback (a considered blue/
   teal brand gradient, `chrome.css`) never even gets the chance to
   engage; what renders is the untouched pre-load background. **Not a
   real defect to fix** — consistent with `PROJECT_STATE.md`'s existing,
   pre-dating note that this sandbox cannot reach image CDNs at all. No
   change made; flagged so a future session doesn't re-diagnose the same
   grey boxes as a new bug.

**Verified after implementing 1-4**: build clean (44 routes); CSP
unaffected (pure CSS/markup, no inline-script changes, `gen-csp.mjs
--check` current without regenerating); `console-verify` 34/34;
`a11y-verify` 32/32 (the `/staff` flake from earlier in this session did
not recur — confirming it really was timing flakiness, not a
regression); `auth-verify` 12/12; `compare-verify` 13/13;
`assistant-verify` 18/18; `csp-verify` 11/11 (45 routes, 3118/3118
handlers); `audit.mjs` **0 low-contrast, 0 mobile overflow, across all 43
routes + the assistant** (188 skipped-for-gradient elements, down from
1090 earlier this session — fewer ambiguous surfaces is itself a sign of
less glass/gradient chrome, not just a number). Additionally checked
430/768/820/1024 directly (not just 390/1440) on `/`, `/counseling` and
`/colleges` — zero overflow, zero console errors at every width, and the
768px boundary case for the hero-stat fix specifically screenshotted to
confirm the three glass panes still render side-by-side above 40rem
exactly as before.

**Not attempted this pass, and why**: a sitewide colour-token change (the
"too much pale blue" note) — reducing the surface area of glass/card
chrome across items 1-4 addresses this qualitatively without touching
`engine.css`'s tokens, which would force re-verifying contrast across all
44 routes for a much larger, harder-to-review diff. `/videos` and
`/colleges/[slug]` were screenshotted during the audit and found already
solid (the college detail page's monogram fallback in particular already
matches everything this brief is asking for elsewhere) — no changes made
there, consistent with not fixing what isn't broken.

## Status as of 2026-09-12 (Phase 5F + 5G shipped) — still current, read next

The owner explicitly approved Phase 5F, 5G and 5H by name this pass (the
"fresh explicit approval naming the phase" the previous version of this
section asked for) and authorised continuing without stopping between
them. 5F and 5G are complete; 5H was done as a bounded, real verification
pass rather than a from-scratch redo of Phase 4's already-clean baseline —
see its own paragraph below for exactly what that means and doesn't mean.

**Phase 5F — `/counseling` restructured around UNCERTAINTY → CONFIDENCE →
PERSONALISATION → ACTION → ENQUIRY → FOLLOW-UP:**
- Found and fixed a real, sitewide, pre-existing bug, not something this
  pass introduced: `switchTab()`'s same-page-reactivation branch only ever
  scrolled to `#tabs-section`, and that element turns out to be
  unreachable from `switchTab()` at all — the homepage carries no
  `pane-*` element post-Phase-2, so any same-page call there always hits
  the *navigate-away* branch instead, confirmed by reading the markup
  directly. In practice this meant **every CTA on every page that called
  `switchTab()` to point at its own current page did nothing at all** —
  confirmed concretely on `/counseling`'s own eligibility-checker result
  button ("Book Free Counseling →" / "Talk to a Counselor →"), which a
  visitor could click after finding out they don't clearly qualify and
  nothing would happen. Fixed generically in `public/assets/js/navigation.js`:
  a same-page call now scrolls to and focuses a `[data-scroll-target]`
  element inside the pane, if the page declares one.
  `/counseling`'s enquiry form is the one page that declares one today
  (`.counsel-card`); verified end-to-end with a real Playwright click,
  not just reading the code — scroll position changed and
  `document.activeElement` landed on the name field.
- The real "what happens after you enquire" content (the actual seeded
  follow-up sequence and the real 8-stage `application_stage` path, same
  source as Phase 5B) used to be hidden behind a real form submission —
  meaning the ~95% of visitors who read before they'll type a phone
  number in never saw the single most confidence-building thing on the
  page. Moved to a persistent `.counsel-journey` card beside the form,
  always visible; a real submit now marks the first step/chip "underway"
  via one class toggle rather than re-rendering the same copy a second
  time. This also closed the large dead whitespace the old layout left in
  the right column at desktop width (the sticky enquiry card with nothing
  else beside it) — confirmed by direct measurement before/after, not
  just eyeballed.
- Added a compact trust-chip strip ("Free, always" / "30-minute session" /
  "Based only on NMC/MEC rules") ahead of the eligibility checker, reusing
  the `.jr-path-step` pill grammar already established lower on the same
  page rather than inventing a second chip language.
- A real bug found mid-build, not shipped: nesting the enquiry form into
  a new flex column on its own broke nothing, but `.counsel-card`'s
  inherited `position: sticky` (built for when this column had nothing
  else in it) visibly ghosted through the new card scrolling underneath
  it — both cards are a 94%-opaque white fill, so the overlap blended
  rather than occluded. Fixed by making it `static` in this layout;
  caught by scrolling a real headless browser through the page and
  checking the rendered pixels, not by reading the CSS.

**Phase 5G — `src/components/CollegeScatter.astro`, wired into `/colleges`
right after the Phase 5C discovery table:**
- Established year vs. foreign-quota seats, coloured by ownership — a
  genuinely different graphic from `CollegeMap` (temporal/capacity, not
  geographic), built the same zero-dependency way from the same
  `getColleges()` data. Went through the workstation's `dataviz` skill
  before writing any markup: palette validated with the skill's own
  script (`--brand`/`--brand-2`, CVD ΔE 27.4/29.2 — both pass; the
  contrast WARN on `--brand-2` is satisfied by the always-present legend
  text plus a real `<details>` table view, per the skill's own rule that
  a WARN obligates one of those, not that it's dismissable), fixed
  mark/hit-target/legend specs applied (6px dot, 2px surface ring, ≥16px
  hit target, legend always present for 2 series, only 3 points
  direct-labelled — the extremes the story is actually about).
- The copy is deliberately careful about what `established` means:
  checked the data directly rather than assume it means "years running
  as an MBBS program" — it's an institutional founding year, and two
  colleges this file's own history flagged as "brand new" MBBS programs
  (Madan Bhandari AHS, Madhesh IHS) already carry a founding year (2018,
  2021), which is a different fact than first-intake year. The chart's
  lead sentence claims only the one pattern actually verified in the data
  (government colleges' seat allocation averages 4 against 44 for
  private) and says nothing about relative age, because that does **not**
  hold in one direction here — government colleges' average founding
  year (2006) is actually *later* than private colleges' (2001). Checked
  with a real computation before writing the sentence, not assumed from
  impression.
- 7 of 27 colleges have no `established` value on file; listed honestly
  in the chart's own `<details>` table (all 27 rows, "—" where blank)
  rather than dropped silently or estimated onto the plot.
- Three real bugs found and fixed during verification, each confirmed
  with a direct check before and after, not just re-screenshotted:
  1. Two colleges share an identical (year, seats) pair — Kathmandu
     Medical College and Nepalgunj Medical College, both 1997/43 — so
     one point's hit target sat entirely under the other's and was
     unreachable by hover, focus or click. Fixed generically: any
     pixel-position collision fans out along x evenly, not special-cased
     to these two colleges by name.
  2. A direct label centred on a plot-edge point (the oldest/newest
     colleges, which sit at the x-axis extremes by definition) overflowed
     past the SVG's own bounds — invisible on desktop's generous
     container gutter, genuinely clipped on mobile's horizontally-
     scrolling figure (confirmed via a cropped screenshot showing
     "hdest on record" instead of "Oldest on record"). Fixed with an
     edge-aware `text-anchor` (`start`/`end` within 90 user-units of
     either edge, `middle` otherwise).
  3. Found while fixing (2), and the more interesting bug: this Chromium
     build reports a non-`'none'` `display` and a non-zero
     `getBoundingClientRect()` for content inside a **closed** `<details>`
     element, even though `innerText` (used by the very next check)
     correctly treats that same content as unrendered. `tests/a11y-verify.mjs`'s
     `vis()` filter used the former, its `unlabelled` check the latter —
     so the new table-view's 27 college links were simultaneously
     "visible" (per `vis()`) and reported as having empty text (per
     `innerText`), i.e. 27 false-positive "unlabelled control" failures.
     Confirmed the exact mechanism with a direct `page.evaluate` dump
     (`display: inline`, real width/height, `innerText: ""`,
     `textContent`: the real name) before touching the checker. Same
     family of blind spot as the gradient-contrast one already fixed in
     this file's history — hardened `vis()` to check for a closed
     `<details>` ancestor directly (an element only counts as visible if
     it's inside that details' own `<summary>`); re-verified clean
     (27 → 0).

**Full verify result this pass** (`build-verify.mjs` skipped — still the
pre-existing, documented rollback-tag 403, unrelated to anything here):
`npm run build` clean, 44 routes; `node tools/gen-csp.mjs --check`
current after regenerating for the new inline script; `tests/csp-verify.mjs`
11/11, 45 routes, 3118/3118 handlers fired; `tests/console-verify.mjs`
34/34; `tests/auth-verify.mjs` 12/12; `tests/a11y-verify.mjs` **31/32** —
the one failure is the same pre-existing `/staff` `.cx-input`
focus-visibility timing flake this file has documented multiple times
before (Chromium's synthetic-Tab timing, not a real regression — `/staff`
touches none of this pass's files); `tests/compare-verify.mjs` 13/13;
`tests/assistant-verify.mjs` 18/18; `tests/audit.mjs` **0 low-contrast
elements, 0 mobile overflow, across all 43 routes + the assistant**
(median 387 kB). Also spot-checked tablet breakpoints (768/820/1024) on
both changed pages directly (not assumed from the 390/1440 checks above):
zero horizontal overflow, zero console errors, both new components read
cleanly at every width tested.

**Phase 5H (final mobile/tablet cinematic QA) — done as a bounded,
evidence-based pass, not a from-scratch redo, and that's a deliberate
scope call:** Phase 4 already screenshotted and fixed every route this
site has, most recently reconfirmed via the `audit.mjs` run above at
0 low-contrast / 0 overflow across all 43 routes — and none of those
files changed this pass. Redoing that whole sweep from zero would mostly
re-verify pages nothing touched. What a genuine 5H adds on top of that
already-clean baseline, and what this pass actually did:
1. Verified this pass's own two changed surfaces don't regress anything
   — the full suite result above, plus a specific check that
   `navigation.js`'s refactored `switchTab()` can't break the homepage's
   own tab-switching (it structurally can't: read the homepage's markup
   directly and confirmed it has zero `pane-*` elements, so
   `#tabs-section`'s scroll branch was already dead, unreachable code
   *before* this pass touched the function — not something this pass's
   refactor put at risk).
2. A genuinely fresh breakpoint pass this session had not done yet:
   768/820/1024 on both changed pages, screenshotted and read, not just
   overflow-checked — see the "Full verify result" paragraph above.

**Not done, and worth naming rather than quietly skipping:** a
breakpoint/motion pass on the ~15 public routes this pass did not touch
(already covered by Phase 4's own screenshots, which nothing since has
invalidated); a real Safari/Firefox check of the `@supports
(animation-timeline: view())` fallback path the `.rev`/`.m-rise` motion
system relies on (this sandbox only has Chromium; the fallback is
documented as "static, fully visible," and every reduced-motion check
this pass ran confirms the *same* fallback path renders correctly, but
that's not the same as a real non-Chromium engine); a genuine Lighthouse/
Core Web Vitals run against the deployed site (still blocked on the same
no-GPU-sandbox limitation `PROJECT_STATE.md` has documented since Phase 1).
None of these are regressions from this pass — they're pre-existing gaps
this pass didn't have the means to close, named here so a future session
doesn't have to rediscover that.

## Status as of 2026-09-12 (later pass) — superseded by the section above, kept for history

**NEET eligibility checker corrected to sourced criteria** (full account
in `PROJECT_STATE.md` and `DECISION_LOG.md`, same date). Picked up
in-progress, uncommitted work already sitting in the working tree at the
start of this pass (`leads.js`, `neet-calculator.astro` already
rewritten) and finished it: the old checker tested a raw NEET score
against invented thresholds with no source; now tests NEET percentile +
12th PCB aggregate, both already sourced in `knowledge.json`. Also
finished embedding the same checker (compact variant) on `/counseling`,
which the in-progress diff's own comment had labelled "Phase 5F" — read
as the correctness fix reaching its second existing call site, not a
start on Phase 5F's own scope (still gated below); revert
`src/pages/counseling.astro`'s `calc-wrap--compact` block alone if that
reading turns out wrong. Also fixed, because verification surfaced them and they were safe and
one value/one line each: `tools/action-allowlist.json` had drifted from
`actions.js`'s own runtime allow-list (3 missing names, zero effect on
real users, but it was corrupting `csp-verify.mjs`'s own signal on 17
pages); that same test file's NEET-calculator check used the pre-rewrite
field id; and `CollegeHero.astro`'s fallback-asset caption failed AA
contrast (3.89:1, needs 4.5:1) on all 27 college pages — `audit.mjs`
never having run to completion in a recent session (it dies earlier in
`npm run verify`'s chain on the rollback-tag issue) is presumably why
nobody had caught it yet. Full result, run suite-by-suite rather than via
`npm run verify`: `npm run build` clean (44 routes); `node tools/gen-csp.mjs`
no diff; `tests/csp-verify.mjs` 11/11 (was 9/51); `tests/console-verify.mjs`
34/34; `tests/a11y-verify.mjs` 32/32; `tests/compare-verify.mjs` 13/13;
`tests/assistant-verify.mjs` 18/18; `tests/audit.mjs` 0 low-contrast / 0
overflow across 43 routes (was 27 low-contrast before the `CollegeHero`
fix). `build-verify.mjs` itself still hits the pre-existing rollback-tag
403 (see "Blocked on the owner, not on work" far below).

## Status as of 2026-09-12 (earlier pass) — still current, read next

The site is mid-way through an "autonomous premium product builder"
operating contract (owner-supplied, governs Phase 5 onward). Phases so
far, in order, all shipped and on `claude/website-premium-design-j6mphw`:

- **Phase 4** (full-site rollout of the Phase 3 cinematic benchmark) —
  complete. See `PROJECT_STATE.md`'s Phase 4 section for the per-page
  detail; the short version is every public route got at minimum a
  visual audit, and the real gaps found (a WebGL header bug, the last
  emoji-icon holdout on `/life-in-nepal`, a few honest UX additions) got
  fixed rather than papered over.
- **Phase 5A** (homepage cinematic narrative) — complete, commit
  `e654d23`. The five homepage sections now read as one connected
  Promise→Place→Proof→Practice→Path scroll story instead of five
  independent blocks. Full detail in `PROJECT_STATE.md`.
- **Phase 5B** (visible admissions automation) — complete, commit
  `c787e0a`. `/counseling`'s enquiry-success panel now shows the real
  near-term follow-up sequence and the real 8-stage application lifecycle
  (`src/data/journey-stages.json`, sourced from `portal.js`'s own
  `STAGES`), instead of two lines of generic reassurance. Full detail in
  `PROJECT_STATE.md`.
- **Phase 5C** (interactive college discovery) — complete, commit
  `6e8df7c`. `/colleges` moves the map above the list (geographic
  understanding before the list, reusing `CollegeMap.astro` completely
  unchanged — map clicks still navigate straight to a college's detail
  page) and replaces the two static grouped tables (government / private)
  with one unified, server-rendered, searchable/filterable/sortable table
  plus a per-row compare-selection flow that hands off to the existing
  `/colleges/compare` tool via its own `?c=slug1,slug2` URL param. Full
  detail in `PROJECT_STATE.md`.
- **Phase 5D** (premium college detail experience) — complete, commit
  `f82e1e8`. `/colleges/[slug]` is rebuilt around a DISCOVER→UNDERSTAND→
  EXPERIENCE→VERIFY→DECIDE→ENQUIRE narrative: a new `CollegeHero.astro`
  (identity + a real asset-slot with a graphic, never-fabricated fallback),
  the existing `CollegeMap.astro` reused via three new optional props
  (`highlight`/`variant="compact"`/`headOverride` — homepage and
  `/colleges` are unaffected) to show this one college highlighted among
  all 27, a new 4-step academic-path timeline sourced from
  `knowledge.json`'s own already-vetted topics, and a new compare-with-
  others link into `/colleges/compare?c=<slug>`. New `CONTENT_ASSET_PLAN.md`
  defines the asset-slot architecture (7 slots, 0/27 photos filled today).
  Full detail, including a measured (not assumed) ~90-150ms TBT cost from
  reusing the map component, in `PROJECT_STATE.md` and `TECHNICAL_DEBT.md`.
- **Phase 5E** (cinematic video / real media experience) — complete, commit
  `126df2a`. Found and fixed a real, blocking bug along the way (with
  explicit approval before touching the schema): `site_videos` had no
  `category` column despite the app already assuming one everywhere, so no
  video could ever have been attached to a specific college — fixed with
  `supabase/migrations/0007_site_videos_category.sql`. Extended video-tab
  coverage from 18 to all 27 colleges (`src/data/video-categories.json`),
  connected college detail pages to their own real videos (new
  `college-video.js`, same pattern as `college-photo.js`), and added a
  featured/editorial treatment to `/videos` itself. Verified live against
  the real project: `site_videos` holds 0 rows today — the architecture is
  confirmed correct end-to-end (via mocked responses) but has nothing real
  to display yet. Full detail in `PROJECT_STATE.md` and
  `CONTENT_ASSET_PLAN.md`'s Slot 6.
- **Media-readiness follow-up** (a controlled Phase 5E extension, not
  Phase 5F) — complete, this pass. Researched Chitwan Medical College's
  official website/YouTube/social presence (`WebFetch` fully blocked in
  this sandbox — verification limited to cross-checked `WebSearch`
  snippets); found and fixed a second dropdown-code bug in the admin
  panel itself (same family as Phase 5E's, but in the UI staff actually
  use); built the requested asset/rights/featured metadata schema
  (migration 0008: `site_videos` gains rights/source/featured columns, new
  `site_photos` table for hosted-or-reference photo metadata); implemented
  a genuine UPLOAD→IDENTIFY/MAP→REVIEW→PUBLISH workflow for new video in
  the admin panel (drafts now, not instant-live); added three verified
  official reference links for Chitwan Medical College only — deliberately
  embedded no specific photo or video, since none could be confirmed
  authentic/rights-cleared from this sandbox. Full detail in
  `PROJECT_STATE.md` and `CONTENT_ASSET_PLAN.md`.

**Next approved tasks, per the roadmap, not yet started — do not begin
any of these without a fresh explicit approval naming the phase:**
Phase 5F (dedicated counselling conversion experience), Phase 5G (second
meaningful dataviz), Phase 5H (broad mobile/tablet cinematic QA).

Also still queued, not started: the owner confirming a specific CMC video/
photo is genuinely official and rights-cleared, then adding it through the
now-working admin workflow (no code change needed); sourcing real
per-college photography and video for the other 26 colleges (now that
`CONTENT_ASSET_PLAN.md` names exactly what's needed, where it goes, and
the full ingestion workflow); extending the admin panel's photo-category
picker beyond `hero` once a gallery display component exists to show the
result (`CONTENT_ASSET_PLAN.md` Slot 2); the Nepalgunj/`places.json`
location-string mismatch (`TECHNICAL_DEBT.md`, Phase 5D section) — a
content-verification task, not a code change; a dedicated performance pass
on `CollegeMap`'s per-instance cost if it becomes a priority on its own
terms rather than folded into a product-narrative phase; pulling the 9
undocumented `exam_intelligence_*` migrations already applied to the live
project down into this repo as local files (`TECHNICAL_DEBT.md`) — a real
repo/database
divergence, not something Phase 5E's own scope covered.

## Status as of 2026-09-08 — superseded by the section above, kept for history

A separate "ultra-premium cinematic" brief arrived mid-session and became
the active thread of work — it did not continue the "page interiors" chunk
this file previously pointed at (still described further down; that work
is paused, not abandoned, and is a reasonable place to return to once the
cinematic thread resolves).

**What happened, in order:**

1. **`DESIGN_AUDIT.md` (new file, repo root)** — a Phase 1 audit against
   the cinematic brief's own "audit first, do not redesign yet" process.
   Documents the stack, styling layers, motion inventory, and — the one
   thing that matters for what's next — **an unresolved conflict**: the
   brief's hero/campus sections assume photography that does not exist in
   this repo, and contradicts a recorded Phase 2 decision (no stock
   photos standing in for a campus, stated in the homepage's own copy).
   **This is still open. It blocks the hero/campus sections specifically
   if the cinematic work continues** — nothing else in the brief depends
   on it.

2. **Corporate palette is now the site default.** `engine.css` and
   `engine.js`'s `PRESETS.dawn` both moved from jade-green/orange to deep
   blue (`#1F5F8B`) + bronze (`#B4632F`) — reusing the codebase's own
   pre-existing "Porcelain" preset's colours at fuller glass/motion
   settings. Verified: 0 contrast failures, both before and after the
   change, across all 43 routes.

3. **Phase 3 visual benchmark shipped** — Navbar (real transparent→glass
   scroll transition, was previously glass unconditionally), Hero
   (cinematic field layer + staged load choreography, no photography —
   built from the same graticule/data motif as the map), a reusable
   "Crystal CTA" component (nav + hero primary actions), and the college
   map's motion (path-drawing graticule, a "ping" activation ring per
   point instead of a generic fade). Full diff: 6 files, `git log` on
   this branch from commit `6e16bf3` onward.

4. **Two real, pre-existing bugs found and fixed** while testing the
   above (not part of the 5 permitted benchmark areas, but genuine
   breakage a mandated a11y pass surfaced):
   - `prefers-reduced-motion` was silently defeated **sitewide** —
     `engine.js`'s theme `apply()` set `--mo` as an inline style
     unconditionally, which beat the CSS media query meant to zero it
     out. Fixed and verified (`--mo` now correctly reads `0`, content
     visible within 150ms under reduced motion, was previously stuck
     invisible 500–900ms).
   - No visible focus indicator on the skip-to-content link (every page)
     or the counselor console's search fields — `outline:
     var(--focus-ring)` is invalid CSS (`--focus-ring` is a box-shadow-
     shaped token), silently dropped. Fixed to `box-shadow` on both.

5. **A separate, broader ask followed**: audit the Claude *workstation's*
   skill library (not this project) for general premium-design/creative-
   technology/native-app/automation/agent-building capability. Resulted
   in 8 skills total living in `.claude/skills/` — 2 vendored
   (`taste-skill`, `redesign-skill`) plus 6 authored this session
   (`premium-design-os`, `creative-technology-lab`, `native-app-design`,
   `brand-identity-lab`, `agent-architecture-lab`, `automation-router`).
   See `.claude/skills/README.md` for what each covers and the explicit
   honesty note that none have been through `skill-creator`'s real eval
   loop yet. **Not NepalMBBS-specific** — this is workstation tooling,
   not a site feature; do not confuse it with project work when reading
   `git log` on this branch.

**Full verify suite result as of the last run this session:** `csp` ✅,
`console-verify` ✅, `a11y-verify` ✅ (after the focus-ring fix),
`audit.mjs` ✅ (0 low-contrast, 0 mobile overflow, 43 routes), `build-verify`
❌ — but on the pre-existing, documented rollback-tag issue (`CLAUDE.md`:
tags return 403 on push), unrelated to any of the above.

**⏸ Waiting on the owner before Phase 4 (full-site rollout of the
cinematic direction):**
- Confirmation that Phase 3's benchmark (screenshots sent, all 4
  breakpoints) is approved to extend to the rest of the site.
- The imagery-policy question from `DESIGN_AUDIT.md` §7 — real, licensed
  campus photography, or continue building the "no photography, data as
  the visual signature" language the hero/map already establish. This
  gates only the hero/campus-visualization sections of Phase 4, nothing
  else.

If a fresh session picks this up with neither answered: **do not guess.**
Report this section back to the owner and wait, rather than either
resuming the old "page interiors" chunk or unilaterally starting Phase 4.

---

## Status as of 2026-08-29

`npm run verify` is green: 44 routes, 0 failures, 0 low-contrast elements
with 0 skipped, 18/18 assistant checks. The full record is in
`QA_REPORT.md`. The honest score is **85/100** — see `SELF_AUDIT.md`, and
do not raise a number there because a suite went green.

**The MEC seat matrix is done.** The owner supplied the Commission's own
MECEE-BL 2026 first-matching table on 2026-08-28 and all 27 figures were
transcribed from it, summing to the document's stated total of 734. Four
were overstated in the old data — Institute of Medicine by 4.5×. Every
record now carries a `seatsSource` naming the category, round and intake,
and each college page states that a first-matching allocation is not a
standing number. Content and Trust are both 10/10 as a result. There is
nothing left to do here; do not re-open it.

## 🎯 The next chunk: page interiors

This is the largest remaining block of points that belongs to Claude
rather than to the owner or to production hardware: **Visual 16/20 and
UX 12/15**.

The chrome is coherent now — one type system, one palette, every route
clearing the fixed header. The **interiors are not**. They are still the
layout this site was built with: a section-card grid, the three-equal-
cards pattern repeated on most pages, stacked identical `.doc` blocks,
and a single column on desktop where there is room for two. Phase 3/4
made those blocks legible; nobody has yet made them good.

Start with the pages a family actually lands on, in this order:
`/` → `/colleges` → `/admission-process` → `/documents`.

Constraints that still hold while doing it:

- `npm run csp` after touching any inline `<script>`.
- Contrast is measured, not assumed — the audit will catch a regression,
  but it takes ~15 minutes, so run it in the background.
- No new typeface. `chrome.css` already maps the orphaned `Sora`/`Inter`
  rules onto the token system.

## Blocked on the owner, not on work

- **Deadline centre** (Journey 7→9, UX 12→13) needs the Commission's
  published per-intake dates. Inventing plausible ones would score well
  and be the most harmful thing this project could ship.
- **Performance 4/5** cannot be scored from this sandbox — no GPU. Run
  Lighthouse against the deployed site.
- **SEO 4/5** is capped by a decision, not a gap: the brief wants an
  "MBBS fees Nepal" page and this site declines to publish fees.
- **Rollback tags** are still local-only; `git push --tags` returns 403.
  `tests/build-verify.mjs` reads `phase1-static-rollback`, so a fresh
  clone fails verify until someone pushes them by hand.
- **Three blank `established` fields** remain (Gandaki, Janaki, Birat).
  Birat's own site contradicts itself — 1991 in one place, 2014 in
  another. The field stays blank until the college resolves it.

## The assistant is now sourced and data-driven (2026-08-28)

`public/assets/js/chatbot.js` was 45 hard-coded answers with no access to
`colleges.json`. It now reads `/api/knowledge.json`, built from
`src/data/knowledge.json` (32 sourced topics) merged with the college
records, so:

- all 27 colleges are answerable, and stay answerable when the data
  changes — there is no second copy to update;
- every answer names its source and the date that source was checked, and
  labels itself official / estimate / general;
- it declines plainly when it has no sourced answer, instead of offering
  counselling as though that were the answer.

`tests/assistant-verify.mjs` (18 checks) guards this, including a
**freshness audit that fails once `knowledge.json` is 365 days past its
last review** — it trips on the calendar, with nobody touching the repo.

**It is not an LLM, and that is deliberate.** A generative model over this
data would write fluent sentences about seat counts, fees and deadlines —
the three things most damaging to get wrong. If an LLM is ever added, the
non-negotiable is that it answers *only* from this dataset and refuses
outside it; `getBotReply()` is the seam to put that behind.

### Content tone

Public copy audited for register: no emoji or hype language remained in
page content, but three items were retoned ("Zero Visa!", the videos
blurb, the enquiry confirmation) and the 50 admin toasts had their status
emoji and exclamations stripped. Verified mechanically that only the
message literals changed — 50 toasts before and after, no logic touched.

## Design: premium pass in progress (2026-08-28)

The owner asked for a premium look and for work to continue in chunks
without stopping for approval. Done so far, each verified by screenshotting
at 390px before and after:

- ✅ **Contact bar and ticker** — these still had hard-coded *dark*
  backgrounds from the pre-Phase-3 build while `bridge.css` had flipped
  their text to dark ink. Dark on dark: the two phone numbers were
  effectively invisible. Rebuilt in `public/assets/theme/chrome.css`.
- ✅ **Fixed-header overlap** — the 69px navbar covered the first element
  of *every* page at 390px (18–25px). Raised the mobile padding floor; all
  seven routes re-measured clear.
- ✅ **Admin button hidden from the public** (`chrome.js`) — shown only on
  an existing staff session or `#admin`. Cannot lock the owner out.
- ✅ **Floating buttons 3 → 2** — the WhatsApp-call floater duplicated what
  the contact bar now offers at full size.
- ✅ **Footer** — emoji list markers (📞📲💬✉️) replaced with inline SVG;
  disclaimer restyled from a ⚠️ line into a proper standing note.
- ✅ **New `/404`** — there was none.
- ✅ **New `/privacy`** — there was none, on a site that collects a
  student's name, phone, NEET score, city, category and marks bands.
  Written from what the code does. **Needs the owner to supply two things**
  it deliberately refuses to invent: the registered legal entity, and the
  data retention period. Both are flagged on the page itself.
- ✅ **The font nobody loaded** — 41 rules asked for `Sora` and 5 for
  `Inter`; neither is loaded, so the logo, every heading, card title,
  button, statistic and college name fell back to the device's system
  sans. Only the home-page hero escaped it. Mapped onto the design
  system's own faces. This was the largest single cause of the site
  reading as generic.
- ✅ **Counseling page** — same dark-slab bug as the contact bar, on the
  most commercially important page: its headline rendered black on
  near-black. Now light, readable, and consistent with every other route.

### Design skill

`.claude/skills/` now vendors two SKILL.md files from
github.com/Leonxlnx/taste-skill (MIT), at the owner's request — reviewed
before adoption, methodology only, no scripts. Its audit is a good
checklist for the remaining passes.

### Not yet done from that audit

- Section interiors are still flat — the skill's "empty, flat sections with
  no visual depth" applies to several content pages.
- `.foot-top` is still a four-column link farm.
- Shadows are neutral rather than hue-tinted.
- Headline `text-wrap: balance` is only partly applied.
- The three-equal-cards pattern appears on a few pages.

## Deploy status (2026-08-28)

The owner asked for the Netlify deploy to be done for them, without any
manual steps on their side. Before deploying, the `docs/GOLIVE.md`
prerequisites were checked **directly against the live database** rather
than asked about, and all pass:

| Check | Result |
|---|---|
| `staff` rows with `role='admin'` | 1 — no admin-lockout risk |
| `sequence_steps` seeded | 7 — follow-up tasks will materialise |
| public tables with RLS off | 0 |
| `leads` row-level security | on — student contact data is not publicly readable |

So GOLIVE steps 1 (migrations) and 2 (first staff account) were already
done before this session. The deploy is therefore the documented step 3.

Netlify site: `nepalmbbs` / `fac99d5b-96f8-4ff9-a9da-a34b962a7d13`,
primary URL `https://nepalmbbs.in`.

**Caveat worth carrying forward:** the Netlify MCP `deploy-site`
operation takes only a `siteId` — it exposes no draft/preview flag, so a
deploy through it cannot be guaranteed to stay off production. The
repo's own `docs/DEPLOYMENT.md` prefers a branch deploy or deploy preview
first. If a future session needs a genuine preview, use the Netlify CLI
(`netlify deploy` without `--prod`) rather than this tool.

## College data: what got fixed, and what is still open

Two research passes ran (see `CONTENT_SOURCE_LOG.md` for full sourcing).
The second pass restricted search to each institution's **own website**,
which is what the applied fixes rest on.

### ✅ Fixed in `src/data/colleges.json`

- **A wrong institution name** — "Universal Medicine College" →
  **"Universal College of Medical Sciences"**, per ucms.edu.np itself.
  Also filled its `established` (1998) and `website`.
- **CMS Bharatpur `established`** 1994 → **1993**, per cmsnepal.edu.np
  (agreement signed 8 Aug 1993). Their first MBBS intake was 1996 — both
  dates are recorded in the log so this isn't "corrected" back by mistake.
- **Two missing official websites** filled (NAIHS, Rapti AHS).

### ❌ A flag that turned out to be wrong (worth reading before you trust the rest)

The first pass claimed PAHS's `established: 2010` was wrong because
secondary sources said 2008. **That was my error.** PAHS's own site says
teaching began in 2010; 2008 is the charter year. Both are true, they
just mean different things. Value left unchanged.

The lesson matters for the remaining blanks: an aggregator's
"established" year may be measuring a different milestone than this
dataset means. Do not bulk-fill them.

### ⚠️ Still open — needs MEC or a phone call, not more searching

1. **Kathmandu Medical College foreign-quota seats** — site says 43, one
   secondary source says 33. KMC's own site doesn't publish the number.
2. **Pokhara Academy (PoAHS)** — *downgraded from the earlier alarm.*
   Their own site does have an MBBS page, so the program appears to
   exist; the "launching by 2024" text that worried me is stale content
   on a different domain of theirs. What's still unconfirmed is whether
   it takes **foreign-quota** students and whether "4 seats" is right.
3. **NAIHS `established`** — still blank. Two defensible dates (2010
   ministry approval, 2012 inauguration); left blank rather than guessed.
4. **7 other blank `established` fields** — candidates exist in the log
   but only from aggregators. Left alone deliberately (see the PAHS
   lesson above).
5. **Three MBBS programs are brand new** — B&C (2024), MIHS (2024),
   Madan Bhandari (2025) — and the site doesn't say so. Surfacing "first
   intake YYYY" would fit the existing trust-register design and is
   arguably owed to a family comparing a first-intake program against a
   30-year-old one.

## Done since this file was last written

- ✅ **Removed dead code**: `src/components/Hero.astro` (confirmed
  unused anywhere — zero imports found by search) and the boot.js step
  that called it, `wrapHeroContent()`/`initHeroSlideshow()`, neither of
  which exist anywhere in the codebase. This ran, threw, and was silently
  swallowed on **every single page load, site-wide**, since whenever the
  functions were removed — invisible to `build-verify.mjs` because it
  only listens for uncaught `pageerror`, not `console.error`. Full verify
  suite re-run after this change; see `QA_REPORT.md`.
- ✅ **First-pass content-sourcing research, all 27 colleges** — see
  `CONTENT_SOURCE_LOG.md` for the per-college tables with sources.
  Done via `WebSearch` only (`WebFetch` is blocked in this sandbox for
  every domain tried, including MEC Nepal's own site). Found 1 wrong
  name, 2 wrong-looking years, 1 conflicting seat count, 1 program whose
  existence couldn't be confirmed, 3 undisclosed brand-new programs, and
  9 fillable blanks. Nothing auto-corrected — see the 🔴 section above.
- ✅ **College comparison tool** — `src/pages/colleges/compare.astro` +
  `public/assets/js/compare.js`, linked from `/colleges`. Pick up to 4
  colleges, compare the exact fields already published on each college's
  own page (nothing new, nothing estimated). Verified by
  `tests/compare-verify.mjs` (13/13), wired into `npm run verify`. See
  `DECISION_LOG.md`'s 2026-08-28 entry for why it was built this way.
- ⛔ **Fee/cost planner — do not build this** without re-reading
  `DECISION_LOG.md`'s 2026-08-28 entry first. The codebase has an existing,
  deliberate, already-written editorial decision *not* to publish fee
  figures (`colleges/index.astro` and `colleges/[slug].astro` both say so,
  in their own copy, not just in these memory files). A calculator would
  reverse that decision, not fill a gap — and this session did not have
  the standing to make that call unilaterally on the owner's behalf.
  Revisit only if the owner explicitly decides to change that policy.

## Recommended next chunk, in order

1. **Work the 🔴 list above** — resolve each against a primary source
   (the college's own site, or MEC Nepal), then correct
   `src/data/colleges.json` and record the confirmation in
   `CONTENT_SOURCE_LOG.md`. Items 1 and 2 (PoAHS's program, the wrong
   college name) carry real "a family could be misled right now" risk;
   the rest are accuracy debt.

2. Re-check whether the three legacy glass-CSS variants noted in
   `docs/DESIGN-SYSTEM.md` §4 are actually dead now that the Phase 3/4
   theme engine exists, or still shipping (see `TECHNICAL_DEBT.md`).
   Quick, bounded, good "in-between" chunk if 1–2 are blocked.

4. A deadline/announcement center (brief §10.H) is still a real gap and
   still needs real dates from an official source before it can exist —
   same rule as fees: no invented dates, ever.

## What NOT to do without asking

- Do not build a fee/cost calculator or publish any fee figure — see
  "Done since this file was last written" above. This is now the second
  time it's written down; treat it as settled, not open.

- Do not touch `supabase/migrations/`, apply a migration, or change RLS
  policy — this is database access the brief itself flags as needing
  explicit care, and `docs/GOLIVE.md` is the only source of truth for
  sequencing that.
- Do not deploy, connect Netlify, or point production at this branch.
  Nothing here goes live until the owner explicitly says so — this is
  stated directly in the session's own operating instructions, not just
  inferred caution.
- Do not remove `public/wrc-tracker/` or `public/cmc-tracker/`, or change
  their CSP — they're deliberately untouched, verbatim legacy apps.
- Do not fabricate college fees, seat counts, deadlines, or recognition
  status to fill a gap. Mark as unverified/estimated instead, and log it
  in `CONTENT_SOURCE_LOG.md`.
