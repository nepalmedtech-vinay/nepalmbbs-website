# NepalMBBS.in — Design System

Written at the end of Phase 1. It records what the front end *is* today, what
the token layer is *for*, and the specific decisions Phase 3 has to make. It is
not aspirational: every count below came from the current stylesheets.

---

## 1. Architecture

```
index.html              1105 lines — markup only
assets/css/
  tokens.css            colour system (live) + design tokens (staged for Phase 3)
  base.css              element defaults, typography, layout primitives
  components.css        nav, tab cards, buttons, glass surfaces
  sections.css          page sections, admin panel, chat, responsive rules
assets/js/
  config.js             Supabase endpoint + helpers, GA4 loader
  boot.js               startup, site settings, dynamic content
  i18n.js               EN/HI switching
  navigation.js         tab routing, mobile menu, toast
  leads.js              lead form, NEET calculator, currency
  reveal.js             scroll reveal observer
  chatbot.js            knowledge base + chat widget
  hero.js               hero slideshow
  colleges.js           college cards, photo and video system
  admin.js              admin auth, dashboard, content management
  effects.js            glass tap glow
assets/brand/           PWA + touch icons
tests/
  regression.mjs        42 functional checks (Playwright)
  visual-diff.mjs       full-page pixel diff at 390 / 820 / 1440
```

**Load order is load-bearing.** CSS is concatenation-ordered — the four files
must stay in the order `index.html` lists them or the cascade changes. JS files
are classic scripts, not modules, because 86 inline `on*` handlers in the markup
call these functions by name and modules would scope them. `boot.js` runs an
IIFE that calls functions defined in later files; this is safe only because it
awaits `DOMContentLoaded` first.

---

## 2. Token layer

`tokens.css` now holds two things, and the distinction matters.

**Live**: the original colour system (`--bg-*`, `--gold*`, `--text-*`,
`--glass-*`, `--r/--r-lg/--r-xl`). Every existing rule consumes these. Changing
a value here changes the site.

**Staged**: everything under the `DESIGN SYSTEM` banner — type, space,
elevation, layers, motion, trust register, CTA hierarchy, focus. Nothing
consumes these yet, which is why adding them produced a zero-pixel diff. Phase 3
migrates rules onto them.

### Why these tokens and not a generic scale

The system answers a specific brief. A family is committing to five and a half
years and a large sum, usually within days of a NEET result, in a market full of
consultancies that overpromise. The page has to look like an institution you can
verify, not like a funnel.

Two token sets follow directly from that:

**Trust register** (`--doc-*`, `--ev-*`). Right now every surface on the site is
the same frosted glass. An NMC recognition status and a marketing headline carry
identical visual authority — backwards for a site whose whole value is being
checkable. The document register is flatter, denser and higher-contrast, closer
to a record than a campaign. The evidence states keep *recognised* /
*provisional* / *caution* distinct, and deliberately **not** the marketing gold:
authority is not a highlight colour.

**CTA hierarchy** (`--cta-*`). Three calls to action compete on this page — the
lead form, WhatsApp, and the Calendly booking. All three currently render as
glowing gold, so none of them leads. The ranking is now stated once, with a 48px
minimum thumb target.

---

## 3. Component inventory

363 classes are defined; 274 are referenced from markup or JS. Grouped by family,
largest first:

| Family | Classes | What it is | Phase 3 note |
|---|---:|---|---|
| `cbar-*` | 60 | Contact bar — phone/WhatsApp pills | **Largest family on the site, and almost entirely unreferenced.** See §4. |
| `hero-*`, `slide-*` | 69 | Hero + 30-slide background slideshow | 30 slides of hotlinked stock is the heaviest thing on the page |
| `college-*`, `cs-*`, `photo-*` | 73 | College cards, photo grid, video system | Stock photos stand in for real campuses — see §5 |
| `tab-*`, `tabs-*` | 50 | The nine-section pseudo-router | Becomes real pages in Phase 2 |
| `chat-*` | 30 | Chat widget + knowledge base | Keep; it converts |
| `trust-*` | 26 | Trust badges and signals | Prime candidate for the document register |
| `a-*` | 24 | Admin panel | Internal; lowest design priority |
| `faq-*` | 22 | Accordion | Needs schema markup in Phase 4 |
| `why-*`, `step-*`, `process-*` | 41 | Explanatory content | The long-form copy `--measure` exists for |
| `vid-*`, `test-*` | 40 | Videos, testimonials | Testimonials are a trust surface |
| `calc-*`, `curr-*`, `compare-*` | 33 | NEET calculator, currency, comparison | Genuinely useful tools; deserve better UI |
| `guide-*`, `life-*` | 24 | Guidelines, life in Nepal | |
| `wa-*`, `counsel-*`, `foot-*` | 41 | WhatsApp, counseling, footer | Conversion surfaces |
| `nav-*`, `ticker-*`, `card-*`, `off-*` | 34 | Chrome | |

---

## 4. Known debt (do not fix silently — these are Phase 3 decisions)

**~91 unreferenced classes (25% of the stylesheet).** Nothing in the markup or
JS refers to them. The `cbar-*` family alone is 60 classes and appears to be an
entire contact-bar redesign that was styled and never wired up. They were left
in place: deleting CSS is not reversible from the browser's point of view if
something injects a class in a way static analysis missed, and Phase 1's
guarantee was zero behaviour change. Delete them in Phase 3, per family, with
the visual diff as the check.

**Raw values everywhere.** 277 hex colours, 520 `rgba()` calls, 121 ad-hoc
`border-radius` values, 194 unrelated `font-size` declarations. The token layer
exists to absorb these; the migration is Phase 3's main mechanical task.

**Ad-hoc stacking.** z-index values in use: `-1, 0, 1, 2, 3, 4, 5, 10, 900, 989,
990, 991, 999, 1000, 9500, 9999`. `--z-*` replaces this.

**211 inline `style` attributes** in the markup, which no stylesheet can
override without `!important`. These block themeable components.

**86 inline `on*` handlers.** They pin every JS function to the global scope and
are why modules are not an option today. Converting them to delegated listeners
is a safe, separately testable change — `regression.mjs` T14/T15 already guard
it.

**Three glass variants** (`glass-*`, "PREMIUM GLASS", "GLASSMORPHISM") layered on
top of each other over time. Phase 3 should keep one.

---

## 5. Imagery — a standing constraint

`colleges.js` maps each college to a set of Unsplash photo IDs, and the page
hotlinks 62 stock images in total. Generic stock campuses are presented in the
position where a specific institution's campus belongs.

For an admissions brand this is a trust problem before it is a design problem: a
parent who reverse-image-searches a "campus" photo and finds a stock library has
learnt something about the whole site. It is also a hard dependency on a third
party for above-the-fold content.

**Rule for every later phase: do not substitute AI-generated or stock imagery for
real institutional photography.** Where real photography is unavailable, use an
honest non-photographic treatment — typographic cards, crests, maps, data — never
a stock building implying it is that college.

The hotlinking is also the reason the splash screen could hang: `load` waits on
all 62 images. That is fixed, but the dependency remains.

---

## 6. Testing

```bash
node tests/regression.mjs      # 42 functional checks; needs the local server it starts
node tests/visual-diff.mjs <baseline-worktree> <working-tree>
```

`regression.mjs` stubs Supabase so auth paths are deterministic and no test
touches production data.

`visual-diff.mjs` freezes animation, the slideshow timer and `Math.random`, then
compares full-page screenshots at three widths. Phase 1's whole safety argument
is that this returned **0 differing pixels out of 11.6M** at every step.

From Phase 3 onward the pixel diff stops being a pass/fail gate — the point then
is to change pixels — but it stays the tool for confirming that a change touched
only what it meant to.
