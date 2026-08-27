#!/usr/bin/env bash
# Run the migrations against a throwaway Postgres and assert the security holds.
#
# The migrations cannot be tested by reading them. RLS is exactly the kind of
# thing that looks right and is not: a missing policy fails open on a table you
# forgot, and "authenticated" is not the same as "on the team". So this stands
# up a real database, applies both migrations, then behaves like each role in
# turn and checks what it can actually see.
#
#   ./supabase/test/run.sh
#
# Requires postgresql (any 14+). Nothing here touches a Supabase project.
set -euo pipefail
DIR="$(cd "$(dirname "$0")" && pwd)"

# Postgres refuses to initdb as root. Re-exec as an unprivileged user rather
# than making the caller remember to.
if [ "$(id -u)" = "0" ]; then
  RUNAS=${RUNAS:-postgres}
  cp -r "$DIR/.." /tmp/_sbtest 2>/dev/null || true
  chown -R "$RUNAS" /tmp/_sbtest
  exec su "$RUNAS" -c "bash /tmp/_sbtest/test/run.sh"
fi
PGBIN=$(ls -d /usr/lib/postgresql/*/bin | tail -1)
DATA=$(mktemp -d)
# Pick a port nothing is on. A hard-coded one collides with any Postgres the
# developer already has running, and the failure ("could not start server")
# points at the wrong thing.
PORT=${PGPORT:-$(python3 -c "import socket;s=socket.socket();s.bind(('',0));print(s.getsockname()[1]);s.close()")}
trap '"$PGBIN/pg_ctl" -D "$DATA" stop -s -m immediate >/dev/null 2>&1 || true; rm -rf "$DATA"' EXIT

"$PGBIN/initdb" -D "$DATA" -A trust >/dev/null
"$PGBIN/pg_ctl" -D "$DATA" -l "$DATA/log" -o "-k /tmp -p $PORT" start >/dev/null
sleep 2
psql() { command psql -h /tmp -p "$PORT" -d postgres -v ON_ERROR_STOP=1 "$@"; }

psql -q -f "$DIR/00_supabase_harness.sql" >/dev/null 2>&1
psql -q -f "$DIR/../migrations/0001_security_baseline.sql" >/dev/null 2>&1
psql -q -f "$DIR/../migrations/0002_admission_platform.sql" >/dev/null 2>&1
psql -q -f "$DIR/../migrations/0003_abuse_and_storage.sql" >/dev/null 2>&1
psql -q -f "$DIR/../migrations/0004_lead_intake.sql" >/dev/null 2>&1
psql -q -f "$DIR/../migrations/0005_revoke_internal_functions.sql" >/dev/null 2>&1
echo "migrations applied"

open=$(psql -At -c "select count(*) from pg_tables where schemaname='public' and not rowsecurity")
[ "$open" = "0" ] && echo "✅ every public table has RLS enabled" || { echo "❌ $open table(s) without RLS"; exit 1; }

psql -q -f "$DIR/01_assert_security.sql"
psql -q -f "$DIR/02_assert_abuse.sql"
psql -q -f "$DIR/03_assert_intake.sql"
