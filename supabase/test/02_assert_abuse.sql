-- Rate limiting, constraints and privilege scrubbing. Each block asserts, so a
-- regression here fails the run rather than printing something reassuring.
\set ON_ERROR_STOP on

do $$
declare i int; landed int := 0; refused int := 0;
begin
  set local role anon;
  -- One sub-block per insert, because each real submit is its own
  -- transaction. Wrapping the whole loop rolls every row back on the first
  -- refusal and the count then measures nothing.
  for i in 1..9 loop
    begin
      insert into public.leads (student_name, contact_number)
      values ('probe ' || i, '9990000000');
      landed := landed + 1;
    exception when others then refused := refused + 1;
    end;
  end loop;
  reset role;
  if refused = 0 then raise exception 'OPEN FAUCET: 9 submissions accepted with no limit'; end if;
  if landed = 0 then raise exception 'TOO STRICT: the form refused every submission'; end if;
  raise notice '✅ rate limit: % landed, % refused — the cap holds and real submits still work', landed, refused;
end $$;

do $$
declare ok boolean;
begin
  set local role anon;
  ok := false;
  begin insert into public.leads (student_name, contact_number) values ('x','not-a-phone');
  exception when others then ok := true; end;
  if not ok then raise exception 'a phone number of "not-a-phone" was accepted'; end if;

  ok := false;
  begin insert into public.leads (student_name, contact_number)
        values (repeat('a', 500), '9990000000');
  exception when others then ok := true; end;
  if not ok then raise exception 'a 500-character name was accepted'; end if;
  reset role;
  raise notice '✅ constraints: malformed phone and oversized name both refused';
end $$;

do $$
declare r record;
begin
  set local role anon;
  -- A hostile post: claim a finished stage, a chosen token, an assigned owner.
  -- Deliberately no RETURNING: that is a read, and anon has no SELECT policy
  -- on applications — asking for it back fails, which is itself correct.
  insert into public.applications (student_name, contact_number, stage, access_token, score)
  values ('Attacker','9998887777','admitted','token-i-picked',999);
  reset role;
  select * into r from public.applications where student_name = 'Attacker';

  if r.stage <> 'enquiry'  then raise exception 'ESCALATION: a public insert set stage=%', r.stage; end if;
  if r.access_token = 'token-i-picked' then raise exception 'ESCALATION: a public insert chose its own portal token'; end if;
  if r.score <> 0 then raise exception 'ESCALATION: a public insert set its own score'; end if;
  raise notice '✅ scrub: a public insert cannot set stage, token, owner or score';
end $$;

do $$
declare n int;
begin
  select count(*) into n from storage.buckets where id='documents' and public;
  if n <> 0 then raise exception 'the documents bucket is PUBLIC'; end if;
  raise notice '✅ storage: the documents bucket is private';
end $$;
