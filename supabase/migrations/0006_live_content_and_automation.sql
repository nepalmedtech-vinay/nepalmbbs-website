-- NepalMBBS.in — 0006_live_content_and_automation.sql
--
-- The owner asked for the site to be dynamic: college photos, videos,
-- notifications and details editable per college, visible without a redeploy,
-- plus automation driven by admission category.
--
-- WHAT ALREADY EXISTED, so this migration does not rebuild it:
--
--   `site_colleges` + `src/lib/colleges.js` already let staff correct a seat
--   count or add a college, merged onto the committed baseline at BUILD time.
--   That is the right shape for facts: a figure that decides where somebody
--   spends five and a half years should pass through a build, where the
--   verify suite and a human both get a look at it.
--
-- WHAT THIS ADDS, and why it is deliberately the other shape:
--
--   Photos, videos and notices are read at RUNTIME. A notice that a college's
--   counselling date moved is worthless if it waits for a deploy, and a photo
--   is not a claim that needs a review step. So these three tables are public
--   SELECT and staff-only write, and the browser reads them directly.
--
--   The split is the point. Facts go through the build. Media and
--   time-sensitive notices go live. Nothing here can change a seat count.
--
-- WHAT IT TOUCHES OUTSIDE ITS OWN TABLES: three nullable columns on `leads`,
-- and one AFTER INSERT trigger on it. Nothing else. It does not alter
-- `applications`, `staff`, `documents`, or any policy written in 0001-0005,
-- and it drops nothing.
--
-- The `leads` columns are not optional extras: the admission category the
-- owner wants to automate on does not currently exist as a field. Section 3
-- explains that in full.

begin;


-- ══ 1. College media ══════════════════════════════════════════════════════
-- Photos and videos, per college, ordered by the owner.
--
-- `college_slug` is text and intentionally NOT a foreign key. The college list
-- lives in committed JSON, not in a table — `site_colleges` is an override
-- layer that may hold three rows or none. A foreign key here would make it
-- impossible to add a photo for a college that has not been overridden, which
-- is 24 of the 27.

create table if not exists public.college_media (
  id            uuid primary key default gen_random_uuid(),
  college_slug  text        not null,
  kind          text        not null check (kind in ('photo', 'video')),
  -- Either a storage object path (uploaded through the admin panel) or an
  -- external URL (a YouTube link, say). Exactly one of them.
  storage_path  text,
  external_url  text,
  caption       text,
  credit        text,                                  -- who took it, when known
  sort_order    int         not null default 0,
  published     boolean     not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  constraint college_media_one_source
    check ((storage_path is null) <> (external_url is null))
);

create index if not exists college_media_slug_idx
  on public.college_media (college_slug, sort_order)
  where published;

alter table public.college_media enable row level security;

-- Public read, but only what is published. An unpublished row is a draft, and
-- a draft is not a thing the anon role should be able to enumerate.
drop policy if exists college_media_public_read on public.college_media;
create policy college_media_public_read on public.college_media
  for select to anon, authenticated
  using (published);

drop policy if exists college_media_staff_all on public.college_media;
create policy college_media_staff_all on public.college_media
  for all to authenticated
  using (public.is_staff()) with check (public.is_staff());


-- ══ 2. Notices ════════════════════════════════════════════════════════════
-- The time-sensitive half. A notice with no college_slug is site-wide; one
-- with a slug shows on that college's page.
--
-- `starts_at` / `ends_at` exist so the owner can write a notice today for a
-- window next month and stop thinking about it. A notice nobody remembers to
-- take down is how a site ends up advertising a closed intake.

create table if not exists public.college_notices (
  id            uuid primary key default gen_random_uuid(),
  college_slug  text,                                  -- null = site-wide
  title         text        not null,
  body          text,
  -- Mirrors the site's own evidence register (trust.css): a notice is one of
  -- these three things, and the page styles it accordingly.
  level         text        not null default 'info'
                check (level in ('info', 'provisional', 'caution')),
  link_url      text,
  link_label    text,
  starts_at     timestamptz not null default now(),
  ends_at       timestamptz,                           -- null = no end
  published     boolean     not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists college_notices_live_idx
  on public.college_notices (college_slug, starts_at desc)
  where published;

alter table public.college_notices enable row level security;

-- The window is enforced in the POLICY, not in the client's query. A client
-- filter is a convenience; a policy is the rule. Enforcing it here means an
-- expired notice cannot be read back by anyone crafting their own request.
drop policy if exists college_notices_public_read on public.college_notices;
create policy college_notices_public_read on public.college_notices
  for select to anon, authenticated
  using (
    published
    and starts_at <= now()
    and (ends_at is null or ends_at > now())
  );

-- Staff see everything, including drafts and expired notices, or they could
-- not edit them.
drop policy if exists college_notices_staff_all on public.college_notices;
create policy college_notices_staff_all on public.college_notices
  for all to authenticated
  using (public.is_staff()) with check (public.is_staff());


-- ══ 3. The admission category, as an actual column ════════════════════════
-- The owner asked for automation "according to admission categories". That
-- could not have worked, and the reason is worth writing down: there is no
-- category column. `leads.js` packs it into the free-text notes field as
--
--     Cat:obc|State:MH|Attempt:1|PCB:...|Bio:...|Mode:...|Lang:en|Src:...
--
-- so the category is only recoverable by parsing a pipe-delimited string, and
-- any rule keyed on it would be matching substrings inside a notes blob. That
-- is not a thing to build automation on.
--
-- These columns are additive and nullable, so every existing row stays valid
-- and the current form keeps working unchanged while it is updated to write
-- them. `notes` is deliberately left alone rather than migrated: it is the
-- historical record of what was actually submitted, and rewriting it would
-- destroy the only copy of the older enquiries' data.

alter table public.leads add column if not exists admission_category text;
alter table public.leads add column if not exists state_name         text;
alter table public.leads add column if not exists neet_attempt       text;

create index if not exists leads_category_idx
  on public.leads (admission_category, created_at desc)
  where admission_category is not null;


-- ══ 4. Automation rules ═══════════════════════════════════════════════════
-- The shape is lifted from the owner's own nepalmbbs-cms repo
-- (routes/automationEngine.js): trigger_event, an optional condition, an
-- action type and a JSON config. That design is already proven in their
-- workflow, and keeping the same vocabulary means the two systems can be
-- reasoned about together.
--
-- What changes is where it runs. That engine is Express + SQLite; this site is
-- a static build with no server, so the rules live in Postgres and fire from a
-- trigger. No extra host, no monthly cost, and RLS already decides who may
-- read them.
--
-- `admission_category` is the owner's specific ask: rules that apply only to
-- one category of applicant rather than to everybody.

create table if not exists public.automation_rules (
  id                 uuid primary key default gen_random_uuid(),
  name               text        not null,
  trigger_event      text        not null
                     check (trigger_event in ('lead.created', 'lead.converted',
                                              'application.stage_changed',
                                              'document.rejected')),
  -- Optional narrowing. Both null means "every event of this type".
  condition_field    text,
  condition_value    text,
  -- The owner's category axis. Null means the rule ignores category.
  admission_category text,
  action_type        text        not null
                     check (action_type in ('create_task', 'create_notice')),
  action_config      jsonb       not null default '{}'::jsonb,
  enabled            boolean     not null default true,
  created_at         timestamptz not null default now()
);

alter table public.automation_rules enable row level security;

-- Staff only, both directions. These are internal operating rules and there is
-- no reason for the anon role to be able to read the follow-up strategy.
drop policy if exists automation_rules_staff_all on public.automation_rules;
create policy automation_rules_staff_all on public.automation_rules
  for all to authenticated
  using (public.is_staff()) with check (public.is_staff());

-- A record of what fired, so a rule that misbehaves can be found afterwards
-- rather than guessed at.
create table if not exists public.automation_runs (
  id           uuid primary key default gen_random_uuid(),
  rule_id      uuid references public.automation_rules(id) on delete set null,
  event        text        not null,
  subject_id   uuid,
  outcome      text        not null,
  detail       text,
  ran_at       timestamptz not null default now()
);

alter table public.automation_runs enable row level security;

drop policy if exists automation_runs_staff_read on public.automation_runs;
create policy automation_runs_staff_read on public.automation_runs
  for select to authenticated
  using (public.is_staff());


-- ══ 5. The engine ═════════════════════════════════════════════════════════
-- Deliberately small and real, the same judgement the owner's own engine
-- records: two action types that work rather than a long list that does not.
--
-- SECURITY DEFINER because it writes to tables the triggering role cannot,
-- and `set search_path = ''` so a schema on the caller's path cannot shadow a
-- function this runs as the owner. Both are the pattern 0001 established.

create or replace function public.run_automation(
  p_event      text,
  p_subject_id uuid,
  p_context    jsonb
) returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  r          record;
  v_config   jsonb;
  v_category text := p_context ->> 'admission_category';
begin
  for r in
    select * from public.automation_rules
     where enabled
       and trigger_event = p_event
       -- A rule with a category applies only to that category. A rule with
       -- none applies to all of them.
       and (admission_category is null or admission_category = v_category)
  loop
    -- A condition that names a field the context does not carry does not
    -- match. It is not an error: contexts differ per event, and a rule that
    -- cannot apply should simply not fire.
    if r.condition_field is not null and r.condition_value is not null then
      if coalesce(p_context ->> r.condition_field, '') <> r.condition_value then
        continue;
      end if;
    end if;

    v_config := r.action_config;

    begin
      -- `tasks` is application-scoped by design: application_id is NOT NULL
      -- and references applications. A lead has no application yet, so a
      -- create_task rule on 'lead.created' has nothing to attach to.
      --
      -- The first draft of this function inserted (title, due_at,
      -- related_lead_id, notes) — three columns that do not exist and one
      -- NOT NULL that was not supplied. Because the insert sits inside the
      -- exception block below, that would not have broken the enquiry form;
      -- it would have logged an error on every submission and the automation
      -- would simply never have worked. Checked against 0002 rather than
      -- assumed.
      --
      -- So create_task fires only where an application exists, and says so
      -- rather than failing quietly.
      if r.action_type = 'create_task' then
        if (p_context ->> 'application_id') is null then
          insert into public.automation_runs (rule_id, event, subject_id, outcome, detail)
          values (r.id, p_event, p_subject_id, 'skipped',
                  'create_task needs an application; this event carries none');
          continue;
        end if;

        insert into public.tasks (application_id, title, channel, due_at)
        values (
          (p_context ->> 'application_id')::uuid,
          coalesce(v_config ->> 'title', 'Follow up'),
          v_config ->> 'channel',
          now() + (coalesce((v_config ->> 'offset_days')::int, 1) || ' days')::interval
        );

      elsif r.action_type = 'create_notice' then
        insert into public.college_notices (college_slug, title, body, level, published)
        values (
          v_config ->> 'college_slug',
          coalesce(v_config ->> 'title', r.name),
          v_config ->> 'body',
          coalesce(v_config ->> 'level', 'info'),
          coalesce((v_config ->> 'published')::boolean, true)
        );
      end if;

      insert into public.automation_runs (rule_id, event, subject_id, outcome)
      values (r.id, p_event, p_subject_id, 'ok');

    exception when others then
      -- One broken rule must not roll back the enquiry that triggered it.
      -- A family submitting a form should never see it fail because a
      -- follow-up rule has a bad config.
      insert into public.automation_runs (rule_id, event, subject_id, outcome, detail)
      values (r.id, p_event, p_subject_id, 'error', sqlerrm);
    end;
  end loop;
end $$;

revoke all on function public.run_automation(text, uuid, jsonb) from public, anon;

-- Fire on a new enquiry.
create or replace function public.tg_lead_created()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.run_automation(
    'lead.created',
    new.id,
    jsonb_build_object(
      'admission_category', new.admission_category,
      'city',               new.city,
      'stage',              new.stage
    )
  );
  return new;
end $$;

drop trigger if exists lead_created_automation on public.leads;
create trigger lead_created_automation
  after insert on public.leads
  for each row execute function public.tg_lead_created();

commit;

-- ─────────────────────────────────────────────────────────────────────────
-- BEFORE RUNNING
--
-- Checked against 0002 and 0004 rather than assumed, after a first draft got
-- both wrong:
--
--   `public.tasks` is (id, application_id NOT NULL, assigned_to, title,
--   channel, due_at, state, sequence_run_id, completed_at, created_at). It has
--   no related_lead_id and no notes. create_task therefore fires only for
--   events that carry an application_id, and records a 'skipped' run when they
--   do not.
--
--   `public.leads` had no category column at all. Section 3 adds one.
--
-- Confirm both before running, because these are the two things that would
-- make the engine silently do nothing:
--
--   select column_name from information_schema.columns
--    where table_schema='public' and table_name='tasks' order by 1;
--   select column_name from information_schema.columns
--    where table_schema='public' and table_name='leads' order by 1;
--
-- STORAGE, which is not SQL and has to be done in the dashboard:
--
--   Create a bucket named `media`, marked PUBLIC. It holds college photos and
--   video posters, which are meant to be seen. Do NOT reuse the `documents`
--   bucket from 0002 — that one is private and holds student records, and the
--   two must not share a policy.
--
--   Then allow staff to write to it:
--
--     create policy media_staff_write on storage.objects
--       for all to authenticated
--       using (bucket_id = 'media' and public.is_staff())
--       with check (bucket_id = 'media' and public.is_staff());
--
-- AFTER RUNNING — verify rather than assume:
--
--   -- every new table has RLS on
--   select tablename, rowsecurity from pg_tables
--    where schemaname='public'
--      and tablename in ('college_media','college_notices',
--                        'automation_rules','automation_runs');   -- all true
--
--   -- anon cannot read the rules
--   set role anon; select count(*) from public.automation_rules;  -- expect: denied
--   reset role;
--
--   -- an expired notice is invisible to anon even though the row exists
--   insert into public.college_notices (title, ends_at)
--   values ('expiry check', now() - interval '1 day');
--   set role anon; select count(*) from public.college_notices
--    where title='expiry check';                                  -- expect 0
--   reset role;
--   delete from public.college_notices where title='expiry check';
--
--   -- the enquiry form still submits. Test it on the live form, not here.
--   -- If it does not, drop the trigger rather than leave enquiries failing:
--   --   drop trigger lead_created_automation on public.leads;
-- ─────────────────────────────────────────────────────────────────────────
