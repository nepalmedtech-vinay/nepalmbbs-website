// NepalMBBS.in — mount-medical-scene.js
//
// One shared gate for every place `medical-icons-scene.js` gets mounted
// (footer, page-header, hero, admission-process). Before this file existed,
// each of those four sites duplicated the same `requestIdleCallback` gate —
// and none of them checked whether the canvas was actually anywhere near
// the viewport before paying Three.js's setup cost. The footer sits below
// the fold on every route by definition, so it was mounting immediately on
// idle regardless of whether the visitor ever scrolled that far.
//
// Measured with `tests/perf-verify.mjs` (4x CPU throttle): Total Blocking
// Time was 30-58x over budget on every route mounting this scene. Moving
// the mount behind IntersectionObserver does not reduce the *cost* of one
// scene (that's the separate DPR/geometry work below) — it moves *when*
// that cost is paid, out of the critical initial-load window for anything
// not already on screen, which is most of these mounts on most page loads.
export function mountMedicalSceneWhenVisible(canvas, { colorVars, onReady, onLost, rootMargin = '600px' } = {}) {
  if (!canvas) return;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduce) return;

  const idle = window.requestIdleCallback || ((fn) => setTimeout(fn, 200));

  const mount = () => {
    idle(async () => {
      try {
        const { mountMedicalIconsScene } = await import('./medical-icons-scene.js');
        const handle = mountMedicalIconsScene(canvas, colorVars);
        if (handle) {
          canvas.classList.add('is-ready');
          onReady?.(handle);
          canvas.addEventListener('webglcontextlost', (e) => {
            e.preventDefault();
            handle.stop();
            canvas.classList.remove('is-ready');
            onLost?.();
          }, { once: true });
        }
      } catch (e) {
        // Import/WebGL failure — the CSS/SVG field underneath is already
        // a finished treatment on its own, never a blank canvas.
      }
    });
  };

  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => {
      if (entries.some((en) => en.isIntersecting)) {
        io.disconnect();
        mount();
      }
    }, { rootMargin });
    io.observe(canvas);
  } else {
    mount();
  }
}
