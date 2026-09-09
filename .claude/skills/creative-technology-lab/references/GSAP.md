# GSAP

## When it's actually justified

A scroll-timeline in native CSS (`animation-timeline: view()` /
`scroll(root block)`) covers a huge share of what people reach for GSAP for —
this project's own site (see its `motion.css`) does staggered reveals,
progress rails, nav compression, and parallax with zero JS, at compositor
speed. Reach for GSAP specifically when the requirement has:

- **Branching/conditional logic** — the timeline's next step depends on a
  runtime value (viewport size, a fetched state, user input), not just scroll
  position.
- **Pinning with content changes mid-pin** — an element stays fixed while
  scroll continues, and what's rendered inside it changes at multiple scroll
  breakpoints (`ScrollTrigger`'s pin + onUpdate).
- **Cross-element choreography that must stay perfectly synced** — five
  elements animating in a precise relative order where CSS's per-element
  `animation-delay` staggering would drift or be too rigid.
- **FLIP transitions** — an element moving between two very different
  DOM states (a card expanding into a full-screen view) without a layout
  jump. This is the one thing genuinely hard to do any other way.
- **Text-splitting effects** — per-character/word animation beyond a line
  mask. `taste-skill`/`premium-design-os` both warn against
  character-by-character animation as a default (it reads as an AI-tell) —
  this is for the rare case it's actually the point, not the default hero
  treatment.

## Install

```
npm install gsap
```

Load only the plugins actually used (`ScrollTrigger`, `Flip`, `SplitText`,
`Draggable`, `MotionPathPlugin`) — do not import the whole plugin set
speculatively. `SplitText`, `ScrollSmoother`, `MorphSVG`, `DrawSVG`, and
`Flip`'s more advanced APIs were Club GreenSock-only historically; check
current licensing before depending on one in a client project — GSAP's
license terms have changed over time, verify at the source rather than
assuming plugin availability from memory.

## The three mistakes that actually happen

**1. No cleanup, ever.** GSAP animations and ScrollTriggers attach listeners
and hold references. In any component-based framework (React, Vue, Astro
islands with client hydration), an animation created on mount and never
killed on unmount leaks — and in a scroll-heavy page, `ScrollTrigger`
instances left alive after their element is gone will throw or silently
break others. Always scope creation and teardown together:

```js
useEffect(() => {
  const ctx = gsap.context(() => {
    gsap.from('.card', { opacity: 0, y: 40, stagger: 0.1, scrollTrigger: '.card' });
  }, scopeRef);
  return () => ctx.revert(); // kills every animation/ScrollTrigger created inside
}, []);
```

For a non-framework / plain-script context, keep an explicit array of
created tweens/triggers and kill them on the relevant teardown event
(page unload for an SPA-like transition, or a route-change hook).

**2. Reduced motion ignored.** `gsap.matchMedia()` is the tool, not a manual
`if (prefersReduced)` scattered through the codebase:

```js
let mm = gsap.matchMedia();
mm.add('(prefers-reduced-motion: no-preference)', () => {
  gsap.to('.hero', { scrollTrigger: '.hero', y: -100 });
  // cleanup function returned here runs automatically when the query stops matching
});
mm.add('(prefers-reduced-motion: reduce)', () => {
  gsap.set('.hero', { clearProps: 'all' }); // end state, instantly, no animation
});
```

**3. Fighting CSS for the same property.** If an element has a CSS
`transition` on `transform` and GSAP also tweens `transform`, they conflict —
GSAP wins unpredictably depending on timing. Either let GSAP own the
property exclusively (remove the CSS transition) or don't animate that
property with GSAP at all.

## Performance notes

- Animate `transform`/`opacity` here too — GSAP doesn't exempt you from the
  compositor-vs-layout-thread cost difference.
- `will-change` sparingly and only on elements about to animate, removed
  after — a `will-change` left on indefinitely reserves a compositor layer
  the browser never reclaims, which is a real memory cost on long pages with
  many animated cards.
- `ScrollTrigger.batch()` for many similarly-triggered elements instead of
  one ScrollTrigger per element — one scroll listener instead of N.

## Canonical source

gsap.com/docs — read the actual plugin docs before assuming an API shape;
GSAP's API has changed across major versions (3.x consolidated a lot of
what used to be separate plugins).
