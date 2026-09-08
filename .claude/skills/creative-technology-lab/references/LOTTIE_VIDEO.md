# Lottie / Video

## Lottie

**What it actually is.** A JSON-encoded After Effects animation, played back by a
runtime library (`lottie-web`, `@lottiefiles/dotlottie-web`, or a native SDK on
iOS/Android). Vector-based, so it scales cleanly and is usually far smaller
than an equivalent video file for the same motion.

**When it's justified.** Complex, hand-animated illustration or icon motion
that would be impractical to hand-code in CSS/SVG/GSAP — a multi-stage
character or icon animation an actual motion designer built in After Effects,
a loading/success/error micro-illustration sequence, an animated logo mark.
Not justified for anything expressible as a CSS keyframe (a simple
spin, fade, or scale) — reaching for Lottie there adds a runtime dependency
and a JSON payload for something three lines of CSS already does.

**The real cost.** The runtime library itself (`lottie-web` is not tiny), plus
the JSON file's own size, which scales with animation complexity — a
detailed illustration sequence can be genuinely large. Always check the
actual exported file size before committing to it; a "small, tasteful" Lottie
mark and a 2MB JSON blob look identical in an After Effects preview.

**Loading discipline.**
- Lazy-load the player library — never in the critical render path.
- Lazy-load the JSON itself if the animation isn't above the fold.
- Provide a static poster frame (a still SVG/PNG of the animation's rest
  state) that shows immediately, with the Lottie player swapping in once
  both the library and JSON have loaded — never a blank space while it
  loads.

**Accessibility / reduced motion.** Every Lottie player exposes play/pause/
stop and a way to jump to a specific frame. Under `prefers-reduced-motion:
reduce`, either don't autoplay (show the poster frame / a meaningful static
frame, e.g. frame 0 or the animation's resolved end-state) or play once
without looping — never an autoplaying loop a reduced-motion user can't
stop. If the animation conveys information (a status change, a completed
action), that information needs a text equivalent too — the same rule
Canvas content follows in `SVG_CANVAS.md`, because a JSON animation has no
accessibility tree either.

**Sourcing.** A real Lottie asset comes from an actual After Effects export
(via the Bodymovin/LottieFiles plugin) by someone who animated it, or a
licensed asset from LottieFiles' library with its license actually checked.
Never fabricate what a Lottie file "shows" — if the project has no real
animated asset, say so rather than describing a Lottie effect that doesn't
exist in the codebase, the same standard this project already holds for
imagery (`DESIGN_ANTI_PATTERNS.md`, `premium-design-os` §8).

## Video (as a design/motion element, not primary content)

**When it's justified.** A background video conveying real, specific content
a static image or animation can't (an actual product demo, real captured
footage relevant to the brand) — not "movement for its own sake." A
generic stock-footage background loop is the video-file equivalent of a
stock photo standing in for real content, and inherits the same honesty
problem this project has already rejected for imagery.

**The discipline, non-negotiable at any tier:**
- `muted autoplay loop playsinline` — audio-on autoplay is both a UX
  violation and blocked by most browsers anyway.
- A poster image (`poster=""` attribute) that IS the correct first frame —
  never a mismatched placeholder, which reads as broken the instant the
  video loads.
- Compressed and served at the resolution actually displayed — a 4K
  source file behind a 600px-tall hero section is pure waste; encode a
  version sized for its actual display area.
- `prefers-reduced-motion: reduce` → don't autoplay; show the poster frame
  with an explicit play control instead, or replace with a static image
  entirely if the video's content isn't essential.
- Lazy-load or defer the video source — it should never compete with the
  page's actual LCP-critical content for bandwidth on load.
- A real fallback poster/image if the video fails to load or the format
  isn't supported (`<video>`'s own fallback content between the tags, or a
  background-image fallback if used as a CSS background).

**Format.** WebM (VP9) with an MP4 (H.264) fallback covers effectively all
browsers; AV1 for the smallest file size where encode/decode support and
build-time cost justify it. Always provide the MP4 fallback regardless —
WebM-only breaks on some environments still in real use.

## Canonical sources

lottiefiles.com/docs for the Lottie runtime APIs — the player component
names and props differ between `lottie-web` and the newer `dotlottie`
runtimes; verify against whichever is actually installed rather than
assuming API parity between them.
