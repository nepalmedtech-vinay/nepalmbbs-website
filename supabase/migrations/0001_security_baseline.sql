-- NepalMBBS.in — 0001_security_baseline.sql
--
-- Run this FIRST, before the ecosystem schema. It closes the exposure that has
-- been open since the site launched.
--
-- The site talks to Postgres with the anon key, which is public by design — it
-- ships in the page and anyone can read it. What decides who can actually see
-- your data is Row Level Security. If RLS is off, or a policy is permissive,
-- then holding that key is the same as holding the data: no login screen is
-- involved, because PostgREST is queried directly.
--
-- Right now `leads` holds every enquiry's name and phone number. If SELECT is
-- open on it, that list is downloadable by anyone who views source.
--
-- ─────────────────────────────────────────────────────────────────────────
-- BEFORE YOU RUN THIS: see what the current state actually is.
--
--   select tablename, rowsecurity from pg_tables where schemaname = 'public';
--   select tablename, policyname, cmd, roles, qual, with_check
--     from pg_policies where schemaname = 'public' order by tablename;
--
-- And the practical test — from a browser console on any page:
--
--   fetch('https://fpzgcijbryvddtpegcmm.supabase.co/rest/v1/leads?select=student_name,contact_number&limit=1',
--         { headers: { apikey: '<the anon key from the page source>' } })
--     .then(r => r.json()).then(console.log)
--
-- If that returns student data, the exposure is live.
-- ─────────────────────────────────────────────────────────────────────────

begin;

-- ══ 1. Staff identity ════════════════════════════════════════════════════
-- Every policy below answers "is this request from a member of staff?", so
-- that question needs one place to live. Rows are keyed to Supabase Auth users.

create table if not exists public.staff (
  id          uuid primary key references auth.users(id) on delete cascade,
  email       text not null,
  full_name   text,
  role        text not null default 'counselor'
              check (role in ('counselor', 'admin')),
  is_active   boolean not null default true,
  created_at  timestamptz not null default now()
);

comment on table public.staff is
  'Counselors and admins. Membership here is what every RLS policy checks.';

-- SECURITY DEFINER so the helper can read `staff` without the caller needing
-- their own SELECT policy on it — otherwise the check recurses. search_path is
-- pinned because a definer function that resolves names through a caller-
-- controlled path is a privilege-escalation route.
create or replace function public.is_staff()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.staff
    where id = auth.uid() and is_active
  );
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.staff
    where id = auth.uid() and is_active and role = 'admin'
  );
$$;

revoke all on function public.is_staff()  from public, anon;
revoke all on function public.is_admin()  from public, anon;
grant execute on function public.is_staff() to authenticated;
grant execute on function public.is_admin() to authenticated;

alter table public.staff enable row level security;

drop policy if exists staff_self_read on public.staff;
create policy staff_self_read on public.staff
  for select to authenticated
  using (id = auth.uid() or public.is_admin());

drop policy if exists staff_admin_write on public.staff;
create policy staff_admin_write on public.staff
  for all to authenticated
  using (public.is_admin()) with check (public.is_admin());


-- ══ 2. leads ═════════════════════════════════════════════════════════════
-- The public form must be able to INSERT. Nothing public may SELECT.
-- This is the single most important statement in the file.

-- Legacy policies found on the live database that this file did not know
-- about. They must go in the SAME transaction as the replacements below: RLS
-- is permissive-OR, so one policy saying `true` grants access no matter what
-- else is written, and dropping them separately would close the enquiry form
-- for the gap between the two migrations.
--
--   leads.owner_all          ALL to authenticated using (true)
--     -> every signed-up user could read all 11,077 student records
--   leads.write_leads_stage  UPDATE to public using (true)
--     -> anyone holding the anon key could rewrite any lead
--   admin_settings.read/write_settings  ALL+SELECT to public using (true)
--     -> the admin password row was readable AND writable by the public
--   site_*.write_*           ALL to public using (true)
--     -> anyone could rewrite the FAQs and testimonials the site renders
drop policy if exists owner_all         on public.leads;
drop policy if exists insert_only       on public.leads;
drop policy if exists write_leads_stage on public.leads;
drop policy if exists read_settings     on public.admin_settings;
drop policy if exists write_settings    on public.admin_settings;
drop policy if exists followup_owner    on public.followups;
drop policy if exists followup_insert   on public.followups;

alter table public.leads enable row level security;

drop policy if exists leads_public_insert on public.leads;
create policy leads_public_insert on public.leads
  for insert to anon, authenticated
  with check (true);

-- Deliberately no SELECT policy for anon. With RLS enabled and no matching
-- policy the read returns zero rows rather than an error, so the enquiry form
-- keeps working and the list stops being downloadable.
drop policy if exists leads_staff_read on public.leads;
create policy leads_staff_read on public.leads
  for select to authenticated
  using (public.is_staff());

drop policy if exists leads_staff_write on public.leads;
create policy leads_staff_write on public.leads
  for update to authenticated
  using (public.is_staff()) with check (public.is_staff());

drop policy if exists leads_admin_delete on public.leads;
create policy leads_admin_delete on public.leads
  for delete to authenticated
  using (public.is_admin());

-- NOTE: the admin dashboard currently reads leads with the anon key and will
-- go blank after this runs. That is the correct outcome — it was reading them
-- with a key the public also holds. It is fixed by putting the admin panel
-- behind Supabase Auth, which is what 0002 assumes.


-- ══ 3. admin_settings ════════════════════════════════════════════════════
-- Split by sensitivity. Display settings are public because the site reads
-- them on every page load; the password hash is not.

alter table public.admin_settings enable row level security;

drop policy if exists settings_public_read on public.admin_settings;
create policy settings_public_read on public.admin_settings
  for select to anon, authenticated
  using (key <> 'admin_password');

drop policy if exists settings_staff_read_all on public.admin_settings;
create policy settings_staff_read_all on public.admin_settings
  for select to authenticated
  using (public.is_staff());

-- Writes were open to anon, so anyone could have overwritten the password, the
-- phone number or the analytics id.
drop policy if exists settings_staff_write on public.admin_settings;
create policy settings_staff_write on public.admin_settings
  for all to authenticated
  using (public.is_staff()) with check (public.is_staff());


-- ══ 4. Public content tables ═════════════════════════════════════════════
-- Read by every visitor, written only by staff. These were writable by anyone
-- holding the anon key, which made the site's own content an injection surface.

do $$
declare t text;
begin
  foreach t in array array['site_colleges','site_faqs','site_videos','site_testimonials']
  loop
    if to_regclass('public.' || t) is null then
      raise notice 'skipping %, not present', t;
      continue;
    end if;

    execute format('alter table public.%I enable row level security', t);

    execute format('drop policy if exists %I on public.%I', t || '_public_read', t);
    execute format(
      'create policy %I on public.%I for select to anon, authenticated using (true)',
      t || '_public_read', t);

    execute format('drop policy if exists %I on public.%I', t || '_staff_write', t);
    execute format(
      'create policy %I on public.%I for all to authenticated using (public.is_staff()) with check (public.is_staff())',
      t || '_staff_write', t);
  end loop;
end $$;

commit;

-- ─────────────────────────────────────────────────────────────────────────
-- AFTER RUNNING — verify rather than assume:
--
--   select tablename, rowsecurity from pg_tables
--    where schemaname = 'public' and rowsecurity = false;      -- expect 0 rows
--
-- Then re-run the browser fetch above. It should now return [].
--
-- The lead form should still submit. If it does not, the INSERT policy did not
-- apply and you should roll back rather than leave enquiries failing:
--
--   alter table public.leads disable row level security;
-- ─────────────────────────────────────────────────────────────────────────
