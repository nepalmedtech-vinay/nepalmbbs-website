# DESIGN_AUDIT.md — Phase 1

Written against branch `claude/website-premium-design-j6mphw` on
2026-09-08, in response to the "Ultra-Premium Cinematic Digital
Experience" master brief. Per that brief's own workflow ("Start with
PHASE 1 only... DO NOT begin the full redesign until the architecture
and existing UI have been understood"), this document is audit only —
no major UI changes are made in this pass.

**Read `PROJECT_STATE.md` and `DECISION_LOG.md` alongside this file.**
This project has been through five prior development phases and is not
a blank canvas; several things the brief's format would normally ask an
agent to "discover" are already decided and recorded there. This audit
does not repeat that history — it summarizes current state and flags
where the brief's asks meet it.

---

## 0. What already happened this session, before this brief arrived

Earlier in this same session (before the cinematic brief was posted), a
first premium pass was scoped, built and pushed — commit history on this
branch shows it. Worth stating up front because it changes what "Phase 1"
is actually auditing: not a generic, unimproved baseline, but a system
partway toward several things this brief also asks for.

Already done:
- A new file, `public/assets/theme/premium.css` (1,262 lines), rebuilt
  the page *interiors* — the part `chrome.css` never reached — replacing
  the three-equal-card pattern, the badge wall, and the pill-grid section
  nav with a ruled editorial layout (hairline rules, an ordinal index, a
  sticky rail on wide screens, a filling progress spine on the admission
  sequence).
- `public/assets/js/premium.js` (86 lines) added a pointer-reactive
  specular highlight on card families, an aria-current mark on the
  section index/nav, and auto-wrapping for tables that would otherwise
  overflow at 390px.
- The default color theme (`engine.css` + `engine.js` `PRESETS.dawn`)
  moved from a jade-green/orange pair to a deep corporate blue
  (`#1F5F8B`) and bronze (`#B4632F`) — reusing the codebase's own
  already-built, already contrast-solved "Porcelain" preset's colors, at
  fuller glass/glow/motion settings than Porcelain ships them at.
- `src/pages/admission-process.astro` was rewritten from six hand-typed
  `<li>` blocks with inline styles into a data-driven two-column
  editorial rail with a real `<table>` comparison (replacing inline
  emoji-as-data-marks).
- `src/components/GlassHero.astro` gained a second column: the three
  hero statistics moved from a card row into a ruled ledger beside the
  headline on desktop (≥76rem), collapsing back to one column below it.
- One real bug found and fixed in the process: the college map on `/`
  (`CollegeMap.astro`, this site's one signature data graphic) was
  rendering **completely empty** — `bridge.css` referenced a
  `@keyframes fade` that did not exist anywhere in the codebase, so
  every point's `opacity: 0` never resolved. All 27 colleges were
  invisible on every visit. Fixed in `premium.css` §14.
- Full `npm run verify` gate run twice (once per palette) — both green:
  0 low-contrast elements, 0 mobile overflow, across all 43 public
  routes + the assistant.

This matters for scoping the rest of this brief: several items on the
brief's own "NEVER" list (§34 — three-equal-card feature rows, pill
badge walls, box-and-border-everywhere cards) were the *previous*
state of this site and are the specific thing the pre-existing session
work replaced. The remaining gap against this brief is concentrated in
motion sophistication (§6, §11, §17, §18 — staggered load choreography,
mask/clip-path reveals, a custom cursor, image parallax) and the visual
signature layer (§5, §7, §15 — a cinematic hero background, atmospheric
lighting, campus visualization), not in the card/section patterns the
brief spends the most words warning against.

---

## 1. Stack & architecture

- **Framework:** Astro 7.2, static output (`output: 'static'`),
  `trailingSlash: 'never'`. No client framework (no React/Vue/Svelte) —
  every page is server-rendered HTML at build time; interactivity is
  vanilla JS attached after load.
- **Routing:** file-based, `src/pages/`. 18 top-level `.astro` files plus
  `colleges/[slug].astro` (27 generated college pages), `colleges/index`,
  `colleges/compare`, and `api/knowledge.json.js` — 44 total built routes
  (confirmed by `tests/build-verify.mjs`, which asserts this count).
  Two standalone legacy apps (`public/wrc-tracker/`, `public/cmc-tracker/`)
  are copied byte-identical from a pinned commit and are explicitly
  **out of scope** — `TECHNICAL_DEBT.md` and `CLAUDE.md` both forbid
  touching them; a test (`build-verify.mjs`) hashes them against
  `phase1-static-rollback` and fails the build if they drift.
- **Layout:** one shared layout, `src/layouts/GlassLayout.astro`
  (176 lines) — head/meta/schema, the stylesheet load order, the
  pre-paint theme script, and the script load order. Every page composes
  through it via `<GlassLayout>`; a `bare` prop opts a page (the console,
  the portal) out of the shared chrome for its own layout.
- **Data:** `src/data/colleges.json` (27 records, build-time
  authoritative), `src/data/places.json` (lat/lon for the map),
  `src/data/knowledge.json` (the sourced-assistant's answer set). No
  CMS, no headless content layer — content changes are code changes.
- **Backend:** Supabase (`fpzgcijbryvddtpegcmm`), RLS-first, out of this
  audit's scope except where it constrains the frontend (below).
- **Deploy:** Netlify, but **not** git-connected auto-deploy for this
  project — the owner deploys by dragging a built `dist/` zip onto the
  Netlify UI (`CLAUDE.md`). `netlify.toml`'s `[[headers]]` blocks
  (including the generated CSP) are therefore not carried by a plain
  `dist/` zip; `dist/_headers` has to be generated from them first, or a
  manual deploy silently loses the CSP. Nothing on this branch is on
  production yet — the owner unpublished the live site specifically to
  allow this redesign work without exposing it mid-flight
  (`PROJECT_STATE.md`).

## 2. Styling system

Ten stylesheets, loaded in a fixed, load-bearing order (see the comment
block in `GlassLayout.astro`) — deliberately **not** bundled; measured
LCP regression (1632ms → 1916ms) when tried, because HTTP/2 multiplexes
nine parallel small requests better than one blocking large one on this
host.

| Layer | File | Role |
|---|---|---|
| tokens | `theme/engine.css` (252 ln) | the token contract — every visual decision reads a `var()`, nothing is a literal, so the admin panel's live theme generator can re-skin the whole site with no rebuild |
| legacy | `css/base.css` (864 ln), `css/components.css` (560 ln), `css/sections.css` (298 ln), `css/trust.css` (436 ln) | Phase-1 hand-written CSS, largely intact from the original single-page build |
| bridge | `theme/bridge.css` (500 ln) | reconciles the legacy dark-theme sheets with the Phase-3/4 light glass system — see §5 below, this is where most of the "invisible element" class of bug has lived |
| material | `theme/glass.css` (471 ln) | the glassmorphism primitives (`.gl`, `.gl-btn`, `.gl-nav`) actually used by newer components |
| motion | `theme/motion.css` (221 ln) | scroll-driven (`animation-timeline: view()`) entrance/parallax/progress system |
| panel | `theme/panel.css` (228 ln) | the admin-facing live theme customizer UI |
| chrome | `theme/chrome.css` (817 ln) | finishes the dark→light migration for site-wide chrome (nav, ticker, contact bar, footer) that `bridge.css` only half-completed; loads after everything above so it can win without `!important` escalation |
| interiors | `theme/premium.css` (1,262 ln) | this session's addition — page-interior layout (editorial rail, section index, record/table styling, cascading motion); loads last |
| texture | `gfx/grain.css` (1 ln, but a 36kB inlined base64 PNG) | deferred via `media="print"` flipped to `all` post-load, so it never blocks first paint |

**Token architecture** (`engine.css`) is genuinely good and is the
right foundation to build the rest of this brief's design-token ask
(§3, §26) on top of, not replace: colour (`--brand`/`--brand-2` with
five `color-mix()`-derived variants), glass material (`--m-*`), shape
(`--sh-radius` cascading to `--r-xs`…`--r-xl`), depth (`--dp` scaling
four tinted shadow levels), type (`--ty-scale` × `--ty-a11y` fluid
`clamp()` sizes), space (`--sp` density multiplier), and motion (`--mo`
master intensity, collapsed to 0 under `prefers-reduced-motion`) are
all already primitives, already admin-panel-editable, already
`color-mix(in oklab, …)`-derived rather than hand-picked hex. The
brief's requested `--color-primary` / `--shadow-premium` / `--radius-lg`
-style token names do not exist under those exact names, but the
underlying system they'd describe already does — a token *rename/
mapping* pass, not a token *system* build, is what's actually needed if
brief-literal names are wanted.

**Known debt in this layer**, from `TECHNICAL_DEBT.md` and this
session's own reading:
- `style-src` still carries `unsafe-inline` — 153 inline `style`
  attributes remain (weak vector; documented, deliberately deferred).
- Three separate dark→light "the background stayed dark, the text
  flipped to dark ink" bugs were found and fixed in `chrome.css`
  (contact bar, ticker, chat header); this session found a fourth-order
  version of the same failure mode in the map's `@keyframes fade` (§0).
  `TECHNICAL_DEBT.md` has a grep for finding further instances.
- ~91 unreferenced legacy CSS classes were identified in the Phase-1
  audit (`docs/DESIGN-SYSTEM.md`) and have not been re-verified as dead
  since.

## 3. Component inventory

`src/components/` — 13 `.astro` components: `Navbar`, `MobileMenu`,
`Ticker`, `ContactBar`, `Footer`, `WhatsAppFloat`, `ChatWidget`,
`AdminPanel`, `GlassHero`, `CollegeMap`, `TrustSection`, `SectionNav`,
`EvidenceBadges`. All are single-purpose, none are a generic
`Card`/`Button`/`Panel` primitive — styling for shared patterns (buttons,
glass panes, cards) lives in the CSS layer as classes (`.gl-btn`,
`.gl`, `.college-card`) rather than as componentized props. This is
usable but is the gap against the brief's §25 ask for named reusable
primitives (`PremiumButton`, `GlassPanel`, `StatCard`, `Timeline`, …) —
Astro supports exactly that component shape; it would be additive, not
a rewrite, since the CSS classes those components would wrap already
exist and are already token-driven.

## 4. Existing animation/motion system

More built already than the brief's phrasing ("Phase 5 — after layout")
assumes. Current mechanism is **scroll-timeline CSS**
(`animation-timeline: view()` / `scroll(root block)`), not JS scroll
listeners or a library:

- Section entrances (`.m-rise`, `.m-scale`, `.m-focus` — translate+fade,
  scale+fade, blur+fade), gated behind `@supports (animation-timeline:
  view())` so a browser without support gets the finished static layout,
  never a stuck-invisible one.
- Cascading stagger (`.m-stagger`, and this session's `--n`-indexed
  extension across `.tabs-grid`, `.trust-grid`, `.doc-steps`,
  `.why-grid`, `.life-grid`, `.off-grid`) — each child's range offset by
  index, no per-element JS timer.
- A filling progress spine on the admission sequence (`.doc-steps::before`,
  this session), a reading-progress rail under the nav, and nav
  compression over the first 140px of scroll — all scroll-timeline
  driven.
- Magnetic buttons and pointer-tilt/specular on `.gl--live` panes,
  driven by a small `requestAnimationFrame` loop in `theme/motion.js`
  and (this session) extended to the legacy card families via
  `premium.js`.
- Cross-document view transitions (`@view-transition { navigation:
  auto }`) — genuinely gives multi-page navigation an app-like feel
  with zero router/bundle cost, which is unusual for a static site and
  is a real asset toward the brief's cinematic-feel ask.
- Count-up statistics (`theme/runtime.js`, `IntersectionObserver`-gated).
- Every motion primitive reads `--mo` (master intensity, 0 under
  `prefers-reduced-motion: reduce`) and none animate `top`/`left`/`width`
  — already compliant with the brief's §11/§20/§22 rules.

**Not yet built, and the real gap against this brief:** clip-path/mask
reveals, image parallax (there is scroll parallax capability in
`motion.css`'s `.m-para` but no imagery uses it, since there is no
photography — see §7 conflicts below), a custom cursor, and the
specific staggered hero load choreography in §6 (the current hero uses
the same `.m-rise`/`.m-focus`/`.m-stagger` primitives but has not been
tuned to the brief's literal 150–900ms per-element sequence).

## 5. JavaScript

Classic scripts (not ES modules), loaded `defer`, in a load-bearing
source order (documented in `GlassLayout.astro` — `config.js` before
`leads.js`, etc.). No bundler-driven code-splitting; each file is its
own request. No `on*` inline handlers anywhere in current code — intent
lives in `data-act`/`data-do` attributes dispatched through an allowlist
(`tools/action-allowlist.json`) by `actions.js`, which is the CSP-safe
pattern (`script-src` carries no `unsafe-inline`) and should be the
model for any new interactive component, per `CLAUDE.md` rule 4.

Largest files: `staff.js` (503 ln, counselor console), `engine.js`
(499 ln, theme token solver — see §2), `admin.js` (483 ln), `panel.js`
(348 ln, the live theme customizer), `chatbot.js` (342 ln, the sourced
assistant), `aurora-gl.js` (302 ln, the WebGL background shader).

## 6. Dependencies

`package.json`: exactly two runtime dependencies — `astro` and
`@astrojs/sitemap`. One dev dependency — `playwright`, for the test
suite. **No animation library** (no GSAP, no Framer Motion/Motion, no
anime.js) and no CSS framework (no Tailwind) — everything above is
hand-written CSS/vanilla JS. This is worth stating plainly against the
brief's §24: there is nothing to "evaluate before adding another" —
there is nothing installed yet. The scroll-timeline approach already in
use covers most of what a scroll library would provide, at zero bundle
cost and with better main-thread behavior (compositor-driven, not
JS-driven) than GSAP ScrollTrigger would give on the low-end Android
hardware this audience actually uses (see §8). Recommendation for Phase
5 of this brief: extend the existing scroll-timeline system for
anything expressible as "value tied to scroll position," and reach for
a small, purpose-built utility (not a general animation framework) only
for the one thing CSS genuinely cannot do — e.g. `clip-path` polygon
interpolation for a mask reveal, if that specific effect is wanted.

## 7. Imagery — the central conflict with this brief

**Correction (2026-09-08, later in the session that wrote this audit):**
the claim below that there is *no* photography anywhere was wrong — a
grep this audit should have run first turns up 7 hotlinked Unsplash
stock images across `/why-nepal` (6) and `/life-in-nepal` (1), allowed
by `netlify.toml`'s own `img-src` CSP entry for `images.unsplash.com`.
The owner reviewed this and decided to keep them: they are generic,
decorative/atmospheric imagery (mountains, a study-mood shot), not a
claim about any specific college, and the owner wants the finished site
to read as image-forward and dynamic rather than austere. What remains
true, and is the actual policy: **no photo may claim to depict a named
college's real campus unless it is that college's own, sourced
photograph** — `src/data/colleges.json` still has no image field for any
of the 27 colleges, and nothing here changes `PROJECT_STATE.md`'s
recorded Phase 2 decision *for campus imagery specifically* ("replaced
stock-photo 'campuses' with honest non-photographic treatments") or the
homepage's own trust claim, *"No stock photographs standing in for a
campus."* A path for real per-college photography now exists
(`supabase/migrations/0006`, the admin panel's College Photos uploader,
`college-photo.js`) — a staff member uploads a real photo and it appears
on that college's own page; nothing is invented or substituted in its
place.

This brief's §5 (hero), §15 (campus visualization), and §19 (image
treatment) all assume photography is available and central to the
design ("high-quality CMC / medical campus imagery," "large campus
image"). **These sections cannot be implemented as written** without
either:

1. Real, rights-cleared, verified photography per college — which does
   not exist in this repository and is not something to source by
   inference or generation (`CLAUDE.md` rule 1: never invent a fact;
   the same principle extends to never inventing a *visual* fact — a
   stock photo of an unrelated building presented as "the campus" is
   exactly the kind of claim this site has already gone on record
   rejecting), or
2. A deliberate policy reversal, decided by the owner, to source and
   licence real photography going forward.

This is flagged here, at the audit stage, rather than discovered mid-
build. The rest of the brief's visual language (§3 colour, §4 type,
§8 glass, §9 buttons, §11 scroll motion) does not depend on photography
and can proceed; the hero and campus-visualization sections do, and
need one of the two paths above decided first. In the interim, the
existing non-photographic treatment (the generated college map, the
credential rail, data-driven statistics) is the honest version of
"visual signature" this site currently has, and is a reasonable
foundation for a cinematic *data* hero (motion + typography + the map)
rather than a cinematic *photography* hero.

## 8. Responsive behavior & performance

- `tests/audit.mjs` (the ~15 minute full-site pass) checks contrast and
  horizontal overflow at 390px across every route. Current state (this
  session, both before and after the palette change): **0 low-contrast
  elements, 0 mobile-overflow routes**, across 43 routes + the sourced
  assistant. Median page weight ~310kB.
- No GPU in this sandbox — the WebGL aurora background and any future
  canvas/WebGL work render software-only here, which is fine for
  correctness testing but means real performance numbers (LCP/CLS/INP)
  have to come from a Lighthouse run against the deployed site, not from
  this environment (`NEXT_TASK.md` already notes this as blocked on the
  owner).
  =`chrome.css`'s file comment records a measured LCP figure (1632ms
  bundled vs. 1916ms — i.e., bundling was *worse*) from a prior
  session's real-browser test; treat that as the one available real data
  point until a fresh Lighthouse run exists.
- Breakpoints in current use: 30rem (480px, 3-column section index
  collapses), 34rem (544px), 40rem (640px), 48rem (768px, nav-clearance
  padding), 52rem (832px), 62rem (992px, editorial rail activates),
  76rem (1216px, hero ledger goes two-column). Not the brief's literal
  360/390/430/768/1024/1280/1440/1920 list, but a `clamp()`-first fluid
  approach with named breakpoints only where a layout genuinely
  restructures (column count, rail vs. stack) rather than at fixed
  device widths — this is a reasonable existing pattern to keep rather
  than replace with device-specific breakpoints.

## 9. What this audit recommends for Phase 2 onward

1. **Resolve the imagery question (§7) before Phase 3's visual
   benchmark** — it gates the hero and campus section specifically, and
   nothing else in the brief.
2. **Extend the token system, don't replace it** — map the brief's
   requested token *names* onto the existing primitives (§2) rather than
   introducing a second, parallel token system; the admin panel's live
   theme generator depends on the current variable names and would break
   silently if they were renamed instead of aliased.
3. **No new animation dependency** — the scroll-timeline system already
   covers staggered reveals, parallax, progress, and cascading grids at
   zero bundle cost; reach for a small purpose-built script only for
   effects CSS genuinely cannot express (§6).
4. **Componentize incrementally** — wrap the existing, working CSS
   classes (`.gl-btn`, `.gl`, `.college-card`) into named Astro
   components (`PremiumButton`, `GlassPanel`, `StatCard`) as each is
   touched, rather than as a separate up-front rewrite pass; this
   matches the brief's own §37 instruction not to replace architecture
   without justification.
5. **Custom cursor, particles, and any new visual flourish** should be
   built behind `(hover: hover) and (pointer: fine)` +
   `prefers-reduced-motion: no-preference` gates from the start, matching
   the pattern already used for pointer-tilt and magnetic buttons — not
   retrofitted later.

This audit makes no UI changes. Per the brief's own Phase 1 instruction,
next step is confirmation before Phase 2 (formal `DESIGN_SYSTEM.md`
token mapping) begins — in particular, a decision on §7.
