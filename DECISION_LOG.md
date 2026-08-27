# DECISION_LOG.md

Append-only. Newest entry on top. Records decisions made without asking the
user, and why, per the autonomy rules in the master brief.

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
