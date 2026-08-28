# QA_REPORT.md

Records actual `npm run verify` / individual test-suite results. Every
entry is a real run's output, not a description of what the suites check —
see `README.md`/`tests/*.mjs` for that.

## 2026-08-27 — First `npm run verify` run in this container

**Context:** first time this suite has run in this session's container.
Could not run at all until three bugs were fixed first — see
`DECISION_LOG.md` (missing `playwright` devDependency, three test files
hardcoding a dead path from a previous container, a missing git tag one
test asserts against).

**Performance note:** this sandbox has no hardware GPU; Chromium falls
back to `swiftshader` software rendering. The site's WebGL aurora
background (`aurora-gl.js`) therefore renders in software on every one of
40 routes the suites visit, which makes the browser-based suites
genuinely slow here (`csp-verify.mjs` alone took roughly 10 minutes) —
this is an artifact of the sandbox, not a defect in the site.

| Step | Result |
|---|---|
| `npm run build` | ✅ 40 pages, clean |
| `node tools/gen-csp.mjs --check` | ✅ netlify.toml CSP current |
| `tests/build-verify.mjs` | ✅ 98/98 passed |
| `tests/csp-verify.mjs` | ✅ 11/11 passed · 42 routes · **2733/2733** CSP-safe handlers dispatch correctly · zero CSP violations on any page |
| `tests/console-verify.mjs` | ✅ 34/34 passed (portal token gating, staff console, lead→application conversion, XSS-safe name rendering) |
| `tests/auth-verify.mjs` | ✅ 12/12 passed · 0 JS errors (Supabase Auth admin login, no password in browser, session in `sessionStorage` not `localStorage`) |
| `tests/a11y-verify.mjs` | ✅ 32/32 passed (keyboard reachability, accessible names, focus visibility, drawer focus trapping, `prefers-reduced-motion` actually stops the aurora + animations, heading hierarchy, landmarks) |
| `tests/audit.mjs` | ✅ 40/40 routes: **0 low-contrast elements, 0 with mobile overflow**, median page weight 265 kB |

**Full run: 100% green, no exceptions, no skipped checks.** The full
command (`npm run verify`) exits 0. This is a strong, verified baseline —
not just "it builds," but real behavioral coverage: CSP handler dispatch,
RLS-backed auth flows, a11y at the DOM level, and per-route performance/
contrast/overflow, all passing simultaneously.

**Confirms the three fixes from `DECISION_LOG.md` were correct and
sufficient** — nothing else in the pipeline was broken by them, and no
other latent issues surfaced. Safe to build the next feature chunk on top
of this baseline (see `NEXT_TASK.md`).

_Sandbox note for future sessions: this full run took roughly 20+ minutes
wall-clock in this container specifically because Chromium has no
hardware GPU here and falls back to software-rendering the WebGL aurora
background across every route (`csp-verify.mjs` alone took ~10 minutes).
Budget accordingly — it is not a sign anything is hung._

## 2026-08-28 — Second run, after adding the college comparison tool

**Context:** `/colleges/compare` + `public/assets/js/compare.js` added
(see `DECISION_LOG.md`), plus a new permanent suite,
`tests/compare-verify.mjs`, wired into `npm run verify` between
`a11y-verify.mjs` and `audit.mjs`. Re-ran the full suite to confirm the
new page didn't regress anything and passes on its own merits.

| Step | Result |
|---|---|
| `npm run build` | ✅ 41 pages (was 40) |
| `node tools/gen-csp.mjs --check` | ✅ current — the new page added one inline-script hash (its embedded college-data JSON), regenerated with `npm run csp` before this run |
| `tests/build-verify.mjs` | ✅ 98/98 |
| `tests/csp-verify.mjs` | ✅ 11/11 · zero CSP violations · the new page introduces no `data-act` handlers (confirmed directly, not assumed) |
| `tests/console-verify.mjs` | ✅ 34/34 |
| `tests/auth-verify.mjs` | ✅ 12/12 |
| `tests/a11y-verify.mjs` | ✅ 32/32 |
| `tests/compare-verify.mjs` (new) | ✅ **13/13** — picker limits to 4, table matches each college's own published record verbatim (including "tuition: ask us"), `?c=` sharing works both ways (building the URL and pre-selecting from it, including ignoring an invalid slug), no mobile overflow |
| `tests/audit.mjs` | ✅ **41/41 routes**, 0 low-contrast, 0 mobile overflow, `/colleges/compare` itself: 0 low-contrast, 283 kB, no overflow |

**Full run: 100% green, exit code 0.** The mobile-layout fix documented in
`DECISION_LOG.md` (transposed table needed its own responsive treatment,
not the shared `.doc-table` stacking rule) is confirmed working by the
same overflow-measurement method `tests/audit.mjs` itself uses, not just
by inspection.
