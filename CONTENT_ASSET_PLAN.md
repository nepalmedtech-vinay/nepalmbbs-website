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

## Status as of 2026-09-12

**Photography: 0 of 27 colleges have a real photo uploaded.** Verified
directly this session against the live project (via `mcp__Supabase`, not
assumed): `select count(*) from storage.objects where bucket_id =
'college-photos'` returns 0. The infrastructure
(`supabase/migrations/0006_college_photos_storage.sql`, `college-photo.js`)
has existed since Phase 4 and has taken zero uploads since. Phase 5D added
the page-level slot this photo appears in and a proper graphic fallback for
when it's empty, but changed nothing about how a photo gets there.

**Video: 0 rows exist in `site_videos`, and — until this session — no
video could have been attached to a specific college even if one had been
added.** Also verified directly against the live project this session:
`select count(*) from public.site_videos` returns 0. More significantly,
`site_videos`'s live schema had **no `category` column at all** — every
per-college filter the app already assumed (`/videos.astro`'s tabs,
`admin.js`'s video-add form, `colleges.js`'s client-side filter) has
therefore always silently matched nothing, from before this phase. Fixed
this session with a new, narrow migration
(`supabase/migrations/0007_site_videos_category.sql`, applied to the live
project after the user explicitly approved touching the schema): adds a
nullable `category text` column, no RLS change, no data touched. See Slot 6
for the full account, including why a schema gap like this is exactly the
kind of thing a network-blocked sandbox would otherwise never have been
able to catch.

## Slot 1 — Hero photo (infrastructure exists, 0/27 filled)

- **Where it appears**: `CollegeHero.astro`'s right-hand panel — the first
  visual thing on a college's own page.
- **Storage**: Supabase Storage bucket `college-photos` (public read, staff
  write, admin delete — see migration 0006), path `<slug>/<filename>`.
  `college-photo.js` lists that prefix at page load and renders the first
  file it finds; nothing else about the page changes when one appears.
- **How it gets filled**: a staff member uploads through the existing admin
  panel (the same mechanism as before this phase).
- **Until then**: `CollegeHero.astro`'s `.ch-fallback` — the college's own
  initials in display type, on an ownership-tinted panel (government/private
  read as two different tints, matching the map legend's own colour coding),
  with the college's real coordinates printed in the corner when known. A
  small caption states plainly that it's a mark, not a photograph.
- **Format guidance for whoever sources it**: landscape or portrait both
  work (the slot's aspect ratio adapts by breakpoint); a real building or
  campus entrance reads better here than a logo or a document scan.

## Slot 2 — Campus photography (not started)

- **Intended location**: a gallery or strip within the college detail page,
  once more than a hero photo exists per college — not built in Phase 5D,
  since one photo per college doesn't yet justify a gallery component.
- **Proposed storage**: same `college-photos` bucket, additional files under
  the same `<slug>/` prefix (the bucket already supports more than one file
  per college; only the *display* of more than one is unbuilt).
- **Until then**: no placeholder is shown — an empty slot with nothing to
  fill it yet is not rendered at all, rather than shown as a visible gap.

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
  form (`url`, `title`, `description`, now a genuinely working `category`),
  unchanged in mechanism by this phase — pick the `category` code for the
  college from this file.
- **Storage**: still an external URL (YouTube, in practice) in a database
  row, not a Storage bucket — no bucket/migration needed for the video file
  itself, only the metadata column this pass added.

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
