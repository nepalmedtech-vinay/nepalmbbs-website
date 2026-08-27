-- Stand in for what Supabase provides: the auth schema, auth.uid(), the anon
-- and authenticated roles, and pgcrypto. Without these the migrations cannot
-- be tested outside Supabase at all.
create extension if not exists pgcrypto;
create schema if not exists auth;
create table if not exists auth.users (id uuid primary key default gen_random_uuid(), email text);
create or replace function auth.uid() returns uuid language sql stable
  as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
do $$ begin create role anon nologin; exception when duplicate_object then null; end $$;
do $$ begin create role authenticated nologin; exception when duplicate_object then null; end $$;
do $$ begin create role service_role nologin; exception when duplicate_object then null; end $$;
grant usage on schema public to anon, authenticated, service_role;

-- The tables 0001 expects to already exist on the live project.
create table if not exists public.leads (
  id bigserial primary key, student_name text, contact_number text,
  neet_score int, city text, stage text, notes text,
  created_at timestamptz default now());
create table if not exists public.admin_settings (
  key text primary key, value text, updated_at timestamptz default now());
create table if not exists public.site_colleges (id bigserial primary key, name text, slug text);
create table if not exists public.site_faqs (id bigserial primary key, question text, answer text);
create table if not exists public.site_videos (id bigserial primary key, url text, title text);
create table if not exists public.site_testimonials (id bigserial primary key, name text, quote text);
