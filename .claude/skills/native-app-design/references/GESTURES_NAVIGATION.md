# Gestures & Navigation

## Why this is the highest-leverage native "tell"

A user's thumb has muscle memory for these gestures from every other app on
their phone. Getting one subtly wrong reads as "not a real app" faster and
more viscerally than any visual polish issue — it's a felt wrongness, not a
seen one.

## iOS

**Edge-swipe-back must be interactive, not a threshold trigger.** The
built-in `interactivePopGestureRecognizer` (UIKit) tracks the finger in
real time — the screen underneath is visible and tracks 1:1 with the drag,
and lifting mid-drag can cancel back to the original screen. A custom
implementation that just fires `pop()` once a swipe exceeds some threshold,
with no mid-drag visual feedback, is the most common way a hand-rolled
navigation stack reads as fake. In SwiftUI, this comes for free with
`NavigationStack`/`NavigationView` — don't intercept or wrap the root gesture
recognizer without preserving this behavior exactly.

**Sheet dismissal.** A `.sheet()` presentation's drag-to-dismiss (from
iOS 15's redesigned sheet system onward) is similarly interactive and
rubber-bands if you drag past resistance — a custom modal that snaps closed
at a fixed threshold with no resistance curve is the sheet-equivalent
mistake.

**Don't consume system gestures for custom purposes.** The edge-swipe zone
(roughly the outer ~20pt) is reserved for system back navigation; a custom
horizontal swipe gesture (a carousel, a swipe-to-delete list) that starts
in that same zone will conflict with system back and lose, unpredictably,
depending on exactly where the touch started.

## Android

**Predictive back (Android 14+, `android:enableOnBackInvokedCallback`).**
The system now shows a live preview of the destination during the back
gesture before it completes — implemented via `OnBackAnimationCallback`
(native) or the Compose `PredictiveBackHandler`. An app that still
intercepts back with the older all-or-nothing `OnBackPressedCallback` (no
progress callback) will feel a full generation behind on current-OS
devices, which is a visible, dated "premium" failure on exactly the
hardware a premium product's actual users are likely to have.

**Gesture nav vs. 3-button nav.** Test both — a custom bottom-sheet or
FAB placement that assumes 3-button nav's fixed bottom bar can visually
collide with the gesture-nav pill on devices using gesture navigation
(the more common configuration on current Android).

## React Native

`react-native-screens` + `react-native-gesture-handler`, used together
through React Navigation, is what gets native-feeling interactive
edge-swipe-back on iOS and correct back-gesture behavior on Android — the
JS-only `Animated`-based navigation transitions that predate this
combination do not reproduce the interactive, interruptible feel described
above; verify the project is actually on the native-screens-backed stack,
not an older pure-JS navigator, before assuming gesture parity with native
apps is achieved.

## Flutter

`Navigator` with `PageRouteBuilder` for custom transitions; iOS-style
interactive edge-swipe-back is not automatic the way it is in a native iOS
UINavigationController-backed stack — `CupertinoPageRoute` gets close on
iOS specifically (it's designed to mimic the native transition and gesture),
but a fully custom `PageRouteBuilder` needs the interactive pop gesture
built by hand (`GestureDetector` + `Navigator.pop` triggered progressively,
not on a fixed threshold) to match §"iOS" above.

## The universal check, any framework

Before shipping any custom navigation transition: **can a user start the
gesture, see the destination tracking their finger in real time, and change
their mind mid-drag to cancel back to where they started?** If the answer
is no — if it's a fixed-threshold trigger that fires a canned animation
once crossed — it will read as not-quite-native regardless of how good the
canned animation itself looks.
