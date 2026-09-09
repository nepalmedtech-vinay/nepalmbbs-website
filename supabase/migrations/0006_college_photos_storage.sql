-- NepalMBBS.in — 0006_college_photos_storage.sql
--
-- Plumbing for real college photography, ready for whenever the owner
-- sources and licenses it (DESIGN_AUDIT.md §7, path 2). This migration adds
-- NO photo and changes NO public page's behaviour by itself: colleges.json
-- still has no image field, and every college page keeps rendering its
-- current non-photographic treatment until a staff member uploads a real
-- file through the admin panel. That upload is the only way a photo can
-- ever appear — there is no path from this migration to an invented or
-- stock image.
--
-- Shape follows 0003's `documents` bucket exactly (bucket + storage.objects
-- policies gated by is_staff()/is_admin()), with one deliberate difference:
-- `documents` is private (student paperwork); `college-photos` is PUBLIC
-- read, because these images are meant to appear on public college pages
-- without the visitor being signed in.
--
-- Path convention: college-photos/<slug>/cover.<ext> — one photo per
-- college, named predictably so the public page can ask Storage to list
-- that one prefix rather than needing a database column to point at it.

begin;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('college-photos', 'college-photos', true, 5242880,
        array['image/jpeg','image/png','image/webp'])
on conflict (id) do update
  set public = true,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- Public read — the whole point: the site displays these with the anon key,
-- no sign-in involved.
drop policy if exists college_photos_public_read on storage.objects;
create policy college_photos_public_read on storage.objects
  for select to anon, authenticated
  using (bucket_id = 'college-photos');

drop policy if exists college_photos_staff_write on storage.objects;
create policy college_photos_staff_write on storage.objects
  for insert to authenticated
  with check (bucket_id = 'college-photos' and public.is_staff());

-- Re-uploading (the admin panel upserts with x-upsert) is an UPDATE against
-- an existing object, not a fresh INSERT — needs its own policy or a staff
-- member replacing a photo would silently fail.
drop policy if exists college_photos_staff_update on storage.objects;
create policy college_photos_staff_update on storage.objects
  for update to authenticated
  using (bucket_id = 'college-photos' and public.is_staff())
  with check (bucket_id = 'college-photos' and public.is_staff());

-- Delete is admin-only, same split 0003 uses for the documents bucket: any
-- staff member can add or replace a photo, only an admin can remove one
-- outright.
drop policy if exists college_photos_admin_delete on storage.objects;
create policy college_photos_admin_delete on storage.objects
  for delete to authenticated
  using (bucket_id = 'college-photos' and public.is_admin());

commit;

-- ─────────────────────────────────────────────────────────────────────────
-- AFTER RUNNING — verify the bucket is actually public and the policies
-- landed, since a typo here is a silent no-op rather than an error:
--
--   select id, public, file_size_limit, allowed_mime_types
--     from storage.buckets where id = 'college-photos';
--
--   select policyname, cmd, roles
--     from pg_policies
--    where schemaname = 'storage' and tablename = 'objects'
--      and policyname like 'college_photos_%';
--
-- Expect one row for the bucket (public = true) and four policies
-- (select/insert/update/delete).
-- ─────────────────────────────────────────────────────────────────────────
