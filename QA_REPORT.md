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

## 2026-08-28 — Fixing the contrast checker's blind spot

`tests/audit.mjs` reported "0 low-contrast elements" for months on a page
whose contact bar had black text on a black slab. Its `groundOf()` walked
ancestors for a background and bailed with `return null` the moment it met
a gradient. Both the contact bar and the ticker are gradients, so both
were skipped rather than measured — and the skip was silent, so a zero
looked like full coverage.

Two changes:

1. **Parse gradient colour stops** instead of giving up, and use the
   darkest opaque stop as the worst case a reader actually meets. Real
   `url()` images still return null — genuinely unknowable.
2. **Report the skip count on every run**, so "0 low-contrast" is only
   meaningful next to "0 skipped".

Two mistakes made while writing it, both worth recording because both
were invisible until measured:

- The first version put backticks inside a comment that lives **inside a
  template literal**, which ended the string and broke the file. Caught
  by the run, not by reading.
- The second version wrote the stop-matching regex as `\(` inside that
  same template literal, where the backslash is consumed as an escape and
  the group silently becomes a capture that matches nothing. So the
  "gradient parsing" parsed nothing and the suite still passed with 624
  elements skipped. `parse()` directly above it escapes as `\\(` for
  exactly this reason — the existing code already knew.

**What the working checker then found: 11 genuine low-contrast elements
across 5 routes, none of which the suite could previously see.**

| Route | Element | Ratio | Cause |
|---|---|---|---|
| `/neet-calculator` | "Check My Eligibility" button | 3.60 | dark ink on the brand-green fill |
| `/videos` | "Request on WhatsApp" | 1.01 | inline pale-green on pale-green, from the dark build |
| `/videos` | "Request via Email" | 1.21 | inline `rgba(255,255,255,.8)` on a light button |
| `/videos` | college filter tabs (`.college-tab.on`) | 1.12 | `color:#fff` kept while the fill became light — the *selected* state was the invisible one |
| `/counseling` | "Book a Session" | 4.44 | inline `--gold` (the fill colour) where `--brand-text` exists for text |
| `/preview` | hero + all three statistics | 1.05–1.59 | the last route still on the old dark `.hero`, with light-theme ink on top |

One false positive was found and excluded rather than worked around: the
home page's gradient headline word uses `background-clip: text` with a
transparent colour, so measuring it compares the gradient against itself
and always yields 1.00. Its legibility is a different question than this
pass asks.

**All 11 fixed. Final: 0 low-contrast, 0 skipped, 0 mobile overflow, 42
routes, exit 0** — and this time the zero means the checker looked.

## 2026-08-28 — Third run, after removing dead code ✅ CONFIRMED GREEN

**Context:** deleted the orphaned `src/components/Hero.astro` and the
`boot.js` step that called its two non-existent functions. Because
`boot.js` loads on every non-bare page, this warranted a full re-run
rather than a spot check.

| Step | Result |
|---|---|
| `npm run build` | ✅ 41 pages, clean |
| `node tools/gen-csp.mjs --check` | ✅ current (no inline-script hashes affected) |
| `tests/build-verify.mjs` | ✅ 98/98 |
| `tests/csp-verify.mjs` | ✅ 11/11 |
| `tests/console-verify.mjs` | ✅ 34/34 |
| `tests/auth-verify.mjs` | ✅ 12/12 |
| `tests/a11y-verify.mjs` | ✅ 32/32 |
| `tests/compare-verify.mjs` | ✅ 13/13 |
| `tests/audit.mjs` | ✅ 41/41 routes · 0 low-contrast · 0 mobile overflow · median 270 kB |

**Exit code 0, zero `❌` lines in the entire output.** This entry was
originally committed marked ⏳ IN FLIGHT, because the commit was made
before the run finished. That reasoning has now been checked against the
actual result rather than left standing on its own — the run confirms it.
Removing the dead `boot.js` call did not disturb anything that depended
on the surrounding `step()` sequence.

_Scope note: this run tested the tree **before** the college-data
corrections committed afterwards (`eba8821`). Those need their own run —
see the next entry._

## 2026-08-28 — Fourth run, after the college-data corrections ✅ CONFIRMED GREEN

**Context:** `src/data/colleges.json` corrections (UCMS's name, its
established year and website, CMS Bharatpur's established year, two
website URLs).

Validated so far **without** a full suite run, by building to a scratch
directory so the in-flight third run's `dist/` was not disturbed:

- ✅ JSON parses, still exactly 27 colleges
- ✅ build succeeds, 41 pages
- ✅ 43/43 unique page titles (the assertion `build-verify.mjs` makes)
- ✅ corrected name renders on the college page and inside the comparison
  tool's embedded data
- ✅ the old incorrect name appears nowhere in the built output
- ✅ sitemap URL unchanged (slug deliberately not renamed)

### The full run then caught something the scratch build could not

The first full attempt **failed at `gen-csp.mjs --check`**:

```
netlify.toml CSP is out of date — run: node tools/gen-csp.mjs
```

Cause: `/colleges/compare` embeds the college dataset as an inline
`<script type="application/json">`, so editing `colleges.json` changes
that script's bytes and therefore its CSP hash. `netlify.toml` still
carried the old hash.

This matters more than a normal test failure. Per `README.md`, a stale
script hash **does not degrade — it blanks the page**. Shipping this
would have served an empty `/colleges/compare` in production while
looking completely fine in local `astro dev` (which sends no CSP).

Two process lessons worth keeping:

1. **The scratch-directory build could not have caught this.**
   `gen-csp.mjs` reads `dist/`, and that validation deliberately built to
   `/tmp/testbuild` to avoid disturbing an in-flight run. It correctly
   confirmed rendering, titles and URLs — but CSP drift was outside what
   it could see. A scratch build is not a substitute for `npm run verify`.
2. **`... | tail -N` hides the real exit status.** The run was reported
   as exit code 0 because that was `tail`'s status, not the pipeline's.
   Without reading the output text, this failure would have been recorded
   as a pass. Use `set -o pipefail` (or check `PIPESTATUS`) when a
   pipeline's success is the thing being judged.

Fixed by regenerating (`node tools/gen-csp.mjs` → 3 inline hashes) and
re-running the full suite.

### Result of the re-run

**`EXIT=0`, zero `❌` lines, 41/41 routes clean** (0 low-contrast, 0
mobile overflow, median 265 kB).

That exit code is trustworthy this time: the re-run was invoked with
`set -o pipefail` and reports `${PIPESTATUS[0]}` explicitly, so it is
npm's status rather than `tail`'s. And because `npm run verify` chains
every suite with `&&`, a zero exit is only reachable if all of them
passed — `gen-csp --check`, `build-verify`, `csp-verify`,
`console-verify`, `auth-verify`, `a11y-verify`, `compare-verify` and
`audit`.

The college-data corrections are therefore verified end to end, CSP
included.
