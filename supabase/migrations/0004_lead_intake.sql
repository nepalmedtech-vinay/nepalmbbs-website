-- NepalMBBS.in — 0004_lead_intake.sql
--
-- Two gaps that made the platform a set of tables rather than a pipeline.
--
-- First: enquiries dead-ended. The public form writes to `leads`, the whole
-- admission platform lives on `applications`, and nothing joined the two. A
-- counselor could see an enquiry and could work an application, but turning one
-- into the other meant retyping the name and phone number and losing the link
-- back to where it came from.
--
-- Second: 0002 gave sequences a working enrolment trigger and no sequence to
-- enrol into, so the automation was correct and inert. A follow-up rhythm that
-- exists only as an empty table follows nothing up.

begin;

-- ══ 1. Where a lead went ═════════════════════════════════════════════════
-- On `leads` rather than only the soft `applications.lead_id`, because the
-- question the console asks is "which enquiries still need working?", and that
-- is a question about leads.

alter table public.leads
  add column if not exists converted_application_id uuid
    references public.applications(id) on delete set null;

alter table public.leads
  add column if not exists converted_at timestamptz;

create index if not exists leads_unconverted_idx
  on public.leads (created_at desc)
  where converted_application_id is null;

comment on column public.leads.converted_application_id is
  'Set by convert_lead_to_application(). Null means the enquiry is still raw.';


-- ══ 2. Conversion ════════════════════════════════════════════════════════
-- SECURITY DEFINER because it writes to two tables and must do both or
-- neither, but it checks is_staff() first: definer rights are for crossing the
-- policy boundary once, not for handing the boundary to anon.
--
-- Idempotent on purpose. Two counselors clicking the same enquiry a second
-- apart must not produce two applications for one student, and a retry after a
-- dropped connection must be safe.

create or replace function public.convert_lead_to_application(p_lead_id bigint)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_lead public.leads%rowtype;
  v_app  uuid;
begin
  if auth.uid() is null or not public.is_staff() then
    raise exception 'not permitted' using errcode = '42501';
  end if;

  select * into v_lead from public.leads where id = p_lead_id for update;
  if not found then
    raise exception 'no such enquiry' using errcode = 'P0002';
  end if;

  -- Already converted: hand back the same application rather than making
  -- another one. The caller cannot tell the difference and should not need to.
  if v_lead.converted_application_id is not null then
    return v_lead.converted_application_id;
  end if;

  insert into public.applications
    (student_name, contact_number, city, neet_score, lead_id, assigned_to, stage)
  values
    (coalesce(nullif(trim(v_lead.student_name), ''), 'Unnamed enquiry'),
     v_lead.contact_number,
     v_lead.city,
     v_lead.neet_score,
     v_lead.id,
     auth.uid(),                 -- whoever converts it owns it until reassigned
     'enquiry')
  returning id into v_app;

  update public.leads
     set converted_application_id = v_app,
         converted_at = now()
   where id = p_lead_id;

  -- Carry the form's free-text across as the first note. It holds the category,
  -- state and attempt the student typed, and it is the only place they exist.
  if coalesce(trim(v_lead.notes), '') <> '' then
    insert into public.notes (application_id, author, body)
    values (v_app, auth.uid(), 'From the enquiry form: ' || v_lead.notes);
  end if;

  insert into public.application_events (application_id, kind, body, actor, is_visible)
  values (v_app, 'system', 'Created from enquiry #' || v_lead.id, auth.uid(), false);

  return v_app;
end $$;

revoke all on function public.convert_lead_to_application(bigint) from public, anon;
grant execute on function public.convert_lead_to_application(bigint) to authenticated;


-- ══ 3. A sequence to actually enrol into ═════════════════════════════════
-- 0002's trigger materialises each step into the task queue at its offset. So
-- these are not messages that get sent — nothing here can send a WhatsApp —
-- they are tasks that appear on a counselor's list at the right hour. That is
-- the honest shape of the automation: it decides when someone should be
-- contacted and about what; a person still does the contacting.
--
-- Seeded only if the table is empty, so re-running this file never duplicates
-- a rhythm the counselors have since tuned.

do $$
declare v_seq bigint;
begin
  if exists (select 1 from public.sequences) then
    raise notice 'sequences already present — leaving them alone';
    return;
  end if;

  insert into public.sequences (name, trigger_stage, is_active)
  values ('New enquiry follow-up', 'enquiry', true)
  returning id into v_seq;

  insert into public.sequence_steps (sequence_id, position, delay_hours, channel, title, template)
  values
    (v_seq, 1,   1, 'call',     'First call — new enquiry',
     'Introduce yourself, confirm NEET score and year, and ask what they already know about MEC.'),
    (v_seq, 2,  24, 'whatsapp', 'Send the eligibility summary',
     'Share the NMC percentile rule and what it means for their score. No promises about seats.'),
    (v_seq, 3,  72, 'call',     'Second call — questions and fees',
     'Answer fee questions with the MEC ceiling only. Never quote a number we cannot source.'),
    (v_seq, 4, 168, 'whatsapp', 'One-week check-in',
     'Ask whether they are still considering Nepal this cycle, and mark them deferred if not.');

  insert into public.sequences (name, trigger_stage, is_active)
  values ('Document chase', 'eligible', true)
  returning id into v_seq;

  insert into public.sequence_steps (sequence_id, position, delay_hours, channel, title, template)
  values
    (v_seq, 1,   2, 'whatsapp', 'Send the document checklist',
     'Send the portal link and the list of what is still outstanding.'),
    (v_seq, 2,  48, 'call',     'Chase outstanding documents',
     'Go through the checklist on a call — most gaps are a photo that did not send.'),
    (v_seq, 3, 120, 'call',     'Escalate if documents are still missing',
     'If anything is still missing at five days, flag it to the senior counselor.');
end $$;


-- ══ 4. Enrol on arrival, not only on movement ════════════════════════════
-- 0002 put the enrolment trigger on UPDATE, so a sequence started only when an
-- application MOVED between stages. An application created at 'enquiry' — which
-- is every application, since the scrub trigger forces that stage for public
-- submissions — never entered one. The follow-up rhythm began on the second
-- stage change and missed the first week entirely, which is the week it exists
-- for.
--
-- enrol_sequences() already handles this: on INSERT old.stage is null, so the
-- "did the stage change" guard passes. It only ever needed the second trigger.

drop trigger if exists applications_enrol_ins_trg on public.applications;
create trigger applications_enrol_ins_trg
  after insert on public.applications
  for each row execute function public.enrol_sequences();

commit;

-- ─────────────────────────────────────────────────────────────────────────
-- AFTER RUNNING — check the pipeline joins up end to end:
--
--   select public.convert_lead_to_application(
--            (select id from public.leads order by created_at desc limit 1));
--
-- Expect a uuid, a new row in `applications`, and — because the application
-- lands on stage 'enquiry' — four rows in `tasks` due over the next week.
-- Calling it a second time with the same lead must return the same uuid and
-- add nothing.
-- ─────────────────────────────────────────────────────────────────────────
