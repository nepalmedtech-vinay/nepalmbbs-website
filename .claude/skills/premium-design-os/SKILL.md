---
name: premium-design-os
description: Universal design-quality router and product-UI methodology for any digital product — SaaS apps, dashboards, admin panels, CRMs, education/healthcare/enterprise platforms, mobile apps — not just marketing pages. Use at the start of any new project or major feature to decide the right design methodology, apply maturity-level and motion-budget frameworks, and run a pre-ship quality gate. For landing pages, portfolios, and marketing-site redesigns specifically, this skill routes to design-taste-frontend (taste-skill) and redesign-skill rather than duplicating them.
license: Internal — author's own project conventions, not third-party.
---

# Premium Design OS

A router and a gap-filler, not a reimplementation. Two skills already do
excellent, detailed work in their own territory:

- **`design-taste-frontend`** (`taste-skill`) — landing pages, portfolios,
  marketing redesigns. Brief-inference, design-variance/motion/density
  dials, honest design-system selection (Carbon, Fluent, Radix, shadcn,
  GOV.UK, etc. vs. hand-rolled CSS), AI-tell detection, a pre-flight
  checklist. If the project is one of these, **use it directly** — do not
  re-derive its logic here.
- **`redesign-skill`** — audit-first process for upgrading an *existing*
  site of any kind without breaking it.

Neither covers **product UI** — dashboards, SaaS app shells, admin
panels, CRMs, multi-step workflows, data-dense enterprise screens
(`taste-skill` says so explicitly: "Not dashboards, not data tables, not
multi-step product UI"). That gap, plus three cross-cutting frameworks
every project needs regardless of type (maturity levels, a motion
budget, a quality gate), is what this skill actually adds.

## 1. Route first

Before designing anything, classify the project and route:

| Project reads as… | Do this |
|---|---|
| Landing page, portfolio, marketing site, existing-site redesign | Invoke `design-taste-frontend` (or `redesign-skill` if it's an existing site). Stop reading this file except §3–5 below. |
| Dashboard, admin panel, CRM, SaaS app shell, internal tool, multi-step product flow | Use §2 below. `taste-skill`'s design-system table (official packages per brief) still applies — reuse it rather than re-deriving. |
| Education / healthcare / civic / regulated platform | Trust-first constraints override aesthetic preference (same rule `taste-skill` §0.A.6 states) — restrained motion, high contrast, no invented statistics, plain language. Route to product-UI (§2) or marketing (taste-skill) depending on which surface you're building. |
| Mixed (marketing site + app behind login) | Route each surface separately. A cinematic marketing hero and a dense admin table are not the same design problem and should not share a motion/density budget. |
| Native or cross-platform mobile app (iOS/Android/React Native/Flutter) — not a responsive website | Invoke `native-app-design` instead. This file's tokens/CSS-shaped guidance is web-specific; native has its own motion physics and platform conventions. |
| Any of the above needs motion/graphics CSS genuinely cannot produce (complex scroll-scrubbed timelines, true 3D, particle systems, real refraction, Lottie/video/sound) | Finish routing above first, build the CSS-first version, and only then invoke `creative-technology-lab` for the specific gap — it is downstream of this gate, not a replacement for it. |
| The brief calls for a distinctive visual identity beyond an off-the-shelf icon library — custom iconography, illustration, or wordmark treatment | Invoke `brand-identity-lab` alongside whichever row above applies. Check its own "does this actually need custom work" gate first — most "make it feel unique" asks are a typography/spacing/motion problem, not an illustration one. |

State the routing decision in one line before proceeding, the same way
`taste-skill` states its "Design Read" — e.g. *"Routing as: product UI
(counselor console), Carbon-density guidance, motion budget MICRO/SECTION
only."*

## 2. Product UI (the actual gap)

Premium in product UI is **not** the same recipe as premium marketing:
motion is quieter, density is higher, and the user is a returning
professional, not a first-time visitor to be impressed.

- **Pick a real system if the brief matches one** — reuse `taste-skill`
  §2.A's table (Carbon for enterprise data density, Fluent for
  Microsoft-adjacent, Radix/shadcn for an owned React app shell, Polaris
  for Shopify admin surfaces). Do not hand-roll a data table, a date
  picker, or a multi-select when an official package already solved it
  accessibly.
- **Information architecture before visuals.** Nav model (sidebar vs.
  top nav vs. command palette), page hierarchy, and where state lives
  (URL vs. client) are the actual design work; color and motion are
  the last 10%.
- **Density is a dial, not a mistake.** `taste-skill`'s `VISUAL_DENSITY`
  scale (1 airy → 10 cockpit) still applies; product UI usually sits
  6–8, not the 2–4 a marketing page would use.
- **States are the design, not an afterthought.** Every list/table needs
  a real empty state, loading state (skeleton matching final layout,
  never a generic spinner), and error state (inline, actionable, never
  `window.alert`) designed at the same time as the populated state —
  not bolted on after.
- **Motion is functional, not cinematic.** See `references/DESIGN_MOTION_GUIDELINES.md`
  — product UI lives almost entirely in the MICRO/INTERACTIVE tiers.
  A dashboard with SECTION- or CINEMATIC-tier motion feels like a demo,
  not a tool people trust with real work.
- **Product-UI-specific anti-patterns** are in
  `references/DESIGN_ANTI_PATTERNS.md` — read it alongside `taste-skill`
  §9, which covers the marketing-page tells this file does not repeat.

## 3. Maturity levels

Use to calibrate ambition against project type and time budget — state
the target level before starting, same as the routing line.

1. **Clean** — correct, accessible, no visual noise. No motion beyond
   native hover/focus states.
2. **Premium** — strong type/spacing/hierarchy, one considered accent,
   MICRO-tier motion. Most internal tools should stop here.
3. **Signature** — a distinctive visual identity and interaction model;
   the project could be recognized from a screenshot alone. SECTION-tier
   motion enters.
4. **Cinematic** — depth, scroll storytelling, choreographed entrances.
   Flagship marketing surfaces, not product UI.
5. **World-class** — 4, plus measured performance and accessibility
   parity across the full device mix. Reserve for the one or two
   surfaces that actually carry the brand.

Default: **Level 2** for product UI, **Level 3–4** for a flagship
marketing surface, unless the brief says otherwise. Do not spend Level
4–5 effort on an admin panel three people will ever see — that is
solving the wrong problem.

## 4. Motion budget

Full tier definitions, timing tokens, and easing in
`references/DESIGN_MOTION_GUIDELINES.md`. The one rule to hold in
working memory: **classify every element into exactly one tier before
animating it, and most elements should be STATIC.** If you can't name
the tier, don't animate it yet.

## 5. Before calling anything done

Run `references/DESIGN_QUALITY_GATE.md`. Its short version: build it,
render it, screenshot it, look at the screenshot critically before
claiming the work is premium — source code review is not a substitute
for looking at the rendered page, on both desktop and a narrow mobile
viewport, with `prefers-reduced-motion` on and off.

## 6. Hierarchy

`Global (this skill) < taste-skill/redesign-skill's own project-specific
findings < the project's own CLAUDE.md / design-system doc < an explicit
instruction from the user in the current conversation.` A project's
established tokens, brand color, or documented constraints win over any
default here — this file sets defaults and fills a gap, it does not
override what a project has already decided for itself.

## 7. Technology discipline

Default to CSS (including `animation-timeline: view()` scroll-driven
animation), `IntersectionObserver`, and `requestAnimationFrame`. These
cover staggered reveals, parallax, progress indicators, and cascading
grids at zero bundle cost and without a main-thread animation library
fighting the browser's compositor. Reach for GSAP, Framer Motion/Motion,
or WebGL/Three.js only for the specific thing CSS genuinely cannot do
(complex scroll-scrubbed timelines with branching logic, true 3D, canvas
particle systems) — and check what the project already has installed
before adding a second animation dependency next to a first.

## 8. Imagery honesty

Never invent or imply photography, statistics, testimonials, awards, or
accreditations that are not sourced. If a brief's visual direction
assumes photography that does not exist for the project (stock or real),
say so before building the section that depends on it, and offer the
non-photographic alternative (data visualization, typography, generated
graphics, the product's own real content) rather than silently
substituting a generic stock image.
