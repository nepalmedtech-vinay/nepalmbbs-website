-- NepalMBBS.in — 0006_exam_intelligence.sql
--
-- Exam Intelligence: institutions, batches, students, exams, marks, report
-- cards and parent communication.
--
-- Three things this file is built around, in order of importance.
--
-- 1. Academic data is never silently changed. `marks` has one row per
--    (subject, student) and a re-import that disagrees with a stored value
--    does NOT overwrite it — it is reported back to the importer as a
--    conflict, and only an explicit amend, with a reason, writes the new
--    value and files the old one in `mark_revisions`. Deletes on the academic
--    tables are admin-only.
--
-- 2. Every number is computed here, in SQL. Totals, percentages, grades,
--    ranks, subject and batch averages and previous-vs-current deltas come out
--    of the views and `exam_report()` below. Nothing upstream — least of all a
--    language model — is asked to do arithmetic on a student's marks.
--
-- 3. Access is decided by the database. A row is visible to a signed-in staff
--    member who is a member of that row's institution, and to nobody else.
--    There is no anon policy anywhere in this file: these are minors' academic
--    records and a parent's phone number.
--
-- Depends on 0001 (staff, is_staff, is_admin).

begin;

-- ══ 1. Tenancy ═══════════════════════════════════════════════════════════

create table if not exists public.institutions (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  short_name    text,
  address       text,
  logo_path     text,
  accent_color  text,
  created_at    timestamptz not null default now(),
  created_by    uuid references auth.users(id) on delete set null
);

comment on table public.institutions is
  'A college whose results this platform holds. Every academic row hangs off one.';

create table if not exists public.institution_members (
  institution_id uuid not null references public.institutions(id) on delete cascade,
  staff_id       uuid not null references public.staff(id) on delete cascade,
  role           text not null default 'coordinator'
                 check (role in ('coordinator', 'admin', 'viewer')),
  created_at     timestamptz not null default now(),
  primary key (institution_id, staff_id)
);

-- SECURITY DEFINER for the same reason is_staff() is: the membership check
-- must not need its own SELECT policy on the table it reads, or the policy
-- recurses. search_path pinned.
create or replace function public.in_institution(p_institution uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.institution_members m
    join public.staff s on s.id = m.staff_id
    where m.institution_id = p_institution
      and m.staff_id = auth.uid()
      and s.is_active
  );
$$;

-- Membership carries a role of its own so a college can have a read-only
-- coordinator without making them a platform admin.
create or replace function public.institution_role(p_institution uuid)
returns text
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select m.role
  from public.institution_members m
  where m.institution_id = p_institution and m.staff_id = auth.uid();
$$;

create or replace function public.can_write_institution(p_institution uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select public.institution_role(p_institution) in ('coordinator', 'admin');
$$;

revoke all on function public.in_institution(uuid)        from public, anon;
revoke all on function public.institution_role(uuid)      from public, anon;
revoke all on function public.can_write_institution(uuid) from public, anon;
grant execute on function public.in_institution(uuid)        to authenticated;
grant execute on function public.institution_role(uuid)      to authenticated;
grant execute on function public.can_write_institution(uuid) to authenticated;


-- ══ 2. Academic structure ════════════════════════════════════════════════
-- Institution → Batch → Exam → Paper → Subject, with Student hanging off the
-- batch and Marks joining student to subject.

create table if not exists public.batches (
  id             uuid primary key default gen_random_uuid(),
  institution_id uuid not null references public.institutions(id) on delete cascade,
  name           text not null,             -- '2025'
  course         text not null default 'MBBS',
  year_label     text,                      -- 'MBBS 1st year'
  created_at     timestamptz not null default now(),
  unique (institution_id, course, name, year_label)
);

create table if not exists public.students (
  id             uuid primary key default gen_random_uuid(),
  institution_id uuid not null references public.institutions(id) on delete cascade,
  batch_id       uuid not null references public.batches(id) on delete restrict,
  student_code   text not null,             -- roll / student ID as printed
  serial_no      integer,                   -- S.N. on the sheet; presentation only
  full_name      text not null,
  category       text,
  photo_path     text,
  is_active      boolean not null default true,
  created_at     timestamptz not null default now(),
  unique (institution_id, student_code)
);

create index if not exists students_batch_idx on public.students (batch_id);
create index if not exists students_name_idx  on public.students (institution_id, lower(full_name));

-- Parents are their own rows, not columns on `students`, because a number can
-- be missing, can be shared between both parents, and must be correctable
-- without touching the academic record.
create table if not exists public.guardians (
  id           uuid primary key default gen_random_uuid(),
  student_id   uuid not null references public.students(id) on delete cascade,
  relation     text not null check (relation in ('father', 'mother', 'guardian')),
  full_name    text,
  phone_raw    text,                        -- exactly as it arrived
  phone_e164   text,                        -- normalised, or null when it could not be
  phone_status text not null default 'missing'
               check (phone_status in ('valid', 'suspect', 'missing')),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique (student_id, relation)
);

comment on column public.guardians.phone_raw is
  'The value as supplied. Never rewritten by an import — a normalisation that
   disagrees is recorded in phone_e164 and flagged suspect instead.';

create table if not exists public.exams (
  id             uuid primary key default gen_random_uuid(),
  institution_id uuid not null references public.institutions(id) on delete cascade,
  batch_id       uuid not null references public.batches(id) on delete restrict,
  name           text not null,             -- '2nd Internal Assessment'
  exam_kind      text not null default 'internal',
  held_on        date,
  held_label     text,                      -- '2083/04/15,19,22' — BS dates, kept verbatim
  result_label   text,
  sequence_no    integer,                   -- orders exams within a batch for trend maths
  source_file    text,
  created_at     timestamptz not null default now(),
  unique (institution_id, batch_id, name)
);

create table if not exists public.exam_papers (
  id         uuid primary key default gen_random_uuid(),
  exam_id    uuid not null references public.exams(id) on delete cascade,
  name       text not null,                 -- 'IBMS-MSK'
  max_marks  numeric(7,2) not null check (max_marks > 0),
  pass_marks numeric(7,2) check (pass_marks >= 0),
  position   integer not null default 0,
  unique (exam_id, name)
);

create table if not exists public.exam_subjects (
  id         uuid primary key default gen_random_uuid(),
  exam_id    uuid not null references public.exams(id) on delete cascade,
  paper_id   uuid not null references public.exam_papers(id) on delete cascade,
  name       text not null,                 -- 'ANA'
  max_marks  numeric(7,2) not null check (max_marks > 0),
  position   integer not null default 0,
  unique (paper_id, name)
);

create index if not exists exam_subjects_exam_idx on public.exam_subjects (exam_id);

create table if not exists public.mark_imports (
  id             uuid primary key default gen_random_uuid(),
  institution_id uuid not null references public.institutions(id) on delete cascade,
  filename       text,
  file_digest    text,
  status         text not null default 'committed'
                 check (status in ('committed', 'partial', 'failed')),
  mapping        jsonb not null default '{}'::jsonb,
  summary        jsonb not null default '{}'::jsonb,
  created_by     uuid references auth.users(id) on delete set null,
  created_at     timestamptz not null default now()
);

create table if not exists public.marks (
  id         uuid primary key default gen_random_uuid(),
  exam_id    uuid not null references public.exams(id) on delete cascade,
  subject_id uuid not null references public.exam_subjects(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete cascade,
  obtained   numeric(7,2) check (obtained >= 0),
  is_absent  boolean not null default false,
  import_id  uuid references public.mark_imports(id) on delete set null,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (subject_id, student_id),
  -- Absent means no mark, and a mark means not absent. Storing both is how a
  -- zero starts being reported as an absence, or the reverse.
  constraint marks_absent_xor_score check (
    (is_absent and obtained is null) or (not is_absent and obtained is not null)
  )
);

create index if not exists marks_exam_student_idx on public.marks (exam_id, student_id);

-- A mark that changes leaves the old value behind, with a reason and a name.
create table if not exists public.mark_revisions (
  id           uuid primary key default gen_random_uuid(),
  mark_id      uuid not null references public.marks(id) on delete cascade,
  old_obtained numeric(7,2),
  old_is_absent boolean,
  new_obtained numeric(7,2),
  new_is_absent boolean,
  reason       text not null,
  changed_by   uuid references auth.users(id) on delete set null,
  changed_at   timestamptz not null default now()
);

-- What the source sheet itself declared per paper. Kept beside our own
-- computation rather than instead of it: when the two disagree the console
-- shows both and asks, which is how a transcription error surfaces.
create table if not exists public.paper_results (
  id             uuid primary key default gen_random_uuid(),
  paper_id       uuid not null references public.exam_papers(id) on delete cascade,
  student_id     uuid not null references public.students(id) on delete cascade,
  declared_total numeric(7,2),
  declared_result text,
  unique (paper_id, student_id)
);

-- Grade bands are data, not code: a college that grades differently edits a
-- row rather than waiting for a deploy.
create table if not exists public.grade_scales (
  id             uuid primary key default gen_random_uuid(),
  institution_id uuid not null references public.institutions(id) on delete cascade,
  name           text not null default 'Default',
  is_default     boolean not null default true,
  -- [{ "min": 80, "grade": "A+", "label": "Distinction" }, …] descending
  bands          jsonb not null,
  created_at     timestamptz not null default now(),
  unique (institution_id, name)
);


-- ══ 3. Report cards and parent communication ═════════════════════════════

-- A template is a stored spec, not a code path. The renderer in the console
-- reads this; adding a design means inserting a row.
create table if not exists public.report_templates (
  id             uuid primary key default gen_random_uuid(),
  institution_id uuid references public.institutions(id) on delete cascade,
  key            text not null,
  name           text not null,
  spec           jsonb not null,
  is_default     boolean not null default false,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  unique (institution_id, key)
);

-- One row per generated card. Regenerating after a correction makes version
-- 2 rather than replacing version 1, so a message sent last week can still be
-- matched to the card that was actually sent.
create table if not exists public.report_cards (
  id           uuid primary key default gen_random_uuid(),
  student_id   uuid not null references public.students(id) on delete cascade,
  exam_id      uuid not null references public.exams(id) on delete cascade,
  template_id  uuid references public.report_templates(id) on delete set null,
  version      integer not null default 1,
  payload      jsonb not null,              -- the computed figures, frozen
  image_path   text,                        -- storage key of the flyer PNG
  generated_by uuid references auth.users(id) on delete set null,
  generated_at timestamptz not null default now(),
  unique (student_id, exam_id, version)
);

create table if not exists public.parent_messages (
  id            uuid primary key default gen_random_uuid(),
  report_card_id uuid references public.report_cards(id) on delete set null,
  student_id    uuid not null references public.students(id) on delete cascade,
  exam_id       uuid references public.exams(id) on delete set null,
  guardian_id   uuid references public.guardians(id) on delete set null,
  recipient_name text,
  recipient_relation text,
  -- Denormalised on purpose: this is the number the message actually went to.
  -- If the guardian row is corrected next month, the log must still say where
  -- this message went.
  to_phone      text not null,
  channel       text not null default 'whatsapp'
                check (channel in ('whatsapp', 'sms', 'manual')),
  body          text not null,
  media_path    text,
  status        text not null default 'queued'
                check (status in ('queued', 'sent', 'delivered', 'read',
                                  'failed', 'prepared', 'cancelled')),
  provider      text,
  provider_message_id text,
  attempts      integer not null default 0,
  error         text,
  created_by    uuid references auth.users(id) on delete set null,
  created_at    timestamptz not null default now(),
  sent_at       timestamptz,
  delivered_at  timestamptz,
  read_at       timestamptz
);

create index if not exists parent_messages_student_idx on public.parent_messages (student_id, created_at desc);
create index if not exists parent_messages_provider_idx on public.parent_messages (provider_message_id);

create table if not exists public.message_events (
  id         uuid primary key default gen_random_uuid(),
  message_id uuid references public.parent_messages(id) on delete cascade,
  status     text not null,
  raw        jsonb,
  at         timestamptz not null default now()
);


-- ══ 4. AI accounting ═════════════════════════════════════════════════════
-- The gateway writes here on every call. Without it, "route to the cheap model
-- for bulk work" is an intention rather than something anyone can check.

create table if not exists public.ai_usage (
  id             uuid primary key default gen_random_uuid(),
  institution_id uuid references public.institutions(id) on delete set null,
  task           text not null,
  provider       text,
  model          text,
  prompt_tokens  integer,
  completion_tokens integer,
  cache_hit      boolean not null default false,
  latency_ms     integer,
  ok             boolean not null default true,
  error          text,
  created_by     uuid references auth.users(id) on delete set null,
  created_at     timestamptz not null default now()
);

create index if not exists ai_usage_day_idx on public.ai_usage (created_at desc);

-- Keyed by a digest of (task, model, input). Two coordinators generating the
-- same student's analysis on the same marks is one call, not two.
create table if not exists public.ai_cache (
  key        text primary key,
  task       text not null,
  provider   text,
  model      text,
  response   jsonb not null,
  hits       integer not null default 0,
  created_at timestamptz not null default now()
);


-- ══ 5. Deterministic analytics ═══════════════════════════════════════════
-- security_invoker so RLS still applies through the view: a view owned by the
-- migration runner would otherwise hand every institution's marks to any
-- signed-in member of any institution.

create or replace view public.v_paper_totals
with (security_invoker = on) as
select
  m.exam_id,
  m.student_id,
  s.paper_id,
  p.name                                    as paper_name,
  p.max_marks                               as paper_max,
  p.pass_marks                              as paper_pass,
  p.position                                as paper_position,
  sum(coalesce(m.obtained, 0))              as obtained,
  count(*) filter (where m.is_absent)       as absent_subjects,
  count(*)                                  as subject_count,
  round(100.0 * sum(coalesce(m.obtained, 0)) / nullif(p.max_marks, 0), 2) as percentage,
  case
    when p.pass_marks is null then null
    when count(*) filter (where m.is_absent) = count(*) then false
    else sum(coalesce(m.obtained, 0)) >= p.pass_marks
  end                                       as passed
from public.marks m
join public.exam_subjects s on s.id = m.subject_id
join public.exam_papers  p on p.id = s.paper_id
group by m.exam_id, m.student_id, s.paper_id, p.name, p.max_marks, p.pass_marks, p.position;

create or replace view public.v_exam_totals
with (security_invoker = on) as
select
  m.exam_id,
  m.student_id,
  sum(coalesce(m.obtained, 0))              as obtained,
  sum(s.max_marks)                          as max_marks,
  round(100.0 * sum(coalesce(m.obtained, 0)) / nullif(sum(s.max_marks), 0), 2) as percentage,
  count(*) filter (where m.is_absent)       as absent_subjects,
  count(*)                                  as subject_count
from public.marks m
join public.exam_subjects s on s.id = m.subject_id
group by m.exam_id, m.student_id;

-- Rank is over the batch sitting the same exam. Ties share a rank (rank(),
-- not row_number()) because two students on the same total are the same
-- position, and telling one of them otherwise is a fabrication.
create or replace view public.v_exam_ranks
with (security_invoker = on) as
select
  t.exam_id,
  t.student_id,
  t.obtained,
  t.max_marks,
  t.percentage,
  rank() over (partition by t.exam_id order by t.obtained desc)  as rank,
  count(*) over (partition by t.exam_id)                          as cohort_size
from public.v_exam_totals t;

create or replace view public.v_subject_stats
with (security_invoker = on) as
select
  s.exam_id,
  s.id                                      as subject_id,
  s.name                                    as subject_name,
  s.paper_id,
  s.max_marks,
  round(avg(m.obtained) filter (where not m.is_absent), 2)  as avg_obtained,
  max(m.obtained) filter (where not m.is_absent)            as max_obtained,
  min(m.obtained) filter (where not m.is_absent)            as min_obtained,
  round(100.0 * avg(m.obtained) filter (where not m.is_absent)
        / nullif(s.max_marks, 0), 2)                        as avg_percentage,
  count(*) filter (where not m.is_absent)                   as sat_count,
  count(*) filter (where m.is_absent)                       as absent_count
from public.exam_subjects s
left join public.marks m on m.subject_id = s.id
group by s.exam_id, s.id, s.name, s.paper_id, s.max_marks;

create or replace view public.v_exam_summary
with (security_invoker = on) as
select
  e.id                                      as exam_id,
  e.institution_id,
  e.batch_id,
  e.name,
  e.sequence_no,
  count(distinct t.student_id)              as students,
  round(avg(t.percentage), 2)               as avg_percentage,
  max(t.percentage)                         as top_percentage,
  min(t.percentage)                         as low_percentage
from public.exams e
left join public.v_exam_totals t on t.exam_id = e.id
group by e.id, e.institution_id, e.batch_id, e.name, e.sequence_no;

-- Previous-vs-current, ordered by the exam's own sequence within its batch.
-- lag() over that ordering is the whole of the "improvement" calculation; no
-- model is asked to work out whether 41% is better than 38%.
create or replace view public.v_student_progress
with (security_invoker = on) as
select
  x.student_id,
  x.exam_id,
  x.percentage,
  x.rank,
  x.cohort_size,
  lag(x.percentage) over w                  as prev_percentage,
  lag(x.exam_id)    over w                  as prev_exam_id,
  lag(x.rank)       over w                  as prev_rank,
  round(x.percentage - lag(x.percentage) over w, 2) as delta_percentage
from (
  select r.*, e.batch_id, e.sequence_no, e.created_at
  from public.v_exam_ranks r
  join public.exams e on e.id = r.exam_id
) x
window w as (partition by x.student_id, x.batch_id
             order by coalesce(x.sequence_no, 0), x.created_at);


-- ══ 6. Grading ═══════════════════════════════════════════════════════════

create or replace function public.grade_for(p_institution uuid, p_percentage numeric)
returns jsonb
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select coalesce(
    (select jsonb_build_object('grade', b->>'grade', 'label', b->>'label')
       from public.grade_scales g,
            lateral jsonb_array_elements(g.bands) b
      where g.institution_id = p_institution
        and g.is_default
        and p_percentage is not null
        and p_percentage >= (b->>'min')::numeric
      order by (b->>'min')::numeric desc
      limit 1),
    '{"grade": null, "label": null}'::jsonb);
$$;

-- Not granted to `authenticated`. It is called only from exam_report() and
-- exam_cohort(), both of which are SECURITY DEFINER and so run as the owner.
-- Exposing it over /rest/v1/rpc would let any signed-in user read any
-- college's grade bands by passing that college's id, which is a small leak
-- with no purpose — Supabase's own linter flags exactly this shape.
revoke all on function public.grade_for(uuid, numeric) from public, anon, authenticated;


-- ══ 7. exam_report() — the single source of every figure on a report card ═
-- One call returns everything the card, the analyst prompt and the parent
-- message need. They all read the same object, so a percentage cannot differ
-- between the PDF and the WhatsApp text.

create or replace function public.exam_report(p_student uuid, p_exam uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_inst   uuid;
  v_out    jsonb;
begin
  select institution_id into v_inst from public.exams where id = p_exam;
  if v_inst is null then
    raise exception 'exam not found';
  end if;
  if not (public.is_staff() and public.in_institution(v_inst)) then
    raise exception 'not permitted';
  end if;
  -- The student has to belong to the same institution as the exam. Without
  -- this the function is definer-rights over two independent ids: a member of
  -- one college could pass one of their own exams with someone else's student
  -- and read that student's name and their parents' phone numbers, none of
  -- which any policy would have shown them.
  if not exists (select 1 from public.students
                  where id = p_student and institution_id = v_inst) then
    raise exception 'not permitted';
  end if;

  select jsonb_strip_nulls(jsonb_build_object(
    'institution', (select to_jsonb(i) - 'created_by'
                      from public.institutions i where i.id = v_inst),
    'student', (select jsonb_build_object(
                  'id', s.id, 'name', s.full_name, 'code', s.student_code,
                  'serial_no', s.serial_no, 'category', s.category,
                  'photo_path', s.photo_path,
                  'batch', jsonb_build_object('id', b.id, 'name', b.name,
                           'course', b.course, 'year_label', b.year_label))
                  from public.students s join public.batches b on b.id = s.batch_id
                 where s.id = p_student),
    'exam', (select jsonb_build_object('id', e.id, 'name', e.name,
               'kind', e.exam_kind, 'held_label', e.held_label,
               'result_label', e.result_label, 'held_on', e.held_on,
               'sequence_no', e.sequence_no)
               from public.exams e where e.id = p_exam),
    'guardians', coalesce((select jsonb_agg(jsonb_build_object(
                     'id', g.id, 'relation', g.relation, 'name', g.full_name,
                     'phone_raw', g.phone_raw, 'phone_e164', g.phone_e164,
                     'phone_status', g.phone_status) order by g.relation)
                   from public.guardians g where g.student_id = p_student), '[]'::jsonb),

    -- Papers, each with its subjects. Per subject: the student's mark, the
    -- subject's batch average for this exam, and the same subject's mark in
    -- this student's previous exam where one exists.
    'papers', coalesce((
      select jsonb_agg(p_obj order by (p_obj->>'position')::int)
      from (
        select jsonb_build_object(
          'id', p.id, 'name', p.name, 'position', p.position,
          'max_marks', p.max_marks, 'pass_marks', p.pass_marks,
          'obtained', pt.obtained, 'percentage', pt.percentage,
          'passed', pt.passed,
          'declared_total', pr.declared_total,
          'declared_result', pr.declared_result,
          -- A mismatch between what we computed and what the sheet said is
          -- surfaced, never reconciled behind the coordinator's back.
          'declared_matches', case
             when pr.declared_total is null then null
             else abs(coalesce(pr.declared_total, 0) - coalesce(pt.obtained, 0)) < 0.005
           end,
          'subjects', coalesce((
            select jsonb_agg(jsonb_build_object(
              'id', es.id, 'name', es.name, 'position', es.position,
              'max_marks', es.max_marks,
              'obtained', m.obtained, 'is_absent', m.is_absent,
              'percentage', round(100.0 * m.obtained / nullif(es.max_marks, 0), 2),
              'batch_avg', ss.avg_obtained,
              'batch_avg_percentage', ss.avg_percentage,
              'prev_obtained', pm.obtained,
              'prev_max_marks', pm.max_marks,
              'delta_percentage', case
                 when pm.obtained is null then null
                 else round(100.0 * m.obtained / nullif(es.max_marks, 0)
                          - 100.0 * pm.obtained / nullif(pm.max_marks, 0), 2)
               end
            ) order by es.position)
            from public.exam_subjects es
            left join public.marks m on m.subject_id = es.id and m.student_id = p_student
            left join public.v_subject_stats ss on ss.subject_id = es.id
            left join lateral (
              -- Same subject name, same batch, the exam immediately before
              -- this one in sequence. Matching on name is deliberate: subject
              -- rows are per-exam, so there is no shared id to join on.
              select m2.obtained, es2.max_marks
              from public.marks m2
              join public.exam_subjects es2 on es2.id = m2.subject_id
              join public.exams e2 on e2.id = es2.exam_id
              join public.exams e1 on e1.id = p_exam
              where m2.student_id = p_student
                and upper(es2.name) = upper(es.name)
                and e2.batch_id = e1.batch_id
                and coalesce(e2.sequence_no, 0) < coalesce(e1.sequence_no, 0)
                and not m2.is_absent
              order by coalesce(e2.sequence_no, 0) desc, e2.created_at desc
              limit 1
            ) pm on true
            where es.paper_id = p.id
          ), '[]'::jsonb)
        ) as p_obj
        from public.exam_papers p
        left join public.v_paper_totals pt
               on pt.paper_id = p.id and pt.student_id = p_student
        left join public.paper_results pr
               on pr.paper_id = p.id and pr.student_id = p_student
        where p.exam_id = p_exam
      ) q), '[]'::jsonb),

    'totals', (select jsonb_build_object(
                 'obtained', r.obtained, 'max_marks', r.max_marks,
                 'percentage', r.percentage, 'rank', r.rank,
                 'cohort_size', r.cohort_size)
                 from public.v_exam_ranks r
                where r.exam_id = p_exam and r.student_id = p_student),
    'grade', public.grade_for(v_inst,
               (select percentage from public.v_exam_totals
                 where exam_id = p_exam and student_id = p_student)),
    'cohort', (select jsonb_build_object(
                 'avg_percentage', avg_percentage, 'top_percentage', top_percentage,
                 'low_percentage', low_percentage, 'students', students)
                 from public.v_exam_summary where exam_id = p_exam),
    'progress', (select jsonb_build_object(
                   'prev_percentage', pr.prev_percentage,
                   'prev_rank', pr.prev_rank,
                   'delta_percentage', pr.delta_percentage,
                   'prev_exam', (select name from public.exams where id = pr.prev_exam_id),
                   'direction', case
                      when pr.delta_percentage is null then 'first-exam'
                      when pr.delta_percentage >= 2  then 'improved'
                      when pr.delta_percentage <= -2 then 'declined'
                      else 'steady' end)
                   from public.v_student_progress pr
                  where pr.exam_id = p_exam and pr.student_id = p_student),

    -- Strengths and weaknesses are a sort, not an opinion. Anything at or
    -- above 60% of its own maximum is a strength, below 40% needs attention;
    -- absences are listed separately because a missing paper is not a weak one.
    'strengths', coalesce((
      select jsonb_agg(x order by (x->>'percentage')::numeric desc)
      from (select jsonb_build_object('subject', es.name,
                     'percentage', round(100.0 * m.obtained / nullif(es.max_marks,0), 2),
                     'obtained', m.obtained, 'max_marks', es.max_marks,
                     'vs_batch', round(100.0 * m.obtained / nullif(es.max_marks,0)
                                     - ss.avg_percentage, 2)) as x
              from public.exam_subjects es
              join public.marks m on m.subject_id = es.id and m.student_id = p_student
              left join public.v_subject_stats ss on ss.subject_id = es.id
             where es.exam_id = p_exam and not m.is_absent
               and 100.0 * m.obtained / nullif(es.max_marks,0) >= 60
             order by 100.0 * m.obtained / nullif(es.max_marks,0) desc
             limit 4) s), '[]'::jsonb),
    'attention', coalesce((
      select jsonb_agg(x order by (x->>'percentage')::numeric asc)
      from (select jsonb_build_object('subject', es.name,
                     'percentage', round(100.0 * m.obtained / nullif(es.max_marks,0), 2),
                     'obtained', m.obtained, 'max_marks', es.max_marks,
                     'vs_batch', round(100.0 * m.obtained / nullif(es.max_marks,0)
                                     - ss.avg_percentage, 2)) as x
              from public.exam_subjects es
              join public.marks m on m.subject_id = es.id and m.student_id = p_student
              left join public.v_subject_stats ss on ss.subject_id = es.id
             where es.exam_id = p_exam and not m.is_absent
               and 100.0 * m.obtained / nullif(es.max_marks,0) < 40
             order by 100.0 * m.obtained / nullif(es.max_marks,0) asc
             limit 4) s), '[]'::jsonb),
    'absences', coalesce((
      select jsonb_agg(es.name order by es.position)
        from public.exam_subjects es
        join public.marks m on m.subject_id = es.id and m.student_id = p_student
       where es.exam_id = p_exam and m.is_absent), '[]'::jsonb),
    'history', coalesce((
      select jsonb_agg(jsonb_build_object(
               'exam_id', e.id, 'exam', e.name, 'sequence_no', e.sequence_no,
               'percentage', t.percentage, 'obtained', t.obtained,
               'max_marks', t.max_marks, 'rank', r.rank, 'cohort_size', r.cohort_size)
             order by coalesce(e.sequence_no, 0), e.created_at)
        from public.v_exam_totals t
        join public.exams e on e.id = t.exam_id
        left join public.v_exam_ranks r on r.exam_id = e.id and r.student_id = p_student
       where t.student_id = p_student), '[]'::jsonb),
    'computed_at', to_jsonb(now())
  )) into v_out;

  return v_out;
end;
$$;

revoke all on function public.exam_report(uuid, uuid) from public, anon;
grant execute on function public.exam_report(uuid, uuid) to authenticated;


-- ══ 8. import_exam_batch() — the only way marks enter the system ═════════
--
-- Runs in one transaction. Structure (institution, batch, exam, papers,
-- subjects, students, guardians) is created where missing and matched where
-- present. Marks are inserted only where none exist.
--
-- A mark that already exists and disagrees is NOT written. It comes back in
-- `conflicts` and the console shows it. p_mode = 'amend' writes it, files the
-- old value in mark_revisions with p_reason, and still reports what it did.
-- There is no mode in which a stored mark changes without a record of it.

create or replace function public.import_exam_batch(
  p_payload jsonb,
  p_mode    text default 'strict',
  p_reason  text default null
) returns jsonb
language plpgsql
volatile
security definer
set search_path = public, pg_temp
as $$
declare
  v_inst uuid; v_batch uuid; v_exam uuid; v_import uuid;
  v_paper uuid; v_subject uuid; v_student uuid; v_mark public.marks%rowtype;
  p jsonb; sub jsonb; st jsonb; g jsonb; mk jsonb; pr jsonb;
  v_created_students int := 0; v_matched_students int := 0;
  v_marks_inserted int := 0; v_marks_amended int := 0;
  v_guardians_created int := 0; v_guardians_flagged int := 0;
  v_conflicts jsonb := '[]'::jsonb;
  v_warnings  jsonb := '[]'::jsonb;
  v_obtained numeric; v_absent boolean; v_max numeric;
begin
  if not public.is_staff() then
    raise exception 'not permitted';
  end if;
  if p_mode not in ('strict', 'amend') then
    raise exception 'unknown mode %', p_mode;
  end if;
  if p_mode = 'amend' and coalesce(btrim(p_reason), '') = '' then
    raise exception 'an amendment needs a reason';
  end if;

  -- ── institution ──
  select id into v_inst from public.institutions
   where lower(name) = lower(p_payload->'institution'->>'name') limit 1;
  if v_inst is null then
    insert into public.institutions (name, address, created_by)
    values (p_payload->'institution'->>'name',
            p_payload->'institution'->>'address', auth.uid())
    returning id into v_inst;
    insert into public.institution_members (institution_id, staff_id, role)
    values (v_inst, auth.uid(), 'admin')
    on conflict do nothing;
    -- A college with no grade scale would report every percentage with a null
    -- grade. This is a starting point the coordinator can edit, not a claim
    -- about how this college grades.
    insert into public.grade_scales (institution_id, name, is_default, bands)
    values (v_inst, 'Default', true, '[
      {"min": 80, "grade": "A+", "label": "Outstanding"},
      {"min": 70, "grade": "A",  "label": "Very good"},
      {"min": 60, "grade": "B+", "label": "Good"},
      {"min": 50, "grade": "B",  "label": "Satisfactory"},
      {"min": 40, "grade": "C",  "label": "Needs improvement"},
      {"min": 0,  "grade": "D",  "label": "Needs urgent attention"}]'::jsonb)
    on conflict do nothing;
  elsif not public.can_write_institution(v_inst) then
    raise exception 'not permitted for this institution';
  end if;

  -- ── batch ──
  select id into v_batch from public.batches
   where institution_id = v_inst
     and course = coalesce(p_payload->'batch'->>'course', 'MBBS')
     and name = p_payload->'batch'->>'name'
     and year_label is not distinct from (p_payload->'batch'->>'year_label');
  if v_batch is null then
    insert into public.batches (institution_id, name, course, year_label)
    values (v_inst, p_payload->'batch'->>'name',
            coalesce(p_payload->'batch'->>'course', 'MBBS'),
            p_payload->'batch'->>'year_label')
    returning id into v_batch;
  end if;

  -- ── exam ──
  select id into v_exam from public.exams
   where institution_id = v_inst and batch_id = v_batch
     and name = p_payload->'exam'->>'name';
  if v_exam is null then
    insert into public.exams (institution_id, batch_id, name, exam_kind,
                              held_label, result_label, sequence_no, source_file)
    values (v_inst, v_batch, p_payload->'exam'->>'name',
            coalesce(p_payload->'exam'->>'kind', 'internal'),
            p_payload->'exam'->>'held_label',
            p_payload->'exam'->>'result_label',
            nullif(p_payload->'exam'->>'sequence_no', '')::int,
            p_payload->'exam'->>'source_file')
    returning id into v_exam;
  end if;

  insert into public.mark_imports (institution_id, filename, file_digest, mapping, created_by)
  values (v_inst, p_payload->>'filename', p_payload->>'digest',
          coalesce(p_payload->'mapping', '{}'::jsonb), auth.uid())
  returning id into v_import;

  -- ── papers and subjects ──
  for p in select * from jsonb_array_elements(coalesce(p_payload->'papers', '[]'::jsonb)) loop
    select id into v_paper from public.exam_papers
     where exam_id = v_exam and name = p->>'name';
    if v_paper is null then
      insert into public.exam_papers (exam_id, name, max_marks, pass_marks, position)
      values (v_exam, p->>'name', (p->>'max_marks')::numeric,
              nullif(p->>'pass_marks', '')::numeric,
              coalesce((p->>'position')::int, 0))
      returning id into v_paper;
    end if;

    for sub in select * from jsonb_array_elements(coalesce(p->'subjects', '[]'::jsonb)) loop
      select id into v_subject from public.exam_subjects
       where paper_id = v_paper and name = sub->>'name';
      if v_subject is null then
        insert into public.exam_subjects (exam_id, paper_id, name, max_marks, position)
        values (v_exam, v_paper, sub->>'name', (sub->>'max_marks')::numeric,
                coalesce((sub->>'position')::int, 0));
      end if;
    end loop;
  end loop;

  -- ── students, guardians, marks ──
  for st in select * from jsonb_array_elements(coalesce(p_payload->'students', '[]'::jsonb)) loop
    select id into v_student from public.students
     where institution_id = v_inst and student_code = st->>'student_code';

    if v_student is null then
      insert into public.students (institution_id, batch_id, student_code,
                                   serial_no, full_name, category)
      values (v_inst, v_batch, st->>'student_code',
              nullif(st->>'serial_no', '')::int, st->>'full_name', st->>'category')
      returning id into v_student;
      v_created_students := v_created_students + 1;
    else
      v_matched_students := v_matched_students + 1;
      -- A name that differs from the stored one is reported, not applied. The
      -- same roll number under two names is either a typo or two students,
      -- and both need a person to look.
      if lower(btrim(coalesce(st->>'full_name', ''))) is distinct from
         lower(btrim((select full_name from public.students where id = v_student))) then
        v_warnings := v_warnings || jsonb_build_object(
          'kind', 'student_name_differs', 'student_code', st->>'student_code',
          'stored', (select full_name from public.students where id = v_student),
          'incoming', st->>'full_name');
      end if;
    end if;

    for g in select * from jsonb_array_elements(coalesce(st->'guardians', '[]'::jsonb)) loop
      if coalesce(g->>'relation', '') <> '' then
        insert into public.guardians (student_id, relation, full_name,
                                      phone_raw, phone_e164, phone_status)
        values (v_student, g->>'relation', g->>'full_name', g->>'phone_raw',
                nullif(g->>'phone_e164', ''),
                coalesce(g->>'phone_status', 'missing'))
        on conflict (student_id, relation) do update
          -- Fill a blank; never replace a number that is already on file.
          set full_name  = coalesce(public.guardians.full_name, excluded.full_name),
              phone_raw  = coalesce(public.guardians.phone_raw, excluded.phone_raw),
              phone_e164 = coalesce(public.guardians.phone_e164, excluded.phone_e164),
              phone_status = case when public.guardians.phone_raw is null
                                  then excluded.phone_status
                                  else public.guardians.phone_status end,
              updated_at = now();
        v_guardians_created := v_guardians_created + 1;

        if coalesce(g->>'phone_status', 'missing') <> 'valid' then
          v_guardians_flagged := v_guardians_flagged + 1;
        end if;

        if exists (select 1 from public.guardians
                    where student_id = v_student and relation = g->>'relation'
                      and phone_raw is not null
                      and nullif(g->>'phone_raw','') is not null
                      and phone_raw <> g->>'phone_raw') then
          v_warnings := v_warnings || jsonb_build_object(
            'kind', 'guardian_phone_differs', 'student_code', st->>'student_code',
            'relation', g->>'relation',
            'stored', (select phone_raw from public.guardians
                        where student_id = v_student and relation = g->>'relation'),
            'incoming', g->>'phone_raw');
        end if;
      end if;
    end loop;

    for mk in select * from jsonb_array_elements(coalesce(st->'marks', '[]'::jsonb)) loop
      select es.id, es.max_marks into v_subject, v_max
        from public.exam_subjects es
        join public.exam_papers ep on ep.id = es.paper_id
       where es.exam_id = v_exam and es.name = mk->>'subject'
         and ep.name = mk->>'paper';
      if v_subject is null then
        v_warnings := v_warnings || jsonb_build_object(
          'kind', 'unknown_subject', 'paper', mk->>'paper', 'subject', mk->>'subject');
        continue;
      end if;

      v_absent   := coalesce((mk->>'is_absent')::boolean, false);
      v_obtained := case when v_absent then null else nullif(mk->>'obtained', '')::numeric end;

      if not v_absent and v_obtained is null then
        v_warnings := v_warnings || jsonb_build_object(
          'kind', 'missing_mark', 'student_code', st->>'student_code',
          'subject', mk->>'subject');
        continue;
      end if;
      if v_obtained is not null and v_obtained > v_max then
        -- Out of range is refused outright. Clamping it would be the system
        -- inventing a mark, which is the one thing it must never do.
        v_conflicts := v_conflicts || jsonb_build_object(
          'kind', 'above_maximum', 'student_code', st->>'student_code',
          'subject', mk->>'subject', 'incoming', v_obtained, 'max_marks', v_max);
        continue;
      end if;

      select * into v_mark from public.marks
       where subject_id = v_subject and student_id = v_student;

      if v_mark.id is null then
        insert into public.marks (exam_id, subject_id, student_id, obtained,
                                  is_absent, import_id, created_by)
        values (v_exam, v_subject, v_student, v_obtained, v_absent, v_import, auth.uid());
        v_marks_inserted := v_marks_inserted + 1;

      elsif v_mark.obtained is not distinct from v_obtained
        and v_mark.is_absent = v_absent then
        null;                                  -- identical re-import: no-op

      elsif p_mode = 'amend' then
        insert into public.mark_revisions (mark_id, old_obtained, old_is_absent,
                                           new_obtained, new_is_absent, reason, changed_by)
        values (v_mark.id, v_mark.obtained, v_mark.is_absent,
                v_obtained, v_absent, p_reason, auth.uid());
        update public.marks
           set obtained = v_obtained, is_absent = v_absent,
               import_id = v_import, updated_at = now()
         where id = v_mark.id;
        v_marks_amended := v_marks_amended + 1;

      else
        v_conflicts := v_conflicts || jsonb_build_object(
          'kind', 'mark_conflict', 'student_code', st->>'student_code',
          'subject', mk->>'subject',
          'stored', case when v_mark.is_absent then 'AB' else v_mark.obtained::text end,
          'incoming', case when v_absent then 'AB' else v_obtained::text end);
      end if;
    end loop;

    for pr in select * from jsonb_array_elements(coalesce(st->'paper_results', '[]'::jsonb)) loop
      select id into v_paper from public.exam_papers
       where exam_id = v_exam and name = pr->>'paper';
      if v_paper is not null then
        insert into public.paper_results (paper_id, student_id, declared_total, declared_result)
        values (v_paper, v_student, nullif(pr->>'declared_total', '')::numeric,
                pr->>'declared_result')
        on conflict (paper_id, student_id) do nothing;
      end if;
    end loop;
  end loop;

  update public.mark_imports
     set summary = jsonb_build_object(
           'students_created', v_created_students,
           'students_matched', v_matched_students,
           'marks_inserted', v_marks_inserted,
           'marks_amended', v_marks_amended,
           'guardians_seen', v_guardians_created,
           'guardians_flagged', v_guardians_flagged,
           'conflicts', jsonb_array_length(v_conflicts),
           'warnings', jsonb_array_length(v_warnings)),
         status = case when jsonb_array_length(v_conflicts) > 0 then 'partial' else 'committed' end
   where id = v_import;

  return jsonb_build_object(
    'import_id', v_import, 'institution_id', v_inst, 'batch_id', v_batch,
    'exam_id', v_exam, 'mode', p_mode,
    'students_created', v_created_students, 'students_matched', v_matched_students,
    'marks_inserted', v_marks_inserted, 'marks_amended', v_marks_amended,
    'guardians_flagged', v_guardians_flagged,
    'conflicts', v_conflicts, 'warnings', v_warnings);
end;
$$;

revoke all on function public.import_exam_batch(jsonb, text, text) from public, anon;
grant execute on function public.import_exam_batch(jsonb, text, text) to authenticated;


-- ══ 9. Dashboard ═════════════════════════════════════════════════════════

create or replace function public.exam_dashboard(p_institution uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare v_out jsonb;
begin
  if not (public.is_staff() and public.in_institution(p_institution)) then
    raise exception 'not permitted';
  end if;

  select jsonb_build_object(
    'students', (select count(*) from public.students
                  where institution_id = p_institution and is_active),
    'batches',  (select count(*) from public.batches where institution_id = p_institution),
    'exams',    (select count(*) from public.exams where institution_id = p_institution),
    'avg_percentage', (select round(avg(s.avg_percentage), 2)
                         from public.v_exam_summary s
                        where s.institution_id = p_institution),
    'reports_generated', (select count(*) from public.report_cards rc
                            join public.students s on s.id = rc.student_id
                           where s.institution_id = p_institution),
    'messages', (select jsonb_object_agg(status, n) from (
                   select pm.status, count(*) n from public.parent_messages pm
                     join public.students s on s.id = pm.student_id
                    where s.institution_id = p_institution
                    group by pm.status) q),
    -- Data health is a count of the things that will bite later: a student
    -- with no reachable parent, a mark the sheet disagreed with, a subject
    -- nobody sat.
    'data_health', (select jsonb_build_object(
        'students_without_valid_parent',
          (select count(*) from public.students s
            where s.institution_id = p_institution and s.is_active
              and not exists (select 1 from public.guardians g
                               where g.student_id = s.id and g.phone_status = 'valid')),
        'declared_mismatches',
          (select count(*) from public.paper_results pr
             join public.exam_papers ep on ep.id = pr.paper_id
             join public.exams e on e.id = ep.exam_id
             left join public.v_paper_totals vt
                    on vt.paper_id = pr.paper_id and vt.student_id = pr.student_id
            where e.institution_id = p_institution
              and pr.declared_total is not null
              and abs(pr.declared_total - coalesce(vt.obtained, 0)) >= 0.005),
        'amended_marks',
          (select count(*) from public.mark_revisions mr
             join public.marks m on m.id = mr.mark_id
             join public.exams e on e.id = m.exam_id
            where e.institution_id = p_institution))),
    'exams_list', coalesce((select jsonb_agg(jsonb_build_object(
        'exam_id', s.exam_id, 'name', s.name, 'batch_id', s.batch_id,
        'sequence_no', s.sequence_no, 'students', s.students,
        'avg_percentage', s.avg_percentage)
        order by coalesce(s.sequence_no, 0) desc)
      from public.v_exam_summary s where s.institution_id = p_institution), '[]'::jsonb),

    -- The most recent exam, read three ways: who is at the top, who needs
    -- somebody's attention, and which way the batch as a whole moved. All of
    -- it is a sort over figures already computed; none of it is a judgement.
    'latest', (
      with latest as (
        select e.id, e.name
          from public.exams e
          join public.v_exam_summary s on s.exam_id = e.id
         where e.institution_id = p_institution and s.students > 0
         order by coalesce(e.sequence_no, 0) desc, e.created_at desc
         limit 1),
      ranked as (
        select st.id, st.full_name, st.student_code, r.percentage, r.rank, r.cohort_size,
               pg.delta_percentage
          from latest l
          join public.v_exam_ranks r on r.exam_id = l.id
          join public.students st on st.id = r.student_id
          left join public.v_student_progress pg
                 on pg.exam_id = l.id and pg.student_id = st.id)
      select jsonb_build_object(
        'exam_id', (select id from latest),
        'exam', (select name from latest),
        'top', coalesce((select jsonb_agg(jsonb_build_object(
            'student_id', id, 'name', full_name, 'code', student_code,
            'percentage', percentage, 'rank', rank) order by rank)
          from (select * from ranked order by rank limit 5) t), '[]'::jsonb),
        'attention', coalesce((select jsonb_agg(jsonb_build_object(
            'student_id', id, 'name', full_name, 'code', student_code,
            'percentage', percentage, 'rank', rank,
            'delta_percentage', delta_percentage) order by percentage)
          from (select * from ranked order by percentage limit 5) t), '[]'::jsonb),
        'improved', (select count(*) from ranked where delta_percentage >= 2),
        'declined', (select count(*) from ranked where delta_percentage <= -2),
        'steady',   (select count(*) from ranked
                      where delta_percentage > -2 and delta_percentage < 2),
        'first_exam', (select count(*) from ranked where delta_percentage is null))
    )
  ) into v_out;
  return v_out;
end;
$$;

revoke all on function public.exam_dashboard(uuid) from public, anon;
grant execute on function public.exam_dashboard(uuid) to authenticated;


-- ══ 10. Cohort drill-down ════════════════════════════════════════════════

create or replace function public.exam_cohort(p_exam uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare v_inst uuid; v_out jsonb;
begin
  select institution_id into v_inst from public.exams where id = p_exam;
  if v_inst is null or not (public.is_staff() and public.in_institution(v_inst)) then
    raise exception 'not permitted';
  end if;

  select jsonb_build_object(
    'exam', (select to_jsonb(e) from public.exams e where e.id = p_exam),
    'summary', (select to_jsonb(s) from public.v_exam_summary s where s.exam_id = p_exam),
    'subjects', coalesce((select jsonb_agg(to_jsonb(ss) order by ss.subject_name)
                            from public.v_subject_stats ss where ss.exam_id = p_exam), '[]'::jsonb),
    'students', coalesce((select jsonb_agg(jsonb_build_object(
        'student_id', s.id, 'name', s.full_name, 'code', s.student_code,
        'serial_no', s.serial_no,
        'obtained', r.obtained, 'max_marks', r.max_marks,
        'percentage', r.percentage, 'rank', r.rank, 'cohort_size', r.cohort_size,
        'grade', public.grade_for(v_inst, r.percentage)->>'grade',
        'delta_percentage', pg.delta_percentage,
        'direction', case
           when pg.delta_percentage is null then 'first-exam'
           when pg.delta_percentage >= 2  then 'improved'
           when pg.delta_percentage <= -2 then 'declined'
           else 'steady' end,
        'absent_subjects', t.absent_subjects,
        'has_valid_parent', exists (select 1 from public.guardians g
                                     where g.student_id = s.id and g.phone_status = 'valid'),
        'last_message', (select jsonb_build_object('status', pm.status, 'at', pm.created_at)
                           from public.parent_messages pm
                          where pm.student_id = s.id and pm.exam_id = p_exam
                          order by pm.created_at desc limit 1),
        'report_versions', (select count(*) from public.report_cards rc
                             where rc.student_id = s.id and rc.exam_id = p_exam))
        order by r.rank, s.full_name)
      from public.v_exam_ranks r
      join public.students s on s.id = r.student_id
      left join public.v_exam_totals t on t.exam_id = p_exam and t.student_id = s.id
      left join public.v_student_progress pg on pg.exam_id = p_exam and pg.student_id = s.id
     where r.exam_id = p_exam), '[]'::jsonb)
  ) into v_out;
  return v_out;
end;
$$;

revoke all on function public.exam_cohort(uuid) from public, anon;
grant execute on function public.exam_cohort(uuid) to authenticated;


-- ══ 11. Row Level Security ═══════════════════════════════════════════════
-- No anon policy exists anywhere below. The public site never reads these
-- tables; the console reads them with a counselor's JWT and gets back only
-- the institutions that counselor belongs to.

alter table public.institutions        enable row level security;
alter table public.institution_members enable row level security;
alter table public.batches             enable row level security;
alter table public.students            enable row level security;
alter table public.guardians           enable row level security;
alter table public.exams               enable row level security;
alter table public.exam_papers         enable row level security;
alter table public.exam_subjects       enable row level security;
alter table public.marks               enable row level security;
alter table public.mark_revisions      enable row level security;
alter table public.paper_results       enable row level security;
alter table public.mark_imports        enable row level security;
alter table public.grade_scales        enable row level security;
alter table public.report_templates    enable row level security;
alter table public.report_cards        enable row level security;
alter table public.parent_messages     enable row level security;
alter table public.message_events      enable row level security;
alter table public.ai_usage            enable row level security;
alter table public.ai_cache            enable row level security;

drop policy if exists inst_member_read on public.institutions;
create policy inst_member_read on public.institutions
  for select to authenticated using (public.is_staff() and public.in_institution(id));

drop policy if exists inst_admin_write on public.institutions;
create policy inst_admin_write on public.institutions
  for update to authenticated
  using (public.can_write_institution(id)) with check (public.can_write_institution(id));

-- Creating a college is how a coordinator gets started; the importer adds the
-- membership row in the same transaction.
drop policy if exists inst_staff_create on public.institutions;
create policy inst_staff_create on public.institutions
  for insert to authenticated with check (public.is_staff());

drop policy if exists members_read on public.institution_members;
create policy members_read on public.institution_members
  for select to authenticated
  using (staff_id = auth.uid() or public.can_write_institution(institution_id));

drop policy if exists members_admin_write on public.institution_members;
create policy members_admin_write on public.institution_members
  for all to authenticated
  using (public.institution_role(institution_id) = 'admin' or public.is_admin())
  with check (public.institution_role(institution_id) = 'admin' or public.is_admin());

-- Institution-scoped tables: read for any member, write for coordinators and
-- admins, delete for platform admins only.
do $$
declare t text;
begin
  foreach t in array array['batches', 'students', 'exams', 'mark_imports',
                           'grade_scales', 'report_templates']
  loop
    execute format('drop policy if exists %I on public.%I', t || '_member_read', t);
    execute format(
      'create policy %I on public.%I for select to authenticated
         using (public.is_staff() and public.in_institution(institution_id))',
      t || '_member_read', t);

    execute format('drop policy if exists %I on public.%I', t || '_member_insert', t);
    execute format(
      'create policy %I on public.%I for insert to authenticated
         with check (public.can_write_institution(institution_id))',
      t || '_member_insert', t);

    execute format('drop policy if exists %I on public.%I', t || '_member_update', t);
    execute format(
      'create policy %I on public.%I for update to authenticated
         using (public.can_write_institution(institution_id))
         with check (public.can_write_institution(institution_id))',
      t || '_member_update', t);

    execute format('drop policy if exists %I on public.%I', t || '_admin_delete', t);
    execute format(
      'create policy %I on public.%I for delete to authenticated
         using (public.is_admin() and public.in_institution(institution_id))',
      t || '_admin_delete', t);
  end loop;
end $$;

-- Child tables reach their institution through a join. Written out rather
-- than generated because each join is different, and a policy nobody can read
-- is a policy nobody can check.

drop policy if exists guardians_member on public.guardians;
create policy guardians_member on public.guardians
  for all to authenticated
  using (exists (select 1 from public.students s
                  where s.id = guardians.student_id and public.in_institution(s.institution_id)))
  with check (exists (select 1 from public.students s
                  where s.id = guardians.student_id and public.can_write_institution(s.institution_id)));

drop policy if exists papers_member on public.exam_papers;
create policy papers_member on public.exam_papers
  for all to authenticated
  using (exists (select 1 from public.exams e
                  where e.id = exam_papers.exam_id and public.in_institution(e.institution_id)))
  with check (exists (select 1 from public.exams e
                  where e.id = exam_papers.exam_id and public.can_write_institution(e.institution_id)));

drop policy if exists subjects_member on public.exam_subjects;
create policy subjects_member on public.exam_subjects
  for all to authenticated
  using (exists (select 1 from public.exams e
                  where e.id = exam_subjects.exam_id and public.in_institution(e.institution_id)))
  with check (exists (select 1 from public.exams e
                  where e.id = exam_subjects.exam_id and public.can_write_institution(e.institution_id)));

-- Marks: read and insert for coordinators, update through the amend path, and
-- no delete at all outside a platform admin. Academic history does not get
-- tidied away.
drop policy if exists marks_member_read on public.marks;
create policy marks_member_read on public.marks
  for select to authenticated
  using (exists (select 1 from public.exams e
                  where e.id = marks.exam_id and public.in_institution(e.institution_id)));

drop policy if exists marks_member_write on public.marks;
create policy marks_member_write on public.marks
  for insert to authenticated
  with check (exists (select 1 from public.exams e
                  where e.id = marks.exam_id and public.can_write_institution(e.institution_id)));

drop policy if exists marks_member_update on public.marks;
create policy marks_member_update on public.marks
  for update to authenticated
  using (exists (select 1 from public.exams e
                  where e.id = marks.exam_id and public.can_write_institution(e.institution_id)))
  with check (exists (select 1 from public.exams e
                  where e.id = marks.exam_id and public.can_write_institution(e.institution_id)));

drop policy if exists marks_admin_delete on public.marks;
create policy marks_admin_delete on public.marks
  for delete to authenticated using (public.is_admin());

drop policy if exists revisions_member_read on public.mark_revisions;
create policy revisions_member_read on public.mark_revisions
  for select to authenticated
  using (exists (select 1 from public.marks m join public.exams e on e.id = m.exam_id
                  where m.id = mark_revisions.mark_id and public.in_institution(e.institution_id)));

drop policy if exists results_member on public.paper_results;
create policy results_member on public.paper_results
  for all to authenticated
  using (exists (select 1 from public.exam_papers p join public.exams e on e.id = p.exam_id
                  where p.id = paper_results.paper_id and public.in_institution(e.institution_id)))
  with check (exists (select 1 from public.exam_papers p join public.exams e on e.id = p.exam_id
                  where p.id = paper_results.paper_id and public.can_write_institution(e.institution_id)));

drop policy if exists cards_member on public.report_cards;
create policy cards_member on public.report_cards
  for all to authenticated
  using (exists (select 1 from public.students s
                  where s.id = report_cards.student_id and public.in_institution(s.institution_id)))
  with check (exists (select 1 from public.students s
                  where s.id = report_cards.student_id and public.can_write_institution(s.institution_id)));

drop policy if exists messages_member on public.parent_messages;
create policy messages_member on public.parent_messages
  for select to authenticated
  using (exists (select 1 from public.students s
                  where s.id = parent_messages.student_id and public.in_institution(s.institution_id)));

drop policy if exists messages_member_insert on public.parent_messages;
create policy messages_member_insert on public.parent_messages
  for insert to authenticated
  with check (exists (select 1 from public.students s
                  where s.id = parent_messages.student_id and public.can_write_institution(s.institution_id)));

-- A sent message is a record of what was sent. It is not editable from the
-- console; only the delivery-status path (service role, from the webhook)
-- moves it on.
drop policy if exists events_member_read on public.message_events;
create policy events_member_read on public.message_events
  for select to authenticated
  using (exists (select 1 from public.parent_messages pm
                   join public.students s on s.id = pm.student_id
                  where pm.id = message_events.message_id
                    and public.in_institution(s.institution_id)));

drop policy if exists ai_usage_read on public.ai_usage;
create policy ai_usage_read on public.ai_usage
  for select to authenticated
  using (public.is_staff() and (institution_id is null or public.in_institution(institution_id)));

-- ai_cache deliberately has NO policy. It holds model output about named
-- students keyed by a digest, and nothing but the gateway (service role,
-- which bypasses RLS) has any reason to read it.

grant select on public.v_paper_totals, public.v_exam_totals, public.v_exam_ranks,
                public.v_subject_stats, public.v_exam_summary, public.v_student_progress
  to authenticated;


-- The gateway counts cache reuse so "caching is on" is a number somebody can
-- check rather than a claim in a commit message. It runs as the service role,
-- which is the only thing that touches ai_cache at all.
create or replace function public.bump_ai_cache(p_key text)
returns void
language sql
volatile
security definer
set search_path = public, pg_temp
as $$
  update public.ai_cache set hits = hits + 1 where key = p_key;
$$;

revoke all on function public.bump_ai_cache(text) from public, anon, authenticated;


-- ══ 12. Storage ══════════════════════════════════════════════════════════
-- Three private buckets. The report-card flyer is private because it carries a
-- named student's marks; WhatsApp receives it through a short-lived signed URL
-- minted server-side, not a public object.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('branding',      'branding',      false, 2097152,
   array['image/jpeg','image/png','image/webp','image/svg+xml']),
  ('student-photos','student-photos',false, 2097152,
   array['image/jpeg','image/png','image/webp']),
  ('report-cards',  'report-cards',  false, 8388608,
   array['image/png','image/jpeg','application/pdf'])
on conflict (id) do update
  set public = false,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

do $$
declare b text;
begin
  foreach b in array array['branding', 'student-photos', 'report-cards'] loop
    execute format('drop policy if exists %I on storage.objects', b || '_staff_read');
    execute format('create policy %I on storage.objects for select to authenticated
                      using (bucket_id = %L and public.is_staff())', b || '_staff_read', b);
    execute format('drop policy if exists %I on storage.objects', b || '_staff_write');
    execute format('create policy %I on storage.objects for insert to authenticated
                      with check (bucket_id = %L and public.is_staff())', b || '_staff_write', b);
    execute format('drop policy if exists %I on storage.objects', b || '_staff_update');
    execute format('create policy %I on storage.objects for update to authenticated
                      using (bucket_id = %L and public.is_staff())', b || '_staff_update', b);
    execute format('drop policy if exists %I on storage.objects', b || '_admin_delete');
    execute format('create policy %I on storage.objects for delete to authenticated
                      using (bucket_id = %L and public.is_admin())', b || '_admin_delete', b);
  end loop;
end $$;


-- ══ 13. Stock report-card templates ══════════════════════════════════════
-- Global rows (institution_id null) that any college can start from and then
-- fork by saving under its own id. The spec is read by the renderer; there is
-- no template that exists only as code.

create unique index if not exists report_templates_global_key
  on public.report_templates (key) where institution_id is null;

drop policy if exists templates_global_read on public.report_templates;
create policy templates_global_read on public.report_templates
  for select to authenticated
  using (institution_id is null and public.is_staff());

insert into public.report_templates (institution_id, key, name, is_default, spec)
values
 (null, 'ivory', 'Ivory — formal', true, '{
   "palette": {"ink": "#1d2430", "muted": "#5b6676", "line": "#dfe4ec",
               "paper": "#ffffff", "band": "#f4f6fa", "accent": "#0f5c4a",
               "good": "#0f7a4f", "warn": "#9a5b00", "bad": "#a32222"},
   "header": {"style": "centered", "showLogo": true, "showAddress": true, "rule": "double"},
   "blocks": {"photo": true, "identity": true, "subjectTable": true, "paperSummary": true,
              "totals": true, "chart": true, "strengths": true, "attention": true,
              "suggestions": true, "remarks": true, "signatures": true, "footer": true},
   "typography": {"display": "Fraunces, Georgia, serif", "body": "Geist, Inter, system-ui, sans-serif"},
   "footerNote": "Computer-generated statement of internal assessment marks."
 }'::jsonb),
 (null, 'slate', 'Slate — modern', false, '{
   "palette": {"ink": "#101828", "muted": "#667085", "line": "#e4e7ec",
               "paper": "#ffffff", "band": "#f2f5f9", "accent": "#1f5fbf",
               "good": "#12734a", "warn": "#8a5400", "bad": "#9f1d1d"},
   "header": {"style": "split", "showLogo": true, "showAddress": true, "rule": "solid"},
   "blocks": {"photo": true, "identity": true, "subjectTable": true, "paperSummary": true,
              "totals": true, "chart": true, "strengths": true, "attention": true,
              "suggestions": true, "remarks": true, "signatures": true, "footer": true},
   "typography": {"display": "Geist, Inter, system-ui, sans-serif", "body": "Geist, Inter, system-ui, sans-serif"},
   "footerNote": "Computer-generated statement of internal assessment marks."
 }'::jsonb),
 (null, 'emerald', 'Emerald — compact', false, '{
   "palette": {"ink": "#14261f", "muted": "#55665e", "line": "#dbe7e1",
               "paper": "#ffffff", "band": "#eef5f1", "accent": "#0b6b4f",
               "good": "#0b6b4f", "warn": "#8a5400", "bad": "#9f1d1d"},
   "header": {"style": "banner", "showLogo": true, "showAddress": false, "rule": "none"},
   "blocks": {"photo": false, "identity": true, "subjectTable": true, "paperSummary": true,
              "totals": true, "chart": false, "strengths": true, "attention": true,
              "suggestions": true, "remarks": false, "signatures": true, "footer": true},
   "typography": {"display": "Fraunces, Georgia, serif", "body": "Geist, Inter, system-ui, sans-serif"},
   "footerNote": "Computer-generated statement of internal assessment marks."
 }'::jsonb)
on conflict do nothing;

commit;
