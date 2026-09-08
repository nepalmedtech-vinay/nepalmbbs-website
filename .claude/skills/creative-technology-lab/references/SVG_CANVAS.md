# SVG / Canvas

## The decision, in order

1. **Can this be a styled DOM element with CSS?** Most icons, most simple
   shapes, most "decorative line" needs — yes. Don't reach for either.
2. **Is it a small number of distinct, describable shapes that need to be
   individually styleable, interactive, or accessible (tooltips, click
   targets, `aria-label` per shape)?** → **SVG.**
3. **Is it many objects (roughly 200+), or per-pixel/procedural content
   (particles, noise, a live-rendered effect) where SVG's one-DOM-node-per-
   shape cost would show up as real jank?** → **Canvas.**

The crossover point (~200 nodes) is a rule of thumb, not a hard number —
measure. A data visualization with 500 static SVG points that never animate
is often fine; 500 SVG points all independently animating every frame is
usually not.

## SVG techniques worth knowing

**Line-drawing (`stroke-dasharray`/`stroke-dashoffset`).** A path or line
that appears to draw itself. Set `pathLength="1"` as an attribute on the
element (not a CSS property — there is no CSS `pathLength`) to normalize
`stroke-dasharray`/`-offset` to a 0–1 range regardless of the actual path
length, then animate `stroke-dashoffset` from 1 to 0:

```html
<line pathLength="1" x1="0" y1="0" x2="100" y2="0" />
```
```css
line { stroke-dasharray: 1; stroke-dashoffset: 1; }
@keyframes draw { to { stroke-dashoffset: 0; } }
```

**Filters for organic texture** (`feTurbulence` + `feDisplacementMap`) —
noise/grain/liquid-distortion effects without a shader. Expensive per-pixel
on large areas; scope the filter region tightly (`x`/`y`/`width`/`height` on
the `<filter>` element) rather than defaulting to `-10% -10% 120% 120%`.

**Masking vs. clipping.** `clip-path` is a hard edge (in or out).
`mask-image` supports gradients — a soft fade-out at an SVG shape's edge,
which `clip-path` cannot do. Use a mask when the edge needs to be soft.

**Path morphing** — animating the `d` attribute between two paths with the
*same number and type of path commands* (a straight morph from a
mismatched path either fails or produces garbage in between). For
non-trivial morphs, use a library (Flubber, or GSAP's MorphSVG plugin) that
interpolates point count automatically rather than hand-authoring matching
paths.

## Canvas techniques worth knowing

**Particle systems.** A `<canvas>` with a single 2D context and a plain
array of particle objects, updated and redrawn every frame via
`requestAnimationFrame`, is the standard shape. Batch all draws inside one
frame callback — never call `requestAnimationFrame` per-particle.

**Offload to `OffscreenCanvas` + a Worker** when the particle count or
per-frame computation is heavy enough to compete with main-thread UI work
(scrolling, input handling) — moves the render loop off the thread that
also has to stay responsive to clicks and keypresses. Not needed for a
light decorative effect; needed once frame drops correlate with particle
count in profiling.

**Resolution and `devicePixelRatio`.** A canvas sized only in CSS pixels
renders blurry on high-DPI screens. Set the backing store to
`css_size * devicePixelRatio` and scale the context:

```js
const dpr = window.devicePixelRatio || 1;
canvas.width = cssWidth * dpr;
canvas.height = cssHeight * dpr;
canvas.style.width = cssWidth + 'px';
canvas.style.height = cssHeight + 'px';
ctx.scale(dpr, dpr);
```

## Accessibility — the gap in both

Neither SVG nor Canvas content is automatically readable by assistive tech
the way real DOM text is:

- **SVG**: add `role="img"` + `aria-label` on the `<svg>` for a
  meaningful graphic, or `aria-hidden="true"` if it's purely decorative
  (exactly the pattern this project's own college map and hero field layer
  use — a labeled `role="img"` on the real data graphic, `aria-hidden` on
  the decorative background layer).
- **Canvas**: has *no* accessibility tree at all by default — content drawn
  to a canvas is invisible to a screen reader entirely. If the canvas
  conveys information (not just decoration), provide a real text/DOM
  equivalent alongside it (a visually-hidden data table, an `aria-label`
  summarizing what's shown), or use the canvas fallback-content pattern
  (real DOM content inside the `<canvas>` tags, which renders only when
  canvas isn't supported *and* can double as the accessible description if
  authored with that in mind).

## Canonical sources

MDN's SVG and Canvas API references for exact syntax — both have enough
surface area that guessing at attribute names from memory is a common
source of silent no-ops (an SVG filter with a misspelled attribute fails
silently rather than erroring).
