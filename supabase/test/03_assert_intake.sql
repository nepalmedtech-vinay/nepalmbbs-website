-- 0004: does an enquiry actually become a worked application, and does the
-- follow-up rhythm start on its own?
--
-- The interesting cases are not the happy path. They are: anon must not be able
-- to call the conversion at all, a second click must not produce a second
-- student, and the sequence must fire on ARRIVAL rather than only on the next
-- stage change — which is the bug this migration exists to fix.
\set ON_ERROR_STOP on

-- ── anon cannot convert ──────────────────────────────────────────────────
do $$
declare refused boolean := false; v_lead bigint;
begin
  -- Entered as staff, both because a counselor logging a phone enquiry is a
  -- real path and because 02 has already spent the anon rate-limit window on
  -- this connection. Staff are exempt, which is the behaviour 0003 intends.
  set local role authenticated;
  perform set_config('request.jwt.claim.sub', '11111111-1111-1111-1111-111111111111', true);
  insert into public.leads (student_name, contact_number, city, neet_score, notes)
  values ('Intake Probe', '9998887770', 'Lucknow', 455, 'Cat:GEN|State:UP')
  returning id into v_lead;
  reset role;

  set local role anon;
  begin
    perform public.convert_lead_to_application(v_lead);
  exception when others then refused := true;
  end;
  reset role;

  if not refused then
    raise exception 'ANON CONVERTED A LEAD: definer rights were handed to the public';
  end if;
  raise notice '✅ conversion: anon is refused — definer rights stop at is_staff()';
end $$;

-- ── staff converts, and the pipeline starts by itself ────────────────────
do $$
declare
  v_lead bigint; v_app uuid; v_again uuid;
  v_tasks int; v_notes int; v_stage application_stage; v_name text;
begin
  select id into v_lead from public.leads where student_name = 'Intake Probe';

  set local role authenticated;
  perform set_config('request.jwt.claim.sub', '11111111-1111-1111-1111-111111111111', true);

  v_app := public.convert_lead_to_application(v_lead);
  if v_app is null then raise exception 'conversion returned nothing'; end if;

  -- Idempotence: the same enquiry twice is one student, not two.
  v_again := public.convert_lead_to_application(v_lead);
  if v_again <> v_app then
    raise exception 'DOUBLE CONVERSION: one enquiry produced two applications (% and %)', v_app, v_again;
  end if;

  select student_name, stage into v_name, v_stage
    from public.applications where id = v_app;
  select count(*) into v_notes from public.notes where application_id = v_app;
  select count(*) into v_tasks from public.tasks where application_id = v_app;
  reset role;

  if v_name <> 'Intake Probe' then raise exception 'the student did not come across: %', v_name; end if;
  if v_stage <> 'enquiry'      then raise exception 'wrong opening stage: %', v_stage; end if;
  if v_notes < 1 then
    raise exception 'the form free-text was dropped — it exists nowhere else';
  end if;

  -- The whole point of 0004's second trigger. Without it this is 0.
  if v_tasks = 0 then
    raise exception 'INERT AUTOMATION: the application arrived at enquiry and no sequence enrolled it';
  end if;

  raise notice '✅ intake: one enquiry → one application, % task(s) scheduled, notes carried across', v_tasks;
end $$;

-- ── a converted enquiry drops out of the "still to work" list ────────────
do $$
declare v_open int;
begin
  select count(*) into v_open
    from public.leads
   where student_name = 'Intake Probe' and converted_application_id is null;
  if v_open <> 0 then
    raise exception 'a converted enquiry is still showing as unworked';
  end if;
  raise notice '✅ intake: a converted enquiry leaves the unworked queue';
end $$;

-- ── moving stage stops the old rhythm and starts the new one ─────────────
do $$
declare v_app uuid; v_stopped int; v_open_runs int;
begin
  select converted_application_id into v_app
    from public.leads where student_name = 'Intake Probe';

  set local role authenticated;
  perform set_config('request.jwt.claim.sub', '11111111-1111-1111-1111-111111111111', true);
  update public.applications set stage = 'eligible' where id = v_app;
  reset role;

  select count(*) into v_stopped
    from public.sequence_runs where application_id = v_app and stopped_at is not null;
  select count(*) into v_open_runs
    from public.sequence_runs where application_id = v_app and stopped_at is null;

  if v_stopped = 0 then
    raise exception 'the enquiry chase kept running after the student moved on';
  end if;
  if v_open_runs = 0 then
    raise exception 'nothing enrolled for the new stage';
  end if;
  raise notice '✅ sequences: % run(s) stopped on the move, % started for the new stage', v_stopped, v_open_runs;
end $$;
