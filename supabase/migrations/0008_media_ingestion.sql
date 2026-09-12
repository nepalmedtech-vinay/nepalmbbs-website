-- NepalMBBS.in — 0008_media_ingestion.sql
--
-- The media-readiness follow-up to Phase 5E (2026-09-12): extends the video
-- table and adds a matching photo table so a real asset — hosted, or an
-- official external reference where reuse rights are unclear — can carry
-- the metadata the site now needs (rights status, source, caption/alt
-- text, featured status, ordering) instead of just a URL and a title.
--
-- Nothing here changes what is currently live: every new column is
-- nullable or defaulted, no existing row is touched, and `site_photos`
-- starts empty. This migration adds capacity; it does not add content.

begin;

-- ── site_videos: the metadata a real, sourced video needs ─────────────────
alter table public.site_videos
  add column if not exists rights_status text,
  add column if not exists source_type text,
  add column if not exists poster_url text,
  add column if not exists featured boolean not null default false;

comment on column public.site_videos.rights_status is
  'official-public | licensed | own | unknown. Set by whoever adds the video — see CONTENT_ASSET_PLAN.md.';
comment on column public.site_videos.source_type is
  'youtube | external | own. Informational only; the embed still works from `url` alone.';
comment on column public.site_videos.featured is
  'When true, this video is shown first regardless of sort_order. At most one per category should be true; the app takes the first if more than one is.';

-- ── site_photos: the metadata layer for the college-photos bucket ─────────
--
-- Two shapes in one table, distinguished by `kind`:
--   'hosted'    — a real file this site has rights to and has stored in the
--                 `college-photos` Storage bucket (migration 0006).
--                 `storage_path` points at it; `external_url` is null.
--   'reference' — reuse rights are unclear, so nothing is copied. Links out
--                 to the institution's own page instead. `external_url` is
--                 set; `storage_path` is null. Never rendered as if it were
--                 this site's own photo.
--
-- `college_slug` matches src/data/colleges.json's own `slug` field directly
-- (not the legacy short `category` codes site_videos uses) — the more
-- direct identifier was available when this table was designed, so there
-- is no indirection to keep in sync here.
create table if not exists public.site_photos (
  id uuid primary key default gen_random_uuid(),
  college_slug text not null,
  category text not null default 'hero',
  kind text not null default 'hosted' check (kind in ('hosted', 'reference')),
  storage_path text,
  external_url text,
  title text,
  caption text,
  alt_text text,
  source_name text,
  source_url text,
  rights_status text not null default 'unknown' check (rights_status in ('official-public', 'licensed', 'own', 'unknown')),
  featured boolean not null default false,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  context_date text,
  created_at timestamptz not null default now(),
  constraint site_photos_kind_shape check (
    (kind = 'hosted' and storage_path is not null and external_url is null) or
    (kind = 'reference' and external_url is not null and storage_path is null)
  )
);

comment on table public.site_photos is
  'Metadata for real college photography — hosted (a file in the college-photos bucket) or reference (an official external link, used when reuse rights are unclear). See CONTENT_ASSET_PLAN.md for the workflow.';
comment on column public.site_photos.category is
  'Free text: hero | campus | academics | hospital | library | laboratory | student-life | facilities | virtual-tour. New categories need no schema change.';

create index if not exists site_photos_college_category_idx
  on public.site_photos (college_slug, category)
  where is_active;

-- Same shape as site_videos' own policies (migration 0001): public can read
-- every row (the app filters is_active/featured client-side, same as
-- site_videos already does), only staff can write.
alter table public.site_photos enable row level security;

drop policy if exists site_photos_public_read on public.site_photos;
create policy site_photos_public_read on public.site_photos
  for select to anon, authenticated
  using (true);

drop policy if exists site_photos_staff_write on public.site_photos;
create policy site_photos_staff_write on public.site_photos
  for all to authenticated
  using (public.is_staff())
  with check (public.is_staff());

commit;

-- ─────────────────────────────────────────────────────────────────────────
-- AFTER RUNNING — verify:
--
--   select column_name, data_type from information_schema.columns
--    where table_schema='public' and table_name='site_videos'
--      and column_name in ('rights_status','source_type','poster_url','featured');
--
--   select count(*) from public.site_photos;  -- expect 0
--
--   select policyname, cmd, roles from pg_policies
--    where schemaname='public' and tablename='site_photos';
--   -- expect site_photos_public_read (SELECT) and site_photos_staff_write (ALL)
-- ─────────────────────────────────────────────────────────────────────────
