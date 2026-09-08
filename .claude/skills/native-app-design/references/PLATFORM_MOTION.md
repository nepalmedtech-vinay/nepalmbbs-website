# Platform Motion — Concrete Values

## iOS — spring, not duration+ease

The system default is a spring with a response (roughly, how long to settle)
and a damping fraction (roughly, how much overshoot/bounce). Apple's own UI
mostly sits in a narrow, tested range:

| Use | response | dampingFraction | Feel |
|---|---|---|---|
| Standard UI transition (sheet, push/pop equivalent) | 0.4–0.5 | 0.8–0.9 | Smooth settle, minimal/no overshoot |
| A snappy, immediate state toggle (switch, small control) | 0.25–0.3 | 0.85–1.0 | Quick, controlled |
| Something that should feel physical/bouncy (a card being released, a drag-to-dismiss) | 0.5–0.6 | 0.6–0.75 | Visible overshoot, settles after 1-2 small bounces |

`dampingFraction: 1.0` is critically damped — no overshoot at all, the
"serious/controlled" end of the range. Below ~0.7 starts reading as bouncy/
playful rather than precise; match to what the interaction actually is (a
financial app's confirmation state probably wants ≥0.85, a playful
onboarding illustration can go lower).

```swift
withAnimation(.spring(response: 0.4, dampingFraction: 0.85)) { ... }
// Or the newer, more explicit API:
withAnimation(.smooth) { ... }        // general-purpose, damping ~1
withAnimation(.snappy) { ... }        // quicker settle, slight overshoot
withAnimation(.bouncy) { ... }        // visible overshoot
```

## Android — Material Motion, by transition *type* not just duration

Material's motion system names transitions by the *relationship* between
what's leaving and what's arriving — picking the right one matters more
than tuning the curve:

| Relationship | Pattern | When |
|---|---|---|
| Elements share a clear visual container/shape (a card expanding into a detail screen) | **Container transform** | The most "premium-reading" of the four — the shared element visibly morphs, not swaps |
| Elements are on the same navigational level (tab switch, peer screens) | **Shared axis** (X for left-right nav, Y for up-down/step flows, Z for forward/back depth) | Preserves the user's sense of spatial relationship between peer destinations |
| Elements have no strong spatial relationship (unrelated content swap) | **Fade through** | The honest "these aren't related" transition — don't force a shared-axis or container-transform where there's no real relationship |
| A small UI element appearing/disappearing in place | **Fade** | Icons, small controls — not a screen-level transition |

Standard Material timing: **300ms** for most transitions,
**easing: FastOutSlowIn** (`cubic-bezier(0.4, 0.0, 0.2, 1)`) as the default
curve — the Android equivalent of a "considered, not abrupt" ease.

## React Native (Reanimated) — run it on the native/UI thread

The performance-determining choice, not the curve choice: use
`react-native-reanimated`'s worklets so the animation runs on the native UI
thread, not the JS thread — a screen with any real complexity (a list, async
data, navigation) will drop frames on the JS thread the moment it's busy
with something else, and the user sees it as jank regardless of how good the
curve is.

```js
import Animated, { useSharedValue, withSpring } from 'react-native-reanimated';

const scale = useSharedValue(1);
scale.value = withSpring(1.05, { damping: 15, stiffness: 150 }); // native thread
```

Match the resulting spring parameters to the *target platform's* feel per
the tables above when the app needs to feel native on both — Reanimated's
`damping`/`stiffness`/`mass` parameterization doesn't map 1:1 to SwiftUI's
`response`/`dampingFraction`, so tune by eye against the real platform
convention, not by converting numbers.

## Flutter — the framework's own curve library, matched to platform

`Curves.easeOutCubic` / `Curves.fastOutSlowIn` (literally Material's own
curve) are built in; for iOS-feeling motion within Flutter, `flutter_platform_widgets`
or a manual spring (`SpringSimulation`) tuned to the iOS table above gets
closer than Flutter's own default curves, which read as Material by default
regardless of target OS.
