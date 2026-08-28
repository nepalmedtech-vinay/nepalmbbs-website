# DECISION_LOG.md

Append-only. Newest entry on top. Records decisions made without asking the
user, and why, per the autonomy rules in the master brief.

---

## 2026-08-28 — Chunk 2: college comparison tool

**Decision: built it as a new external script + a new page, not by adding
to the legacy `data-act`/`data-do` dispatcher.** That mechanism
(`public/assets/js/actions.js` + `tools/action-allowlist.json`) exists
specifically to replace *inline* `on*=` handlers under CSP — it is a
migration tool, not the house style for all new interactivity. Phase 3/4
code (`public/assets/theme/panel.js` etc.) already uses plain
`addEventListener` directly for new features, which is equally CSP-safe
(an external `<script src>` file needs no inline-script hash at all) and
simpler. Followed that precedent: `public/assets/js/compare.js` is a
self-contained IIFE with no dependency on the allowlist, confirmed by a
test assertion that the new page introduces zero `data-act` names.

**Decision: did not build a fee/cost comparison, despite it being in
`NEXT_TASK.md`'s roadmap.** Reading `colleges/index.astro` and
`colleges/[slug].astro` before writing any code surfaced something the
earlier audit missed: the site has an explicit, deliberate, already-written
editorial stance against publishing fee figures — "We do not publish a
fee figure... a number that is stale by the time you read it is worse
than no number" — and against per-college recognition badges, for the
same reason (see the code comment above the trust-register block in
`colleges/index.astro`). Building a fee calculator now, without sourced
data and without revisiting that stance, would have overridden a decision
already made in the codebase, not filled a gap. The comparison table
therefore shows exactly the fields already public on each college's own
page — including rendering "Tuition fee: set per intake — ask us" as its
own row, matching the per-college page's treatment verbatim — and adds
nothing new. `CONTENT_SOURCE_LOG.md` and `NEXT_TASK.md` are updated to
flag this stance explicitly, so it isn't overridden by accident in a
future session either.

**Decision: transposed the comparison table (rows = fields, columns =
colleges) rather than reusing the existing `.doc-table` list layout as-is.**
A comparison's whole value is seeing two or three colleges' values for the
same field side by side; a row-per-college table (the existing pattern on
`/colleges`) doesn't give you that once more than one is selected. This
meant the shared `.doc-table` mobile CSS (which stacks `<td>` into cards
and hides `<thead>` — right for a rows-are-items table) would have broken
this table's layout, since it uses `<th scope="row">` for field labels, a
pattern the existing CSS was never written to handle. Fixed with a
page-scoped mobile override (horizontal scroll with a sticky label column)
rather than editing the shared `trust.css`, to keep the blast radius to
this one page. Caught by writing a real mobile-viewport overflow check
before considering the feature done, not by inspection.

**Decision: capped selection at 4 colleges.** Not specified anywhere; a
judgment call to keep the table legible on a typical laptop width without
horizontal scroll being the default experience, while still comfortably
covering "which of these 3 shortlisted colleges should I pick."

**Found and logged, not fixed (out of scope for this chunk): `boot.js`'s
hero step calls two functions that don't exist anywhere in the codebase**
(`wrapHeroContent`, `initHeroSlideshow`) — dead code left behind when
Phase 3 removed the stock-photo slideshow, throwing silently on every page
load site-wide. Invisible to `build-verify.mjs` because that check only
listens for uncaught `pageerror`, not `console.error`, and `step()`'s own
try/catch turns it into the latter. Left for a future chunk — a one-line
deletion, but unrelated to comparison work, and touching `boot.js` deserves
its own focused check rather than riding in on this commit. See
`TECHNICAL_DEBT.md`.

---

## 2026-08-27 — Session start: Phase 0 baseline audit

**Context.** First autonomous session against the master brief on
`redesign/premium-ecosystem`. Ran a real Phase 0 (repository intelligence)
before writing any feature code, per the brief's own instruction not to
destroy existing work.

**Finding: the repo is not a blank slate.** `git log` shows four prior
development phases already completed (security hardening, multi-page
migration, premium visual redesign, glass theme engine + full admission
platform + CSP/RLS security pass). Decision: do not treat the master
brief's Phase 1–3 roadmap ("design system + visual foundation",
"navigation + global layout", "homepage transformation") as starting from
zero. Instead, audit what exists, fix what's broken, and pick up at the
genuinely unfinished work. See `PROJECT_STATE.md` for the gap list.

**Decision: installed `playwright` as a local devDependency.**
`package.json` had no `devDependencies` section at all, yet every file in
`tests/` imports `playwright`. It only worked before because a *global*
npm install happened to be present. `npm run verify` — the gate the
README says must be green before every push — could not run in a clean
`npm ci` environment (a fresh CI runner, or Netlify's build image). Pinned
to `1.56.1` (the version already present) and installed with
`PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1` so it reuses the browser binary this
container already has rather than downloading a new one. Low-risk,
additive, does not touch runtime/production code.

**Decision: fixed three test files hardcoding another session's absolute
path.** `tests/build-verify.mjs`, `tests/auth-verify.mjs`, and
`tests/regression.mjs` had `/home/user/nepalmedtech-vinay/nepalmbbs-website`
hardcoded as the repo root, instead of deriving it from
`import.meta.dirname` the way the other four test files
(`csp-verify.mjs`, `audit.mjs`, `a11y-verify.mjs`, `perf-verify.mjs`)
already do. In this container the repo lives at
`/home/user/nepalmbbs-website`, so the hardcoded path pointed nowhere —
the static test server 404'd every request, which is what caused
`build-verify.mjs`'s first real check (`switchTab is not defined`) to
throw, since the page never actually loaded. Fixed by switching all three
to the same `path.resolve(import.meta.dirname, '..')` pattern the working
four use. This is a portability bug a previous session's environment left
behind, not a design decision to revisit — no discretion exercised beyond
matching the existing working pattern.

**Decision: restored five git tags documented in `docs/GOLIVE.md` as
rollback points but missing from the repository.** `pre-phase0-baseline`,
`phase1-static-rollback`, `phase2-rollback`, `pre-premium-rollback`,
`pre-glass-rollback` are all referenced by name in `docs/GOLIVE.md` and
`docs/DEPLOYMENT.md` (and `phase1-static-rollback` specifically is read
programmatically by `tests/build-verify.mjs` to assert the two legacy
tracker apps stay byte-identical). None existed — likely lost because tags
are not included in a normal `git push` (`git push --tags` is a separate
step) and a previous session's local tags never made it to `origin`.
Rather than inventing new reference points, walked the commit history to
find, for each tag, the exact commit its name and the docs' description
implies (the parent of the commit that starts the next named phase — e.g.
`pre-premium-rollback` = the parent of `ed94657 design: premium visual
system…`), and verified `phase1-static-rollback`'s target by confirming
the tracker-app files are byte-for-byte identical between that commit and
where they were later copied into `public/`. All five created as
annotated tags on existing historical commits — this only labels history
that already exists, it does not rewrite anything.

**Not yet decided: what the first real feature chunk should be.** Two
credible candidates found: (1) a college comparison tool (real UX gap,
buildable now from existing `colleges.json` fields with no new research
needed), or (2) starting `CONTENT_SOURCE_LOG.md` and sourcing official fee
data (higher value per the brief's zero-fabrication standard, but is
research work, not code, and should probably run as its own longer task
rather than be rushed inside a coding session). Left for `NEXT_TASK.md`
to record once Phase 0's verify run finishes and a decision is made.
