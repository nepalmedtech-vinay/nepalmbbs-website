# 3D_ARCHITECTURE.md

The site's Three.js architecture, its cost, and the adaptive strategy adopted
2026-09-10 per the owner's explicit Decision 1 ("3D = high-value experience,
not global decoration"). Kept at repo root to match this project's existing
convention (`PROJECT_STATE.md`, `DESIGN_SYSTEM.md`, `DECISION_LOG.md`,
`ULTRA_PREMIUM_ROADMAP.md` are all root-level, not under `docs/`, which holds
an older, separate document set — see `PROJECT_STATE.md`).

## The one scene, four mount sites

There is exactly one Three.js scene module, `src/lib/medical-icons-scene.js`
— five procedurally-built shapes (stethoscope, pulse trace, capsule, DNA
helix, cross) sharing a `MeshPhysicalMaterial` "crystal glass" material
language, animated by one `requestAnimationFrame` loop. It is mounted from
four places, each with its own canvas, colour tuning, and (until this pass)
independent mount logic:

| Site | File | Above/below fold | Colour | Desktop | Mobile (pre-2026-09-10) | Mobile (now) |
|---|---|---|---|---|---|---|
| Hero | `GlassHero.astro` | Above (home page only) | brand/brand-2 | mounts | none | **still none, deliberately** |
| Page header | `PageHeader.astro` (`threeD` prop) | Above (5 pages: why-nepal, guidelines, faq, videos, admission-process*) | brand/brand-2 | mounts | mounts | mounts |
| Footer | `Footer.astro` | Below (every one of 44 routes) | navy-accent/sky | mounts | mounts | **mounts only once scrolled near-view** |
| Admission process | `admission-process.astro` (hand-rolled, same markup as PageHeader's) | Above | brand/brand-2 | mounts | mounts | mounts |

\* `admission-process.astro` doesn't use the shared `PageHeader` component
(it needs a fourth staged element `PageHeader` doesn't support), so it
duplicates the same canvas/mount pattern directly.

## What was actually expensive (measured, not assumed)

`tests/perf-verify.mjs` (4x CPU throttle, ~1.6 Mbps/150ms RTT, 390×844 —
i.e. a realistic budget-Android/Indian-mobile-data simulation) isolated the
cost by comparing routes that mount this scene against `/staff`/`/portal`,
which use `bare={true}` and skip it entirely (34-43ms TBT, near the 200ms
budget). Three real, measured, sequential findings, each verified with a
before/after `perf-verify.mjs` run rather than assumed:

1. **`PMREMGenerator.fromScene(RoomEnvironment)`** — Three.js's own addon
   for generating a lit environment map — is a genuinely expensive,
   synchronous, multi-mip-level GPU prefilter, and was being recomputed
   independently by *every* mount (separate WebGL contexts can't share the
   resulting texture). Replaced with a cheap hand-built single-sphere
   gradient scene through the same `PMREMGenerator` call — same real,
   non-fabricated environment reflection, ~24% TBT cut, zero visual
   difference (screenshotted before/after).
2. **`transmission`** (the per-object glass refraction, which costs Three.js
   an extra backdrop-render pass per frame) — A/B tested by forcing it to 0:
   recovered a further ~1900ms against a ~5200ms floor still present with
   a *single* mount, meaning it wasn't the dominant cost either. Reverted
   rather than shipped — losing the real-glass look for a partial win
   wasn't worth it once the real lever (below) was found.
3. **All four mount sites used `requestIdleCallback` only, never
   `IntersectionObserver`.** The footer sits below the fold on every route
   by definition — it was paying the full Three.js setup cost (library
   parse, geometry construction, environment prefilter, first several
   render calls) during the *initial load window* regardless of whether
   the visitor ever scrolled that far. This was the dominant cost.

## The fix: `src/lib/mount-medical-scene.js`

One shared gate, used by all four sites (previously each duplicated the
same idle-callback logic independently — the reuse the owner asked for).
`mountMedicalSceneWhenVisible(canvas, { colorVars, onReady, onLost,
rootMargin })`:

- Skips entirely under `prefers-reduced-motion: reduce` (unchanged
  behaviour — a real static frame is still rendered by
  `medical-icons-scene.js` itself for that preference, never "no scene").
- Otherwise waits for `IntersectionObserver` (default `rootMargin: 600px`)
  before doing anything — for the hero/page-header sites, which are above
  the fold by definition, this fires immediately and changes nothing
  observable; for the footer, it defers the entire mount until the
  visitor scrolls near it.
- Once visible, defers to `requestIdleCallback` (unchanged) before the
  dynamic `import()` and mount.
- `onReady`/`onLost` callbacks let each site keep its own class-toggling
  (`.ph--3d-active`, `.gh-field--3d-active`) without duplicating the gate
  logic itself.

Also added to `medical-icons-scene.js`: an adaptive device-pixel-ratio cap
(`resize()`'s `renderer.setPixelRatio`) — 2x only when
`navigator.hardwareConcurrency > 4` and the viewport isn't phone-width;
1.5x for declared-low-core devices; 1.25x under a 48rem (768px) viewport.
These are small background/ambient objects — the resolution difference is
not visible at that size, and `hardwareConcurrency` is the only signal the
platform actually offers for "how much can this device's CPU do," there
being no direct GPU-capability API.

## Measured result

| Route | Scene(s) mounted | TBT before this pass | TBT after |
|---|---|---|---|
| `/` | footer only | 9357ms | **486ms** (95% cut) |
| `/colleges/institute-of-medicine` | footer only | 7020ms (pre-env-fix) | **226ms** (97% cut) |
| `/neet-calculator` | footer only | 6969ms | **221ms** (97% cut) |
| `/colleges` (index) | footer + page-header (`threeD`) | 9872ms (pre-env-fix) | 4576ms |
| `/faq` | footer + page-header (`threeD`) | 10718ms (pre-env-fix) | 4344ms |
| `/staff`, `/portal` | none (`bare`) | 33-43ms | unchanged |

Every footer-only route is now at or near the 200ms budget. The two
remaining over-budget routes (`/colleges`, `/faq`) both mount an
**above-the-fold** `threeD` page-header scene — the IntersectionObserver
gate correctly does not defer these (that would make a "meaningful"
element feel slow to appear, which is the opposite of the point), so their
remaining cost is the genuine, currently-unreduced cost of one scene
mounting immediately. This is the next lever, not yet pulled this pass:
a lighter-geometry/no-transmission variant specifically for these
above-fold mobile mounts, distinct from the desktop version, matching the
adaptive-strategy brief ("MOBILE: lighter 3D / reduced geometry"). Tracked
here rather than acted on in this pass — see `PROJECT_STATE.md`'s "Next
action."

## What stayed deliberately as-is

- **`GlassHero.astro` (home page hero) is still desktop-only** (`fine =
  matchMedia('(min-width: 62rem)')`). This is the one scene not opened to
  mobile — it's above-the-fold on the single highest-traffic route, tied
  directly to LCP, and adding WebGL there for mobile risks the metric that
  matters most on the page that matters most. Routed through the same
  shared `mountMedicalSceneWhenVisible` helper for architectural
  consistency (and because `IntersectionObserver` doesn't defer an
  above-fold element regardless), but the `fine` gate around the call
  itself is untouched. A lighter mobile hero variant is a candidate for a
  future pass, not settled here.
- **The five shapes/materials themselves are unchanged.** The owner was
  explicit: "preserve premium visual quality," and every measured fix
  above was chosen specifically because it doesn't touch what a visitor
  actually sees (environment swap, DPR reduction only where invisible,
  mount-timing change only for an element already off-screen).
