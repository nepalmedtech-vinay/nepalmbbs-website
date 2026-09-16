# CONTENT_ASSET_PLAN.md

What real photography and video this site is missing, and exactly where it
slots in once it exists. This file exists so the owner has something concrete
to act on — not a wishlist, a set of named slots with a path convention, a
current status, and the rule that governs every one of them until it's
filled.

**The rule, stated once so it doesn't need repeating per slot**: a slot with
no real asset renders an intentional graphic/editorial fallback (built from
this site's own existing visual language and this college's own real data —
never a stock photo, a generic campus image, or an AI-generated image
standing in for a real one). A slot is filled only by a real file a staff
member uploads for that specific institution. There is no code path in this
site, anywhere, that invents or guesses an image.

## Status as of 2026-09-12 (media-readiness follow-up)

**Photography: 0 of 27 colleges have a real, hosted photo uploaded.**
Verified directly against the live project (via `mcp__Supabase`, not
assumed): `select count(*) from storage.objects where bucket_id =
'college-photos'` returns 0. **One college — Chitwan Medical College — now
has three verified official reference links** (its own website, Facebook
page and YouTube channel), added this pass; see "CMC research findings"
below for exactly what was and wasn't confirmed, and why no specific photo
or video was copied or embedded.

**Video: 0 rows exist in `site_videos`.** The table's `category` column
(added in the Phase 5E pass, see history below) and this pass's new
`rights_status`/`source_type`/`poster_url`/`featured` columns are all real
and working end-to-end — there is simply nothing filed yet.

**This pass also fixed a second, separate bug from the same family**: the
admin panel's own video-add form (`AdminPanel.astro`'s `#a-vid-college`
dropdown) had its *own*, never-aligned set of 13 category codes — four of
which didn't match `video-categories.json` at all (`manipal` vs the real
`mcoms`, `nmc-b` vs `nmcb`, `lumbini` vs `lmc`, `chitwan` vs `cmc`), and
nine colleges had no option in the list whatsoever. Even after Phase 5E's
schema fix, using this dropdown to add a Chitwan Medical College video
would have saved it under `category: "chitwan"` — which nothing reads,
since `/videos.astro` and `college-video.js` both look for `cmc`. Fixed by
generating the dropdown from `video-categories.json` directly (all 27
colleges, correct codes) — see `DECISION_LOG.md` for the full account.

### The ingestion workflow — UPLOAD → IDENTIFY/MAP → REVIEW → PUBLISH

This is what actually happens in the admin panel today, for each asset type.

**Video** (`AdminPanel.astro`'s Videos tab):
1. **UPLOAD** — paste a YouTube URL (or any embeddable video URL) and a
   title into the "Add Video to Videos Tab" form.
2. **IDENTIFY/MAP** — pick the college from the dropdown (now all 27, with
   the correct code behind each name — nothing to type or get wrong), and
   a rights status (official / licensed / filmed by us / not sure).
   Optionally mark it "featured" so it leads ahead of anything else already
   filed for that college.
3. **REVIEW** — pressing "Save as draft" writes the row with
   `is_active: false`. It exists in the database and shows in the admin's
   own "Current Videos" list, but nothing on the public site queries
   inactive rows — a mistyped URL or the wrong college never reaches a
   visitor. Check the "Current Videos" list; if something's wrong, delete
   it and redo it, no harm done.
4. **PUBLISH** — press "Publish" next to that row. It goes live on
   `/videos` (under its college's tab) and on that college's own detail
   page immediately — no rebuild, no deploy.
   ("Unpublish" reverses this at any time without deleting the row.)

**Hero photo** (`AdminPanel.astro`'s Colleges tab, "📷 College Photos"):
This flow predates this pass and is deliberately **not** changed to add a
draft step — it has always gone live immediately on upload, and that's
documented, intentional behaviour worth keeping consistent rather than
retrofitting a review gate that wasn't asked for here.
1. **UPLOAD** — pick a college, choose a JPG/PNG/WebP file (max 5MB), and
   optionally fill in a caption, alt text and rights status.
2. **IDENTIFY/MAP** — the college dropdown *is* the mapping; the file is
   always stored at the fixed path `<slug>/cover.<ext>`, so there's never a
   naming decision to make.
3. **REVIEW** — press "🔄 Check current photo" to see exactly what's live,
   with its caption/alt/rights pre-filled so they can be corrected without
   re-uploading the file.
4. **PUBLISH** — pressing "⬆️ Upload" *is* publish, immediately, matching
   this flow's existing, already-documented behaviour.

**Official reference link** (same "📷 College Photos" section, below the
upload controls) — for when a real photo is known to exist but reuse
rights are unclear:
1. **UPLOAD** — nothing to upload; there is no file.
2. **IDENTIFY/MAP** — pick the college (same dropdown), paste the
   institution's own URL and a source name.
3. **REVIEW** — press "🔗 Add reference link"; it appears immediately in
   the list beneath, with its own Delete button if it needs correcting.
4. **PUBLISH** — a reference link is metadata about where to look, not
   content this site hosts, so there is no separate publish step — it's
   either listed or it isn't. (Reference links aren't rendered as a public
   page section yet beyond the one hand-written entry for Chitwan Medical
   College — see Slot 1 below.)

## Slot 1 — Hero photo (infrastructure exists, 0/27 hosted; 1/27 has reference links)

- **Where it appears**: `CollegeHero.astro`'s right-hand panel — the first
  visual thing on a college's own page.
- **Storage**: Supabase Storage bucket `college-photos` (public read, staff
  write, admin delete — see migration 0006), path `<slug>/<filename>`.
  `college-photo.js` lists that prefix at page load and renders the first
  file it finds; nothing else about the page changes when one appears.
- **Metadata (new this pass)**: `site_photos` (migration 0008) — a
  `kind: 'hosted'` row per uploaded photo carries its caption, alt text,
  rights status, featured flag and ordering. `college-photo.js` reads this
  first for the caption/alt text, and falls back to the original
  Storage-only behaviour (blank alt, no caption) if no metadata row exists
  yet — a photo uploaded before this pass, or uploaded without filling in
  the optional fields, still displays exactly as before.
- **How it gets filled**: a staff member uploads through the existing admin
  panel; see the ingestion workflow above.
- **Until a real photo exists**: `CollegeHero.astro`'s `.ch-fallback` — the
  college's own initials in display type, on an ownership-tinted panel
  (government/private read as two different tints, matching the map
  legend's own colour coding), with the college's real coordinates printed
  in the corner when known. A small caption states plainly that it's a
  mark, not a photograph.
- **Official reference links (new this pass)**: `site_photos` also holds
  `kind: 'reference'` rows — no file, just an institution's own URL and a
  source name, for when a real photo is known to exist but reuse rights
  aren't clear. Chitwan Medical College has three (see "CMC research
  findings" below), rendered as an "Official [college] sources" note on
  its own detail page (`[slug].astro`, right after the video section) —
  present only for colleges with a verified entry in
  `src/data/official-sources.json`; absent for the other 26, same as every
  other unfilled slot.
- **Format guidance for whoever sources it**: landscape or portrait both
  work (the slot's aspect ratio adapts by breakpoint); a real building or
  campus entrance reads better here than a logo or a document scan.

## CMC research findings (media-readiness follow-up, 2026-09-12)

Investigated the official Chitwan Medical College (CMC) website and its
official YouTube/social presence per this pass's own brief. **This
sandbox's `WebFetch` tool is blocked for every external domain tried**
(cmc.edu.np, youtube.com, facebook.com — the same pre-existing constraint
`CLAUDE.md` and `CONTENT_SOURCE_LOG.md` already document for content
research generally), so verification here means cross-checking
search-snippet-level evidence across independent sources, not reading a
page's own content, terms or copyright notice directly.

**What was confirmed, and how**: an official website (`cmc.edu.np`) and an
official Facebook page (`facebook.com/cmcteachinghospital`) — cross-checked
because both independently listed the same phone number
(+977 56-493555) and email (info@cmc.edu.np), which is strong evidence
they're run by the same institution rather than a coincidence. A YouTube
channel named "Chitwan Medical College Teaching Hospital" surfaced
prominently for the institution's own name, plausible but not
independently confirmed (its About page could not be fetched). All three
are recorded in `src/data/official-sources.json` and rendered as outbound
reference links only.

**What was deliberately NOT used, and why**: several YouTube videos
surfaced for "Chitwan Medical College campus tour" / "virtual tour" —
titles like "CHITWAN MEDICAL COLLEGE TOUR | CAMPUS & HOSPITAL | NEPAL |
Episode #2" and "CMC Virtual Tour | Jan 2024". None were embedded into
`site_videos`, because this session could not verify which channel
actually uploaded any specific one of them — several search results were
explicitly third-party (a named individual's "campus review," another
consultancy's own "Episode #2" series), and embedding a video as this
college's official evidence without being confident who made it would be
exactly the kind of misattribution this project's standing content rules
exist to prevent (`DECISION_LOG.md`, `TECHNICAL_DEBT.md`,
`CONTENT_SOURCE_LOG.md` all record versions of the same principle for text
and photography; this is that principle applied to video). No CMC photo
was downloaded or hosted for the same reason — copyright in an
institution's own photography does not transfer just because it's publicly
viewable, and rule 1 of this pass's own brief says as much explicitly.

**What this means practically**: nothing was lost by being cautious here.
The three reference links are a real, honest improvement over nothing, and
they point a visitor at CMC's own channels to judge authenticity for
themselves — which is a more honest posture than this site vouching for a
specific asset it cannot verify. If the owner can confirm a specific video
or photo is genuinely CMC's own and rights-cleared, it can be added through
the admin panel in minutes using the workflow above — no code change
needed.

## Slot 2 — Campus photography (metadata layer ready; gallery UI not started)

- **Intended location**: a gallery or strip within the college detail page,
  once more than a hero photo exists per college — the display component is
  still not built, since there is nothing real yet to display in it.
- **What changed this pass**: `site_photos` (migration 0008) already
  supports this — `category` is free text (`campus`, `academics`,
  `library`, `laboratory`, `student-life`, `facilities`, `virtual-tour` are
  the suggested values; a new one needs no schema change), and a college
  can have any number of rows. The admin panel's upload form only writes
  `category: 'hero'` today; extending it to a category picker for a gallery
  is a small addition once a gallery component exists to show the result —
  not worth building blind.
- **Proposed storage**: same `college-photos` bucket, additional files
  under the same `<slug>/` prefix (already supported; `storage_path` in
  `site_photos` can point at any of them).
- **Until a gallery exists**: no placeholder is shown — an empty slot with
  nothing to fill it yet is not rendered at all, rather than shown as a
  visible gap.

## Slot 3 — Hospital / clinical environment (not started)

- **What's real today**: every MEC-approved college is required to be
  attached to a teaching hospital (a regulatory fact, sourced in
  `knowledge.json`'s `teaching-hospital` topic and surfaced on every detail
  page's "Your years at [college]" section); the *specific* hospital's name,
  size, ward count or case mix is not on file for any college beyond what
  the college's own name states.
- **Intended location**: an expansion of the existing "Your years here"
  section, once real per-college hospital detail (name, an affiliation
  document, or photography of the clinical setting) is sourced and
  verified — this is a content-research task before it is a design task.
- **Until then**: the page states the general, sourced regulatory fact and
  is explicit that it does not have this college's specific hospital detail
  on file, rather than implying a specific relationship it cannot verify.

## Slot 4 — Library / classroom (not started)

- **Intended location**: alongside Slot 2, once real photography exists.
- **Until then**: not referenced anywhere on the page — there is no
  placeholder for a slot with nothing planned to fill it imminently.

## Slot 5 — Student life (not started)

- Same treatment as Slots 2 and 4: a real, sourced photo or a short verified
  student account, never a stock lifestyle image or an invented quote.
  `TECHNICAL_DEBT.md`/`DECISION_LOG.md` already record the standing rule
  against fabricated testimonials; this slot is the same rule applied to
  imagery.

## Slot 6 — Video (architecture built and repaired in Phase 5E; 0/27 filled)

- **This slot turned out to already have real infrastructure behind it, with
  one real, load-bearing gap.** `site_videos` (a Supabase table, not a
  Storage bucket — video lives as a YouTube/external URL, not an uploaded
  file) already existed, already had RLS policies (migration 0001), and
  `/videos` already read from it with a genuinely honest per-college empty
  state. But its live schema had no `category` column — confirmed by
  querying the actual table, not assumed — so `/videos.astro`'s tabs,
  `admin.js`'s video-add form, and `colleges.js`'s filter had all been
  reading and writing a field that silently never existed. Any video ever
  added would have landed uncategorised; every per-college filter would
  always have matched nothing. This predates Phase 5E and was not
  introduced by it, but stood directly in the way of the phase's own goal
  (connecting a college's detail page to its real video) — flagged to the
  user before touching the schema, approved, then fixed with a new, minimal
  migration.
- **What Phase 5E built and fixed**:
  - **`supabase/migrations/0007_site_videos_category.sql`** — adds
    `category text`, nullable, no default. No RLS change (public read /
    staff write are row-level policies, unaffected by an added column), no
    data touched. Applied to the live project this session.
  - **`src/data/video-categories.json`** — the single source of truth
    mapping each of the 27 colleges to the short code `site_videos.category`
    now genuinely uses, and its display label. Before this pass, only 18 of
    27 colleges had a code at all (as hardcoded button markup on
    `/videos`) — the other 9 had no tab and no way to filter to them even
    once the column existed. All 27 are covered now.
  - **`/videos.astro`** generates its college tabs from that file instead
    of 18 hand-typed buttons, and supports `?college=<code>` to land
    pre-filtered (previously only reachable by clicking a tab after
    arrival).
  - **`public/assets/js/college-video.js`** (new, loaded sitewide like
    `college-photo.js`) — on a college detail page, fetches `site_videos`
    filtered to that college's category. A real, active video would render
    featured, click-to-play, exactly as `/videos` itself shows one, with a
    link to watch more if more than one exists. No video on file (true for
    every college right now — see below) renders an explicit "no video on
    file yet for [college]" state with a link into the fuller library —
    never silence, never a stock clip.
  - Fixed in the same pass: `renderNoVideoState`'s college-name lookup
    (`colleges.js`) used a `[onclick*=...]` selector against buttons that
    have never used `onclick` (they use `data-act`/`data-do`), so it
    silently always fell back to "this college" instead of naming the one
    actually selected. Now passed the clicked button directly.
  - Added a "featured" editorial treatment (`.vid-featured`/
    `.vid-card--featured`) so the first video of a set reads as evidence
    with real context, not one tile among equals — used identically on
    `/videos` and on a college detail page.
- **Confirmed this session, directly against the live project**: `site_videos`
  holds 0 rows, for any college, any category. Not assumed — queried. The
  architecture above is therefore verified working end-to-end (build,
  fetch, render, empty-state) but has nothing real to display yet.
- **How new video gets filed**: through the existing admin panel's video
  form — see the ingestion workflow above. The college dropdown now
  generates from `video-categories.json` directly (fixed this pass; see
  "Status as of 2026-09-12" above), so there's no code to match a name
  against and nothing to type incorrectly.
- **Storage**: still an external URL (YouTube, in practice) in a database
  row, not a Storage bucket — no bucket/migration needed for the video file
  itself, only the metadata columns this pass and the last one added.
- **New metadata columns (this pass, migration 0008)**: `rights_status`
  (official-public / licensed / own / unknown), `source_type` (auto-set to
  `youtube` or `external` when a video is added), `poster_url` (for a
  non-YouTube source with no automatic thumbnail — not yet surfaced in the
  UI, since nothing needs it yet), `featured` (shown first regardless of
  upload order). All nullable/defaulted — every existing row (there are
  none) would have read as before.

## Slot 7 — Maps / location visuals (already real, no placeholder needed)

Unlike every slot above, this one is **already filled with real data, not a
placeholder** — `CollegeMap.astro` (homepage, `/colleges`, and now every
college detail page via Phase 5D's `highlight`/`compact` reuse) plots every
college's actual town against real coordinates (`src/data/places.json`).
Nothing here is stock or invented; the open item is data completeness, not
imagery: one college's `location` string does not currently match any
`places.json` key (see `TECHNICAL_DEBT.md`), so it has no point on the map
at all rather than a wrong one.

## What this file is not

Not a request to generate, buy, or stand in with placeholder stock imagery
for any slot above — that is the one thing every slot's fallback is
deliberately designed to avoid needing. It is a map of exactly what to go
photograph, film, or verify, and where it will slot in the moment it exists.
