---
name: creative-technology-lab
description: Orchestrator for advanced creative-technology implementation — GSAP, Lenis, SVG/Canvas, WebGL/Three.js, and shader-based refraction — for the specific effects CSS genuinely cannot produce. Routes a creative requirement to the right tool (or combination), and enforces the QA gates every one of them must clear before shipping (performance budget, accessibility fallback, cleanup, device-tier gating). Use only after premium-design-os's CSS-first gate has been checked and found insufficient — this skill is the "yes, this genuinely needs it" tier, not a default.
license: Internal — author's own project conventions, not third-party.
---

# Creative Technology Lab

The heavy tier. `premium-design-os` §7 already states the rule this skill exists
downstream of: **default to CSS, scroll-timelines, `IntersectionObserver`, and
`requestAnimationFrame`; reach for anything below only for the specific thing
those cannot do.** This file does not relitigate that gate — it assumes you
already checked it and the answer was no, CSS cannot do this. What follows is
how to do the heavy version correctly once that's true.

Every one of the five domains below has a real, narrow justification and a
much larger blast radius for getting it wrong than a CSS animation does — a
memory leak in a Three.js scene, a scroll library that breaks keyboard
navigation, a shader that runs a mobile GPU at 12fps. That is why this skill
carries mandatory QA gates (§6) that CSS-tier work does not need.

## 1. Route first

| The requirement is… | Reach for | Reference |
|---|---|---|
| A scroll-triggered timeline with branching logic, pinning, or scrubbing across multiple asynchronous states that `animation-timeline` can't express in one declarative rule | GSAP + ScrollTrigger | `references/GSAP.md` |
| Character/word-level text reveal beyond a line-mask (typewriter, per-glyph physics, text-on-path) | GSAP + SplitText | `references/GSAP.md` |
| FLIP-style layout transitions (an element moving between two very different DOM positions/sizes without a layout jump) | GSAP Flip | `references/GSAP.md` |
| Inertia-based "cinematic" scroll feel — momentum, easing on the scroll position itself | Lenis | `references/LENIS.md` |
| A line that draws itself, an icon that morphs, a filter-based organic/noise effect, a small number (<200) of independently styled/interactive shapes | SVG | `references/SVG_CANVAS.md` |
| A particle system, a large number (200+) of objects, or per-pixel effects where DOM node count would tank performance | Canvas (2D context) | `references/SVG_CANVAS.md` |
| A genuinely 3D object, scene, or camera move; a particle system needing GPU parallelism at scale | WebGL via Three.js | `references/WEBGL_THREEJS.md` |
| Light actually bending through/around a shape — true refraction, not a blur — the "Liquid Glass" class of effect | A fragment shader | `references/SHADER_REFRACTION.md` — read this before reaching for it; `backdrop-filter` (see `taste-skill` Appendix C) covers most of what people mean by "glass" without a shader at all |

Multiple rows can combine — the common real pairing is **Lenis driving scroll
feel + GSAP ScrollTrigger reading that same scroll position** (§2 in
`LENIS.md` covers the sync, and the conflict with native
`animation-timeline: scroll()` CSS this creates). State which row(s) apply
and why, in one line, before writing code — the same discipline
`premium-design-os` and `taste-skill` already ask for at their own decision
points.

## 2. What none of these replace

`premium-design-os`'s existing motion tiers (STATIC/MICRO/INTERACTIVE/
SECTION/CINEMATIC/AMBIENT) still apply — a heavy tool executing a MICRO-tier
hover state is the wrong tool for the tier, not a justified upgrade. These
five domains exist for CINEMATIC-tier and above, or for content (3D, particle
fields, true refraction) that has no CSS equivalent at any tier.

## 3. No dependency stacking

Check what's already installed before adding a second library that does
overlapping work. GSAP's ScrollTrigger and native CSS scroll-timelines both
drive scroll-position animation — a project should pick one as its primary
mechanism, not run both for different sections without a stated reason. Same
for Lenis vs. native smooth scrolling: Lenis's entire justification is
inertia the CSS `scroll-behavior: smooth` property cannot produce; if that
inertia isn't the point, don't add it.

## 4. Loading discipline

Every library here is a real, render-blocking-if-you-let-it-be cost:

- GSAP core is small (~30-50kb depending on plugins); load it, don't bundle
  a CDN `<script>` synchronously in `<head>` — defer it, same as this
  project's own script-loading pattern.
- Lenis is small but runs on every frame while active — it has to justify
  its RAF cost, not just its bundle cost.
- Three.js is not small (100kb+ minified even before a scene's own
  geometry/texture assets). Load it async, behind the fold or behind a
  loading state, never blocking LCP.
- A compiled shader has a real one-time compile cost (measured on this exact
  project's own WebGL background: ~160ms of main thread on a throttled
  mid-range phone) — mount it after the thread is idle
  (`requestIdleCallback`), never synchronously on page load, and never for
  content the user is looking at *right now* on that first paint.

## 5. Device and capability gating

None of these five assume they'll run. Every implementation needs, before it
mounts:

- A `prefers-reduced-motion: reduce` check — freeze or skip, don't just slow
  down. GSAP: `gsap.matchMedia()`. Three.js/shaders: don't disable the whole
  scene necessarily, but stop any continuous/ambient animation loop within
  it.
- A capability check for WebGL/Canvas (`WebGL2RenderingContext` availability,
  a `webglcontextlost` listener) with a real fallback — a static image or a
  CSS-only version, never a blank section.
- A cost-aware default for low-end hardware — `navigator.hardwareConcurrency`
  or `navigator.deviceMemory` as a rough signal, or simpler: measure actual
  frame time for the first second and downgrade (fewer particles, lower
  shader resolution, disabled bloom/post-processing) if it's not holding
  60fps — rather than assuming every visitor has the machine it was built on.

## 6. QA gates — mandatory, all five domains

Full checklist in `references/QA_GATES.md`. The four categories, in the order
to check them:

1. **Performance** — bundle cost measured, no LCP/TBT regression, frame rate
   held on a throttled/mid-range profile, not just the dev machine.
2. **Accessibility** — reduced-motion respected, no scroll/keyboard behavior
   broken (Lenis and scroll-jacking libraries are the most common offender
   here), no content that exists *only* inside a canvas/WebGL scene with no
   text/DOM equivalent for a screen reader.
3. **Fallback** — the no-JS, no-WebGL, and load-failure paths all show
   something real, never a blank region. This project's own house rule
   applies here without exception: "no motion" is an acceptable fallback,
   "no content" is not.
4. **Cleanup** — every mounted instance (GSAP context, Three.js
   renderer/geometry/material/texture, a Lenis instance, an animation
   frame loop) has a matching teardown path. A leaked `requestAnimationFrame`
   loop or an undisposed Three.js texture is the single most common way a
   "premium" page turns into a battery drain and a memory leak a few minutes
   in.

Run `RENDER → SCREENSHOT/PROFILE → INSPECT → FIX → RE-RENDER`
(`premium-design-os`'s own quality-gate discipline) — for this tier that
means an actual performance profile (Chrome DevTools Performance tab or
equivalent), not just a visual screenshot, since the failure mode that
matters most here (dropped frames, a leak) doesn't show up in a static image.
