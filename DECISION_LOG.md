# DECISION_LOG.md

Append-only. Newest entry on top. Records decisions made without asking the
user, and why, per the autonomy rules in the master brief.

---

## 2026-08-28 — Chunk 6: the assistant becomes data-driven and sourced

The owner asked for maximum automation, corporate content, and for me to
audit my own output and fix what the audit found.

**Diagnosis first: the "AI chatbot" was not AI and could not reach the
site's own data.** `chatbot.js` was 45 hard-coded answers matched by
substring — no model, no retrieval, no access to `colleges.json`. So "how
many seats does Nobel Medical College have?" fell through to "book a
counselling session" on a site that publishes exactly that number on that
college's own page. It also claimed, in the widget header, that all
answers were "based on official sources" while none of those 45 answers
were recorded in `CONTENT_SOURCE_LOG.md` — precisely the kind of unbacked
claim this project's own standard forbids.

**Decision: deterministic retrieval over a reviewed dataset, not an LLM.**
A generative model over this data would produce fluent sentences about
seat counts, fees and deadlines — the three things most likely to be
wrong and most costly to be wrong about. It would also need a server-side
key, which a static site cannot hold safely. The assistant now reads
`/api/knowledge.json`, built at build time from `src/data/knowledge.json`
and `src/data/colleges.json`, so it cannot drift from the pages: change a
seat count once and the answer changes with it. All 27 colleges became
answerable without writing 27 answers.

**Every answer now carries its source and the date that source was
checked, and declines when it has none.** The old default thanked the
visitor and offered counselling, which reads as an answer without being
one. Refusing plainly is the behaviour a family deserves from a site they
are using to make a five-and-a-half-year decision.

**Fixed a live XSS-shaped defect found while rewriting.** The old
`addChatMsg` used `innerHTML` for *both* sides of the conversation, so
the visitor's own words were re-inserted as markup. The CSP stopped it
executing, but the right fix is not to build the node that way: user
messages are `textContent` now.

**Four bugs my own test caught, all in code I had just written.** Worth
recording because each was invisible without the test:

1. Colleges named entirely from generic vocabulary — College of Medical
   Sciences, Nepal Medical College, National Medical College, B & C —
   had no "distinctive" words left after filtering and became
   unreachable; "Kathmandu Medical College" resolved to Kathmandu
   University School of Medical Sciences on the one word they share.
   Fixed by matching the short name directly, longest wins.
2. Topic keys were matched as raw substrings, so `age` matched
   "percentage" and `fee` matched "coffee" — the age topic was answering
   percentile questions. Now padded to whole words.
3. Word-coverage fallback rewarded short generic names: asked about
   Nobel Medical College it answered about Nepalgunj, which scored 0.67
   on "medical college" alone against Nobel's 0.60. A college now counts
   as named only if something specific to it appeared.
4. One failure was the test's own fault, not the code's: it compared a
   raw college name against escaped HTML, so "B & C" never matched
   "B &amp; C". Corrected the assertion rather than the matcher — the
   matcher was right.

**Added a data-freshness audit that fails on the calendar.** The suite
now fails if `knowledge.json` has not been reviewed within 365 days, with
nobody having touched the repository. Admissions rules are restated
yearly; a dataset that quietly ages is how a trustworthy site becomes an
untrustworthy one without any single person deciding to let it.

---

## 2026-08-28 — Chunk 5: premium pass on the site chrome

The owner sent a phone screenshot and said the site looked cheap, asked for
a premium look, and asked for the work to continue in chunks without
stopping for approval. Everything below was driven by what the screenshot
and the rendered pages actually showed, screenshotted at 390px before and
after each change rather than judged from source.

**Found the root cause of the worst of it, and it was a real inherited
bug, not a taste problem.** `.cbar` (the phone/WhatsApp strip) and
`.ticker` still carried hard-coded *dark* backgrounds from the original
dark build — `#0b1e3d` and `#1e40af`. When Phase 3/4 moved the site to the
light glass system, `bridge.css` flipped those components' *text* colours
to dark ink but never touched their backgrounds. The result on every page
was near-black text on a near-black slab: the two phone numbers, the
single most conversion-critical thing on the site, were effectively
invisible. Fixed by finishing that migration in a new `chrome.css` rather
than by patching colours one at a time.

**`tests/audit.mjs` could never have caught it.** Its contrast pass walks
ancestors to resolve an element's background and bails with `return null`
the moment it meets a gradient (its own comment: "gradient: unknowable").
Both components are gradients, so both were skipped, not measured — which
is why the suite reported "0 low-contrast elements" on a page that plainly
had a dozen. Recorded in `TECHNICAL_DEBT.md`; the checker should fall back
to sampling a rendered pixel rather than skipping.

**Measured a second site-wide bug the screenshot hinted at.** The fixed
navbar is 69px tall and every page's first element sat under it at 390px —
the home page by 18px, six other pages by 25px. Eyebrows and back-links
were sliced in half on first paint on the width most of this audience
uses. Desktop was fine (112px of padding against the 69px bar), so only
the mobile end of the clamp fell short. Raised the floor rather than
switching the header to `sticky`, which would have reserved space at every
breakpoint and cost the intended glass-overlay effect. Verified by
re-measuring all seven routes: all clear.

**Hid the admin button from the public.** It was a fixed pill in the corner
of every page, telling every visitor the site has an admin panel. RLS is
what actually protects the data so this was never the security boundary,
but it read as unfinished. It is now revealed only when a staff session
exists or the URL asks for it (`#admin`). Deliberately not a secret — the
sign-in form and the database policies are the actual gate; the point is
to stop showing the door to families researching a medical degree. Written
so it can never remove the button or lock an owner out.

**Added the two pages the site was missing.** A branded 404 (there was
none — a broken link served nothing useful), and a privacy page. The
privacy page matters more than polish: this site collects a student's
name, phone, NEET score, city, category, attempt number and class-12 marks
bands, stores them in Supabase, and had no privacy page at all. It is
written from what the code actually does — fields read out of
`leads.js`, storage and access from the RLS policies, third parties from
the actual embeds — not from a template. Two things it deliberately does
*not* state are the registered legal entity and the retention period:
those are the owner's to declare, and a privacy page that invents either
is worse than one that admits the gap, so the gap is stated on the page
itself.

**The single biggest cause of "it looks cheap" turned out to be a font
that was never loaded.** 41 CSS rules ask for `'Sora'` and 5 more for
Inter; `GlassLayout` requests Fraunces and Geist and nothing else. So the
logo, every heading, every card title, every button, every statistic and
every college name had been rendering in whatever generic sans the device
defaults to. The only component escaping it was the home page hero, which
uses the newer `.gl-*` classes — which is exactly why the home page looked
considered and every other page looked like a template. Mapped the legacy
names onto the design system's tokens rather than starting to load Sora:
Phase 3/4 chose Fraunces + Geist deliberately, and adding a third family
would mean more webfont weight and a look nobody picked. Split by role —
display serif for headings and figures, body sans for controls and the
wordmark — because a serif submit button would have been worse than the bug.

**The counseling page had the same dark-slab bug, on the page that matters
most commercially.** `.counsel-bg` is a near-black gradient while its
headline and button labels had already been flipped to dark ink, so "Free
Counseling — No Pressure" rendered black on near-black and the three
contact routes used white-tint surfaces meant for a dark page. Brought
into the same light language as the rest of the site.

**Caught two of my own would-be regressions before they shipped.** I had
written bare `clamp()` font sizes for `.sec-title` and `.cbar-number`,
which would have made those the only text on the site immune to the admin
theme panel's type-scale control and to the accessibility multiplier —
reintroducing exactly the kind of un-themeable one-off that made the
legacy layer hard to work with. Both now multiply by `--ty-scale` and
`--ty-a11y` like everything else.

**Fixed the contrast checker rather than working around it, and it
immediately found 11 real bugs.** `tests/audit.mjs` skipped any element
sitting on a gradient — silently — so its "0 low-contrast" had been
covering 624 unmeasured elements per run. Taught it to parse gradient
stops and to print the skip count, on the principle that a checker which
cannot see a class of failure must not report zero as if it had looked.
With it working: dark ink on the brand-green calculator button, two
`/videos` buttons still carrying inline colours from the dark build at
1.01 and 1.21, the video filter's *selected* tab rendering white on
near-white, `/counseling`'s eyebrow using the fill colour where a
text-tuned one exists, and `/preview` — the last route still on the old
dark hero — with its three headline statistics at 1.59. All fixed; the
final zero is now a measured zero.

Twice while writing that fix I broke it in ways only the run caught: a
backtick inside a comment that lives in a template literal, and then
`\(` in a regex in that same literal, where the backslash is eaten as an
escape so the "gradient parsing" silently matched nothing and the suite
went green with 624 elements still skipped. The function directly above
already escaped as `\\(` for that exact reason. Reading the neighbouring
code would have been faster than rediscovering it twice.

**Adopted the design skill the owner linked** (github.com/Leonxlnx/taste-skill,
MIT). Read it before adopting rather than installing blind, and scanned it
for scripts, network calls and credential access — it is methodology only.
Vendored just the two SKILL.md files actually used plus the upstream
LICENSE, with attribution in `.claude/skills/README.md`, rather than the
whole repository. Its audit independently names the exact fault found
above — "a single dark-background section breaking an otherwise light page
looks like a copy-paste accident" — and its "no legal links" and "no
custom 404" items are what prompted the two new pages.

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

## 2026-09-08 — Cinematic-premium brief: palette promotion, two bug fixes, imagery conflict left open

**Decision: promoted the codebase's own existing "Porcelain" preset colours
to the site default**, rather than inventing a new palette from scratch, in
response to a request for a more explicitly "corporate/professional" look.
`engine.js` already shipped four curated alternate themes
(`porcelain`, `monsoon`, `saffron`) alongside the default `dawn`; Porcelain's
blue/bronze pair (`#1F5F8B`/`#B4632F`) was already built, already
contrast-solved by `engine.js`'s own dynamic solver, and already described
in its own `hint` field as "near-white, minimal colour" — a lower-risk move
than hand-picking new hex values, and it kept Dawn's fuller glass/glow/
motion settings rather than adopting Porcelain's quieter ones (the ask was
for more motion, not less). `--sh-radius` moved 22px→18px and `--dp` 1→1.05
alongside it — sharper corners and slightly deeper shadow, both small,
both reversible via the admin panel's existing theme controls.

**Decision: did not add stock or generated campus photography**, despite
the cinematic brief's hero/campus sections assuming it. This is not a new
call — it is enforcing the Phase 2 decision already recorded in
`PROJECT_STATE.md` ("replaced stock-photo 'campuses' with honest
non-photographic treatments") and stated directly in the homepage's own
copy ("no stock photographs standing in for a campus"). Fabricating or
substituting generic photography would have reversed a decision that isn't
this session's to reverse, the same standing `DECISION_LOG.md` already
holds for the fee-calculator question below. Recorded as an open question
in `DESIGN_AUDIT.md` §7 for the owner, not resolved unilaterally in either
direction — the hero was instead built from the site's own data/motion
language (the map's graticule motif) as the non-photographic alternative.

**Decision: fixed two accessibility bugs found while testing Phase 3, not
originally in scope, rather than only reporting them.** Both were small
(one-line), both were genuine regressions for real users (no focus
indicator at all on two elements; `prefers-reduced-motion` silently
defeated sitewide by the theme engine's own inline-style application), and
both had an unambiguous correct fix already proven elsewhere in the same
codebase (the pattern three other correct uses of `--focus-ring` already
established; a `matchMedia` check added to `engine.js`'s `apply()`). Judged
this the same class of decision as the earlier `@keyframes fade` fix for
the invisible map — a found, verified, narrowly-scoped bug, not a
redesign — rather than something requiring a check-in first.

**Decision: the "Universal Design OS" and follow-on skills-library work is
account/workstation-level tooling, committed to this repo only because it
is the writable location this session has access to.** Explicitly not a
NepalMBBS feature or dependency — `.claude/skills/README.md` states this
and gives the reuse path (copy the folder into a future project, or
install the packaged `.skill` file at the account level). Recorded here so
a future session reading `git log` on commits like `a5d2433`/`2419f98`/
`a1368b5` does not mistake workstation tooling for site work.

**2026-09-08 — hero icon field: two contrast regressions found and fixed,
then the icons themselves redesigned on owner feedback.** After the
light-palette revert (`73df424`) and the genuine-WebGL medical-icons pass
(`27208f4`/`5c1538d`), `audit.mjs` caught two real AA failures neither
present before that work:

1. `.gl-crystal-face`'s gradient (`--brand-lift -> --brand -> --brand-deep`)
   put white label text over `--brand-lift` at ~3.84:1. Same fault
   `chrome.css`'s "Brand fills under white text" section already
   documents and fixed for every other primary action — this component
   was added after that sweep and never got it. Fixed in `premium.css` by
   dropping `--brand-lift` from the gradient (`7498369`), same remedy
   `chrome.css` already proved safe.
2. `.test-stars`'s hardcoded `#9a6400` (pre-token-system leftover, same
   class of debt as the Sora/Inter font rules `chrome.css` already maps)
   measured 3.95:1 over the translucent testimonial card. Darkened to
   `#7b5000` in `base.css` (`8a8f9e0`).

Separately, the owner reviewed a recorded motion preview of the WebGL
hero and judged the three medical icons too large and too saturated —
"cheap" rather than premium — and asked for a proper medical + medicine +
biology set, not one shape per category, with an explicit requirement
that the colour never read as a solid block over the copy. Addressed in
`cf6c280`: both the CSS/SVG fallback and the WebGL scene were resized
(~40% smaller), the stethoscope redrawn as a closed loop (matching the
🩺 emoji's grammar instead of an open squiggle), colour mixed toward
white before reaching any material, and two shapes added — a capsule
(medicine) and a DNA double helix (biology) — alongside the existing
stethoscope, pulse trace, and cross. `audit.mjs` confirmed 0 low-contrast
elements after all three changes.

**2026-09-09 — site-wide motion, second icon-visibility correction, and
WebGL expanded past the homepage.** Owner reported the site still read as
static/no motion after watching the recorded preview, despite the hero
WebGL work. Two real causes, not one:

1. The "cheap" icon fix a day earlier overcorrected — 0.13 opacity and a
   30% white colour mix stopped reading as motion at all on a real
   screen. Rebalanced (opacity 0.26, 15% white mix, ~35% larger) in both
   `GlassHero.astro`'s CSS fallback and `medical-icons-scene.js`'s
   material tint/scale — a deliberate middle setting between the two
   passes, documented in both files.
2. `motion.css`'s scroll-driven utilities (`m-rise`, `m-stagger`,
   `animation-timeline: view()`) existed and worked but were applied to
   almost nothing — the homepage's `TrustSection` and `SectionNav` had
   zero motion classes, and no page-specific markup anywhere used the
   shared card family (`college-card`/`why-card`/`life-card`/`test-card`/
   `vid-card`/`guide-card`/`faq-item`/`cx-card`) with any entrance motion
   at all. Fixed by binding the animation directly to that shared
   selector in `motion.css`, once — since premium.css's own card
   unification (§10) already applies that selector across all 44 routes,
   this covers every card grid site-wide (including JS-rendered ones,
   colleges.js) without touching 40 page files individually.

Separately, owner asked for real 3D "everywhere", lead-flow automation,
and an automated blog writer, and pushed back explicitly on a prior
message where research was skipped by Claude's own judgement rather than
performed as asked — noted here so a future session does not repeat that:
when asked to check something, check it, don't substitute judgement for
the request.

- **3D beyond the hero**: added an opt-in `threeD` prop to
  `PageHeader.astro` (the shared header on 40 sub-pages) that mounts the
  same `mountMedicalIconsScene` — not a duplicate scene, the identical
  function. Left off by default (a WebGL context + Three.js fetch on all
  40 pages for a decorative flourish most visitors never see is real
  cost, not a hypothetical one) and enabled on the two highest-traffic
  decision pages, `/colleges` and `/why-nepal`. Deliberately not enabled
  on `/counseling` — that page doesn't use `PageHeader` at all; it's the
  lead-capture form, where decoration competing with conversion is the
  wrong trade, not an oversight.
- **Lead-flow automation**: investigated before building anything, since
  this touches the real leads table. Found the automation structure
  already exists — `sequences`/`sequence_steps`/`sequence_runs`/`tasks`
  tables and an `enrol_sequences()` trigger (0002_admission_platform.sql)
  that auto-enrols an application into a follow-up sequence and creates
  staff tasks with a channel (call/whatsapp/email) and due date. What
  does not exist is an actual outbound sender — no WhatsApp Business API
  or email provider is wired up; `tasks.channel` labels intent for a
  human, nothing sends automatically. Not built further this session:
  doing so needs the owner to choose a provider and supply credentials,
  which is a decision and a secret Claude cannot originate.
- **Automated blog writer**: not built. `CLAUDE.md` rule 1 ("never invent
  a fact... no fee, seat count, deadline, ranking or recognition status
  that does not trace to a named source with a date") is in direct
  tension with an automation that generates content on its own for a
  medical-admissions site. Flagged to the owner rather than either
  silently building it or silently refusing — a source-gated "draft
  assistant" (matching the site's existing sourced-assistant discipline:
  every claim needs a source before it can be used) was offered as the
  version of this feature that doesn't cross that line, pending the
  owner's decision.

Full `audit.mjs` re-run after each change in this pass: 0 low-contrast
elements, 0 pages overflowing, each time.

**2026-09-09 — chat launcher redesigned, broken-image fallback built,
hamburger confirmed present.** Owner reported the hamburger menu missing,
the chatbot icon looking cheap, and two images missing on `/why-nepal`,
and asked for more Nepal/medical photography sourced from open sources.

- **Hamburger**: verified present and correctly coloured via a real
  mobile-viewport screenshot (`.hbg`, base.css shows/premium.css tints it
  dark) — not a bug. Not touched further.
- **Chat launcher (`.chat-toggle`)**: a real bug, and the same class as
  every other fault this file (chrome.css) exists to fix — a 2023 dark-
  build gradient (`var(--m-fill)` to `var(--blue-dark)`) with a hardcoded
  `#fff` icon fill and a shadow tuned for a dark page. `audit.mjs`'s
  contrast pass explicitly bails on gradient backgrounds (this file's own
  opening comment), so it could not have caught this — it only showed up
  by looking. Redesigned with the same crystal-glass surface the Book
  free counseling button already uses, plus a slow sonar-ping idle
  animation (gated on `--mo`/reduced-motion) since it is the one always-
  visible affordance on every page.
- **Broken-image fallback, sitewide**: every photograph on the site
  hotlinks Unsplash, a third-party CDN this project does not control.
  Added one capture-phase `error` listener in `chrome.js` (`error` does
  not bubble, so no per-`<img>` wiring needed) that flags a failed image
  `.img-broken`; `chrome.css` hides it and gives the container a tokened
  gradient instead of a browser broken-image glyph, and drops the photo-
  darkening overlay that would otherwise muddy the fallback. Verified
  working via a real broken-image case (this sandbox's network policy
  blocks images.unsplash.com entirely, confirmed at the proxy level, not
  just for this session's own curl calls) — a real visitor's browser is
  not behind that restriction.
- **Could not verify the specific "2 missing" images or confirm any new
  photo IDs actually resolve** — this sandbox cannot reach Unsplash,
  Pexels, or Wikimedia (org-level proxy policy denial on all three,
  confirmed via `/__agentproxy/status`), so no external image URL can be
  fetched or checked from here, ever, regardless of which host is used.
  Added a `.life-gallery` (three Nepal/culture photos, asymmetric layout)
  to `/life-in-nepal` — which had exactly one photo on the whole page —
  using new Unsplash photo IDs chosen without the ability to confirm
  they resolve. The fallback above means a dead ID degrades to a clean
  gradient rather than a broken glyph either way, but the owner should
  spot-check `/life-in-nepal` and the two originally-reported `/why-nepal`
  images after deploy and report which (if any) still show as a gradient
  rather than a photo, so the specific dead ID can be swapped rather than
  guessed at again.

**2026-09-09 — mobile menu redesigned, homepage medical-photo section
added.** Owner shared a screenshot of the open mobile menu: dark navy
glass, gold accents. Found the cause — `#mob-menu` (base.css,
components.css) is three separate rule blocks, one literally commented
`/* Image 5 exact style */`, none reading a single design token. It is
the one screen on the site that still opens onto the near-black surface
the owner's brief ruled out everywhere, and the gold accent matches
nothing in the current two-colour (blue/teal) brand. It only renders once
opened, which is almost certainly why no audit or screenshot pass this
project has run ever caught it. Overridden in chrome.css with the same
glass tokens the rest of the chrome uses, gold swapped for the brand blue
already used on the desktop nav's EN/HI toggle.

Added `MedicalGallery.astro` to the home page (`GlassHero` → `CollegeMap`
→ `TrustSection` → **`MedicalGallery`** → `SectionNav`) — the home page's
only prior "medical" imagery was the hero's WebGL icons and the map,
both abstractions; nothing was an actual photograph. Same `.why-img`
treatment and honest-caption discipline as why-nepal/life-in-nepal
(captions describe what a photo generically shows — "Teaching Hospital",
"Clinical Rounds" — never a specific college or "our campus").

Also answered directly, in chat, why no further externally-sourced
images can be verified from this session: `/__agentproxy/status` shows
policy denials for images.unsplash.com, images.pexels.com, and
upload.wikimedia.org alike — this is a blanket sandbox network policy,
not a per-host quirk to route around by picking a different CDN. The
concrete way past it: the owner uploads image files directly into the
conversation, which this session can then save as local assets and
reference with no external fetch involved at all — more reliable than
hotlinking a third party regardless.

**2026-09-09 — deploy confusion resolved: `main` was never behind a
different redesign, just behind this branch.** Owner enabled Netlify
branch deploys ("All") and triggered one via the dashboard's "Trigger
deploy" button, then reported nepalmbbs.in still showing an old view.
The deploy details named `main@392ad45` ("Merge pull request #2 from
redesign/premium-ecosystem") — worth checking rather than assuming,
since that name reads like a competing redesign. It is not: `git
merge-base HEAD origin/main` resolves to that exact commit, so it is
this branch's own fork point, with zero divergence and zero conflicts —
29 commits ahead, nothing on `main` this branch doesn't already have.
`main` simply predates every visual change this session made (the
light-palette revert, the WebGL medical icons, the mobile-menu and chat-
launcher fixes, all of it), which is why the deployed page looked like
none of this session's work.

The actual cause: Netlify's "Trigger deploy" button rebuilds the site's
configured *production* branch (`main`) — it does not offer a branch
picker. Branch-deploy builds for a non-production branch fire from a
*push* to that branch (a webhook), which only starts working once
"branch deploys: All" is enabled going forward; it does not retroactively
build a branch that was already fully pushed before the setting changed.
This commit's own push is what should trigger that first build for
`claude/website-premium-design-j6mphw` and produce a
`claude-website-premium-design-j6mphw--nepalmbbs.netlify.app` preview URL.
