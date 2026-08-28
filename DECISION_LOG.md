# DECISION_LOG.md

Append-only. Newest entry on top. Records decisions made without asking the
user, and why, per the autonomy rules in the master brief.

---

## 2026-08-28 — Chunk 4: official-source verification, and four data fixes

**Decision: used `WebSearch`'s `allowed_domains` to reach official
sources, after `WebFetch` stayed blocked.** Chunk 3 concluded that
primary-source verification was impossible here because `WebFetch` is
blocked for every domain. That was half right: `WebFetch` is still
blocked (re-tested against `ucms.edu.np`), but restricting `WebSearch` to
a single institution's own domain returns snippets *from that domain's
own pages*, including page titles. That is materially stronger evidence
than the general-search results chunk 3 relied on, which were dominated
by consultancy and aggregator sites. Chunk 3's "cannot verify" conclusion
was too pessimistic and is corrected here.

**Decision: applied four fixes, all backed by the institution's own
website, and left everything else alone.** Fixed: UCMS's name (the site
had "Universal Medicine College"; their own site says "Universal College
of Medical Sciences" throughout), UCMS's established year and website,
CMS Bharatpur's established year (1994 → 1993, per their own site's
account of the founding agreement), and two missing official website
URLs. Everything sourced only to aggregators was deliberately left
unapplied.

**Withdrew one of my own earlier findings, which was wrong.** Chunk 3
flagged PAHS's `established: 2010` as contradicted by sources saying
2008. PAHS's own site says its School of Medicine "began to teach
prospective doctors in 2010" — so 2010 and 2008 are both correct and
measure different milestones (teaching start vs. parliamentary charter).
The existing value is right and was left unchanged. Recording this
explicitly rather than quietly dropping it, because it is the concrete
justification for chunk 3's rule about not auto-applying findings: had
that "fix" been applied, a correct value would have been replaced with a
differently-correct one and the site would have silently lost the meaning
it had chosen. The same reasoning is why the seven remaining blank
`established` fields were left blank despite having aggregator-sourced
candidates.

**Downgraded, not resolved, the PoAHS alarm.** Chunk 3 raised it as a
possible "listing a college with no MBBS program" case, which would have
been the most serious kind of error this site can make. Searching their
own domains found a dedicated MBBS page, so the program does appear to
exist; the alarming "working to launch MBBS by 2024" text is stale
content on a second domain they run. Downgraded from 🔴 to ⚠️ — what
remains unconfirmed is the foreign-quota seat figure, not the program's
existence. Correcting the severity in both directions matters as much as
finding the issue did.

---

## 2026-08-28 — Chunk 3: dead-code cleanup + first real content-sourcing pass

**Decision: deleted `Hero.astro`, not just the dead `boot.js` call.**
`TECHNICAL_DEBT.md` had logged the `boot.js` reference to
`wrapHeroContent()`/`initHeroSlideshow()` as debt to fix. Before deleting
just that line, checked whether those functions belonged to something
still in use — they don't. `Hero.astro` (the component whose markup they
targeted: `#hero-slides`, `.slide-dots`, etc.) is not imported anywhere
in `src/` (confirmed by search, not assumed); `/` actually renders
`GlassHero.astro`, a completely different, later component. `Hero.astro`
also happened to contain exactly the anti-pattern the site's own design
docs and the master brief prohibit — 50+ hotlinked stock photos with
captions implying they show this institution ("Medical College Nepal",
"MRI Machine — Diagnostic Radiology" on generic Unsplash photos). Since
it was confirmed dead, not a design choice someone might revert, deleting
it removed both the JS error and a landmine for a future session that
might have found the file and assumed it was live. Re-ran the full verify
suite after, since this touches `boot.js`, which loads on every page.

**Decision: started content-sourcing with `WebSearch` only, after
confirming `WebFetch` is blocked.** Tried `WebFetch` against 4 different
domains (a news article, its mirror, MEC Nepal's own site, Wikipedia) —
all refused with `EGRESS_BLOCKED`. This is the sandbox's network policy,
not a per-domain issue. `WebSearch` still returns real, citable snippets,
so proceeded with that, but logged the limitation prominently in
`CONTENT_SOURCE_LOG.md` and `TECHNICAL_DEBT.md` so a future session
doesn't waste time rediscovering it, and so nobody mistakes
snippet-level corroboration for having read a primary source directly.

**Decision: did not edit `src/data/colleges.json`, even where a source
disagreed with it.** Found two real discrepancies (PAHS's established
year; PoAHS's MBBS-program status) and one gap I couldn't fill with
confidence (Purbanchal USHS's own founding year vs. its parent
university's). Logged all three in `CONTENT_SOURCE_LOG.md` and surfaced
the more serious one (PoAHS) at the top of `NEXT_TASK.md`, rather than
resolving them myself from search-snippet evidence alone. This is data
27 colleges' worth of families could act on; "probably right based on a
search snippet" is not the same bar as "confirmed," and the brief's own
zero-fabrication standard cuts both ways — replacing one unverified
number with another isn't an improvement just because I did the typing.

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
