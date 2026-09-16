-- NepalMBBS.in — 0007_site_videos_category.sql
--
-- Adds the `category` column `site_videos` was always assumed to have.
-- Found during Phase 5E (college-specific video display): `/videos.astro`'s
-- college tabs, `admin.js`'s video-add form, and `colleges.js`'s client-side
-- filter all already read/write a `category` field on this table — but the
-- live table has never had one (confirmed against the running schema: id,
-- title, description, url, is_active, sort_order, created_at only). Every
-- per-college filter in the app has therefore always silently matched
-- nothing; any video an admin added landed with no way to attach it to a
-- specific college. This migration adds only the missing column — no RLS
-- change (site_videos_public_read/site_videos_staff_write are row-level,
-- unaffected by adding a column), no data touched, no video content added.
--
-- Values: 'all' (shown regardless of the selected tab, matching the app's
-- own existing `(v.category || 'all') === 'all'` fallback) or one of the
-- codes in src/data/video-categories.json (one per college, e.g. 'mcoms',
-- 'iom', 'pahs'). Nullable, defaulting to NULL rather than 'all', so an
-- existing row added before this migration (there are none today, per a
-- direct count against this table, but the column must still be safe for
-- one) reads as "not yet categorised" rather than silently becoming
-- everyone's "all".

begin;

alter table public.site_videos
  add column if not exists category text;

commit;

-- ─────────────────────────────────────────────────────────────────────────
-- AFTER RUNNING — verify the column landed:
--
--   select column_name, data_type, is_nullable
--     from information_schema.columns
--    where table_schema = 'public' and table_name = 'site_videos'
--    order by ordinal_position;
--
-- Expect `category | text | YES` alongside the existing six columns.
-- ─────────────────────────────────────────────────────────────────────────
