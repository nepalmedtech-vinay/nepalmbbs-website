# Sound Design (Web)

## Read this first: almost never the default

Sound is the single easiest way to make a "premium" product feel intrusive
or amateurish instead — audio carries an implicit demand for attention CSS
motion doesn't, and a large share of users browse with sound off, in a
shared space, or actively annoyed by unexpected audio. Justified only as a
small number of *optional, muted-by-default, clearly-attributable* feedback
sounds on a product where audio feedback is already an established
convention (games, some fintech apps' transaction-confirmation sound,
music/media products) — essentially never on a marketing site, an admissions
platform, a dashboard, or any content-first page. If in doubt, don't.

## If it's genuinely justified

**Always opt-in, never autoplay on load.** No page should play sound before
a user has interacted with it — most browsers block autoplaying audio with
sound anyway (a real platform constraint, not just a UX opinion), so relying
on it doesn't work even where it might be tempting.

**Web Audio API, not `<audio autoplay>`, for interaction feedback.** A tap/
click sound needs to fire in response to the actual user gesture with no
perceptible latency — the Web Audio API's `AudioContext` gives sample-accurate
timing an `<audio>` element's playback doesn't reliably guarantee:

```js
let ctx;
function playFeedback(buffer) {
  // AudioContext must be created/resumed inside a user-gesture handler —
  // browsers block audio from starting outside one.
  if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
  if (ctx.state === 'suspended') ctx.resume();
  const src = ctx.createBufferSource();
  src.buffer = buffer;
  src.connect(ctx.destination);
  src.start(0);
}
```

**A persistent, discoverable mute control** — if sound exists at all, a
visible, always-reachable way to turn it off is not optional. Respect the
choice for the rest of the session (store it), don't ask again on every
visit.

**Volume, always low.** UI feedback sound is a whisper, not a soundtrack —
short (under ~150ms for a discrete action sound), low-amplitude, and pitched
to not be startling on headphones.

**File size and loading.** Short sounds only, compressed (Ogg Vorbis or AAC,
with a fallback), preloaded only for sounds that will actually be triggered
soon — not a full sound-effect library loaded speculatively on every page.

## Accessibility

Sound is never the *only* channel for information — a confirmation sound
needs a visible confirmation state alongside it, always, for users who are
deaf/hard of hearing or simply browsing muted (the majority case). This is
the audio equivalent of the rule Lottie/Canvas content already follows: no
information exists in only one non-text channel.

## Canonical source

MDN's Web Audio API docs for the actual API surface — `AudioContext`
autoplay-policy behavior differs slightly across browsers; verify current
behavior rather than assuming.
