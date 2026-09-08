---
name: native-app-design
description: Premium design methodology for native and cross-platform mobile apps — iOS (SwiftUI/UIKit), Android (Jetpack Compose/Material), React Native, and Flutter. Covers platform-native motion systems, gesture-driven navigation, haptics, and the specific ways a premium mobile app differs from a premium website (this is not premium-design-os or taste-skill applied to a smaller screen — native platforms have their own motion physics, their own HIG/Material conventions, and their own "looks templated" tells). Use whenever the project is a native or cross-platform mobile app, not a responsive website.
license: Internal — author's own project conventions, not third-party.
---

# Native App Design

`premium-design-os` and `taste-skill` are web-shaped: CSS tokens, the DOM,
`backdrop-filter`, scroll-timelines. A native or cross-platform mobile app is
a genuinely different medium — it has its own motion physics (spring-based,
not easing-curve-based, as the default), its own platform conventions users
already have muscle memory for, and its own specific ways to look cheap
(fighting the platform's native feel instead of working with it is the
mobile equivalent of "generic AI landing page").

**Route here, not to the web skills, whenever the deliverable is:** a native
iOS/Android app, a React Native or Flutter cross-platform app, or a PWA
built to feel indistinguishable from native. Route to `premium-design-os`
instead for a responsive *website* viewed on a phone — that's still a web
medium with web conventions, not this file's territory.

## 1. The core difference from web premium

On web, restraint and CSS-first are the whole philosophy. On native, **the
platform itself already carries most of "premium" for free** — iOS's own
system fonts, spring physics, and materials (blur, vibrancy) already read as
considered; Android's Material motion system already has real, tested
timing curves. The mistake native apps make is not under-designing, it's
**fighting the platform** — a custom navigation transition that ignores the
platform's gesture conventions, a font that isn't the system font pretending
to be "brand," a hand-rolled button that doesn't match platform touch-target
and feedback conventions. Premium native design usually means *using the
platform's own vocabulary fluently*, with one or two genuinely bespoke
signature moments — not replacing the vocabulary wholesale.

## 2. Platform-native motion, not CSS easing curves

**iOS** defaults to spring-based animation, not duration+easing-curve — the
system's own transitions (sheet presentation, navigation push/pop) are
springs, and a custom animation that uses a fixed-duration ease-out where
the OS uses a spring will read as subtly wrong even to someone who can't
say why.

```swift
// SwiftUI — the platform-idiomatic default, not a duration+curve
withAnimation(.spring(response: 0.4, dampingFraction: 0.8)) {
    isExpanded.toggle()
}
```

**Android / Material** has its own named motion system (Material Motion) with
specific curves for specific transition types (container transform, shared
axis, fade through) — these aren't arbitrary, they encode what kind of
relationship the transitioning elements have. Using the wrong pattern (a
fade-through where the elements have a real spatial/hierarchical
relationship that calls for container transform) reads as generic even when
technically smooth.

**React Native / Flutter** — reach for `react-native-reanimated` (RN) or
Flutter's own animation framework rather than the older `Animated` API
(RN) — both prioritize running on the native thread, not the JS thread,
which is the difference between 60fps and visible jank on a mid-range
device once a screen has any real complexity. Match the resulting motion to
the *target platform's* convention where the two diverge (a screen
transition should feel like iOS on iOS and Android on Android, not one
compromise aesthetic on both) — reference `references/PLATFORM_MOTION.md`
for the concrete timing/curve values per platform and per transition type.

## 3. Navigation and gesture

The single highest-leverage "does this feel native or fake" signal.
Platform-native gesture conventions users already have muscle memory for:

- **iOS**: edge-swipe-back on any pushed navigation view (interruptible,
  interactive — the user can drag partway and reverse), not just a button.
  A screen that intercepts this gesture without providing an equivalent
  breaks a reflex the user has on every other app on their phone.
- **Android**: back button/gesture is the system's, not the app's to
  reinterpret — predictive back (Android 14+) shows a preview of where
  the gesture will land; fighting or hiding this reads as broken, not as a
  design choice.
- Full detail per platform, including the exact interruptible-gesture
  implementation and what "gesture-driven navigation" actually requires
  (a screen that can render mid-transition, not just at its two end
  states): `references/GESTURES_NAVIGATION.md`.

## 4. Haptics

The mobile-native equivalent of a micro-interaction, and — same discipline
as sound design on web — easy to overdo. A haptic pulse on every single tap
reads as noisy, not premium; reserved for state changes that matter (a
completed action, a boundary reached, a selection changed in a way the user
should feel, not just see).

- **iOS**: `UIImpactFeedbackGenerator` (light/medium/heavy/rigid/soft — pick
  by the weight of what happened, a light tap for a minor toggle, heavy only
  for something substantial), `UINotificationFeedbackGenerator` for
  success/warning/error, `UISelectionFeedbackGenerator` for a value changing
  in a picker/slider.
- **Android**: `HapticFeedbackConstants` (View-based) or the
  `VibrationEffect` API for more control — Android's haptic vocabulary is
  less standardized across OEMs than iOS's; test on real hardware, not just
  the emulator, which doesn't reproduce haptic feel meaningfully.
- **Cross-platform (RN/Flutter)**: a haptics package that wraps both native
  APIs (`react-native-haptic-feedback`, Flutter's `HapticFeedback` class) —
  map to the *semantic* event (success, selection, impact-light/medium/
  heavy), not a raw vibration duration, so each platform's native feel is
  preserved rather than homogenized into a generic buzz.
- **Always respect the system-level haptics setting** — every platform lets
  a user disable system haptics; the app must not override that preference
  by calling low-level vibration APIs directly instead of the
  platform-provided haptic APIs, which already check it.

## 5. Materials and depth

**iOS**: system materials (`.ultraThinMaterial`, `.regularMaterial`, etc. in
SwiftUI) already implement a tuned, accessibility-aware version of
glassmorphism — prefer them over a hand-rolled blur+opacity stack, which
will not adapt to Increase Contrast / Reduce Transparency accessibility
settings the way the system material does automatically.

**Android**: Material 3's elevation system (tonal elevation, not just
shadow) is the platform's depth language — a surface gets *lighter*, not
just shadowed, as it elevates, in both light and dark themes. A hand-rolled
shadow-only elevation system will look correct in light mode and wrong in
dark mode, which is exactly the kind of dark-mode-was-an-afterthought bug
this project's own web work has already found and fixed multiple times.

## 6. Typography and iconography

Default to the platform system font (SF Pro on iOS, Roboto/the device's
configured font on Android) unless the brand has a real, licensed
typeface — a custom web font ported into a native app without the
platform's own dynamic type / accessibility text-scaling support is a
regression, not a premium upgrade. San Francisco and Roboto both already
carry "this is a real app," the same way system fonts on web usually don't
(the inverse of the web rule, where system fonts often signal generic).

For icons, platform-native icon sets (SF Symbols on iOS — thousands of
icons in matching weights, with built-in Dynamic Type scaling and
multicolor/hierarchical rendering modes; Material Symbols on Android) are
almost always the right default over a third-party web icon set ported in —
they're free, already weight-matched to the system font, and users
recognize them. Reserve custom iconography for a genuinely bespoke brand
mark, not the whole icon vocabulary (see `brand-identity-lab` for building
that bespoke layer where it's actually warranted).

## 7. Anti-patterns specific to native

- **A web-style hamburger menu as primary navigation on iOS.** iOS
  convention is tab bars (≤5 items) or a navigation stack — a hamburger
  drawer is a web/Android-ported pattern that reads as non-native on iOS
  specifically.
- **Ignoring safe areas.** Content behind the notch/Dynamic Island/home
  indicator/status bar is not "edge-to-edge premium," it's broken on a
  device the designer didn't test on.
- **A splash screen with a spinner.** Platform guidelines (both iOS and
  Android) explicitly discourage a loading splash for anything but the
  literal app-launch frame — a "premium loading experience" with a custom
  spinner on every screen transition is the native equivalent of the
  unnecessary-splash-screen anti-pattern the original cinematic-web brief
  itself warned against.
- **Pull-to-refresh reinvented.** Users have a specific, precise gesture
  memory for this; a custom version that doesn't match native timing/
  resistance feels laggy even if the code is objectively correct.

## 8. Quality gate

Everything in `creative-technology-lab`'s `QA_GATES.md` performance/
accessibility/cleanup discipline still applies conceptually (measure, don't
assume; respect the reduced-motion equivalent — iOS's Reduce Motion, which
apps must query via `UIAccessibility.isReduceMotionEnabled` and Android's
equivalent, not assume from a media query that doesn't exist on native).
Additionally, native-specific:

- [ ] Tested on real hardware, not only a simulator/emulator — haptics,
      true frame rate, and thermal throttling behavior don't reproduce
      accurately in software
- [ ] Dynamic Type / font-scaling (iOS) and font-scale accessibility
      setting (Android) tested at a large scale, not just default size
- [ ] Reduce Motion (iOS) / "remove animations" (Android accessibility)
      respected — same principle as web's `prefers-reduced-motion`, queried
      through the platform's own API
- [ ] Safe areas respected on the actual notch/Dynamic Island/gesture-bar
      hardware the app will run on, not an idealized rectangle
- [ ] Haptics tested on real devices per platform — and confirmed silent
      when the user has disabled system haptics
