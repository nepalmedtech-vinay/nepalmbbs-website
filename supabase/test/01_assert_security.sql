-- Behave as each role and assert what it can see. A failure here is a real
-- exposure, not a style problem, so every check raises rather than printing.
\set ON_ERROR_STOP on
insert into public.leads (student_name, contact_number) values ('Seed','9990001111');
insert into public.admin_settings (key,value) values ('admin_password','hash'),('phone','+91700');
insert into auth.users (id,email) values ('11111111-1111-1111-1111-111111111111','s@x.com');
insert into public.staff (id,email,role) values ('11111111-1111-1111-1111-111111111111','s@x.com','admin');
insert into public.applications (student_name, contact_number) values ('Seed','9990001111');
grant select, insert, update, delete on all tables in schema public to anon, authenticated;
grant usage, select on all sequences in schema public to anon, authenticated;

do $$
declare n int; ok boolean;
begin
  set local role anon;

  select count(*) into n from public.leads;
  if n <> 0 then raise exception 'EXPOSED: anon can read % lead rows', n; end if;

  select count(*) into n from public.admin_settings where key='admin_password';
  if n <> 0 then raise exception 'EXPOSED: anon can read the admin password'; end if;

  select count(*) into n from public.admin_settings;
  if n = 0 then raise exception 'BROKEN: anon cannot read display settings, the site will not render'; end if;

  select count(*) into n from public.applications;
  if n <> 0 then raise exception 'EXPOSED: anon can read % applications', n; end if;

  select count(*) into n from public.notes;
  if n <> 0 then raise exception 'EXPOSED: anon can read internal notes'; end if;

  begin
    insert into public.leads (student_name, contact_number) values ('Form','9876543210');
  exception when others then raise exception 'BROKEN: the public lead form cannot submit'; end;

  ok := false;
  begin insert into public.site_faqs (question,answer) values ('x','x');
  exception when others then ok := true; end;
  if not ok then raise exception 'EXPOSED: anon can write site content'; end if;

  reset role;
  raise notice '✅ anon: can submit, cannot read leads/applications/notes/password, cannot write content';
end $$;

do $$
declare n int;
begin
  set local role authenticated;
  perform set_config('request.jwt.claim.sub','22222222-2222-2222-2222-222222222222', true);
  select count(*) into n from public.leads;
  if n <> 0 then raise exception 'EXPOSED: a signed-up stranger can read % leads', n; end if;
  reset role;
  raise notice '✅ authenticated non-staff: sees nothing — logged in is not the same as on the team';
end $$;

do $$
declare n int;
begin
  set local role authenticated;
  perform set_config('request.jwt.claim.sub','11111111-1111-1111-1111-111111111111', true);
  select count(*) into n from public.leads;
  if n = 0 then raise exception 'BROKEN: staff cannot read leads'; end if;
  select count(*) into n from public.applications;
  if n = 0 then raise exception 'BROKEN: staff cannot read applications'; end if;
  reset role;
  raise notice '✅ staff: full operational access';
end $$;

do $$
declare tok text; n int;
begin
  select access_token into tok from public.applications limit 1;
  set local role anon;
  select count(*) into n from public.portal_application(tok);
  if n <> 1 then raise exception 'BROKEN: the portal does not resolve a valid token'; end if;
  select count(*) into n from public.portal_application('wrong-token');
  if n <> 0 then raise exception 'EXPOSED: the portal resolves an invalid token'; end if;
  reset role;
  raise notice '✅ portal: right token resolves, wrong token returns nothing';
end $$;
