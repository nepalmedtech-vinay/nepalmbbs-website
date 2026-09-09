# Anti-Patterns — Product UI

For marketing pages, portfolios, and landing pages, use `design-taste-frontend`
§9 ("AI Tells") — that list (AI-purple gradients, centered hero over dark
mesh, three equal feature cards, infinite-loop micro-animations, generic
glassmorphism-on-everything, Inter + slate-900 everywhere) is not repeated
here. This file covers the product-UI patterns that list doesn't reach.

## Structural

- **The sidebar is not mandatory.** A tool with four destinations does
  not need a persistent 240px rail. Top nav, a command palette, or tabs
  can be the better answer — pick by destination count and switching
  frequency, not by dashboard-template default.
- **The generic dashboard grid.** Four equal stat cards in a row, under
  a chart, under a table — the product-UI equivalent of three marketing
  feature cards. If every metric gets identical visual weight, none of
  them are actually the headline number.
- **Settings-as-endless-toggle-list.** Group by what the setting
  affects, not by when it was added to the codebase. A settings page a
  user has to `Ctrl-F` is an information-architecture failure, not a
  visual one.
- **Every panel is a bordered box.** In a dense product UI, borders and
  shadows on every single region compound into visual noise faster than
  on a sparse marketing page. Use whitespace and typographic hierarchy
  to separate regions before reaching for another box.

## Data & tables

- **A table with no empty state.** "No results" rendered as a blank
  white rectangle is a bug users report as broken, not as empty.
- **Fake or placeholder data left in a shipped screen.** "Lorem
  Ipsum," `user@example.com`, `John Doe` in a table row that will ship —
  either real seed data or an explicit "no data" state, never filler
  that looks real.
- **A spinner instead of a skeleton.** A generic circular spinner tells
  the user nothing about what's coming; a skeleton shaped like the real
  layout prevents the layout jumping when data arrives.
- **Numbers in a proportional font.** Anything tabular — a price
  column, a stat, a counter — needs `font-variant-numeric: tabular-nums`
  or a monospace figure style, or the column doesn't align and reads as
  unfinished.

## Interaction

- **A primary action that's a plain `<a href="#">`.** Dead links and
  `onClick` no-ops are worse in a tool people rely on daily than on a
  page they visit once.
- **`window.alert` / `window.confirm` for anything.** Inline, styled
  error and confirmation UI only.
- **No keyboard path to a core action.** If a mouse is required to
  complete the primary workflow, that's an accessibility bug in a
  product people use for hours, not a nice-to-have.
- **A modal for something that isn't transient.** Editing a record that
  takes more than one field is usually better as a dedicated view or a
  slide-over than a modal that fights the browser's back button and
  clips at small viewport heights.

## Trust & content (carries over from marketing, doubly true here)

- **Invented statistics, testimonials, or accreditation badges.** A
  product surface with fabricated social proof is worse than one with
  none — the user of a CRM or admin panel is the one who'd notice the
  number is wrong.
- **A "premium" visual treatment that hides real functional gaps.**
  Glassmorphism and motion on top of a workflow that doesn't actually
  work is the definition of the thing this whole system exists to
  prevent. Fix the workflow first.
