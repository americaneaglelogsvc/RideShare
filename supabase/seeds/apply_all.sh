#!/bin/sh
set -e

echo "=== Step 1: Drop existing DB ==="
psql -U urway -d postgres -c "DROP DATABASE IF EXISTS urway_dev;"

echo "=== Step 2: Create fresh DB ==="
psql -U urway -d postgres -c "CREATE DATABASE urway_dev;"

echo "=== Step 3: Bootstrap Supabase roles ==="
psql -U urway -d urway_dev -f /tmp/bootstrap.sql

echo "=== Step 4: Apply all migrations ==="
for f in /tmp/migrations/*.sql; do
  echo "  Applying: $(basename $f)"
  psql -U urway -d urway_dev -f "$f" -q 2>&1 | grep -i error || true
done

echo "=== Step 5: Count tables ==="
psql -U urway -d urway_dev -c "SELECT count(*) AS table_count FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE';"

echo "=== ALL DONE ==="
