# Shader / Refraction

## Read this first: you probably don't need a shader

`taste-skill` Appendix C already covers the CSS-only "Liquid Glass"
approximation — `backdrop-filter` blur/saturate + layered borders + highlight
gradients — labeled honestly as an approximation, not a shader effect. That
covers the large majority of what a brief means by "glass." Use it. Read
that appendix before this file; this file is for the remaining, narrower
case: **light actually bending** — the background behind a shape visibly
warping and displacing based on that shape's geometry, not just blurring
through it. `backdrop-filter` cannot do that at any settings; it composites
a blurred/saturated copy of what's behind, it does not distort it.

## When it's actually justified

A single, deliberate signature moment — one hero element, rarely more —
where the refraction itself is the point (an award-site-style glass blob, a
distorted-lens cursor follower, a liquid transition between two states).
Never as a default treatment applied broadly; a page where every card
refracts its background is a demo, not a product.

## The technique, at a high level

A fragment shader that:
1. Renders the page content (or a texture of it) to an offscreen target.
2. For each pixel inside the refracting shape, computes a **surface normal**
   from the shape's geometry (often from a signed distance field / SDF, or a
   normal map baked from a 3D-modeled glass surface).
3. Uses that normal to offset the UV coordinates sampling the background
   texture — bending what's "seen through" the shape based on its curvature,
   the way a real lens or glass surface bends light.
4. Optionally layers chromatic aberration (sampling R/G/B at slightly
   different offsets), a Fresnel-based edge highlight, and specular
   highlights on top for the "physical glass" read rather than a flat
   distortion.

This is meaningfully more work than a CSS filter: it needs an SDF or normal
map for the shape (hand-authored or generated), a render-to-texture pass for
"what's behind," and a fragment shader compiled and run every frame the
effect is visible or interactive.

## Implementation paths, cheapest to most involved

1. **SVG `feDisplacementMap`** — an SVG filter primitive that displaces
   pixels of one input based on a displacement map's values. Runs on the
   CPU/SVG rendering pipeline, not the GPU — cheap enough for a small,
   static or gently-animated area, and needs no WebGL at all. The ceiling
   of what's achievable without a real shader; often enough for a
   "convincing glass edge" without the WebGL cost below.
2. **A CSS `backdrop-filter` + a Canvas-drawn distortion overlay** — hybrid:
   blur does the "frosted" part, a small canvas-computed displacement
   (sampling nearby pixel colors and offsetting) fakes edge bending. More
   control than pure CSS, far less cost than a WebGL pass.
3. **A real WebGL fragment shader** (via Three.js's `ShaderMaterial`, or raw
   WebGL) — for genuine, dynamic, physically-plausible refraction. Follow
   every discipline in `WEBGL_THREEJS.md` (loading, device gating, cleanup,
   reduced motion) — a shader effect is a WebGL scene and inherits all of
   that file's rules, plus the shader-specific ones below.

Escalate only as far as the effect actually requires — reach for (3) only
once (1) and (2) have been tried and are visibly insufficient for the
specific brief, not by default because it's the "real" version.

## Shader-specific discipline (path 3)

- **Compile cost is real and happens on mount**, not per-frame — this
  project's own WebGL background measured ~160ms of main-thread time to
  compile on a throttled mid-range phone. Mount off the idle callback
  (`WEBGL_THREEJS.md` §Loading), never synchronously.
- **Resolution-scale the effect**, don't render every pixel at native
  resolution if the visual difference is marginal — render the refraction
  pass at a lower internal resolution and upscale; refraction edges rarely
  need native-resolution precision to read as convincing.
- **One refracting surface's shader should not block interaction** — if
  it's following the pointer, throttle the uniform update to
  `requestAnimationFrame`, not the raw `pointermove` event rate.
- **Reduced motion**: freeze the distortion at a neutral/rest state rather
  than removing the shape — a static refracted glass surface is a legitimate
  reduced-motion end state; a *moving* one is not.

## Canonical sources

The Book of Shaders (thebookofshaders.com) for GLSL fundamentals if the
implementer doesn't already read shader code fluently — do not attempt to
write a refraction shader from a half-remembered example without
understanding what a normal map and a UV offset actually do; a shader that
compiles but is subtly wrong (an inverted normal, a wrong coordinate space)
fails silently as an ugly but "working" effect, not as an error.
