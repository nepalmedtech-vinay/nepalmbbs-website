# Lenis

## When it's actually justified

Lenis replaces the browser's native scroll physics with an inertia-based one
— the scroll position eases toward its target instead of moving 1:1 with the
wheel/trackpad. Justified when that specific *feel* is the point (a
flagship, cinematic, editorial/agency-style page where scroll itself is part
of the brand experience). Not justified as a default "premium" upgrade — most
product UI, most content-dense pages, and most return-visitor tools are
actively worse with inertia scrolling (it adds latency between input and
result, which reads as sluggish rather than premium on anything people
scroll through quickly or repeatedly).

## The real cost: it changes what "scroll" means to everything else

Lenis intercepts the scroll event and drives the page via its own RAF loop.
This breaks things that assume native scroll, silently, unless handled:

**1. Native CSS scroll-timelines stop matching what the user sees.**
`animation-timeline: scroll(root block)` / `view()` read the *native*
scroll position. Lenis is moving the page via `transform`, not native
`scrollTop`, in its default (and most common) configuration — so a CSS
scroll-driven animation and Lenis's eased position drift apart. **Pick one
scroll-driving mechanism per page.** If Lenis is in use, either:
  - Drive all scroll-position animation through Lenis's own `scroll` event /
    GSAP ScrollTrigger's Lenis integration (`ScrollTrigger.scrollerProxy`),
    not native CSS scroll-timelines, or
  - Configure Lenis in a mode that keeps native `scrollTop` in sync
    (check current Lenis docs for the option — this has changed across
    versions) if the project also depends on CSS scroll-timelines elsewhere.

**2. Keyboard scrolling (Space, Page Down, arrow keys, `Home`/`End`) and
screen-reader scroll commands can break** if Lenis doesn't explicitly pass
them through. Test this directly — tab to a link near the bottom of a long
page and confirm arrow-key/Page-Down scrolling still works exactly as
without Lenis. This is the single most common accessibility regression this
library introduces, and it is not always caught by an automated contrast/
overflow audit — it has to be tested by hand, with a keyboard, not just
looked at.

**3. Anchor links (`<a href="#section">`) and `Element.scrollIntoView()`**
(used for focus management, "skip to content" links, in-page navigation)
need Lenis's own `scrollTo()` API, or they'll fight the inertia loop and
either undershoot or produce a visible fight between two competing scroll
attempts.

**4. `prefers-reduced-motion: reduce` must disable the inertia, not just
slow it.** A reduced-motion user should get native 1:1 scroll back, not a
gentler version of the eased scroll:

```js
const lenis = new Lenis({
  autoRaf: false, // drive it yourself, see below
});

const mm = window.matchMedia('(prefers-reduced-motion: reduce)');
function applyMotionPref() {
  if (mm.matches) { lenis.stop(); /* or lenis.destroy() for a full native fallback */ }
  else { lenis.start(); }
}
mm.addEventListener('change', applyMotionPref);
applyMotionPref();
```

## Cleanup

Lenis runs a `requestAnimationFrame` loop for as long as it's alive. In any
route-based/component-based context, call `lenis.destroy()` on teardown —
an undestroyed instance is a permanent RAF leak, running forever even after
the page it was scrolling is gone.

```js
function raf(time) {
  lenis.raf(time);
  rafId = requestAnimationFrame(raf);
}
rafId = requestAnimationFrame(raf);

// teardown
cancelAnimationFrame(rafId);
lenis.destroy();
```

## QA checklist specific to this library

- [ ] Tab to a link past the fold, press Page Down / arrow keys — scroll
      still works exactly as it would natively
- [ ] Every in-page anchor link and any `scrollIntoView()` call (skip-links,
      focus management, a "back to top" button) still lands correctly
- [ ] `prefers-reduced-motion: reduce` fully disables the inertia, not just
      softens it
- [ ] No CSS `animation-timeline: scroll()`/`view()` rule is silently
      reading a native scroll position that no longer matches what's on
      screen
- [ ] The RAF loop is torn down on unmount/route change

## Canonical source

github.com/darkroomengineering/lenis — read the current README directly;
the sync-with-native-scroll and framework-integration APIs have changed
across versions.
