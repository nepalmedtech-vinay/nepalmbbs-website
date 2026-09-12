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

**0 of 27 colleges have any real photography or video uploaded.** The
infrastructure for the first tier (hero photo) has existed since Phase 4
(`supabase/migrations/0006_college_photos_storage.sql`, `college-photo.js`)
and has taken zero uploads since. Phase 5D adds the page-level slot this
photo appears in and a proper graphic fallback for when it's empty, but
changes nothing about how a photo gets there.

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

## Slot 6 — Video (not started)

- **Intended location**: college detail page, likely near the hero once it
  exists — not built in Phase 5D (roadmapped separately as Phase 5E).
- **Proposed storage**: a dedicated bucket (`college-videos` or similar,
  its own migration) rather than overloading `college-photos`, since video
  needs different size limits and probably a thumbnail/poster convention.
  Not created yet — no video exists to store.

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
