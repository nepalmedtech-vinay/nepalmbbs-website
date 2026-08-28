# IMPLEMENTATION_PROGRESS.md

Tracks progress against the master brief's Phase 0–20 roadmap. Updated at
the end of each chunk, not continuously.

Legend: ✅ done · 🟡 partially done · ⬜ not started · 🚫 not applicable here

## Already complete, from before this session (verified by reading the code — see PROJECT_STATE.md for detail)

| Brief phase | Status | Evidence |
|---|---|---|
| Phase 0 — repo audit | 🟡 | Never formally done as this brief's Phase 0 until this session; the codebase's own "Phase 0" (commit `41d0031`) was a security fix pass, not a full audit. This session is the first real one. |
| Phase 1 — design system + visual foundation | ✅ | Token layer (`public/assets/theme/engine.css`): color via `color-mix`, glass/elevation tokens, radius scale, type scale with `clamp()` + an a11y multiplier, spacing scale. `docs/DESIGN-SYSTEM.md` is the Phase-1-era audit; component inventory further consolidated in Phase 3/4's glass rollout. |
| Phase 2 — navigation + global layout | ✅ | `GlassLayout.astro` is the shared layout across all 40 routes; `Navbar.astro`, `MobileMenu.astro`, `SectionNav.astro`, `Footer.astro` exist and are shared chrome, asserted by `build-verify.mjs`'s "shared chrome present" check. |
| Phase 3 — homepage transformation | ✅ | `Hero.astro` (158 lines) + `GlassHero.astro`, generated graphics, `CollegeMap.astro`. Not independently re-audited against the brief's hero checklist this session — see `NEXT_TASK.md` if a fresh visual QA pass is wanted. |
| Phase 4 — core admissions IA | 🟡 | `admission-process`, `why-nepal`, `guidelines`, `counseling`, `life-in-nepal`, `faq`, `videos` pages exist. No dedicated deadline center or document center as first-class pages (see gap list in `PROJECT_STATE.md`). |
| Phase 5 — eligibility engine | 🟡 | `neet-calculator.astro` exists (NEET-score eligibility). No broader eligibility checker covering nationality/document requirements as a distinct flow. |
| Phase 6 — college discovery + comparison | ✅ | Discovery: `colleges/index.astro`, `colleges/[slug].astro`, `CollegeMap.astro`, 27 profiles. Comparison: `colleges/compare.astro` + `compare.js`, added 2026-08-28 — pick up to 4, compare their published fields side by side. |
| Phase 7 — fees + cost planner | 🚫 (deliberate) | Not a gap — a deliberate, pre-existing editorial decision. The codebase's own copy says it will not publish fee figures because they go stale per intake. See `DECISION_LOG.md` (2026-08-28) and `NEXT_TASK.md`. Do not build this without the owner revisiting that decision. |
| Phase 8 — admission journey + document center | 🟡 | `admission-process.astro` covers the journey narratively (44 lines). No document checklist/download center as a distinct feature. |
| Phase 9 — FAQ + knowledge system | ✅ | `faq.astro` + `chatbot.js` (knowledge-base-backed chat widget). |
| Phase 10 — lead/conversion system | ✅ | `leads.js`, `ContactBar.astro`, `WhatsAppFloat.astro`, full lead→application pipeline in Supabase (migrations 0002/0004). |
| Phase 11 — admin CMS | ✅ | `AdminPanel.astro` + `admin.js`: colleges, FAQs, testimonials, videos, tickers, leads dashboard, CSV export. |
| Phase 12 — admin appearance/design engine | ✅ | `public/assets/theme/panel.js` + `panel.css` — a live theme generator (colors, glass intensity, motion, radius, spacing) with saved looks and a viewport preview, per commit `271b62a`. |
| Phase 13 — AI agents + automation | 🟡 | `chatbot.js` exists (FAQ/knowledge-base chat). No eligibility/document/lead-qualification AI agents with source-citing guardrails as described in the brief. |
| Phase 14 — SEO + structured data | 🟡 | Sitemap, robots.txt, per-page unique titles/descriptions (asserted by tests). Structured data (schema.org) not verified this session. |
| Phase 15 — accessibility | ✅ (baseline) | Commit `8dac1cb` fixed 1140 WCAG AA contrast failures; `tests/a11y-verify.mjs` exists and gates `verify`. Re-run this session to confirm still green — see `QA_REPORT.md`. |
| Phase 16 — performance | ✅ (baseline) | Commit `4dbe3f3` — Core Web Vitals measured and fixed; `tests/perf-verify.mjs` exists. |
| Phase 17 — security | ✅ (baseline) | RLS baseline, Supabase Auth admin, CSP with no `unsafe-inline` on `script-src`, rate limiting, private storage bucket. `style-src unsafe-inline` remains as documented, deliberate debt (153 inline style attributes). |
| Phase 18 — responsive QA | 🟡 | Tests run at a 390×844 mobile viewport (`build-verify.mjs`, `csp-verify.mjs`'s hamburger check). No systematic tablet/large-desktop pass recorded. |
| Phase 19 — visual polish / motion | ✅ (baseline) | Full glass/motion/aurora system, `prefers-reduced-motion` handling not yet independently confirmed this session. |
| Phase 20 — final autonomous audit | ⬜ | Never run as a discrete pass. |

## This session (Phase 0 re-run)

- ✅ Confirmed the build is healthy: `npm run build` → 40 pages, no errors.
- ✅ Fixed 3 test files hardcoding a stale absolute path from a previous
  session's container (`tests/build-verify.mjs`, `tests/auth-verify.mjs`,
  `tests/regression.mjs`) — see `DECISION_LOG.md`.
- ✅ Added `playwright` as a real `devDependency` so `npm run verify` works
  from a clean `npm ci`, not just this container's global install.
- ✅ Restored 5 git tags documented in `docs/GOLIVE.md` but missing from
  the repo (`pre-phase0-baseline`, `phase1-static-rollback`,
  `phase2-rollback`, `pre-premium-rollback`, `pre-glass-rollback`).
- ✅ `npm run verify` — finished 100% green (all suites, 40 routes). See
  `QA_REPORT.md`.

## This session, chunk 2 (college comparison)

- ✅ Built `/colleges/compare`: pick up to 4 of the 27 colleges, compare
  the same fields already published on each one's own page. Shareable via
  `?c=slug,slug`. New CSP-safe external script (`compare.js`), no changes
  to `tools/action-allowlist.json` needed.
- ✅ New permanent test `tests/compare-verify.mjs` (13/13), wired into
  `npm run verify`.
- ✅ Caught and fixed a real mobile-layout bug before shipping: the shared
  `.doc-table` responsive CSS assumes rows-are-items, which broke against
  this table's rows-are-fields structure. Fixed with a page-scoped
  override, verified against the same overflow-measurement method
  `tests/audit.mjs` uses.
- 🚫 Deliberately did **not** build a fee/cost planner — see
  `DECISION_LOG.md`. Discovered the codebase already has a written,
  deliberate stance against publishing fee figures.
- 📝 Found (not fixed, out of scope): `boot.js` calls two functions that
  don't exist anywhere in the codebase, throwing silently on every page
  load. See `TECHNICAL_DEBT.md`.
- ✅ `npm run verify` (second run, including the new page/test) —
  finished 100% green, 41/41 routes. See `QA_REPORT.md`.

## This session, chunk 3 (dead-code cleanup + content sourcing)

- ✅ Deleted `src/components/Hero.astro` (confirmed orphaned — imported
  nowhere; superseded by `GlassHero.astro`, which is what `/` actually
  renders) and the dead `boot.js` step that called its two now-nonexistent
  functions. Third full `npm run verify` re-run to confirm the global
  `boot.js` change is safe everywhere; see `QA_REPORT.md`.
- ✅ Started real content-sourcing research (`CONTENT_SOURCE_LOG.md`):
  all 10 government colleges checked via `WebSearch` (`WebFetch` is
  blocked in this sandbox — tested against 4 domains, all refused).
  7 confirmed, 1 wrong-looking date (PAHS: site says 2010, sources say
  2008), 1 serious open question flagged prominently in `NEXT_TASK.md`
  (PoAHS — MBBS program status could not be confirmed), 1 unresolved
  (Purbanchal USHS's own founding year, distinct from its parent
  university's). Nothing in `colleges.json` was edited — findings only,
  pending either deeper verification or the owner's direct confirmation.
  17 `ku`/`tu`-affiliated colleges still unchecked.

## This session, chunk 5 (premium pass on the chrome)

Driven by an owner screenshot ("looks cheap") and by the design skill they
linked. Every change screenshotted at 390px before and after, not judged
from source.

- ✅ **Contact bar + ticker rebuilt** (`public/assets/theme/chrome.css`).
  Root cause was a real inherited bug: both kept hard-coded dark
  backgrounds from the pre-Phase-3 build while `bridge.css` had already
  flipped their text to dark ink. The two phone numbers — the most
  conversion-critical elements on the site — were dark-on-dark and
  effectively invisible.
- ✅ **Fixed-header overlap on every page** — measured 18–25px at 390px
  across seven routes; all now clear.
- ✅ **`.sec-title` typography** — the h1 on eleven pages asked for `Sora`,
  which the site never loads, so every content page's heading fell back to
  the system sans while the home page rendered in Fraunces. Pointed at the
  design system's display face.
- ✅ **Section-nav cards no longer clip** — `white-space: nowrap` plus a
  four-column mobile grid truncated "Nepal Medical Colleges" mid-word.
- ✅ **Admin button hidden from the public**; floating buttons 3 → 2;
  footer emoji markers replaced with inline SVG; disclaimer restyled.
- ✅ **New `/404` and `/privacy`** — neither existed. 43 pages now.
- ✅ Caught two of my own would-be regressions before they shipped:
  hardcoded `clamp()` font sizes that would have made those headings immune
  to the admin type-scale control and the accessibility multiplier.
- 📝 Logged that `tests/audit.mjs` cannot see these faults at all — its
  contrast pass skips any element over a gradient, silently, so a "0
  low-contrast" result does not mean full coverage. See `TECHNICAL_DEBT.md`.

## This session, chunk 4 (official-source verification + data fixes)

- ✅ Found that `WebSearch`'s `allowed_domains` filter reaches each
  institution's **own website**, even though `WebFetch` stays blocked —
  correcting chunk 3's overly pessimistic "primary sources unreachable"
  conclusion.
- ✅ **Applied 4 corrections to `src/data/colleges.json`**, each backed by
  the college's own site: UCMS's name (was genuinely wrong), UCMS's
  established year + website, CMS Bharatpur's established year
  (1994 → 1993), and 2 missing official website URLs.
- ✅ **Withdrew a wrong finding of my own**: PAHS's `established: 2010`
  is correct (their site: teaching began 2010); the 2008 figure secondary
  sources give is the charter year. No change made.
- ✅ **Downgraded the PoAHS alarm** from "may not have an MBBS program at
  all" to "seat figure unconfirmed" — their own site has an MBBS page.
- 🟡 Left 7 blank `established` fields blank on purpose (aggregator-only
  sourcing), plus KMC's seat conflict and NAIHS's ambiguous year.
  See `NEXT_TASK.md`.
