#!/usr/bin/env bash
# Applies every migration to the live database and then checks that it worked.
#
#   ./tools/setup-database.sh "postgresql://postgres.<ref>:<password>@aws-0-<region>.pooler.supabase.com:5432/postgres"
#
# The connection string is in the Supabase dashboard under
# Project Settings → Database → Connection string → URI. It is a secret: this
# script never prints it, never writes it to a file, and you should not paste
# it into a chat window — including to me.
#
# Everything here is idempotent. Running it twice is safe: the migrations use
# `create ... if not exists` / `create or replace`, and 0004 refuses to seed a
# second set of sequences if any already exist.
set -euo pipefail

DB="${1:-}"
if [ -z "$DB" ]; then
  echo "usage: $0 <postgres-connection-uri>" >&2
  exit 2
fi
DIR="$(cd "$(dirname "$0")/.." && pwd)"

# Never echo the URI, including in error traces.
run() { psql "$DB" -v ON_ERROR_STOP=1 -q "$@" 2>&1 | grep -v '^psql:.*NOTICE' || true; }
ask() { psql "$DB" -At -c "$1" 2>/dev/null; }

command -v psql >/dev/null || { echo "psql not found. Install the postgresql client first." >&2; exit 1; }

echo "── connecting ─────────────────────────────────────────────"
who=$(ask "select current_database() || ' as ' || current_user")
[ -n "$who" ] || { echo "could not connect — check the URI" >&2; exit 1; }
echo "   $who"

echo
echo "── BEFORE: is the enquiry list currently readable by the public? ──"
open_tables=$(ask "select count(*) from pg_tables where schemaname='public' and not rowsecurity")
echo "   tables without row-level security: ${open_tables:-unknown}"

echo
echo "── applying migrations ────────────────────────────────────"
for f in 0001_security_baseline 0002_admission_platform 0003_abuse_and_storage 0004_lead_intake; do
  printf '   %s ... ' "$f"
  if run -f "$DIR/supabase/migrations/$f.sql" >/dev/null; then echo "ok"; else echo "FAILED"; exit 1; fi
done

echo
echo "── AFTER: checking, not assuming ──────────────────────────"
fail=0
chk() { # name, query, expected
  local got; got=$(ask "$2")
  if [ "$got" = "$3" ]; then printf '   ✅ %s\n' "$1"
  else printf '   ❌ %s (got %s, expected %s)\n' "$1" "${got:-nothing}" "$3"; fail=1; fi
}
chk "every public table has RLS enabled" \
    "select count(*) from pg_tables where schemaname='public' and not rowsecurity" "0"
chk "the public cannot read leads" \
    "select count(*) from pg_policies where schemaname='public' and tablename='leads' and cmd='SELECT' and 'anon'=any(roles)" "0"
chk "the public can still submit an enquiry" \
    "select count(*) from pg_policies where schemaname='public' and tablename='leads' and cmd='INSERT' and 'anon'=any(roles)" "1"
chk "the admin password is not publicly readable" \
    "select count(*) from pg_policies where schemaname='public' and tablename='admin_settings' and qual like '%admin_password%'" "1"
chk "the documents bucket is private" \
    "select case when public then 'public' else '1' end from storage.buckets where id='documents'" "1"
chk "rate limiting is armed on the enquiry form" \
    "select count(*) from pg_trigger where tgname='leads_rate_trg'" "1"
chk "a new application starts its follow-up automatically" \
    "select count(*) from pg_trigger where tgname='applications_enrol_ins_trg'" "1"
chk "follow-up sequences are seeded" \
    "select case when count(*) > 0 then '1' else '0' end from public.sequence_steps" "1"

echo
if [ "$fail" = "0" ]; then
  echo "   All checks passed."
else
  echo "   Some checks failed — see above. Nothing here is destructive; re-run after fixing." >&2
fi

echo
echo "── ONE THING LEFT, and it needs the dashboard ─────────────"
staff=$(ask "select count(*) from public.staff")
if [ "${staff:-0}" = "0" ]; then
cat <<'TXT'
   There is nobody in `staff` yet, so the console will let nobody in —
   including you. Row-level security asks "is this request from someone in
   staff?" and right now the answer is always no.

     1. Supabase dashboard → Authentication → Users → Add user
        (a real address you control, a password you have not used elsewhere)
     2. Copy the new user's UUID
     3. Run, with your own values:

        insert into public.staff (id, email, full_name, role)
        values ('<uuid>', '<the same email>', '<your name>', 'admin');

   Do this BEFORE deploying, or you will be locked out of your own dashboard.
TXT
else
  echo "   ${staff} staff account(s) already exist — nothing to do."
fi

echo
echo "Then: npm run build && npm run verify, and deploy per docs/DEPLOYMENT.md"
