-- NepalMBBS.in — 0003_abuse_and_storage.sql
--
-- Two things 0001 and 0002 deliberately left open, plus the document store.
--
-- 0001 gave anon INSERT on `leads`, `applications` and `eligibility_checks`,
-- because the public forms genuinely have to write. That is correct and it is
-- also an open faucet: the endpoint is public, so anyone can post to it in a
-- loop. A client-side guard is not a guard here — the browser is not where the
-- request has to come from, and the whole point of PostgREST is that curl
-- works just as well.
--
-- So the limit lives in the database, where it cannot be skipped.

begin;

-- ══ 1. Rate limiting ═════════════════════════════════════════════════════

create table if not exists public.rate_hits (
  bucket      text        not null,          -- table + caller identity
  window_start timestamptz not null,
  hits        int         not null default 1,
  primary key (bucket, window_start)
);

alter table public.rate_hits enable row level security;
-- No policy at all: only SECURITY DEFINER code touches this. A counter the
-- rate-limited party can read or reset is not a counter.

comment on table public.rate_hits is
  'Fixed-window counters for public inserts. Written only by enforce_rate_limit().';

-- Identify the caller. Supabase/PostgREST expose the request headers as a GUC;
-- outside that (psql, tests, a direct connection) they are absent, and the
-- function has to still work rather than throw.
create or replace function public.caller_key()
returns text
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare h text; ip text;
begin
  begin
    h := current_setting('request.headers', true);
  exception when others then h := null; end;

  if h is not null and h <> '' then
    -- x-forwarded-for is a list; the first entry is the client. It is
    -- spoofable in general, but Supabase's edge sets it, so on that path it is
    -- the best signal available without a server of our own.
    ip := split_part(coalesce((h::json ->> 'x-forwarded-for'), ''), ',', 1);
    ip := trim(ip);
    if ip <> '' then return ip; end if;
  end if;

  -- No header: fall back to the authenticated user, then to a shared bucket.
  -- A shared bucket is deliberately conservative — it limits everyone together
  -- rather than letting an unidentifiable caller through unlimited.
  return coalesce(auth.uid()::text, 'anonymous-shared');
end $$;

-- Fixed window rather than a sliding one. A sliding window needs per-request
-- history; a fixed window needs one row and one UPDATE, and for "stop a script
-- hammering the enquiry form" the difference does not matter.
create or replace function public.enforce_rate_limit()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_limit  int  := coalesce(nullif(TG_ARGV[0], '')::int, 10);
  v_window int  := coalesce(nullif(TG_ARGV[1], '')::int, 60);   -- minutes
  v_bucket text;
  v_start  timestamptz;
  v_hits   int;
begin
  -- Staff are exempt. A counselor entering ten enquiries after a phone shift
  -- is the business working, not abuse.
  if auth.uid() is not null and public.is_staff() then
    return new;
  end if;

  v_start  := date_trunc('hour', now())
              + (floor(extract(minute from now()) / v_window) * v_window) * interval '1 minute';
  v_bucket := TG_TABLE_NAME || ':' || public.caller_key();

  insert into public.rate_hits (bucket, window_start, hits)
  values (v_bucket, v_start, 1)
  on conflict (bucket, window_start)
    do update set hits = public.rate_hits.hits + 1
  returning hits into v_hits;

  if v_hits > v_limit then
    raise exception 'rate limit exceeded: % submissions in % minutes', v_limit, v_window
      using errcode = '54000',      -- program_limit_exceeded — PostgREST maps to 500
            hint = 'Please wait a few minutes and try again.';
  end if;

  return new;
end $$;

revoke all on function public.enforce_rate_limit() from public, anon, authenticated;
revoke all on function public.caller_key() from public, anon, authenticated;

-- Limits chosen from what a real person does. A family filling the enquiry
-- form twice because the first submit looked slow must not be blocked; a
-- script posting continuously must be.
drop trigger if exists leads_rate_trg on public.leads;
create trigger leads_rate_trg
  before insert on public.leads
  for each row execute function public.enforce_rate_limit('6', '15');

drop trigger if exists applications_rate_trg on public.applications;
create trigger applications_rate_trg
  before insert on public.applications
  for each row execute function public.enforce_rate_limit('4', '15');

-- The calculator is used repeatedly by one person trying different scores, so
-- its ceiling is much higher — it is there to stop a loop, not a visitor.
drop trigger if exists elig_rate_trg on public.eligibility_checks;
create trigger elig_rate_trg
  before insert on public.eligibility_checks
  for each row execute function public.enforce_rate_limit('60', '15');

-- Old counters are worthless. Without a sweep this table grows forever.
create or replace function public.sweep_rate_hits()
returns void language sql security definer set search_path = public, pg_temp as $$
  delete from public.rate_hits where window_start < now() - interval '2 days';
$$;


-- ══ 2. Input sanity ══════════════════════════════════════════════════════
-- Constraints, not validation code. The browser check is a courtesy to the
-- person typing; this is what actually holds, because the endpoint is public.

do $$ begin
  alter table public.leads
    add constraint leads_name_len check (char_length(coalesce(student_name,'')) between 1 and 120);
exception when duplicate_object then null; end $$;

do $$ begin
  alter table public.leads
    add constraint leads_phone_shape check (contact_number ~ '^[0-9+\-\s()]{6,20}$');
exception when duplicate_object then null; end $$;

do $$ begin
  alter table public.leads
    add constraint leads_notes_len check (char_length(coalesce(notes,'')) <= 2000);
exception when duplicate_object then null; end $$;

do $$ begin
  alter table public.applications
    add constraint apps_name_len check (char_length(student_name) between 1 and 120);
exception when duplicate_object then null; end $$;

do $$ begin
  alter table public.applications
    add constraint apps_phone_shape check (contact_number ~ '^[0-9+\-\s()]{6,20}$');
exception when duplicate_object then null; end $$;

do $$ begin
  alter table public.applications
    add constraint apps_neet_range check (neet_score is null or neet_score between 0 and 720);
exception when duplicate_object then null; end $$;

do $$ begin
  alter table public.eligibility_checks
    add constraint elig_score_range check (neet_score is null or neet_score between 0 and 720);
exception when duplicate_object then null; end $$;


-- ══ 3. Public inserts cannot set privileged columns ═══════════════════════
-- RLS decides whether a row may be inserted, not what is in it. Without this a
-- posted row could arrive with stage='admitted', a chosen access_token, or an
-- assigned counselor. The trigger overwrites those regardless of what was sent.

create or replace function public.scrub_public_application()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if auth.uid() is not null and public.is_staff() then
    return new;                       -- staff may set these deliberately
  end if;
  new.stage          := 'enquiry';
  new.assigned_to    := null;
  new.allotted_college := null;
  new.score          := 0;
  new.access_token   := encode(gen_random_bytes(32), 'hex');
  new.token_expires  := now() + interval '400 days';
  new.created_at     := now();
  new.updated_at     := now();
  return new;
end $$;

drop trigger if exists applications_scrub_trg on public.applications;
create trigger applications_scrub_trg
  before insert on public.applications
  for each row execute function public.scrub_public_application();


-- ══ 4. Document storage ══════════════════════════════════════════════════
-- The bucket must be private. A passport scan behind a guessable URL is the
-- same as a public passport scan.
--
-- Create the bucket first (dashboard, or the insert below), then these
-- policies decide who may touch an object in it. Path convention:
--   documents/<application_id>/<uuid>.<ext>

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('documents', 'documents', false, 10485760,
        array['image/jpeg','image/png','image/webp','application/pdf'])
on conflict (id) do update
  set public = false,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists docs_staff_read on storage.objects;
create policy docs_staff_read on storage.objects
  for select to authenticated
  using (bucket_id = 'documents' and public.is_staff());

drop policy if exists docs_staff_write on storage.objects;
create policy docs_staff_write on storage.objects
  for insert to authenticated
  with check (bucket_id = 'documents' and public.is_staff());

drop policy if exists docs_staff_update on storage.objects;
create policy docs_staff_update on storage.objects
  for update to authenticated
  using (bucket_id = 'documents' and public.is_staff());

drop policy if exists docs_admin_delete on storage.objects;
create policy docs_admin_delete on storage.objects
  for delete to authenticated
  using (bucket_id = 'documents' and public.is_admin());

-- Students upload through a signed URL minted by the function below rather
-- than by being given write access to the bucket. That way the only thing they
-- can write is one object, in one folder, for a limited time.
create or replace function public.portal_upload_url(p_token text, p_kind doc_kind, p_ext text)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp, storage
as $$
declare v_app uuid; v_path text;
begin
  select id into v_app from public.applications
   where access_token = p_token and token_expires > now();
  if v_app is null then
    raise exception 'invalid or expired link' using errcode = '28000';
  end if;
  if p_ext !~ '^(jpg|jpeg|png|webp|pdf)$' then
    raise exception 'unsupported file type' using errcode = '22023';
  end if;

  v_path := v_app::text || '/' || gen_random_uuid()::text || '.' || p_ext;

  insert into public.documents (application_id, kind, state, storage_path)
  values (v_app, p_kind, 'pending', v_path);

  -- The caller signs this path with the Storage API. Returning the path rather
  -- than a URL keeps the signing key on the server side of that call.
  return jsonb_build_object('path', v_path, 'bucket', 'documents');
end $$;

revoke all on function public.portal_upload_url(text, doc_kind, text) from public;
grant execute on function public.portal_upload_url(text, doc_kind, text) to anon, authenticated;

commit;

-- ─────────────────────────────────────────────────────────────────────────
-- AFTER RUNNING
--
--   select cron.schedule('sweep-rate-hits', '0 3 * * *', 'select public.sweep_rate_hits()');
--
-- if pg_cron is enabled. If it is not, the table simply grows slowly — two
-- days of counters is small — but sweeping is tidier.
--
-- Verify the limiter without waiting for abuse:
--
--   do $$ begin
--     for i in 1..8 loop
--       insert into public.leads (student_name, contact_number)
--       values ('probe ' || i, '9990000000');
--     end loop;
--   end $$;
--
-- Expect it to raise on the 7th, since leads is capped at 6 per 15 minutes.
-- ─────────────────────────────────────────────────────────────────────────
