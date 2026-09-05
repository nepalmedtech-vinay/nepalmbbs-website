-- 0006 — exam intelligence.
--
-- Synthetic students throughout. The spreadsheet this feature was built from
-- holds 41 real people's marks and their parents' mobile numbers; none of it
-- belongs in a repository. The shape here is the same as that file's: three
-- papers, one of them with subjects whose maxima differ, absences recorded as
-- absences, and a second exam so the progress maths has something to compare.

\set ON_ERROR_STOP on
set client_min_messages = notice;

-- ── actors ───────────────────────────────────────────────────────────────
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000c1', 'coord@example.test'),
  ('00000000-0000-0000-0000-0000000000c2', 'other@example.test'),
  ('00000000-0000-0000-0000-0000000000c3', 'outsider@example.test')
on conflict do nothing;

insert into public.staff (id, email, full_name, role) values
  ('00000000-0000-0000-0000-0000000000c1', 'coord@example.test', 'Coordinator', 'admin'),
  ('00000000-0000-0000-0000-0000000000c2', 'other@example.test', 'Other college', 'counselor'),
  ('00000000-0000-0000-0000-0000000000c3', 'outsider@example.test', 'Outsider', 'counselor')
on conflict (id) do nothing;

create or replace function pg_temp.act(p uuid) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claim.sub', p::text, false);
  execute 'set local role authenticated';
end $$;

-- ── 1. import ────────────────────────────────────────────────────────────
do $$
declare v jsonb; v_exam uuid; v_inst uuid;
begin
  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000c1', false);

  select public.import_exam_batch($j$
  {
    "filename": "first-internal.xlsx",
    "institution": {"name": "Test Medical College", "address": "Bharatpur"},
    "batch": {"name": "2025", "course": "MBBS", "year_label": "MBBS 1st Year"},
    "exam": {"name": "1st Internal Assessment", "sequence_no": 1, "held_label": "2083/01/10"},
    "papers": [
      {"name": "Basic Sciences", "max_marks": 60, "pass_marks": 30, "position": 0,
       "subjects": [{"name": "ANA", "max_marks": 20, "position": 0},
                    {"name": "PHYSIO", "max_marks": 20, "position": 1},
                    {"name": "BIO", "max_marks": 20, "position": 2}]},
      {"name": "Community", "max_marks": 40, "pass_marks": 20, "position": 1,
       "subjects": [{"name": "EPIDEMIOLOGY", "max_marks": 25, "position": 0},
                    {"name": "DEMOGRAPHY", "max_marks": 15, "position": 1}]}
    ],
    "students": [
      {"student_code": "T001", "serial_no": 1, "full_name": "Asha Rao", "category": "FOREIGNER",
       "guardians": [{"relation": "father", "full_name": "Ravi Rao",
                      "phone_raw": "+919812345678", "phone_e164": "+919812345678", "phone_status": "valid"},
                     {"relation": "mother", "full_name": "Sita Rao",
                      "phone_raw": "9812345670", "phone_e164": "+919812345670", "phone_status": "suspect"}],
       "marks": [{"paper":"Basic Sciences","subject":"ANA","obtained":10},
                 {"paper":"Basic Sciences","subject":"PHYSIO","obtained":12},
                 {"paper":"Basic Sciences","subject":"BIO","obtained":8},
                 {"paper":"Community","subject":"EPIDEMIOLOGY","obtained":15},
                 {"paper":"Community","subject":"DEMOGRAPHY","obtained":9}],
       "paper_results": [{"paper":"Basic Sciences","declared_total":30,"declared_result":"Pass"}]},
      {"student_code": "T002", "serial_no": 2, "full_name": "Bikash Thapa",
       "guardians": [{"relation": "father", "full_name": "Hari Thapa",
                      "phone_raw": "12345", "phone_e164": null, "phone_status": "suspect"}],
       "marks": [{"paper":"Basic Sciences","subject":"ANA","obtained":4},
                 {"paper":"Basic Sciences","subject":"PHYSIO","obtained":6},
                 {"paper":"Basic Sciences","subject":"BIO","is_absent":true},
                 {"paper":"Community","subject":"EPIDEMIOLOGY","obtained":10},
                 {"paper":"Community","subject":"DEMOGRAPHY","obtained":5}]},
      {"student_code": "T003", "serial_no": 3, "full_name": "Chandni Iyer",
       "guardians": [{"relation": "mother", "full_name": "Latha Iyer",
                      "phone_raw": "+919800000003", "phone_e164": "+919800000003", "phone_status": "valid"}],
       "marks": [{"paper":"Basic Sciences","subject":"ANA","obtained":18},
                 {"paper":"Basic Sciences","subject":"PHYSIO","obtained":17},
                 {"paper":"Basic Sciences","subject":"BIO","obtained":16},
                 {"paper":"Community","subject":"EPIDEMIOLOGY","obtained":22},
                 {"paper":"Community","subject":"DEMOGRAPHY","obtained":12}]}
    ]
  }$j$::jsonb) into v;

  if (v->>'students_created')::int <> 3 then
    raise exception 'expected 3 students, got %', v->>'students_created';
  end if;
  if (v->>'marks_inserted')::int <> 15 then
    raise exception 'expected 15 marks, got %', v->>'marks_inserted';
  end if;
  if jsonb_array_length(v->'conflicts') <> 0 then
    raise exception 'unexpected conflicts: %', v->'conflicts';
  end if;
  raise notice '✅ import: 3 students, 15 marks, 1 absence, 0 conflicts';
end $$;

-- ── 2. a mark above its maximum is refused, not clamped ──────────────────
do $$
declare v jsonb; v_stored numeric;
begin
  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000c1', false);
  select public.import_exam_batch($j$
  {
    "institution": {"name": "Test Medical College"},
    "batch": {"name": "2025", "course": "MBBS", "year_label": "MBBS 1st Year"},
    "exam": {"name": "1st Internal Assessment"},
    "papers": [{"name": "Basic Sciences", "max_marks": 60, "pass_marks": 30,
                "subjects": [{"name": "ANA", "max_marks": 20}]}],
    "students": [{"student_code": "T001", "full_name": "Asha Rao",
                  "marks": [{"paper":"Basic Sciences","subject":"ANA","obtained":25}]}]
  }$j$::jsonb) into v;

  if not (v->'conflicts' @> '[{"kind":"above_maximum"}]'::jsonb) then
    raise exception 'a 25/20 was not refused: %', v;
  end if;
  select m.obtained into v_stored
    from public.marks m join public.exam_subjects s on s.id = m.subject_id
    join public.students st on st.id = m.student_id
   where s.name = 'ANA' and st.student_code = 'T001';
  if v_stored <> 10 then raise exception 'stored mark was altered to %', v_stored; end if;
  raise notice '✅ range: 25 out of 20 refused, the stored 10 untouched';
end $$;

-- ── 3. a different mark for the same cell conflicts; amend files a revision ─
do $$
declare v jsonb; v_stored numeric; v_revisions int;
begin
  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000c1', false);
  select public.import_exam_batch($j$
  {
    "institution": {"name": "Test Medical College"},
    "batch": {"name": "2025", "course": "MBBS", "year_label": "MBBS 1st Year"},
    "exam": {"name": "1st Internal Assessment"},
    "papers": [{"name": "Basic Sciences", "max_marks": 60, "pass_marks": 30,
                "subjects": [{"name": "ANA", "max_marks": 20}]}],
    "students": [{"student_code": "T001", "full_name": "Asha Rao",
                  "marks": [{"paper":"Basic Sciences","subject":"ANA","obtained":14}]}]
  }$j$::jsonb) into v;

  if not (v->'conflicts' @> '[{"kind":"mark_conflict"}]'::jsonb) then
    raise exception 'a changed mark did not conflict: %', v;
  end if;
  select m.obtained into v_stored from public.marks m
    join public.exam_subjects s on s.id = m.subject_id
    join public.students st on st.id = m.student_id
   where s.name = 'ANA' and st.student_code = 'T001';
  if v_stored <> 10 then raise exception 'strict mode overwrote a mark (now %)', v_stored; end if;

  select public.import_exam_batch($j$
  {
    "institution": {"name": "Test Medical College"},
    "batch": {"name": "2025", "course": "MBBS", "year_label": "MBBS 1st Year"},
    "exam": {"name": "1st Internal Assessment"},
    "papers": [{"name": "Basic Sciences", "max_marks": 60, "pass_marks": 30,
                "subjects": [{"name": "ANA", "max_marks": 20}]}],
    "students": [{"student_code": "T001", "full_name": "Asha Rao",
                  "marks": [{"paper":"Basic Sciences","subject":"ANA","obtained":14}]}]
  }$j$::jsonb, 'amend', 'Re-checked against the answer script on 2083/02/01') into v;

  select m.obtained into v_stored from public.marks m
    join public.exam_subjects s on s.id = m.subject_id
    join public.students st on st.id = m.student_id
   where s.name = 'ANA' and st.student_code = 'T001';
  select count(*) into v_revisions from public.mark_revisions;
  if v_stored <> 14 or v_revisions <> 1 then
    raise exception 'amend wrote % with % revision row(s)', v_stored, v_revisions;
  end if;
  raise notice '✅ amend: strict refuses, amend writes 14 and files the old 10 with a reason';
end $$;

-- an amendment without a reason is not an amendment
do $$
begin
  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000c1', false);
  begin
    perform public.import_exam_batch('{"institution":{"name":"Test Medical College"},
      "batch":{"name":"2025","course":"MBBS","year_label":"MBBS 1st Year"},
      "exam":{"name":"1st Internal Assessment"},"papers":[],"students":[]}'::jsonb, 'amend', '  ');
    raise exception 'a reasonless amend was accepted';
  exception when others then
    if sqlerrm not like '%needs a reason%' then raise; end if;
  end;
  raise notice '✅ amend: refused without a reason';
end $$;

-- ── 4. second exam, then the arithmetic ──────────────────────────────────
do $$
declare v jsonb;
begin
  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000c1', false);
  select public.import_exam_batch($j$
  {
    "institution": {"name": "Test Medical College"},
    "batch": {"name": "2025", "course": "MBBS", "year_label": "MBBS 1st Year"},
    "exam": {"name": "2nd Internal Assessment", "sequence_no": 2},
    "papers": [
      {"name": "Basic Sciences", "max_marks": 60, "pass_marks": 30, "position": 0,
       "subjects": [{"name": "ANA", "max_marks": 20, "position": 0},
                    {"name": "PHYSIO", "max_marks": 20, "position": 1},
                    {"name": "BIO", "max_marks": 20, "position": 2}]},
      {"name": "Community", "max_marks": 40, "pass_marks": 20, "position": 1,
       "subjects": [{"name": "EPIDEMIOLOGY", "max_marks": 25, "position": 0},
                    {"name": "DEMOGRAPHY", "max_marks": 15, "position": 1}]}
    ],
    "students": [
      {"student_code": "T001", "full_name": "Asha Rao",
       "marks": [{"paper":"Basic Sciences","subject":"ANA","obtained":16},
                 {"paper":"Basic Sciences","subject":"PHYSIO","obtained":15},
                 {"paper":"Basic Sciences","subject":"BIO","obtained":13},
                 {"paper":"Community","subject":"EPIDEMIOLOGY","obtained":18},
                 {"paper":"Community","subject":"DEMOGRAPHY","obtained":6}]},
      {"student_code": "T002", "full_name": "Bikash Thapa",
       "marks": [{"paper":"Basic Sciences","subject":"ANA","obtained":3},
                 {"paper":"Basic Sciences","subject":"PHYSIO","obtained":5},
                 {"paper":"Basic Sciences","subject":"BIO","obtained":4},
                 {"paper":"Community","subject":"EPIDEMIOLOGY","obtained":8},
                 {"paper":"Community","subject":"DEMOGRAPHY","obtained":4}]},
      {"student_code": "T003", "full_name": "Chandni Iyer",
       "marks": [{"paper":"Basic Sciences","subject":"ANA","obtained":19},
                 {"paper":"Basic Sciences","subject":"PHYSIO","obtained":18},
                 {"paper":"Basic Sciences","subject":"BIO","obtained":17},
                 {"paper":"Community","subject":"EPIDEMIOLOGY","obtained":23},
                 {"paper":"Community","subject":"DEMOGRAPHY","obtained":13}]}
    ]
  }$j$::jsonb) into v;
  if (v->>'students_created')::int <> 0 or (v->>'students_matched')::int <> 3 then
    raise exception 'the second exam created students instead of matching them: %', v;
  end if;
  raise notice '✅ second exam: 3 students matched, none duplicated';
end $$;

do $$
declare r jsonb; v_student uuid; v_exam uuid;
begin
  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000c1', false);
  select id into v_student from public.students where student_code = 'T001';
  select id into v_exam    from public.exams where name = '2nd Internal Assessment';
  select public.exam_report(v_student, v_exam) into r;

  -- 16+15+13+18+6 = 68 of 100
  if (r->'totals'->>'obtained')::numeric <> 68 then
    raise exception 'total came out %, expected 68', r->'totals'->>'obtained';
  end if;
  if (r->'totals'->>'percentage')::numeric <> 68 then
    raise exception 'percentage came out %', r->'totals'->>'percentage';
  end if;
  if (r->'totals'->>'rank')::int <> 2 or (r->'totals'->>'cohort_size')::int <> 3 then
    raise exception 'rank came out % of %', r->'totals'->>'rank', r->'totals'->>'cohort_size';
  end if;
  -- The first internal stands at 58/100 for this student — 54 as imported,
  -- plus the +4 amendment filed in step 3 — so this is +10.00 and 'improved'.
  if (r->'progress'->>'delta_percentage')::numeric <> 10
     or (r->'progress'->>'prev_percentage')::numeric <> 58
     or r->'progress'->>'direction' <> 'improved' then
    raise exception 'progress came out %', r->'progress';
  end if;
  if r->'grade'->>'grade' <> 'B+' then
    raise exception 'grade for 68%% came out %', r->'grade';
  end if;
  if jsonb_array_length(r->'papers') <> 2 then
    raise exception 'expected 2 papers, got %', jsonb_array_length(r->'papers');
  end if;
  -- DEMOGRAPHY 6/15 = 40%, above the 40 threshold, so not in attention;
  -- nothing else is under 40, so attention is empty and strengths are not.
  if jsonb_array_length(r->'strengths') = 0 then
    raise exception 'no strengths found in %', r->'strengths';
  end if;
  if jsonb_array_length(r->'history') <> 2 then
    raise exception 'history should hold both exams, got %', r->'history';
  end if;
  raise notice '✅ exam_report: 68/100, rank 2 of 3, +10.00 vs the amended 1st internal, grade B+';
end $$;

-- an absence is an absence, not a zero
do $$
declare r jsonb; v_student uuid; v_exam uuid;
begin
  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000c1', false);
  select id into v_student from public.students where student_code = 'T002';
  select id into v_exam    from public.exams where name = '1st Internal Assessment';
  select public.exam_report(v_student, v_exam) into r;
  if r->'absences' <> '["BIO"]'::jsonb then
    raise exception 'absence not reported: %', r->'absences';
  end if;
  if (r->'totals'->>'obtained')::numeric <> 25 then
    raise exception 'absent subject changed the total: %', r->'totals';
  end if;
  raise notice '✅ absence: BIO reported absent, counted as no marks rather than zero-scored';
end $$;

-- ── 5. tenancy ───────────────────────────────────────────────────────────
do $$
declare n int; v_student uuid; v_exam uuid;
begin
  select id into v_student from public.students where student_code = 'T001';
  select id into v_exam    from public.exams where name = '2nd Internal Assessment';

  perform pg_temp.act('00000000-0000-0000-0000-0000000000c3');
  select count(*) into n from public.students;
  if n <> 0 then raise exception 'an outsider saw % student(s)', n; end if;
  select count(*) into n from public.marks;
  if n <> 0 then raise exception 'an outsider saw % mark(s)', n; end if;
  select count(*) into n from public.guardians;
  if n <> 0 then raise exception 'an outsider saw % parent number(s)', n; end if;
  begin
    perform public.exam_report(v_student, v_exam);
    raise exception 'an outsider got a report card';
  exception when others then
    if sqlerrm not like '%not permitted%' then raise; end if;
  end;
  reset role;
  raise notice '✅ tenancy: a signed-in counselor of another college sees no students, marks or numbers';
end $$;

-- exam_report() runs with definer rights over two independent ids. A member of
-- one college pairing one of their own exams with somebody else's student must
-- not get that student's name or their parents' numbers back.
do $$
declare v_exam uuid; v_other uuid; v_inst2 uuid;
begin
  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000c1', false);
  select id into v_exam from public.exams where name = '2nd Internal Assessment';

  -- A second college, with a student of its own, belonging to someone else.
  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000c3', false);
  perform public.import_exam_batch($j$
  {
    "institution": {"name": "Other Medical College"},
    "batch": {"name": "2025", "course": "MBBS", "year_label": "MBBS 1st Year"},
    "exam": {"name": "1st Internal Assessment", "sequence_no": 1},
    "papers": [{"name": "Basic Sciences", "max_marks": 20, "pass_marks": 10,
                "subjects": [{"name": "ANA", "max_marks": 20}]}],
    "students": [{"student_code": "O001", "full_name": "Someone Else",
                  "guardians": [{"relation": "mother", "full_name": "Their Mother",
                                 "phone_raw": "+919800000099", "phone_e164": "+919800000099",
                                 "phone_status": "valid"}],
                  "marks": [{"paper":"Basic Sciences","subject":"ANA","obtained":11}]}]
  }$j$::jsonb);
  select id into v_other from public.students where student_code = 'O001';

  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000c1', false);
  begin
    perform public.exam_report(v_other, v_exam);
    raise exception 'exam_report returned another college''s student';
  exception when others then
    if sqlerrm not like '%not permitted%' then raise; end if;
  end;
  raise notice '✅ tenancy: exam_report refuses a student who is not in the exam''s own college';
end $$;

do $$
declare n int;
begin
  set local role anon;
  select count(*) into n from public.students;
  if n <> 0 then raise exception 'anon saw % student(s)', n; end if;
  select count(*) into n from public.guardians;
  if n <> 0 then raise exception 'anon saw % parent number(s)', n; end if;
  reset role;
  raise notice '✅ tenancy: anon — the key that ships in the page — sees nothing at all';
end $$;

-- ── 6. cohort drill-down and dashboard ───────────────────────────────────
do $$
declare c jsonb; d jsonb; v_exam uuid; v_inst uuid;
begin
  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000c1', false);
  select id into v_exam from public.exams where name = '2nd Internal Assessment';
  select institution_id into v_inst from public.exams where id = v_exam;
  select public.exam_cohort(v_exam) into c;
  if jsonb_array_length(c->'students') <> 3 then
    raise exception 'cohort listed % students', jsonb_array_length(c->'students');
  end if;
  if (c->'students'->0->>'rank')::int <> 1 then
    raise exception 'cohort is not ranked: %', c->'students'->0;
  end if;
  if jsonb_array_length(c->'subjects') <> 5 then
    raise exception 'expected 5 subject stats, got %', jsonb_array_length(c->'subjects');
  end if;

  select public.exam_dashboard(v_inst) into d;
  if (d->>'students')::int <> 3 or (d->>'exams')::int <> 2 then
    raise exception 'dashboard counts: %', d;
  end if;
  -- T002's only parent number is unusable, so exactly one student is unreachable
  if (d->'data_health'->>'students_without_valid_parent')::int <> 1 then
    raise exception 'data health missed the unreachable parent: %', d->'data_health';
  end if;
  if (d->'data_health'->>'amended_marks')::int <> 1 then
    raise exception 'data health missed the amendment: %', d->'data_health';
  end if;
  -- Top and bottom of the latest exam, and which way each student moved.
  if (d->'latest'->>'exam') <> '2nd Internal Assessment' then
    raise exception 'latest exam came out %', d->'latest'->>'exam';
  end if;
  if (d->'latest'->'top'->0->>'name') <> 'Chandni Iyer'
     or (d->'latest'->'attention'->0->>'name') <> 'Bikash Thapa' then
    raise exception 'top/attention came out %', d->'latest';
  end if;
  -- T001 +10 and T003 +5 improved; T002 went 25 -> 24, which is steady.
  if (d->'latest'->>'improved')::int <> 2 or (d->'latest'->>'steady')::int <> 1
     or (d->'latest'->>'declined')::int <> 0 then
    raise exception 'movement counts came out %', d->'latest';
  end if;
  raise notice '✅ dashboard: 3 students, 2 exams, 1 unreachable parent, 1 amended mark, top/attention and movement all counted';
end $$;

-- ── 7. history is not deletable by a counselor ───────────────────────────
do $$
declare n int;
begin
  perform pg_temp.act('00000000-0000-0000-0000-0000000000c1');
  -- The coordinator here is a platform admin, so drop to a plain counselor by
  -- adding one to this institution and acting as them.
  reset role;
  insert into public.institution_members (institution_id, staff_id, role)
  select id, '00000000-0000-0000-0000-0000000000c2', 'coordinator'
    from public.institutions where name = 'Test Medical College'
  on conflict do nothing;

  perform pg_temp.act('00000000-0000-0000-0000-0000000000c2');
  delete from public.marks;
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'a coordinator deleted % mark(s)', n; end if;
  delete from public.students;
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'a coordinator deleted % student(s)', n; end if;
  reset role;
  raise notice '✅ history: a coordinator cannot delete marks or students — deletes are admin-only';
end $$;
