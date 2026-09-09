# Construction Spec — Template

Fill this in once per project before drawing any custom icon or
illustration asset, the same way a color/type token sheet gets defined
before components get built. Keep it in the project alongside the actual
design tokens (not just in conversation) so a new asset months later still
matches.

```
## Icon grid
- Base grid: ___px (e.g. 24px)
- Live area / padding: ___px inset from the grid edge
- Optical sizing: a circle needs to overshoot the square bounding box by
  roughly __% to read as equal weight (typically 2-4% for a 24px grid)

## Stroke
- Treatment: stroke-only / filled / both (state which contexts use which,
  if not one universally)
- Stroke weight at reference size: ___px
- Line cap: round / square / butt
- Line join: round / miter

## Corners
- Treatment: sharp / rounded (radius: ___px) / mixed
- If mixed, the rule: ___

## Perspective / dimensionality
- Flat / isometric (angle: ___°) / single-light-source with shading
- If icons and larger illustrations use different treatments, state both
  and when each applies

## Color
- Reads from token: --___ (e.g. --brand, --g-ink)
- Multi-color icons: how many colors max, and which tokens they map to
- Dark-mode behavior: does the asset need a distinct dark-mode variant, or
  does it work unmodified via the same tokens? (Prefer the latter — a
  second hand-maintained asset per icon is a real maintenance cost.)

## What this system does NOT draw
- Concepts already covered well by [the base library in use, e.g. Lucide] —
  list what stays on the library rather than being redrawn
- State the domain-specific concepts this custom system exists FOR,
  explicitly, so scope doesn't creep into redrawing the whole library by
  accident
```

## Worked example (illustrative, not prescriptive — every brand's numbers differ)

```
## Icon grid
- Base grid: 24px
- Live area: 20px (2px inset each side)
- Optical sizing: circles/diamonds sized to 25px diameter to read equal to
  a 24px square

## Stroke
- Treatment: stroke-only, no fills except status dots
- Stroke weight: 1.75px at 24px reference size, scales proportionally
- Line cap: round
- Line join: round

## Corners
- Treatment: rounded, 2px radius on exterior corners; interior corners
  (e.g. where two strokes meet inside a shape) stay sharp

## Perspective
- Flat only. No isometric, no shading. Larger hero illustrations (if any)
  use the same flat, line-based language as the icons, not a different
  treatment.

## Color
- Single color, reads var(--g-ink-2) at rest, var(--brand) on hover/active
- No dedicated dark-mode variant needed — color-mix-derived tokens already
  handle both modes

## What this system does NOT draw
- Generic UI icons (settings, search, close, chevrons) — stay on the base
  library
- This custom set exists for: [the 6-8 domain-specific concepts the base
  library doesn't have, named explicitly]
```
