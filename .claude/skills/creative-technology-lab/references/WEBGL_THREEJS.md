# WebGL / Three.js

## When it's actually justified

Genuinely 3D content (a rotatable product, an architectural walkthrough, a
real spatial scene) or a particle/visual effect that needs GPU parallelism
at a scale Canvas 2D can't hold at 60fps. Not justified for "make the
background feel premium" — a 2D card grid, a hero section, a data
dashboard essentially never need it, and reaching for it there is the
single most common way a page becomes a demo of what the developer can
build rather than a a fast, credible product. This project's own WebGL
background (`aurora-gl.js`) is the honest example of a *justified,
disciplined* use: it sits behind an already-correct CSS fallback (so its
failure costs nothing), mounts only once the main thread is idle, and is
never load-bearing for content.

## Loading discipline

- **Never block first paint or LCP.** Mount after the page's real content is
  visible and the main thread has gone idle:
  ```js
  function mountScene() { /* create renderer, geometry, start loop */ }
  if ('requestIdleCallback' in window) requestIdleCallback(mountScene, { timeout: 2500 });
  else setTimeout(mountScene, 700);
  ```
- **A CSS-only or static-image fallback must already be correct** before the
  WebGL layer mounts on top of it — the WebGL scene is a progressive
  enhancement, never the only version of the content.
- **Code-split it.** Three.js and its geometry/texture assets should not be
  in the main bundle for a route that might not even show the scene (mobile,
  reduced-motion, low-end device where you choose not to mount it at all).

## Device / capability gating

```js
function shouldMountWebGL() {
  if (!window.WebGLRenderingContext) return false;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return false;
  // A rough, not authoritative, low-end signal -- treat as a hint, not a hard gate
  if (navigator.deviceMemory && navigator.deviceMemory < 4) return false;
  return true;
}
```

Handle context loss — a real event on mobile GPUs under memory pressure,
not an edge case:

```js
canvas.addEventListener('webglcontextlost', (e) => {
  e.preventDefault();
  cancelAnimationFrame(rafId);
  // fall back to the static/CSS version already underneath — do not attempt
  // to silently recreate the context; a lost context on a low-memory device
  // will likely be lost again immediately
});
```

## The leak that always happens

Three.js objects (`BufferGeometry`, `Material`, `Texture`, `WebGLRenderTarget`)
hold GPU memory that `dispose()` releases — and JS garbage collection does
**not** call `dispose()` for you; removing a mesh from the scene graph does
not free its GPU resources. Every scene needs an explicit teardown that
walks and disposes everything it created:

```js
function teardown() {
  cancelAnimationFrame(rafId);
  scene.traverse((obj) => {
    obj.geometry?.dispose();
    if (Array.isArray(obj.material)) obj.material.forEach((m) => m.dispose());
    else obj.material?.dispose();
  });
  renderer.dispose();
  renderer.forceContextLoss();
}
```

Call this on route change, component unmount, and the `prefers-reduced-motion`
media-query change handler alike — not just on page unload, which is too
late for a single-page app that mounts/unmounts the scene repeatedly.

## Performance, in priority order

1. **Draw call count** — merge geometries where possible; hundreds of
   individual meshes each issuing their own draw call is the most common
   cause of a "premium" 3D scene running at 20fps on a mid-range phone.
2. **Texture size** — a texture larger than it will ever be rendered at is
   pure waste; compress and size for the actual display resolution, not the
   source asset's native resolution.
3. **Post-processing passes** (bloom, depth of field, SSAO) — each is a full
   extra render pass. Justify each one against a measured frame-time cost,
   not by default; the first thing to cut on a low-end-device fallback path.
4. **Shadow maps** — expensive; real-time shadows from multiple lights are
   rarely worth their cost for a marketing/product page versus a baked or
   faked (blob-shadow) approximation.

## Reduced motion

Don't necessarily remove the whole scene — a static, well-lit 3D object can
be a legitimate reduced-motion end state. What must stop: camera drift,
particle movement, any continuous/ambient animation loop. `gsap.matchMedia()`
if GSAP is driving the scene's animation; a plain `matchMedia` listener
toggling the render loop otherwise.

## Canonical source

threejs.org/docs + threejs.org/manual — Three.js's API surface changes
between major versions (material property names, the `Object3D` disposal
pattern above, texture color-space handling) more than most libraries;
verify against the docs for the exact version pinned, not from memory.
