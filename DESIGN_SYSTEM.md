# DESIGN_SYSTEM.md

Current-state design system reference. `docs/DESIGN-SYSTEM.md` is the
**historical** Phase-1 audit (pre-glass-engine) — kept for its debt
inventory, not current architecture. This file describes what's live now,
read directly from `public/assets/theme/` this session.

## Token architecture

Lives in `public/assets/theme/engine.css` (~240 lines) as CSS custom
properties, consumed by `glass.css`, `motion.css`, `panel.css`,
`bridge.css` (~1900 lines combined). All colour mixing uses `color-mix(in
oklab, …)` rather than hand-picked hex fallbacks, which is why a single
`--brand` value can derive soft/line/deep/lift variants consistently.

- **Color:** `--g-base`, `--g-ink` (ground/ink), `--brand` family (5
  derived variants off one base via `color-mix`).
- **Glass/elevation:** `--m-*` (tint, opacity, blur, saturate, border,
  inner-sheen) and `--dp`/`--dp-hue` for depth. `--au-*` controls the
  WebGL aurora background (opacity/scale/blur/speed) — `--au-opacity: 0`
  is the documented way to disable it entirely, which matters for a
  reduced-motion or low-power path.
- **Shape:** one base radius (`--sh-radius`) with `--r-xs` through
  `--r-xl` derived as multiples of it, plus `--r-pill`. Changing one
  variable re-scales the whole shape system — this is the mechanism the
  brief's admin "shape" customization panel (§14) needs, and it already
  exists (`panel.js`).
- **Typography:** `--ty-display` (Fraunces/Newsreader serif) /
  `--ty-body` (Geist/Inter). Sizes are `clamp()`-based fluid scales
  (`--t-display` through `--t-label`) multiplied by both a user-set
  `--ty-scale` and a `--ty-a11y` factor — meaning font-size respects an
  accessibility multiplier independent of the design-density setting, a
  detail worth preserving in any future edit to this layer.
- **Spacing:** one density variable `--sp` (0.85 compact / 1 standard /
  1.2 comfortable per the code comment) drives `--s-section` and
  `--gutter`, both `clamp()`-based.

## Component/runtime files

| File | Role |
|---|---|
| `engine.css` / `engine.js` | token definitions + runtime that applies them |
| `glass.css` | glassmorphism surfaces |
| `motion.css` / `motion.js` | animation/transition system, presumably `prefers-reduced-motion`-aware — not confirmed this session, see `UX_AUDIT.md` |
| `aurora-gl.js` (302 lines) | WebGL shader background |
| `panel.css` / `panel.js` (348 lines) | the admin-facing live theme generator/customizer — colors, glass intensity, motion, shape, spacing, with saved looks |
| `generate.js` (197 lines) | look generation logic behind the panel |
| `runtime.js` | boot/apply logic |
| `bridge.css` | connects the legacy Phase-1 `public/assets/css/*` layer to the token system, so both can coexist |

## What this means for future admin/appearance work (brief §14)

Most of §14's "Admin — full design/appearance engine" ask is **already
built**: branding, color, typography, layout, shape, motion, and
visual-style controls all exist in `panel.js`/`panel.css`/`generate.js`.
Before building anything new here, open the admin panel in a browser and
check what's actually exposed in the UI versus what exists only as a CSS
variable with no control wired to it — that gap (if any) is the real
remaining work, not a rebuild.

## Known layering debt (see `TECHNICAL_DEBT.md`)

`docs/DESIGN-SYSTEM.md` (Phase 1) documented three overlapping glass
implementations and ~91 unreferenced CSS classes in the legacy
`public/assets/css/` layer. `bridge.css` exists specifically to reconcile
old and new — whether the old glass variants are now fully superseded or
still shipping dead weight has not been re-checked this session.
