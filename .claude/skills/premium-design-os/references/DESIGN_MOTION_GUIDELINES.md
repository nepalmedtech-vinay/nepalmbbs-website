# Motion Guidelines

Every element gets exactly one tier before it gets a `transition` or
`animation` rule. Most elements are STATIC — that is the correct default,
not a gap to fill in later.

## The tiers

| Tier | What lives here | Duration | Examples |
|---|---|---|---|
| **STATIC** | Most content | 0 | Body text, most cards, most layout |
| **MICRO** | Feedback that a control was touched | 100–200ms | Button hover/press, focus ring, checkbox toggle, link underline |
| **INTERACTIVE** | State the user caused | 200–350ms | Accordion open/close, modal/drawer in-out, dropdown, tab switch |
| **SECTION** | Content entering the viewport | 400–700ms | Scroll-triggered reveal, staggered card grid, count-up statistic |
| **CINEMATIC** | The signature moment(s) of a flagship page | 700–1400ms | Hero choreography, a scroll-scrubbed story sequence, a mask/clip-path reveal |
| **AMBIENT** | Continuous background motion | loop, but must respect `--mo`/reduced-motion | A drifting gradient field, a marquee/ticker, a subtle parallax layer |

A product UI (dashboard, admin panel, CRM) should be almost entirely
STATIC + MICRO + INTERACTIVE. If a settings page has SECTION-tier
scroll reveals, that is very likely a mistake, not a feature — it makes
a tool feel like an unfinished demo. A flagship marketing page uses all
six tiers, but CINCEMATIC and AMBIENT should be rare and specific: one
hero, maybe one storytelling section — not the whole page.

## Relationship to `taste-skill`'s dials

`taste-skill` uses `MOTION_INTENSITY` (1–10) as its single knob. Rough
mapping, so the two systems don't contradict each other on a project
that uses both:

| MOTION_INTENSITY | Tiers actually in play |
|---|---|
| 1–3 | STATIC + MICRO only |
| 4–6 | + INTERACTIVE, light SECTION |
| 7–8 | + full SECTION, one CINEMATIC moment |
| 9–10 | + AMBIENT, multiple CINEMATIC moments |

## Timing tokens

```css
--d-micro: 150ms;
--d-interactive: 280ms;
--d-section: 550ms;
--d-cinematic: 1000ms;

--ea-standard: cubic-bezier(0.22, 1, 0.36, 1);   /* out, most UI motion */
--ea-enter:    cubic-bezier(0.16, 1, 0.3, 1);    /* content arriving */
--ea-io:       cubic-bezier(0.65, 0, 0.35, 1);   /* symmetric in/out, modals */
```

Prefer one master intensity variable (`--mo`, or whatever the project
already calls it) that every duration multiplies against, collapsed to
`0` under `prefers-reduced-motion: reduce` — one line turns off every
animation at once, rather than auditing each rule individually. If the
project already has this pattern (many do), reuse its variable name;
don't introduce a second one.

## Non-negotiables

- Animate `transform` and `opacity` only, for anything that has to run
  smoothly — never `top`/`left`/`width`/`height`.
- Every looping (AMBIENT) animation must stop under
  `prefers-reduced-motion: reduce`, not just slow down.
- A scroll-driven effect must degrade to the finished static layout if
  the browser doesn't support it (`@supports (animation-timeline:
  view())`) — the fallback is never "invisible until JS runs."
- One sheen/shimmer pass on hover is a detail; a looping shine is an
  advertisement. Don't loop attention-seeking motion on anything that
  isn't actively loading.
