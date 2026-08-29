# QA_REPORT.md

Records actual `npm run verify` / individual test-suite results. Every
entry is a real run's output, not a description of what the suites check —
see `README.md`/`tests/*.mjs` for that.

## 2026-08-29 — Chunk 7 (page interiors) ✅ ALL EIGHT SUITES GREEN — but `npm run verify` did not run them

**Read the caveat before the table.** `npm run verify` **exited 1 without
running six of its eight suites.** `tests/build-verify.mjs` line 188 shells out
to `git show phase1-static-rollback:...`; this container is a fresh clone with
**no tags at all** (`git tag -l` empty, `git ls-remote --tags origin` empty),
so the call throws `fatal: invalid object name`, the exception kills the
process, and the `&&` chain takes `csp-verify`, `console-verify`,
`auth-verify`, `a11y-verify`, `compare-verify`, `assistant-verify` and `audit`
down with it. Nothing in the output says six suites were skipped.

This is the environmental blocker `CLAUDE.md` already records (tag pushes
return 403). What was not previously recorded is that it **aborts the gate**
rather than costing one check.

**Resolved for this run** by identifying the commit the tag belongs on —
`d48a4c6`, the last commit of the single-page build, immediately before
`61dd892` moved the trackers into `public/` — and recreating it locally:

```bash
git tag phase1-static-rollback d48a4c6
```

Independently confirmed before trusting it: all seven tracker files hash
identically between `d48a4c6`, `public/` and `dist/`. With the tag present the
whole gate runs and the tracker byte-identical check passes on its own terms.

| Step | Result |
|---|---|
| `npm run build` | ✅ 44 pages, clean |
| `node tools/gen-csp.mjs --check` | ✅ netlify.toml CSP current |
| `tests/build-verify.mjs` | ✅ **98/98** — including "Tracker apps byte-identical to Phase 1" |
| `tests/csp-verify.mjs` | ✅ 11/11 · 45 routes · **2949** handlers fired · zero CSP violations |
| `tests/console-verify.mjs` | ✅ 34/34 |
| `tests/auth-verify.mjs` | ✅ 12/12 · 0 JS errors |
| `tests/a11y-verify.mjs` | ✅ 32/32 |
| `tests/compare-verify.mjs` | ✅ 13/13 |
| `tests/assistant-verify.mjs` | ✅ 18/18 |
| `tests/audit.mjs` | ✅ 43 routes + the assistant · **0 low-contrast · 0 mobile overflow · 0 skipped** · median 279 kB |

The audit result is the one that matters for this chunk, because the chunk was
almost entirely visual: a new stylesheet, a rebuilt home-page section, a
three-column stage row, a two-column step list, and eight heading tags
promoted. **Zero contrast regressions and zero elements skipped** — the
"skipped" count is the number that caught the contact-bar bug by being
non-zero, so it is worth reading every time.

### Handler count moved, and that is expected

2949 CSP-safe handlers against 2733 at the 2026-08-27 baseline and 45 routes
against 42. The map's town list adds `pointerenter`/`pointerleave` listeners
per row, attached in the component's existing inline script (re-hashed with
`npm run csp`; the check confirms `netlify.toml` is current).

### What the suites did **not** catch, and did not claim to

Three of this chunk's defects were invisible to every one of these suites, and
all three were found by measuring the rendered page directly:

- the map printing **26 places / 691 seats** under a hero reading **27 / 734**
  — no suite compares two numbers on one page for agreement;
- government and private colleges plotted with a **2% fill difference** under
  a legend announcing the distinction — `audit.mjs` measures *text* contrast,
  not whether an encoding is discriminable;
- the fixed header covering the first 9px of every inner route **at desktop**
  — `audit.mjs` checks overflow at 390px only, and the overlap is at ≥48rem.

Worth stating plainly: a green suite here means no regression, not that the
page is right. All three would have shipped.

### A measurement trap, recorded so the next session does not lose an hour

A full-page Playwright screenshot of `/` renders everything below the fold at
**opacity 0** and looks like a catastrophically broken page. It is not: the
reveals are scroll-driven (`animation-timeline: view()` in `motion.css`), and
a full-page capture does not scroll, so every scroll timeline sits at its
start value. Confirmed by scrolling to the element and re-reading computed
style — `opacity: 1`, transform none.

**Screenshot with `reducedMotion: 'reduce'`**, which the CSS already gates on,
and the static end state renders.

---

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

## 2026-08-28 — Chunks 6–8: the assistant, the document centre, two more blind spots

**Run after the document centre and college data ✅ green**: exit 0, zero
failures, 43 routes, 0 low-contrast, **0 elements skipped**, median 284 kB.
That covered the rewritten assistant, `tests/assistant-verify.mjs` (18
checks) and the six newly verified college records.

### Two more places the audit could not see

The contrast pass had been measuring only what a page shows on load. Two
consequences, both found this session and both now covered:

1. **States reachable only by acting.** `/counseling`'s enquiry
   confirmation — the one screen every enquiry ends on — carried
   `rgba(255,255,255,.6)` from the dark build and was white on white. It is
   `display:none` until submit, so the suite had never seen it. The audit
   now reveals success and error containers and measures them, reported
   with a `[revealed]` prefix.
2. **The assistant's own answers.** The chat is the only surface here whose
   text is generated rather than authored, its styling lives in `chrome.css`
   while its markup is built in JavaScript, and none of it had ever been
   measured — it is closed on load. The audit now opens it once and asks
   three questions covering the three answer shapes (a college record, a
   sourced topic, the refusal). Measured once rather than per route: the
   widget is identical on all 44, and re-measuring it 44 times would cost
   minutes to learn nothing.

A mistake caught while adding the second: the first version pushed the
assistant's result into the per-route `rows` array, which would have
reported the wrong route count and dragged the median page weight down with
a synthetic `kb: 0` row. Counted separately now.

### The assistant pass found four faults on its first run

Not in the CSS written for it — in the chat **header**, which had been
carrying them all along. `.chat-header` fills with
`linear-gradient(135deg, var(--m-fill), var(--blue-dark))`: light glass at
one end, `#1e40af` at the other, with dark ink text over both. Measured
against the dark half:

| Text | Ratio | Needs |
|---|---:|---:|
| "Answers from sourced records" | **1.03** | 4.5 |
| "↑ swipe to close" | 1.56 | 4.5 |
| "Admissions Assistant" | 2.39 | 4.5 |

1.03:1 is text that is not there. Anyone who opened the assistant saw a
header with a title they could half-read and a subtitle they could not.

This is the **third** component found with the same fault — the contact
bar, the ticker, and now the chat header all kept their dark-build
backgrounds when `bridge.css` flipped their text to dark ink. Three of
three is no longer a coincidence: the dark→light migration was done by eye,
and eye missed every component whose background was a gradient, because a
gradient is exactly what the contrast checker was skipping. The two
failures were the same failure.

Fixed in `chrome.css` alongside the avatar glyph, which was inheriting the
header's dark ink onto a brand-filled circle. Re-run confirms it:
`/ (assistant open)` now measures 0 low-contrast, exit 0.

### And then the checker itself was still half-blind

Reviewing the fix surfaced a flaw in the rule that found it. The checker
resolved a gradient by taking its **darkest** stop. That is the worst case
for dark ink — it earned its keep three times over — but it is the **best**
case for light ink. White text over the light end of a gradient was
invisible to it, in both senses of the word.

`.chat-msg.user` is exactly that shape: white on a fill running from light
glass to dark blue. Over the dark end it is fine, which is all the old rule
ever looked at.

`groundsOf()` now returns every stop, and the measurement takes whichever
ground contrasts worst with the element's **actual** foreground colour.
Worst-case in both directions, which is the only rule correct for text of
any colour.

### A new kind of check: freshness

`tests/assistant-verify.mjs` fails once `src/data/knowledge.json` is 365
days past its last review. It trips on the calendar with nobody touching
the repository — the failure mode it exists for is a dataset that quietly
ages while every test stays green.

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
