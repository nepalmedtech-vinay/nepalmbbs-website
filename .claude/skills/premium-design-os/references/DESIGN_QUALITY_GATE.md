# Quality Gate

Run before calling any UI work finished. For marketing/landing/portfolio
work, run `design-taste-frontend` §14 (its own pre-flight check) instead
— it's more specific to that surface. This is the general-purpose
version for product UI and for anything that doesn't fit either skill.

## The one rule that matters most

**Source code review is not visual QA.** If you can render the page —
dev server, build + preview, a screenshot tool — do it, and look at the
actual screenshot before claiming the work is done. A CSS rule that is
correct on paper and wrong on screen (a z-index conflict, a collapsed
flex item, a color token that resolves to near-invisible text) is the
single most common gap between "I edited the right file" and "this
looks premium." If you cannot render it in this environment, say so
explicitly rather than asserting a visual result you didn't verify.

`RENDER → SCREENSHOT → INSPECT critically → FIX → RENDER AGAIN`, repeated
until the screenshot actually looks like the thing you're claiming to
have built.

## Checklist

**Visual**
- [ ] Rendered and screenshotted, not just reviewed as source
- [ ] Checked at a narrow mobile width (≈390px) and a standard desktop
      width, not just one
- [ ] No horizontal scroll/overflow at the narrow width
- [ ] Text meets WCAG AA contrast against its actual rendered
      background (not assumed from the hex value — gradients and
      glass surfaces can resolve differently than expected)
- [ ] No orphaned single words on headline last lines
      (`text-wrap: balance`/`pretty` or a manual check)

**Motion**
- [ ] Every animated element assigned a tier (see
      `DESIGN_MOTION_GUIDELINES.md`) — nothing animating "because it was
      easy to add"
- [ ] `prefers-reduced-motion: reduce` actually stops looping/ambient
      motion, verified, not just coded
- [ ] No animation runs on `top`/`left`/`width`/`height`

**Interaction**
- [ ] Every interactive element has a visible `:focus-visible` state
- [ ] Every primary action is keyboard-reachable and keyboard-operable
- [ ] Loading, empty, and error states exist and were actually looked
      at (not just the happy path with data present)
- [ ] No inline `on*` handlers if the project's CSP forbids them (check
      the project's own rules before assuming)

**Content**
- [ ] No invented statistic, testimonial, badge, or accreditation
- [ ] No placeholder/lorem/fake-looking data left in a shipped screen
- [ ] Numbers that are data (prices, counts, stats) use tabular figures

**Performance (sanity check, not a full audit)**
- [ ] No new animation library added without checking what's already
      installed
- [ ] No large, render-blocking asset added without a loading strategy
      (lazy load, `media="print"` deferral trick, or equivalent)
- [ ] If a real Lighthouse/CWV run is possible in this environment, run
      it; if not (e.g. no GPU in a sandboxed container), say so rather
      than asserting a performance number you didn't measure

**Honesty**
- [ ] If a brief asked for something this project's real content, data,
      or architecture doesn't support (photography that doesn't exist,
      a metric that isn't tracked, a dependency the project doesn't
      have), that conflict was surfaced before or during the work, not
      silently worked around.
