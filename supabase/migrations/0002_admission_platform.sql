-- NepalMBBS.in — 0002_admission_platform.sql
--
-- The admission platform. Run 0001 first; every policy here depends on the
-- is_staff() / is_admin() helpers it creates.
--
-- The shape follows what actually happens to a family, in order: an enquiry
-- becomes an application, the application collects documents, the documents
-- are verified, MEC runs its process, a seat is allotted or it is not. Each of
-- those is a state, and the whole point of the table design is that the state
-- is explicit and its history is not overwritten.
--
-- One decision runs through all of it: a student never gets a Supabase Auth
-- account. Families check a status once a week from a WhatsApp link; making
-- them hold a password is friction that costs applications. Instead each
-- application carries a long random token, and the portal reads through a
-- SECURITY DEFINER function that takes that token. The anon role therefore
-- never needs SELECT on any table — which is what keeps the whole database
-- closed by default.

begin;

-- ══ Enumerations ═════════════════════════════════════════════════════════
-- Named types rather than free text, so an impossible state cannot be written
-- in the first place. A status typo in a CRM is how a student silently stops
-- being followed up.

do $$ begin
  create type application_stage as enum (
    'enquiry',        -- captured, not yet worked
    'qualifying',     -- eligibility being established
    'eligible',       -- NEET + documents check out
    'applied',        -- submitted to MEC
    'entrance',       -- MEC entrance sat
    'counselling',    -- in MEC counselling
    'allotted',       -- seat allotted
    'admitted',       -- joined
    'deferred',       -- next intake
    'withdrawn',      -- student stepped away
    'ineligible'      -- cannot proceed this cycle
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type doc_kind as enum (
    'neet_scorecard','marksheet_10','marksheet_12','passport','photo',
    'birth_certificate','migration_certificate','character_certificate',
    'medical_fitness','affidavit','other'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type doc_state as enum ('pending','received','verified','rejected','expired');
exception when duplicate_object then null; end $$;

do $$ begin
  create type task_state as enum ('open','done','skipped','failed');
exception when duplicate_object then null; end $$;


-- ══ applications ═════════════════════════════════════════════════════════

create table if not exists public.applications (
  id              uuid primary key default gen_random_uuid(),
  lead_id         bigint,                     -- soft link; leads may be pruned
  intake_year     int  not null default extract(year from now())::int,

  student_name    text not null,
  contact_number  text not null,
  email           text,
  city            text,
  state           text,

  neet_score      int,
  neet_year       int,
  neet_category   text,
  stage           application_stage not null default 'enquiry',

  preferred_colleges text[] default '{}',
  allotted_college   text,

  -- Portal access. 32 bytes of urandom, not a guessable id: this token IS the
  -- credential, so it has to be long enough that enumeration is pointless.
  access_token    text not null default encode(gen_random_bytes(32), 'hex'),
  token_expires   timestamptz not null default now() + interval '400 days',

  assigned_to     uuid references public.staff(id) on delete set null,

  -- Denormalised so the counselor queue can sort without touching every task.
  next_action_at  timestamptz,
  score           int not null default 0,

  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create unique index if not exists applications_token_idx on public.applications (access_token);
create index if not exists applications_stage_idx    on public.applications (stage, next_action_at);
create index if not exists applications_assigned_idx on public.applications (assigned_to, stage);
create index if not exists applications_phone_idx    on public.applications (contact_number);

comment on column public.applications.access_token is
  'Bearer credential for the student portal. Treat as a secret: anyone with it can read this application.';


-- ══ application_events ═══════════════════════════════════════════════════
-- Append-only. Stage changes are recorded rather than overwritten, because
-- "when did this student become eligible" is a question the business will ask
-- and a mutable status column cannot answer.

create table if not exists public.application_events (
  id              bigserial primary key,
  application_id  uuid not null references public.applications(id) on delete cascade,
  kind            text not null,              -- stage_change | note | doc | message | system
  from_stage      application_stage,
  to_stage        application_stage,
  body            text,
  actor           uuid references public.staff(id) on delete set null,
  is_visible      boolean not null default false,   -- shown in the student portal
  created_at      timestamptz not null default now()
);

create index if not exists events_app_idx on public.application_events (application_id, created_at desc);

-- Stage transitions write their own history. A trigger rather than app code,
-- so an update from the SQL editor or a future integration is recorded too —
-- an audit trail only one code path maintains is not an audit trail.
create or replace function public.log_stage_change()
returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if new.stage is distinct from old.stage then
    insert into public.application_events (application_id, kind, from_stage, to_stage, actor, is_visible)
    values (new.id, 'stage_change', old.stage, new.stage, auth.uid(), true);
  end if;
  new.updated_at := now();
  return new;
end $$;

drop trigger if exists applications_stage_trg on public.applications;
create trigger applications_stage_trg
  before update on public.applications
  for each row execute function public.log_stage_change();


-- ══ documents ════════════════════════════════════════════════════════════

create table if not exists public.documents (
  id              uuid primary key default gen_random_uuid(),
  application_id  uuid not null references public.applications(id) on delete cascade,
  kind            doc_kind not null,
  state           doc_state not null default 'pending',
  storage_path    text,                       -- Supabase Storage object path
  original_name   text,
  size_bytes      bigint,
  mime_type       text,
  expires_on      date,                       -- passports, medical fitness
  reject_reason   text,
  verified_by     uuid references public.staff(id) on delete set null,
  verified_at     timestamptz,
  created_at      timestamptz not null default now()
);

create index if not exists documents_app_idx on public.documents (application_id, kind);
create index if not exists documents_state_idx on public.documents (state) where state <> 'verified';


-- ══ notes ════════════════════════════════════════════════════════════════
-- Internal. Never exposed to the portal, and there is no policy that could.

create table if not exists public.notes (
  id              bigserial primary key,
  application_id  uuid not null references public.applications(id) on delete cascade,
  author          uuid references public.staff(id) on delete set null,
  body            text not null,
  created_at      timestamptz not null default now()
);

create index if not exists notes_app_idx on public.notes (application_id, created_at desc);


-- ══ tasks ════════════════════════════════════════════════════════════════
-- The follow-up queue. Rows are created both by hand and by the automation
-- below; `sequence_run_id` is what distinguishes them.

create table if not exists public.tasks (
  id              bigserial primary key,
  application_id  uuid not null references public.applications(id) on delete cascade,
  assigned_to     uuid references public.staff(id) on delete set null,
  title           text not null,
  channel         text,                       -- call | whatsapp | email | none
  due_at          timestamptz not null default now(),
  state           task_state not null default 'open',
  sequence_run_id bigint,
  completed_at    timestamptz,
  created_at      timestamptz not null default now()
);

create index if not exists tasks_queue_idx on public.tasks (state, due_at) where state = 'open';
create index if not exists tasks_app_idx   on public.tasks (application_id);


-- ══ Automation ═══════════════════════════════════════════════════════════
-- Sequences are stored as data, not code, so a counselor can change the
-- follow-up rhythm without a deploy. A run is one application moving through
-- one sequence; steps are due at an offset from when the run started.

create table if not exists public.sequences (
  id            bigserial primary key,
  name          text not null,
  trigger_stage application_stage,            -- start when an application enters this stage
  is_active     boolean not null default true,
  created_at    timestamptz not null default now()
);

create table if not exists public.sequence_steps (
  id            bigserial primary key,
  sequence_id   bigint not null references public.sequences(id) on delete cascade,
  position      int not null,
  delay_hours   int not null default 24,
  channel       text not null default 'whatsapp',
  title         text not null,
  template      text,
  unique (sequence_id, position)
);

create table if not exists public.sequence_runs (
  id             bigserial primary key,
  sequence_id    bigint not null references public.sequences(id) on delete cascade,
  application_id uuid   not null references public.applications(id) on delete cascade,
  started_at     timestamptz not null default now(),
  stopped_at     timestamptz,
  stop_reason    text,
  unique (sequence_id, application_id)        -- never enrol the same pair twice
);

create index if not exists runs_active_idx on public.sequence_runs (application_id) where stopped_at is null;

-- Enrol on entry to a stage, and stop every other run for that application.
-- Without the stop, a student who moves from 'enquiry' to 'admitted' keeps
-- receiving the enquiry chase — the most common way an automated CRM
-- embarrasses the business that installed it.
create or replace function public.enrol_sequences()
returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
declare s record; st record;
begin
  if new.stage is not distinct from old.stage then return new; end if;

  update public.sequence_runs
     set stopped_at = now(), stop_reason = 'stage_changed'
   where application_id = new.id and stopped_at is null;

  for s in select * from public.sequences where is_active and trigger_stage = new.stage loop
    insert into public.sequence_runs (sequence_id, application_id)
    values (s.id, new.id)
    on conflict (sequence_id, application_id) do nothing;

    for st in select * from public.sequence_steps where sequence_id = s.id order by position loop
      insert into public.tasks (application_id, assigned_to, title, channel, due_at, sequence_run_id)
      values (new.id, new.assigned_to, st.title, st.channel,
              now() + (st.delay_hours || ' hours')::interval,
              (select id from public.sequence_runs
                where sequence_id = s.id and application_id = new.id));
    end loop;
  end loop;
  return new;
end $$;

drop trigger if exists applications_enrol_trg on public.applications;
create trigger applications_enrol_trg
  after update on public.applications
  for each row execute function public.enrol_sequences();


-- ══ eligibility_checks ═══════════════════════════════════════════════════
-- Every calculator run, whether or not it became an enquiry. This is the only
-- honest measure of how many people bounce off the eligibility bar, and it
-- costs nothing to keep.

create table if not exists public.eligibility_checks (
  id           bigserial primary key,
  neet_score   int,
  neet_year    int,
  category     text,
  outcome      text,                          -- eligible | below_cutoff | needs_review
  became_lead  boolean not null default false,
  created_at   timestamptz not null default now()
);

create index if not exists elig_created_idx on public.eligibility_checks (created_at desc);


-- ══ Row Level Security ═══════════════════════════════════════════════════
-- Closed by default. anon gets INSERT where the public genuinely has to write,
-- and SELECT nowhere at all — the portal reads through the function below.

alter table public.applications        enable row level security;
alter table public.application_events  enable row level security;
alter table public.documents           enable row level security;
alter table public.notes               enable row level security;
alter table public.tasks               enable row level security;
alter table public.sequences           enable row level security;
alter table public.sequence_steps      enable row level security;
alter table public.sequence_runs       enable row level security;
alter table public.eligibility_checks  enable row level security;

-- Public writes: the enquiry form and the calculator.
drop policy if exists apps_public_insert on public.applications;
create policy apps_public_insert on public.applications
  for insert to anon, authenticated with check (true);

drop policy if exists elig_public_insert on public.eligibility_checks;
create policy elig_public_insert on public.eligibility_checks
  for insert to anon, authenticated with check (true);

-- Staff read/write everything operational.
do $$
declare t text;
begin
  foreach t in array array[
    'applications','application_events','documents','notes','tasks',
    'sequences','sequence_steps','sequence_runs','eligibility_checks'
  ] loop
    execute format('drop policy if exists %I on public.%I', t || '_staff_all', t);
    execute format(
      'create policy %I on public.%I for all to authenticated using (public.is_staff()) with check (public.is_staff())',
      t || '_staff_all', t);
  end loop;
end $$;


-- ══ Student portal ═══════════════════════════════════════════════════════
-- One function, one token, one application. SECURITY DEFINER so it can read
-- past RLS, and narrow on purpose: it returns a fixed projection rather than
-- the row, so adding an internal column later cannot accidentally leak it.
-- Notes are not in the projection and never will be.

create or replace function public.portal_application(p_token text)
returns table (
  student_name text,
  stage        application_stage,
  intake_year  int,
  allotted_college text,
  updated_at   timestamptz,
  documents    jsonb,
  timeline     jsonb
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select
    a.student_name,
    a.stage,
    a.intake_year,
    a.allotted_college,
    a.updated_at,
    coalesce((
      select jsonb_agg(jsonb_build_object(
        'kind', d.kind, 'state', d.state,
        'rejectReason', d.reject_reason, 'expiresOn', d.expires_on)
        order by d.kind)
      from public.documents d where d.application_id = a.id
    ), '[]'::jsonb),
    coalesce((
      select jsonb_agg(jsonb_build_object(
        'at', e.created_at, 'kind', e.kind,
        'toStage', e.to_stage, 'body', e.body)
        order by e.created_at desc)
      from public.application_events e
      where e.application_id = a.id and e.is_visible
    ), '[]'::jsonb)
  from public.applications a
  where a.access_token = p_token
    and a.token_expires > now()
  limit 1;
$$;

revoke all on function public.portal_application(text) from public;
grant execute on function public.portal_application(text) to anon, authenticated;

commit;

-- ─────────────────────────────────────────────────────────────────────────
-- AFTER RUNNING
--
-- 1. Create the first admin. Sign the account up through Supabase Auth, then:
--
--      insert into public.staff (id, email, full_name, role)
--      values ('<auth user uuid>', 'you@nepalmbbs.in', 'Your name', 'admin');
--
--    Until a staff row exists, is_staff() is false for everyone and the
--    operational tables are closed to all — which is the correct failure
--    direction, but it does mean nothing works until you do this.
--
-- 2. Confirm nothing is open:
--
--      select tablename, rowsecurity from pg_tables
--       where schemaname = 'public' and rowsecurity = false;   -- expect 0 rows
--
-- 3. Storage: create a private bucket named `documents`. Do not make it
--    public — the whole point of the state machine above is that a passport
--    scan is not a URL anyone can guess.
-- ─────────────────────────────────────────────────────────────────────────
