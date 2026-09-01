#!/usr/bin/env bash
# Applies the migrations to a throwaway Postgres cluster and runs the assertions
# in supabase/tests. Needs Postgres server binaries locally (no Docker required):
#
#   ./scripts/test-db.sh
#
# If you have the Supabase CLI and Docker instead, `supabase start && supabase db reset`
# is the closer-to-production equivalent.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PGBIN="${PGBIN:-$(ls -d /usr/lib/postgresql/*/bin 2>/dev/null | sort -V | tail -1)}"
WORKDIR="${WORKDIR:-$(mktemp -d)}"
PGDATA="$WORKDIR/data"
SOCKET="$WORKDIR/socket"

if [ ! -x "$PGBIN/initdb" ]; then
  echo "Postgres server binaries not found. Set PGBIN to the directory holding initdb." >&2
  exit 1
fi

cleanup() {
  "$PGBIN/pg_ctl" -D "$PGDATA" -s -m immediate stop >/dev/null 2>&1 || true
  rm -rf "$WORKDIR"
}
trap cleanup EXIT

mkdir -p "$PGDATA" "$SOCKET"

# Postgres refuses to run as root, so hand the cluster to the postgres user when we are.
AS_POSTGRES=()
if [ "$(id -u)" = "0" ]; then
  chown -R postgres "$WORKDIR"
  AS_POSTGRES=(setpriv --reuid=postgres --regid=postgres --clear-groups)
fi

echo "==> initialising a throwaway cluster in $PGDATA"
"${AS_POSTGRES[@]}" "$PGBIN/initdb" -D "$PGDATA" -U postgres --auth=trust >/dev/null

echo "==> starting postgres"
"${AS_POSTGRES[@]}" "$PGBIN/pg_ctl" -D "$PGDATA" -o "-k $SOCKET -h ''" -w -l "$WORKDIR/postgres.log" start >/dev/null

export PGHOST="$SOCKET" PGUSER=postgres PGDATABASE=postgres

psql -v ON_ERROR_STOP=1 -q -c 'create database carrom;' >/dev/null
export PGDATABASE=carrom

echo "==> installing local stand-ins for Supabase roles and the auth schema"
psql -v ON_ERROR_STOP=1 -q -f "$ROOT/supabase/tests/00_supabase_stubs.sql"

for migration in "$ROOT"/supabase/migrations/*.sql; do
  echo "==> applying $(basename "$migration")"
  psql -v ON_ERROR_STOP=1 -q -f "$migration"
done

echo "==> running assertions"
# From the repo root, so the \i paths inside the test files resolve.
cd "$ROOT"
psql -v ON_ERROR_STOP=1 -q -f supabase/tests/01_assertions.sql
psql -v ON_ERROR_STOP=1 -q -f supabase/tests/02_scripts.sql
