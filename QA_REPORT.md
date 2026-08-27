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
| `tests/build-verify.mjs` | ✅ passed, after the path fix |
| `tests/csp-verify.mjs` | ✅ passed, after the path fix + tag restore |
| `tests/console-verify.mjs` | ⏳ running as of this writing |
| `tests/auth-verify.mjs` | ⏳ not yet reached |
| `tests/a11y-verify.mjs` | ⏳ not yet reached |
| `tests/audit.mjs` | ⏳ not yet reached |

_This entry is being written while the run is still in progress, because
the run is slow enough (software-rendered WebGL across 40 routes) that
waiting for full completion before recording anything risked losing the
session's progress. Update the table above with final results, and add
`npm run a11y` / `npm run perf` results if run separately, before treating
this baseline as confirmed._
