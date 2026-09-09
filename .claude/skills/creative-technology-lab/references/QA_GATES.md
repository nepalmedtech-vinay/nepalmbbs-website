# QA Gates

Mandatory before shipping anything built with GSAP, Lenis, Canvas, WebGL/
Three.js, or a shader. `premium-design-os`'s `DESIGN_QUALITY_GATE.md` still
applies underneath this (contrast, keyboard reach, visual render-and-look) —
this file adds the checks that only apply to heavy creative technology,
where the failure modes (a leak, a broken scroll, a dropped-frame scene)
don't show up in a static screenshot the way a layout bug does.

## 1. Performance

- [ ] Bundle cost measured — know the actual kb added (library + any plugins
      actually imported, not the whole package), not assumed
- [ ] No LCP regression — the library loads after, or async/deferred from,
      the content that determines Largest Contentful Paint
- [ ] No Total Blocking Time regression from synchronous work on mount
      (shader compilation, large scene construction) — moved off the main
      thread's idle-critical path (`requestIdleCallback` or equivalent)
- [ ] Frame rate profiled on a throttled/mid-range CPU profile (Chrome
      DevTools' CPU throttling, not just the dev machine), not assumed —
      target 60fps, and know what the actual number is if it isn't
- [ ] Bundle is code-split / lazy-loaded if the effect doesn't apply to
      every route or every device (mobile, reduced-motion) that loads the
      page

## 1.5 Lottie / video / sound — their own failure mode

These three don't leak memory the way a Three.js scene does, but they fail
in their own specific way: **unwanted autoplay and unmutable audio.**

- [ ] No video autoplays with sound
- [ ] Every video has `muted autoplay loop playsinline` if it autoplays at
      all, and a correct poster frame
- [ ] Any sound effect is opt-in, never plays before a user gesture, and has
      a persistent, visible mute control if it exists at all
- [ ] Lottie/video/sound respects `prefers-reduced-motion` — no autoplaying
      loop a reduced-motion user can't stop
- [ ] File sizes checked against actual displayed size, not source/export
      resolution (a 4K video behind a 600px section, a needlessly detailed
      Lottie JSON)

## 2. Accessibility

- [ ] `prefers-reduced-motion: reduce` verified to actually stop continuous/
      ambient motion — tested with the OS/browser setting on, not assumed
      from the code
- [ ] Keyboard navigation unaffected — tab order, Page Down/arrow-key
      scrolling, and any custom scroll library (Lenis) pass through
      correctly; tested by hand with a keyboard, not inferred
- [ ] Any information conveyed only inside a Canvas or WebGL scene has a
      real text/DOM equivalent for assistive tech — canvas has no
      accessibility tree by default
- [ ] Focus management (skip-links, `scrollIntoView`, anchor navigation)
      still lands correctly through any custom scroll library

## 3. Fallback

- [ ] No-JS path shows real content, not a blank region (verify by
      disabling JS and reloading, not by reading the code and assuming)
- [ ] WebGL-unsupported / `webglcontextlost` path shows a real fallback
      (static image or CSS-only version), not a blank canvas
- [ ] Library load failure (CDN down, script blocked) degrades to something
      real — the page underneath the enhancement was already correct before
      the enhancement was added, and stays correct if the enhancement never
      arrives
- [ ] Low-end-device gating (§5 in the main `SKILL.md`) actually reduces
      cost on a simulated low-end profile, not just on paper

## 4. Cleanup

- [ ] Every GSAP animation/ScrollTrigger created has a matching
      `gsap.context().revert()` or explicit `.kill()` on the relevant
      teardown event
- [ ] Every Lenis instance has `.destroy()` called and its RAF loop
      cancelled on teardown
- [ ] Every Three.js geometry/material/texture/render-target created has a
      matching `.dispose()` call; the renderer itself is disposed
- [ ] No `requestAnimationFrame` loop keeps running after its owning
      component/route is gone — verified by navigating away and checking
      DevTools' Performance/Memory tabs for continued activity, not assumed

## How to actually check these, not just claim them

A static screenshot proves layout and initial paint. It proves nothing about
a leak, a dropped frame, or a broken scroll interaction. For this tier,
"visual QA" (`premium-design-os`'s render→screenshot→inspect loop) has to be
supplemented with:

- A **Performance profile** (record 5-10 seconds of scroll/interaction,
  check for dropped frames and long tasks) where any of the five domains are
  in use.
- A **Memory profile** (take a heap snapshot, navigate away and back several
  times, take another) where anything mounts/unmounts more than once in the
  page's lifetime — this is what actually catches a leak; it never shows up
  in a single-session screenshot.
- A **manual keyboard pass** (no mouse) on any page using Lenis or a
  scroll-jacking library.

If none of this profiling is possible in the current environment (no
browser, no DevTools access), say so explicitly rather than asserting these
gates passed from source review alone — the same honesty rule
`premium-design-os`'s own quality gate already states for ordinary visual
QA applies here with more force, because the failure modes are less visible
in code than a layout bug is.
