# nepalmbbs.in — working notes

Auto-loaded every session. Kept short on purpose; the detail lives in the
memory files listed at the bottom.

## What this is

An MBBS-in-Nepal admissions platform: a public site (44 routes, Astro
static), a counsellor console (`/staff`), a student portal (`/portal`), an
admin panel, and a sourced assistant. Supabase behind it (project
`fpzgcijbryvddtpegcmm`), RLS-first.

It is **not** a greenfield project and has never been one. Read
`PROJECT_STATE.md` before assuming anything is missing — several "gaps"
turn out to be deliberate decisions already argued out in `DECISION_LOG.md`.

## Rules that are not negotiable

1. **Never invent a fact.** No fee, seat count, deadline, ranking or
   recognition status that does not trace to a named source with a date.
   `CONTENT_SOURCE_LOG.md` is the register. If a source contradicts itself,
   record that and leave the field blank — do not pick the likelier value.
2. **Fees are deliberately not published.** The site says so in its own
   copy. Do not build a fee calculator; see `DECISION_LOG.md` 2026-08-28.
3. **The database decides access, not the UI.** RLS policies in
   `supabase/migrations/0001`–`0002` are the boundary. Never weaken one to
   make a screen easier.
4. **No inline `on*` handlers.** `script-src` carries no `'unsafe-inline'`.
   Markup carries intent as data (`data-act` / `data-do`), dispatched
   through the allow-list in `tools/action-allowlist.json`. New code should
   just use `addEventListener` in an external file — that is equally
   CSP-safe and is what the newer files do.
5. **Do not deploy or merge to `main`.** The owner does that.
6. **Do not touch `public/wrc-tracker/` or `public/cmc-tracker/`** — legacy
   apps kept byte-identical by a test.

## Verifying — read this before running anything

```bash
npm run verify        # the gate. ~20 min. ALWAYS run in background.
```

- **`set -o pipefail` and echo `${PIPESTATUS[0]}`.** Piping to `tail` masks
  the exit code — a failing run once looked like a pass because of this.
- **Never rebuild while a suite is running.** They read `dist/`; a rebuild
  mid-run corrupts the result.
- `tests/audit.mjs` alone is ~15 min (44 routes, software-rendered WebGL —
  no GPU in this sandbox). Background it and wait for the notification
  rather than polling.
- **`npm run csp` after any change to an inline `<script>`** — including
  `/colleges/compare`'s embedded JSON, which changes whenever
  `colleges.json` does. A stale hash does not degrade, it blanks the page.
- `tests/audit.mjs`'s contrast code lives inside a **template literal**.
  No backticks in its comments, and regex escapes need `\\(` not `\(` —
  both mistakes were made there and both failed silently.

## Environment

- **`WebFetch` is blocked for every domain.** `WebSearch` works — use its
  `allowed_domains` to restrict results to an institution's own site, which
  is how the college records were verified.
- **GitHub**: pushes work. Tags return 403 — the five rollback tags in
  `docs/GOLIVE.md` exist locally but are not on the remote, and
  `tests/build-verify.mjs` reads `phase1-static-rollback`. A fresh clone
  will fail verify until someone pushes them by hand.
- **Netlify MCP is unreliable** (502s). Deploy is done by the owner via
  zip drag-drop; generate `dist/_headers` from `netlify.toml` first or the
  CSP is lost.

## One pattern worth knowing

Phase 3/4 moved the site from a dark theme to a light one. `bridge.css`
flipped legacy components' **text** to dark ink but left several of their
**backgrounds** hard-coded dark — producing dark-on-dark. Three were found
this way (contact bar, ticker, chat header) and all are fixed in
`public/assets/theme/chrome.css`, which loads last and finishes that
migration. If something is invisible, suspect this first. The grep to find
a fourth is in `TECHNICAL_DEBT.md`.

The same era left ~41 CSS rules asking for `Sora` and 5 for `Inter`,
neither of which is loaded. `chrome.css` maps those to the design tokens.
Do not add a third typeface.

## Reading order for a new session

1. `NEXT_TASK.md` — what to do next, and what not to do
2. `SELF_AUDIT.md` — honest score, and which remaining points are not
   Claude's to close
3. `PROJECT_STATE.md` — architecture and history
4. `DECISION_LOG.md` — why things are the way they are
5. `CONTENT_SOURCE_LOG.md` — every factual claim and its source
6. `TECHNICAL_DEBT.md`, `QA_REPORT.md` — known debt, and what each test
   run actually found

Update these as you go. They are the only thing that survives a session.
