# PROJECT_STATE.md

_Last updated: 2026-09-12. Read this file first in any new session before
doing implementation work — an earlier version of this file (last touched
2026-08-27) had drifted badly out of sync with reality and is not a
reliable starting point; if this one starts to feel that way too, verify
against the actual repo rather than trusting it._

## ⭐ 2026-09-13 — Royal-premium colour pass

Full account in `NEXT_TASK.md`'s top section. The owner's complaint: the
colour system still read "too pale/generic"; target "this looks
expensive," not "clean college website." A token-level pass in
`engine.css` (every value computed against WCAG contrast math before
being chosen — this file's own header records a past incident where a
hand-picked ramp shipped ~890 broken contrast checks) plus three targeted
surface changes, not a full redesign.

Deepened `--brand` (#2464E0→#1B4CC7), `--brand-2` (#20B78E→#0F9B87,
confirmed decorative-only sitewide by grep before touching it),
`--navy-accent`/`--sky` (the footer's Three.js pair), and the aurora
tints — all derived tokens (`--brand-soft/-line/-deep/-lift`, `--sd-
brand`, the focus ring) update automatically. Added a new restrained
warm accent (`--accent-warm` decorative, `--accent-warm-text` a
separately-verified AA-safe variant) used sparingly: the hero's primary
glow core, the CTA's sheen/hover glow, and the scatter chart's three
superlative labels. Deliberately left `--g-base`/`--g-ink` ramp and the
hero's light ground untouched — the former is the exact "solved" ramp
this file warns against hand-editing, the latter is a previously
reversed dark→light decision this file's own history already argued out
(2026-09-08 entries) and reversing it again wasn't this brief's call to
make unilaterally.

Highest-leverage single change: `.doc-head` (the header band on every
college Record panel, the compare picker, guidelines, privacy and
documents — 16 instances sitewide) went from pale-gray-on-white to a
deep navy gradient with white/warm-tinted text, with every possible
nested child (title, kicker, and guidelines.astro's verified badge)
given an explicit, independently contrast-checked dark-ground override.

**Verified**: build clean; CSP unaffected; full fast suite green
(console/a11y/compare/assistant/auth); two full `audit.mjs` runs — one
checkpointing the token-only change, one after `.doc-head` — both 0
low-contrast / 0 mobile overflow across all 43 routes. Screenshots
confirmed the palette at both 1440px and 390px on the hero, a college
Record panel, guidelines and the compare picker.

## ⭐ 2026-09-13 — Cinematic spatial escalation, round 2

Full account in `NEXT_TASK.md`'s top section. Two additions, both still
CSS/DOM-only: (1) real scroll parallax (`.m-para-shift`, new in
`motion.css`, `animation-timeline: view()`-driven like everything else
here) between the three atmospheric fields and their foreground content;
(2) the homepage map now tilts toward the pointer via the existing
`.gl--live` system, on a new `.map-tilt` wrapper rather than `.map-figure`
itself.

That second one surfaced a genuine, non-obvious CSS interaction worth
remembering: a scroll-driven CSS Animation with `animation-fill-mode:
both` permanently wins the cascade for whatever property it animates,
over *any* plain declared value for that property on the same element,
regardless of specificity — so `.m-focus`'s entrance animation (ends on
`transform: none`) silently killed `.gl--live`'s tilt transform on the
same element. Confirmed by reading `getComputedStyle(...).transform`
after a real pointer move rather than trusting a screenshot (a tilt of a
few degrees doesn't read clearly in a static image anyway). Fixed by
splitting the two transforms onto separate elements — the same pattern
`GlassHero.astro`'s stat cards already use for the identical reason.

**Verified**: build clean; CSP unaffected; full fast suite green
(console/a11y/auth/compare/assistant); `csp-verify`/`audit.mjs` re-run
clean against the final build (a first pass was invalidated by a rebuild
mid-run — see `NEXT_TASK.md`'s process note). Confirmed via 6-position
scroll screenshots that the new parallax never exposes a seam, and via a
real college detail page that the map's `highlight`/compact-variant reuse
still works with the new `.map-tilt` wrapper.

Two further additions the same day, full detail in `NEXT_TASK.md`:
`/colleges`' scatter chart points now scale+fade in staggered by index
(the same "data entering with depth" treatment the map's own points use,
reusing that pattern's `IntersectionObserver` approach rather than
adding `animation-timeline: view()` to SVG children, which the map
component had already implicitly avoided for the identical element
type); and the compare-picker's result table now pops in with depth
every time the selection changes and the table is rebuilt from scratch,
a real "selection → spatial response" achieved on the table itself after
a per-checkbox tilt was reconsidered and rejected again for the same
wobble reason as before. Both independently verified green across the
fast suite plus a reduced-motion check.

## ⭐ 2026-09-12 — Cinematic depth pass (CSS/SVG only, no new WebGL)

Full account in `NEXT_TASK.md`'s top section. The owner asked for a step
up toward "cinematic digital experience" — richer colour, spatial/3D
interaction, scroll choreography — while explicitly gating new WebGL on
"genuinely superior AND performance remains acceptable." Given this
project's own documented history of a severe WebGL performance
regression (the "Critical finding" section above this one — TBT 30-58x
over budget before Phase 1's mount-gating rework), delivered entirely
with CSS/SVG and the site's own already-running pointer-tilt system:
zero new JS, zero new WebGL, zero new dependencies.

Added two atmospheric fields — `.map-field` (teal) for the homepage's
Place chapter and `.practice-field` (navy) for the new Practice/
`AcademicJourney` chapter — using the exact recipe `.gh-field`/
`.trust-field` already established (two masked `linear-gradient` layers),
so all five homepage chapters now have their own tonal register instead
of two. Both colours are existing tokens already used elsewhere for
related reasons (teal already previewed at the hero's own bottom edge;
navy already the footer's own WebGL-scene pair), not new brand colours.
Also reversed a standing mobile restraint: `.trust-field` and
`.gh-glow--handoff` used to `display: none` below 48rem entirely: reduced
to a lower opacity instead, since this pass's own brief was explicit that
mobile should not lose the atmosphere.

One genuine spatial-interaction addition: `CollegeHero.astro`'s identity-
mark panel now carries `.gl--live`, the pointer-tilt + specular system
already built for the hero's own stat panes, extended to one more static
element. Found and fixed a real, not-yet-triggered bug while wiring it
up: the specular highlight's default z-index would have rendered *under*
a college's real photo once one is finally uploaded (0/27 today) — fixed
before it could surface.

**Verified**: build clean; CSP unaffected; full test suite green
(console/a11y/auth/compare/assistant/csp-verify, `audit.mjs` 0 low-
contrast / 0 overflow across 43 routes); `perf-verify.mjs` run and read
against the existing documented baseline rather than skipped — TBT/LCP
shape is unchanged (elevated only on WebGL-mounting routes, near-zero on
`/staff`/`/portal`), consistent with a CSS-only change having no
mechanism to move it. 390px screenshots confirm both new fields and the
tilt panel render correctly with zero overflow.

## ⭐ 2026-09-12 — Autonomous execution mandate: continued design pass

The owner handed over full autonomous execution authority after the
design pass below shipped. Continued the same screenshot → verify-by-
computed-style → fix discipline across the rest of the site. Full detail
in `NEXT_TASK.md`'s top section.

**Homepage "Clinical Training" gallery replaced entirely** (not just
given a better broken-image fallback): it was three Unsplash stock
photos, directly contradicting the homepage's own hero copy ("no stock
photographs standing in for a campus") — an unresolved conflict this
codebase's design history had already flagged (`DESIGN_AUDIT.md` §7).
New `AcademicJourney.astro` replaces the deleted `MedicalGallery.astro`,
reusing the same four-stage academic sequence `colleges/[slug].astro`
already builds from `knowledge.json`'s sourced topics, rendered with the
same `.doc-steps` scroll-spine component `admission-process.astro` and
every college detail page already use. Needs no photography, so nothing
in it can go dead as a hotlink. Kept its `id="hp-practice"` exactly where
the homepage's own chapter rail expects it — verified the rail still
highlights correctly at this scroll position.

**Two more real, confirmed-via-computed-style fixes**: `/videos`' two
emoji icons replaced with inline SVG (same fix already applied elsewhere
in this codebase, for the same reason); `/faq`'s 13 questions — each
individually shadowed, rounded and margined (confirmed, not assumed) —
consolidated into one shared panel with the existing category labels as
section headers and each question a flush ruled row, the accordion
behaviour itself untouched. `/videos`' own 27-college filter pills and
`/colleges/[slug]` and `/admission-process` were all checked and found
already correct/solid — no changes made to any of them.

**Deliberately not touched**: `/why-nepal` and `/life-in-nepal` carry the
same stock-photo hotlink fragility the homepage gallery did, but
photography is those two pages' entire structural content, not a
substitutable section — replacing it is a real content/architecture
decision, not a targeted visual fix, and both already have a working
broken-image fallback for a production hotlink's actual failure mode
(distinct from this sandbox's own network-stall behavior). Recorded as a
considered stop, not an oversight.

**Verified**: build clean, one file removed and one added; CSP
unaffected; `console-verify` 34/34; `a11y-verify` 32/32 (twice in a row —
the `/staff` flake from earlier in the session did not recur);
`auth-verify` 12/12; `compare-verify` 13/13; `assistant-verify` 18/18;
`csp-verify` 11/11 (3118/3118 handlers); `audit.mjs` 0 low-contrast / 0
overflow across all 43 routes + assistant.

## ⭐ 2026-09-12 — Design-led visual reconstruction pass (post-5F/5G)

Full account, including how each finding was verified, is in
`NEXT_TASK.md`'s top section. Short version: the owner reviewed real
mobile screenshots and found the visual bar not met ("too many bordered
cards... form/dashboard feeling"), and asked for an evidence-based audit
followed by targeted fixes — not a rewrite.

Screenshotted the main pages first, then verified every suspected problem
against **computed style** before touching code — this caught two false
positives (the homepage's "Navigate Sections" and "Verified & Trusted
Sources" looked like stacked cards in a compressed screenshot but are
already a deliberate ruled-index/masthead pattern with zero per-item
border/shadow) before any code changed on them, and confirmed one problem
was a genuine, wins-by-cascade CSS bug rather than a style choice worth
just overriding again.

**Four real fixes shipped**, in order of reach: (1) the footer's ~20
mobile links carried an always-on crystal-glass pill at rest instead of
on hover — moved the (already well-built) treatment to `:hover`/
`:focus-visible` only, which also un-shadowed a dead, correctly-intentioned
rule already sitting in `premium.css`; (2) `/colleges`' 27-college mobile
list gave each of 6 fields per college its own border and 16px padding —
a real bug (`trust.css`'s correct one-border-per-row mobile design was
being silently overridden by a later, equally-specific `!important` rule
in `premium.css`), fixed by restoring the original intent from the layer
that was actually winning; (3) the homepage hero's three stat tiles were
individually-glowing glass cards stacked full-width on mobile — reused
the site's own existing `.stat-box` "no box, a rule, a number" language
(built for the admin console, never brought to the public site) rather
than inventing a second one, leaving the genuinely well-built desktop
glass-pane treatment (a spinning conic-gradient rim light per stat)
completely untouched; (4) `/counseling`'s three contact options were
three separately-elevated cards in a column on the site's highest-
commercial-value page — merged into one shared panel of ruled rows,
reusing the same "one border, hairline dividers" language `SectionNav`
and `TrustSection` already established.

One suspected issue (the homepage's broken-looking "Clinical Training"
image gallery) was checked and found to be a sandbox-only network
artifact — the egress proxy stalls the Unsplash request rather than
failing it, so the sitewide broken-image fallback never gets the chance
to engage. Not fixed, because there was nothing to fix in the code;
documented so it isn't re-diagnosed as a new bug.

**Verified**: build clean, CSP unaffected (pure CSS/markup change,
`gen-csp.mjs --check` current); `console-verify` 34/34; `a11y-verify`
32/32; `auth-verify` 12/12; `compare-verify` 13/13; `assistant-verify`
18/18; `csp-verify` 11/11 (3118/3118 handlers); `audit.mjs` 0 low-contrast
/ 0 overflow across all 43 routes + assistant (188 gradient-skipped
elements, down from 1090 earlier the same session — less ambiguous glass
chrome, not just a smaller number). Additionally checked 430/768/820/1024
directly on the three changed pages — zero overflow, zero console errors
— including a specific screenshot at 768px confirming the hero-stat fix's
breakpoint boundary renders the three glass panes side-by-side exactly as
before above 40rem.

## ⭐ 2026-09-12 — Phase 5F (counselling conversion) + Phase 5G (second dataviz) shipped

Full account, including every bug found and exactly how each was verified,
is in `NEXT_TASK.md`'s top section — this is the short version.

**Phase 5F** rebuilt `/counseling` around the owner's own UNCERTAINTY →
CONFIDENCE → PERSONALISATION → ACTION → ENQUIRY → FOLLOW-UP brief. The real
finding: the page's "what happens after you enquire" content (the actual
seeded follow-up sequence plus the real 8-stage application path, sourced
from Phase 5B) only ever rendered *after* a real form submission, which
means the large majority of visitors — who read before they'll hand over a
phone number — never saw the one thing most likely to earn that trust. Made
it a persistent card beside the enquiry form instead. Also found and fixed
a genuine sitewide bug, not scoped to this page: `switchTab()`'s same-page
branch has been unreachable-by-design since Phase 2 removed multi-pane
pages, except it still ran a scroll-to-`#tabs-section` that only the
homepage has and that the homepage's own switchTab calls can never reach
(no `pane-*` elements there at all) — meaning every "talk to us" style CTA
elsewhere in body copy that pointed at its own current page was a **dead
click**, confirmed concretely on this page's eligibility-checker result
button. `navigation.js` now scrolls to (and focuses) a page-declared
`[data-scroll-target]` instead.

**Phase 5G** added `src/components/CollegeScatter.astro` — established year
vs. foreign-quota seats, by ownership — to `/colleges`, right after the
Phase 5C discovery table. Deliberately not another `CollegeMap`: temporal/
capacity, not geographic, built the dataviz skill's way (validated
categorical palette, fixed mark/hit-target specs, a real `<details>` table
as the required accessible fallback). The copy only claims what the data
actually verifies — government colleges' seat allocation averages a
fraction of private colleges' (4 vs 44, checked directly) — and deliberately
says nothing about relative age, since that pattern does not hold in one
direction in the real data (checked before writing, not assumed).

**Two bugs worth knowing about if this pattern comes up again**: (1) an SVG
direct label centred on a plot's own edge point overflows past the SVG's
bounds — invisible on a wide desktop gutter, genuinely clipped on a
mobile horizontally-scrolling figure; fix is an edge-aware `text-anchor`,
not a wider container. (2) `tests/a11y-verify.mjs`'s `vis()` visibility
check reported real dimensions for content inside a **closed** `<details>`
element in this Chromium build, even though `innerText` (used one check
later, in the same function) correctly reports it as empty — a checker
blind spot that would misfire on any future `<details>` use, now fixed by
checking for a closed `details` ancestor directly in `vis()` itself.

**Verified**: `npm run build` clean (44 routes); CSP regenerated and
current; `csp-verify` 11/11 (3118/3118 handlers); `console-verify` 34/34;
`auth-verify` 12/12; `a11y-verify` 31/32 (the one failure is the
pre-existing, previously-documented `/staff` `.cx-input` focus-timing
flake — unrelated, that page touches none of this pass's files);
`compare-verify` 13/13; `assistant-verify` 18/18; `audit.mjs` 0
low-contrast / 0 overflow across all 43 routes + the assistant. Additionally
screenshotted both changed pages at 768/820/1024 (not just the usual
390/1440) — zero overflow, zero console errors, both new components read
cleanly. `build-verify.mjs` still hits the pre-existing rollback-tag 403 —
unrelated, documented since Phase 4.

## ⭐ 2026-09-12 — NEET eligibility checker corrected to sourced criteria, embedded on /counseling

The tool at `/neet-calculator` (`public/assets/js/leads.js`'s
`checkEligibility()`) compared a student's raw NEET score against
invented thresholds (`{gen:400, obc:370, sc:320}`) that trace to no
published source — a direct instance of the rule 1 violation
`CLAUDE.md` exists to prevent, present since long before this session.
NMC India resets the qualifying *mark* every year against that year's
results and does not publish it in advance, so no fixed-score check can
ever be honest here. Rewrote it to check the two criteria the FMGL
Regulations 2021 actually do fix in advance — NEET **percentile**
(50th for General/OBC, 40th where reservation applies) and 12th PCB
**aggregate** (same split) — both already sourced and dated in
`src/data/knowledge.json`. The result now shows each criterion as its
own row against the rule it's measured by, rather than one verdict.

The same component (compact variant) is now also embedded on
`/counseling`, above the enquiry form — "not sure you qualify, check
first" as the moment before a student commits to the form. One
function, one set of element ids per page (the two pages never overlap
at runtime); no second calculator system. Added the CSS this needed
using the site's actual current light-theme tokens (`--m-hairline`,
`--g-ink-*`) rather than the component's own pre-Phase-3 dark-card
assumption still sitting in `base.css` above it — `.calc-wrap` is one of
`bridge.css`'s generically-aliased cards, so its rendered surface is
already the light glass fill, not the dark navy gradient the
un-migrated rule still declares.

Three unrelated, pre-existing bugs found and fixed during verification —
full account in `DECISION_LOG.md`'s entry of the same date:
`tools/action-allowlist.json` had silently drifted from `actions.js`'s
own runtime allow-list (three handlers added directly during the prior
session, bypassing `tools/dehandler.py`); `tests/csp-verify.mjs`'s own
NEET-calculator check used the pre-rewrite field id; and
`CollegeHero.astro`'s fallback-asset caption failed AA contrast (3.89:1,
needs 4.5:1) on all 27 college pages. All three fixed. Full suite, run
individually since `npm run verify`'s own `build-verify.mjs` step still
hits the pre-existing rollback-tag 403: `csp-verify` 11/11 (was 9/51),
`console-verify` 34/34, `a11y-verify` 32/32, `compare-verify` 13/13,
`assistant-verify` 18/18, `audit.mjs` 0 low-contrast / 0 overflow across
43 routes (was 27 low-contrast before the `CollegeHero` fix).

## 2026-09-12 — Media-readiness follow-up (Phase 5E extension) shipped

A controlled, explicitly-scoped follow-up to Phase 5E: make the media
system usable now, without waiting on the owner's own photo/video uploads,
using officially-published CMC resources where legitimately usable, and
build a documented future-ingestion system. Not a Phase 5E redesign, not
Phase 5F.

**Research**: investigated Chitwan Medical College's official website and
YouTube/social presence via `WebSearch` (`WebFetch` is blocked in this
sandbox for every external domain tried, confirmed directly — the same
constraint `CLAUDE.md` already documents). Confirmed an official website
(`cmc.edu.np`) and official Facebook page (`facebook.com/cmcteachinghospital`)
via matching contact details across both; found a plausible official
YouTube channel by name but could not independently verify it. Found
several YouTube "campus tour"/"virtual tour" videos but deliberately did
**not** embed any of them — their actual uploader/channel could not be
confirmed, and several search results were explicitly third-party
(a named individual's review, another consultancy's own series). Embedding
one as this college's official evidence without that confidence would be
the exact misattribution this project's standing content rules exist to
prevent. Added the three verified presences as outbound reference links
instead (`src/data/official-sources.json`) — the safe, honest middle
ground between "embedded evidence" and "nothing," rendered as a distinct
"Official [college] sources" note on Chitwan Medical College's own detail
page only.

**Second bug found and fixed, same family as Phase 5E's**: the admin
panel's own video-add dropdown (`AdminPanel.astro`) had its own,
never-aligned 13-code list — 4 codes actively wrong (`manipal`/`nmc-b`/
`lumbini`/`chitwan` vs the real `mcoms`/`nmcb`/`lmc`/`cmc`), 9 colleges
missing entirely. Even after Phase 5E's schema fix, using this dropdown to
tag a Chitwan Medical College video would have silently saved it under a
code nothing reads. Fixed by generating the dropdown from
`video-categories.json` directly — all 27 colleges, correct codes,
impossible to drift out of sync again.

**Schema (migration 0008, applied to the live project)**: `site_videos`
gained `rights_status`/`source_type`/`poster_url`/`featured` (all
nullable/defaulted, zero impact on the 0 existing rows). New `site_photos`
table — `kind: 'hosted'` (a real file in `college-photos`, with caption/alt
text/rights status/featured/ordering) or `kind: 'reference'` (an official
external link, no file, used when reuse rights are unclear) — RLS mirrors
`site_videos` exactly (public read, staff write). Verified via
`get_advisors` afterward: zero new security findings.

**Admin panel workflow (UPLOAD → IDENTIFY/MAP → REVIEW → PUBLISH)**: new
videos now save as a draft (`is_active: false`) with a Publish button in
the admin's own video list, rather than going instantly live the moment
"Add to Supabase" was clicked — a wrong URL or mistyped college used to
reach a visitor with zero chance to check it first. The hero-photo upload
flow's existing "instant live" behaviour was deliberately *not* changed
(it predates this pass, is documented, and works well); it gained optional
caption/alt-text/rights-status fields instead, plus a parallel
"link to an official source" path for reference-only assets. Full
non-technical walkthrough in `CONTENT_ASSET_PLAN.md`.

**Rendering**: `college-photo.js` now prefers `site_photos`' metadata
(caption/alt text) when present, falling back to the original
Storage-only behaviour otherwise — zero regression for anything uploaded
before this pass. `vidCardHTML`/`renderVideoGrid`/`college-video.js` now
show a small rights/source line when meaningful, and an explicit
`featured: true` row leads regardless of upload order (verified via a
mocked Supabase response, since no real video exists to test against
naturally). Two more small pre-existing bugs fixed while in this code:
`addVideo()`'s own "show immediately" DOM injection (now removed — it
would have shown a draft as if it were live) and a stale comment/behaviour
mismatch now corrected in the same functions.

**Deliberately not done**: no CMC photo or video was copied, downloaded,
or embedded — every slot on Chitwan Medical College's own page still shows
its honest graphic fallback or empty state, now alongside three verified
reference links. No new visual language, no WebGL, no GSAP/Lenis. No touch
to the `exam_intelligence_*` migration divergence (documented separately,
explicitly out of scope for this pass per the user's own instruction).

**Verified**: production build (44 routes, clean); CSP unaffected (no
inline-script changes); Playwright checks across all 6 breakpoints on
Chitwan Medical College's own page (zero overflow); the official-sources
block's 3 links (correct hrefs, `target=_blank`/`rel=noopener`, keyboard-
focusable) render only for the one college with a verified entry and
correctly absent for every other; a mocked-Supabase pass confirming
featured-first ordering and the rights badge on both `/videos` and a
college detail page; a `prefers-reduced-motion: reduce` pass; the admin
panel opens with zero JS errors and all new fields (rights status,
featured checkbox, caption/alt/reference-link inputs) present and the
college dropdown showing all 27 correct entries; no console/page errors
beyond this sandbox's pre-existing, already-documented network egress
restrictions.

## ⭐ 2026-09-12 — Phase 5E (cinematic video / real media experience) shipped

The strategic question this phase actually answered wasn't "what video
should we add" — it was "does the video system that already exists
actually work, and is it connected to anything." `/videos` had a real,
honest, admin-managed video system (`site_videos` table, click-to-play
YouTube embeds, an honest per-college empty state) that predates this
phase. What it lacked: coverage (9 of 27 colleges had no tab at all),
connection (college detail pages had zero link to it), and editorial
presentation (a flat grid, no featured treatment). One of those turned out
to be a real, blocking bug rather than a gap — see below.

**Investigated before coding**: `/videos.astro`, `colleges.js`'s video
rendering (`renderVideoGrid`/`renderNoVideoState`/`playVid`), `admin.js`'s
video-add form, `CONTENT_ASSET_PLAN.md`, `college-photo.js` (the pattern to
match for a new per-college slot), `[slug].astro`'s existing asset slots
from Phase 5D, and the site's CSP (confirmed `img.youtube.com`/
`youtube-nocookie.com`/Supabase were already whitelisted — no CSP change
needed for this phase's own additions).

**Critical finding, not assumed**: using live Supabase MCP access to the
real project (`fpzgcijbryvddtpegcmm`), confirmed `site_videos` has **zero
rows** and, more importantly, its live schema **had no `category` column
at all** — despite `/videos.astro`'s tabs, `admin.js`'s form, and
`colleges.js`'s filter all already reading/writing one. Every per-college
video filter in the app had been silently matching nothing since before
this phase; any video an admin added would have landed with no way to
attach it to a college. Flagged to the user before touching the schema
(standing project rule); approved; fixed with a new, minimal, additive-only
migration (`0007_site_videos_category.sql` — nullable `category text`, no
RLS change, verified via `get_advisors` to introduce no new findings).
Also discovered, not investigated further: the live project has 9 applied
migrations (`exam_intelligence_01`-`09`) with no corresponding file
anywhere in this repo — recorded as its own item in `TECHNICAL_DEBT.md`.

**What shipped**:
- **`src/data/video-categories.json`** (new) — the single source of truth
  mapping all 27 colleges (up from 18) to the video category code and
  display label. The missing 9 (Patan, Karnali, Nepalese Army, Pokhara,
  Rapti, Madhesh, Madan Bhandari, Purbanchal, B&C) now have both.
- **`/videos.astro`** generates its tabs from that file instead of 18
  hand-typed buttons, and now supports `?college=<code>` to land
  pre-filtered — the mechanism a "watch more from this college" link needs.
- **`public/assets/js/college-video.js`** (new, loaded sitewide like
  `college-photo.js`) — a college detail page's own video slot: fetches
  `site_videos` filtered to that college's category, renders a featured
  click-to-play card if any exist (with a "watch N more" link into the
  fuller library), or an explicit "no video on file yet for [college]"
  state otherwise. Verified against mocked Supabase responses (no real
  video exists yet to test against naturally): thumbnail-first with zero
  iframes loaded until click, exactly one iframe after a click, the
  non-clicked video in a multi-video set never eagerly loads.
- **`[slug].astro`** gained a "See [college]" section (EXPERIENCE, placed
  before the academic-path timeline — evidence before explanation) hosting
  the new slot, with a `<noscript>` fallback linking to `/videos` for the
  no-JS case.
- **Editorial "featured" treatment** (`.vid-featured`/`.vid-card--featured`,
  `base.css`) — the first video of a set renders larger, with fuller
  caption context, side-by-side with its thumbnail from tablet width up;
  the rest stay in the existing plain grid. Used identically on `/videos`
  and every college detail page — one visual language, not two.
- Fixed in the same pass: `renderNoVideoState`'s college-name lookup used a
  `[onclick*=...]` selector against buttons that have never carried
  `onclick` (they use `data-act`/`data-do`), so it always silently fell
  back to "this college." Now passed the clicked button directly. Also
  fixed `playVid`'s embed URL, which always produced a malformed double
  `?` (`...?rel=0?autoplay=1`) — found while verifying click-to-play
  against a real embed URL.
- **`CONTENT_ASSET_PLAN.md`** Slot 6 rewritten with the verified-real status
  (0 rows, architecture now correct end-to-end) and the schema fix.

**Deliberately not done**: no stock or generic video anywhere (there is
none to show — every path either shows a real video or says plainly that
none exists yet); no WebGL, GSAP, or Lenis; no autoplay; no per-college
photo gallery (Slot 2 — still no real photography to display, per
`CONTENT_ASSET_PLAN.md`); no fabricated testimonial or campus claim.

**Verified**: production build (44 routes, clean); CSP unaffected
(no inline-script changes this phase); Playwright checks at
390/430/768/820/1024/1440 on both `/videos` and a college detail page
(zero horizontal overflow at any width); the real (unmocked) empty-state
path end-to-end on both pages; `?college=` deep-link pre-selection;
keyboard reachability; a `prefers-reduced-motion: reduce` pass; a
mocked-Supabase-response pass proving the featured/click-to-play/lazy-load
mechanics actually work, not just compile; no `pageerror`s anywhere (the
only console errors present are this sandbox's pre-existing, already-
documented network egress restrictions on Google Fonts and Supabase).
No dedicated performance run: this phase's JS is a small, dependency-free
script mirroring `college-photo.js`'s existing footprint, and the only
new images are click-gated YouTube thumbnails — no new render-blocking
resource exists to move Core Web Vitals.

## ⭐ 2026-09-12 — Phase 5D (premium college detail experience) shipped

The college detail page (`/colleges/[slug]`) was a generic `PageHeader` plus
one "Record" table plus a fee caveat plus an enquire button — a fact sheet,
not the decision surface the brief asked for. Phase 5D rebuilds it around a
DISCOVER → UNDERSTAND → EXPERIENCE → VERIFY → DECIDE → ENQUIRE narrative,
using only systems the site already has.

**Investigated before coding**: the route itself, `colleges.json`'s full
field list, `CollegeMap.astro`'s data/interaction model, `compare.astro`'s
`?c=` pre-select mechanism, `knowledge.json`'s already-sourced topics,
`college-photo.js`/migration 0006's existing (unfilled) photo infrastructure,
and `EvidenceBadges`/`.doc`/`.doc-steps`/`.college-enquire` — confirming a
real, un-invented "hospital ecosystem" fact already exists
(`knowledge.json`'s `teaching-hospital` topic: every MEC-approved college is
attached to a teaching hospital) but no per-college hospital detail beyond
what a college's own name states.

**What shipped**:
- **`CollegeHero.astro`** (new) — identity (name, one-line real facts,
  evidence badges) plus an asset slot. The slot reuses `college-photo.js`'s
  existing hook unchanged; until a real photo exists for a college (0/27 do
  today), it shows a graphic fallback built from that college's own data —
  its initials in display type, an ownership-tinted panel, and its real
  coordinates where known — never a stock or generic campus image.
- **`CollegeMap.astro` extended, not rebuilt**: three additive, optional
  props (`highlight`, `variant="compact"`, `headOverride`) let the exact
  same component render beside a detail page's own copy with one college's
  point already marked. Reuses the existing `.map-pt`/`show()`/`hide()`
  interaction model entirely; the one addition is a permanent
  `.is-highlight` mark (decoupled from the transient hover-driven
  `.is-active` class) so the highlighted college's ring survives hovering
  elsewhere on the map. Homepage and `/colleges` pass none of these props
  and are pixel-for-pixel unchanged.
- **`[slug].astro` restructured** into the narrative: Hero → Record panel
  (unchanged in substance) → compact highlighted map (skipped for the one
  college with no `places.json` match, rather than shown broken) → "Your
  years at [college]" — a 4-step `.doc-steps` timeline (the same ordinal
  component `admission-process.astro` already uses) built from
  `knowledge.json`'s own already-sourced curriculum/teaching-hospital/
  duration/internship/NExT topics, read in chronological order rather than
  as separate FAQ answers → the existing seat/fee caveats, unchanged → a new
  "compare this college" link (`/colleges/compare?c=<slug>`, the tool's own
  pre-select mechanism) and a link back to `/colleges` → the enquire CTA,
  moved to the end so it reads as the next step after understanding the
  college rather than a button competing with the facts above it.
- **`CONTENT_ASSET_PLAN.md`** (new) — the asset-slot architecture: seven
  named slots (hero photo, campus, hospital/clinical, library/classroom,
  student life, video, maps/location), each with its intended storage,
  current fill status (0/27 except maps, which is real data already), and
  the one rule that governs all of them (an empty slot gets an intentional
  graphic fallback, never a stock or invented image; a filled slot is
  filled only by a real, staff-uploaded asset).

**Deliberately not done**: no `.gl-crystal` on the enquire button (that
crystal fill is reserved, by an existing documented decision, to the two
highest-visibility sitewide conversion points — nav and homepage hero; using
it again per-college would be the exact dilution that restraint exists to
prevent); no fabricated hospital name/bed count/case-mix for any college
(the page states the general, sourced regulatory fact and is explicit when
a specific detail isn't on file); no gallery/video work (Slots 2-6 in
`CONTENT_ASSET_PLAN.md` — no real assets exist yet to display); no change
to `compare.js`, `colleges.js`, or any Supabase/RLS surface.

**Verified**: production build (44 routes, clean) and CSP hash regeneration
(the map component's inline script changed); Playwright checks at
390/430/768/820/1024/1440 — zero horizontal overflow at any width, the
highlighted map point auto-reveals its readout card and is the only one
without the dimmed treatment, the college with no map-coordinate match
correctly omits the map section entirely rather than rendering broken;
keyboard reachability; the 4-step academic timeline renders with absolute,
real source links; the compare-link carries the correct `?c=` value and
genuinely pre-selects on `/colleges/compare`; the enquire button's
`data-do` payload is correct; a `prefers-reduced-motion: reduce` pass (hero
and map both render); a live discovery → detail → compare flow click-through.
No console/page errors from this phase's own code (the only errors present
are this sandbox's pre-existing, already-documented network egress
restrictions on Google Fonts and Supabase).

**Performance — measured, not assumed**: reusing `CollegeMap` on the detail
route has a real, reproducible cost. A git-stash isolated before/after
comparison (same route, same throttled-mobile harness, two runs each side)
showed baseline TBT at ~325-355ms and Phase 5D's TBT at ~436-510ms — a
genuine ~90-150ms increase, not noise. The project's own `tests/perf-verify.mjs`
puts the finished route's TBT at ~500-545ms; in the same run, `/colleges`
(untouched this phase) measured ~975-980ms TBT and `/` (also untouched)
~555-560ms, so this route's number is not an outlier against the rest of
the site's current state in this specific sandboxed harness — every route
tested except `/staff` and `/portal` exceeds the 200ms budget right now,
which is a pre-existing environmental condition, not something this phase
introduced or fixed. One targeted attempt to reduce it (deferring the
highlighted point's card-reveal off the `IntersectionObserver` callback via
double-`requestAnimationFrame`) did not measurably help and was kept anyway
on correctness grounds (it's still better practice not to force a
synchronous layout read inside that callback), not claimed as a fix.
Documented as real, open debt in `TECHNICAL_DEBT.md` rather than glossed
over.

## ⭐ 2026-09-12 — Phase 5C (interactive college discovery) shipped

`/colleges` was two static grouped tables (government, then private) with
no way to search, filter, sort, or geographically orient before reading
27 rows top to bottom — a real UX gap even though the underlying data
model, the map, and the comparison tool were all already solid.

**Investigated before coding, per the phase's own instruction**:
`src/lib/colleges.js` (Supabase-over-committed-JSON merge, one-directional,
network-optional), `src/data/colleges.json` (27 records, complete field
list), `CollegeMap.astro` (already used unchanged on the homepage — hover
for a name, click through to the college's own page), `compare.js`'s
existing `?c=slug1,slug2` shareable-URL mechanism, the `.doc-table`
mobile responsive pattern (`data-label`-driven stacking), the sitewide
auto-styled form-input CSS (no new classes needed for a search box or
`<select>`), and `guidelines.astro`'s `.g-tab` filter-pill pattern
(already styled globally in `base.css`/`chrome.css`, not page-scoped).
Confirmed `filterColleges`/`.college-card` in `colleges.js` (the JS file,
not the lib) are dead code, unrelated to this page.

Asked the owner one concrete question before writing any markup: does
clicking a map point on `/colleges` navigate straight to the college's
page, or highlight the matching list row in place? Answer: navigate
(matches the homepage's existing behaviour) — so `CollegeMap.astro` is
reused with zero modification.

**What shipped** (`src/pages/colleges/index.astro`,
`public/assets/js/college-discovery.js`, both new/changed):

- `<CollegeMap />` moved to the top of the page, immediately after the
  page header — geographic orientation before the list, not a homepage-
  only decoration.
- The two static tables replaced by one server-rendered `.doc-table`
  listing all 27 colleges, each row carrying `data-name`/`data-location`/
  `data-type`/`data-seats`. A control bar above it: a live search input
  (name or city), an ownership filter (`.g-tab` pills: All / Government /
  Private, each with its own contextual note reusing the copy the old
  two tables' intro paragraphs already had), and a sort `<select>` (seats
  desc/asc, name A–Z/Z–A). A live "N shown" counter and an empty-state
  with a one-click reset.
- Each row also carries a compare checkbox (max 4, matching
  `compare.js`'s own `MAX`). Checking one or more reveals a fixed
  "N selected → Compare selected" bar that links straight into
  `/colleges/compare?c=slug1,slug2` — the existing tool's own pre-select
  mechanism, not a new comparison UI.
- All filtering/sorting/searching happens client-side over rows already
  in the server-rendered DOM: no fetch, no client data model that could
  drift from `colleges.json`, and the page is a complete, correctly
  ordered list with JS disabled.

**Bug found and fixed before commit, not part of the original plan**:
`.doc` (the ruled "Record" panel class, `premium.css`/`trust.css`) sets
`overflow: hidden !important` for its own rounded-corner styling — which
silently breaks `position: sticky` for any descendant. The compare bar
was originally sticky *inside* `.doc.cd`; moved it to a sibling `position:
fixed` bar instead (the right pattern for a persistent selection affordance
regardless). That surfaced a second, real collision: `.wa-float` and
`.chat-wrap` (base.css's persistent bottom-right call/WhatsApp/chat
widgets) claim nearly the entire bottom band at phone widths when their
labels are expanded — there is no gap left for another fixed bar to sit
in without guessing at pixel offsets against widgets this phase doesn't
own. Fixed by having `college-discovery.js` toggle a `cd-compare-active`
class on `<body>` while 1+ rows are selected; a `:global()` rule in the
page's own scoped `<style>` hides those two widgets only while that class
is present, restoring them the instant the selection is cleared. Scoped
to this one page's own script — no change to `base.css`, `boot.js`, or
the widgets themselves.

**Deliberately not done**: no new visual language (reuses `.doc`/
`.doc-table`, `.g-tab`, the sitewide form-input styling, `college-link`/
`college-enquire` link classes verbatim), no WebGL, no invented college
facts/fees/rankings (every field rendered already existed in
`colleges.json`; the contextual filter notes reuse the old tables' own
intro-paragraph language almost verbatim), no change to `CollegeMap.astro`,
`compare.js`, `colleges.js`, or any Supabase/RLS surface.

**Verified**: production build (44 routes, clean); `npm run csp --check`
(unaffected — external `src=` script, no inline-script hash to
regenerate); 390/820/1440px screenshots of the control bar and table;
Playwright-driven interaction checks (search narrows results, ownership
filter narrows + swaps the contextual note, sort reorders rows correctly,
checking rows reveals the compare bar with a correct `?c=` link,
`/colleges/compare?c=...` genuinely pre-selects those colleges on load,
empty-state + reset work, keyboard reachability of the search input and
filter tabs); a `prefers-reduced-motion: reduce` pass (page loads, search
still works — nothing here depends on motion); mobile horizontal-overflow
check at all three widths (clean); a direct `pageerror`/`console.error`
scan (clean — the only console errors present are this sandbox's
pre-existing network egress restrictions on Google Fonts and Supabase
REST calls, unrelated to this page's own code, confirmed by reproducing
the same errors on an unrelated route). No `perf-verify.mjs` run: the
added JS is a small, dependency-free vanilla script operating on rows
already in the DOM (no new images, no new render-blocking resources, no
motion/animation), so there's no plausible LCP/TBT mechanism for it to
move — noted here rather than run for form's sake, consistent with how
Phase 5B's static-markup-only change was handled.

## ⭐ 2026-09-11 — Phase 5B (visible admissions automation) shipped

The gap audit's #1 finding after Phase 5A: the real backend (lead intake,
a genuine counsellor follow-up sequence, an 11-stage `application_stage`
lifecycle, a working student portal with a live per-application timeline)
is functionally real and completely invisible from the public site. A
visitor clicking "Send Enquiry →" got two lines of reassurance and no
sense that anything organised was happening behind it.

**What shipped** — `/counseling`'s post-enquiry success panel (the one
live public moment this applies to; the homepage's own hero form fields
are dead markup, no longer wired to anything since Phase 3's hero
rewrite):

- **"What happens next"** — four near-term steps, paraphrased (not
  invented) from the real seeded counsellor sequence
  (`supabase/migrations/0004_lead_intake.sql`'s "New enquiry follow-up":
  call, eligibility summary, second call, week check-in). Deliberately
  generalised rather than quoting its exact hour offsets — those live in
  an admin-editable table, and a public promise that can drift out of
  sync with the real timing is worse than a slightly vaguer true one.
  The existing "within two working hours" line is kept exactly as-is,
  since it was already the site's own standing promise.
- **"The path ahead, if you proceed"** — the real 8-stage
  `application_stage` lifecycle, in the *exact* words
  `public/assets/js/portal.js`'s own `STAGES` array already shows a real
  applicant (Enquiry received → Checking eligibility → Eligible →
  Applied to MEC → Entrance → In MEC counselling → Seat allotted →
  Admitted). New `src/data/journey-stages.json` is the canonical copy —
  portal.js is a classic script the Astro build doesn't process, so it
  can't import the JSON directly; the file's own header comment flags
  that the two need to be kept in sync by hand if the wording ever
  changes. Nothing here is invented copy: it's the real enum
  `0002_admission_platform.sql` already enforces, humanised.
- Visual language deliberately reused rather than invented: the
  near-term steps reuse admission-process.astro's ordinal-spine motif at
  a compact scale (`premium.css` §8), and the 8-stage strip echoes the
  Phase 5A homepage chapter rail's dot/chip-and-connector grammar
  (`premium.css` §22) as a wrapped horizontal strip — the same signature
  applied a second place, which is what makes it a recognisable brand
  element rather than a one-off effect.

**Deliberately not done**: no fake dashboard, no fabricated activity
("3 people enquired today"), no backend jargon exposed ("sequence
engine," "SECURITY DEFINER"), no new Supabase migration or RLS change
(this session's standing rule), no touching `portal.js` itself (a
working authenticated flow — the new JSON file is additive only).

**Verified**: 390/820/1440px screenshots of the revealed success state
(the same `display:none`-reveal technique `tests/audit.mjs` itself uses,
since the panel only appears after a real form submit); a canvas-based
contrast check on every new text/background pairing this pass introduced
(resolves the actual `color-mix`/`oklab` computed values rather than
guessing — 6.01–6.45:1, all comfortably past AA); mobile
horizontal-overflow check (clean); a direct `pageerror` scan (clean); a
production build (44 routes, clean); CSP hash confirmed unchanged (no
inline `<script>` touched, only static markup + a scoped `<style>`).
No dedicated `perf-verify.mjs` run — the change is static markup and CSS
with zero new JS, motion, images or animation, so there's no plausible
TBT/LCP mechanism for it to move; noted here rather than run for form's
sake.

## Phase 5A (homepage cinematic narrative) — complete, 2026-09-11

Followed a creative gap audit (against `ULTRA_PREMIUM_ROADMAP.md`,
`DESIGN_AUDIT.md` and this file's own Phase 4 history) that the owner
explicitly asked for *before* any more code — the conclusion was that
Phase 4's rollout was real polish, not the scale of change the original
"ultra-premium cinematic" brief asked for. The gap audit's #1 approved
priority: the homepage was five independently well-motioned sections
with no connective tissue (`ULTRA_PREMIUM_ROADMAP.md`'s own Phase 0
finding, still true after Phase 4: "a stack of good individual pieces,
not a scene sequence").

**What shipped**, all reusing existing primitives, zero new WebGL/GSAP/
Lenis, homepage-only:

1. **A persistent field**, not a page-spanning wrapper — a second,
   teal-tinted `.gh-glow--handoff` anchored to the *bottom* of the hero
   (`GlassHero.astro`) bleeds toward where the map begins, and a new
   `.trust-field` (same two-gradient grid recipe `.gh-grid` already uses)
   sits behind Trust, strongest where Map hands off and masked to fade to
   nothing by ~78% down the section. Both live in `premium.css` §22, not
   in the components — matching where `.gh-field` itself is styled.
2. **Register shift**: the `.trust-field` mask *is* the mechanism — no
   separate scroll-linked effect needed. Verified by screenshot: the grid
   is visible entering Trust and fully gone by Gallery, exactly where the
   brief asked the cinematic atmosphere to settle into the existing
   Record/editorial register.
3. **Handoff entrance**: Map's `.map-head`/`.map-figure` swapped from the
   generic `.m-rise` to the already-existing `.m-focus` (blur-pull) —
   reads as resolving out of the hero's field rather than starting an
   independent entrance. Zero new CSS.
4. **Chapter rail** (`.hp-story`, `premium.css` §22): Promise/Place/
   Proof/Practice/Path, fixed vertical dot-rail on desktop, collapsing to
   a left-edge fill-only spine below 64rem (Phase 5A's mobile
   deliverable) — one component, two presentations. The fill reuses
   `.m-progress`'s own `scroll(root block)` mechanic verbatim. "Current
   chapter" state is the one piece of new JS
   (`index.astro`, `is:inline`) — **and it went through a real
   correctness bug during this pass**: the first version used
   `IntersectionObserver` with a centre-band `rootMargin`, and Trust
   (~200px tall against Map/Gallery's 700-1200px) could get skipped
   entirely on a fast or discrete scroll — confirmed by direct
   measurement (`getBoundingClientRect` on all 5 sections at each
   section's own centred scroll position), not assumed. Replaced with
   the project's actual established rAF-coalesced scroll pattern
   (matching `runtime.js`'s nav `is-stuck` toggle): closest section
   centre to viewport centre, recomputed once per scroll frame. Re-
   verified correct for all 5 sections after the fix, including Trust.

**Verified before shipping**: 390/820/1440px screenshots through all 5
chapters; `prefers-reduced-motion: reduce` emulation (every new animation
collapses to its finished state — fill line full, glow static, no blur —
computed-style-checked, not just eyeballed); mobile horizontal-overflow
check (`scrollWidth === innerWidth`, no overflow); `console-verify.mjs`
and a direct `pageerror`/`console.error` scan of `/` (clean — the only
console errors are this sandbox's own pre-existing blocked-network
noise, unrelated). CSP hashes regenerated (`tools/gen-csp.mjs`) for the
new inline script.

**Performance**: `perf-verify.mjs`'s full run showed `/` TBT at 534ms,
above budget and above `3D_ARCHITECTURE.md`'s last recorded 482ms for
this route. Didn't accept that at face value — isolated it with a
repeated-measurement A/B (`.m-focus` vs `.m-rise`, 3-4 runs each) and,
critically, measured the **true pre-Phase-5A baseline** via `git stash`
+ rebuild: 504ms avg on the untouched prior commit, right now, in this
environment. Phase 5A's own numbers (511-517ms across variants) are
within noise of that baseline. **Conclusion, measured not assumed:
Phase 5A adds no detectable TBT regression** — the elevated reading
relative to the historical 482ms figure is this session's environment
right now, not something this pass introduced. Worth a fresh
`perf-verify.mjs` run in a future session to see if 482ms or ~505ms is
the more representative number going forward; not re-litigated further
here since it's independent of Phase 5A specifically.

**Not done, out of scope for 5A on purpose**: Gallery and SectionNav's
own styling (untouched, per the brief), Map's interaction/motion beyond
the one entrance-class swap (untouched — already excellent), any other
route (homepage only). The gap audit's remaining priorities (#2-8:
visible admissions automation, college discovery, college-detail
redesign, video experience, counselling conversion, second dataviz,
mobile/tablet QA) and `CONTENT_ASSET_PLAN.md` are queued, not started —
the owner's own instruction was not to move to 5B after this.

## Phase 4 (full-site cinematic rollout) — complete, 2026-09-11

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

**`/neet-calculator`** checked last: already uses `PageHeader` (without
`threeD`, correctly — a compact utility tool isn't one of the three pages
that component's own comment reserves the WebGL scene for), a plain
focused form and a disclaimer. Nothing generic or flat about it; no
change made.

**Phase 4 rollout status: all five priority chunks (`/`, `/colleges`,
`/admission-process`, `/documents`, remaining public pages) are done.**
What's left is judgment calls this pass deliberately deferred rather than
unfinished work: `/counseling`'s PageHeader retrofit (see above — needs
its own careful session, not a squeeze) and `/why-nepal`'s harmless
`.rev`/`.why-card` motion-selector redundancy (cosmetic dead code, not a
visible bug). Every change this session made is covered by the verify
checkpoints recorded above and in `NEXT_TASK.md`.

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
