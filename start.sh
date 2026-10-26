#!/bin/bash

PG_BIN=/nix/store/bgwr5i8jf8jpg75rr53rz3fqv5k8yrwp-postgresql-16.10/bin
PGDATA=/home/runner/pgdata
PG_SOCKET_DIR=/tmp/postgresql
LOCAL_DB_URL="postgresql://postgres:password@127.0.0.1:5432/heliumdb?sslmode=disable"

# ─── Start local PostgreSQL if helium is unavailable ─────────────────────────
echo "🔍 Checking database connectivity..."
PG_OK=false
if $PG_BIN/pg_isready -h helium -p 5432 -t 3 -q 2>/dev/null; then
  echo "✅ Replit PostgreSQL (helium) is available"
  PG_OK=true
else
  echo "⚠️  Replit PostgreSQL (helium) is unavailable — starting local PostgreSQL..."

  # Kill any stale postgres processes from previous runs
  pkill -f "postgres -D $PGDATA" 2>/dev/null || true
  sleep 1

  # Clean up stale socket/lock files
  rm -f $PG_SOCKET_DIR/.s.PGSQL.5432 $PG_SOCKET_DIR/.s.PGSQL.5432.lock $PGDATA/postmaster.pid 2>/dev/null

  # Initialize data directory if needed
  if [ ! -f "$PGDATA/PG_VERSION" ]; then
    echo "   Initializing PostgreSQL data directory..."
    mkdir -p $PGDATA
    $PG_BIN/initdb -D $PGDATA -U postgres --auth=trust --encoding=UTF8 -q
  fi

  # Create socket directory
  mkdir -p $PG_SOCKET_DIR && chmod 777 $PG_SOCKET_DIR

  # Write minimal postgresql.conf
  cat > $PGDATA/postgresql.conf << EOF
listen_addresses = '127.0.0.1'
port = 5432
unix_socket_directories = '$PG_SOCKET_DIR'
max_connections = 50
shared_buffers = 32MB
log_min_messages = warning
EOF

  # Write pg_hba.conf — trust local connections
  cat > $PGDATA/pg_hba.conf << EOF
local   all   all                 trust
host    all   all   127.0.0.1/32  trust
host    all   all   ::1/128       trust
EOF

  # Start postgres in background (stays alive while workflow runs)
  $PG_BIN/postgres -D $PGDATA >> /tmp/postgres.log 2>&1 &
  PG_PID=$!
  echo "   Postgres starting (PID $PG_PID)..."

  # Wait until it accepts connections (up to 15 seconds)
  for i in $(seq 1 15); do
    sleep 1
    if $PG_BIN/pg_isready -h 127.0.0.1 -p 5432 -U postgres -q 2>/dev/null; then
      echo "   PostgreSQL ready after ${i}s"
      PG_OK=true
      break
    fi
  done

  if [ "$PG_OK" = "true" ]; then
    # Set password and create database
    $PG_BIN/psql -h 127.0.0.1 -p 5432 -U postgres -c "ALTER USER postgres WITH PASSWORD 'password';" -q 2>/dev/null || true
    $PG_BIN/psql -h 127.0.0.1 -p 5432 -U postgres -c "CREATE DATABASE heliumdb;" -q 2>/dev/null || true
    echo "   Database 'heliumdb' ready on localhost:5432"
    export DATABASE_URL="$LOCAL_DB_URL"
    echo "   DATABASE_URL overridden to local instance"
  else
    echo "❌ Local PostgreSQL failed to start — app may be degraded"
    cat /tmp/postgres.log | tail -10
  fi
fi

# ─── Prisma ───────────────────────────────────────────────────────────────────
echo ""
echo "🔧 Generating Prisma client..."
npx prisma generate 2>&1 | tail -3

echo "🗄️  Syncing database schema..."
npx prisma db push --accept-data-loss 2>&1 | tail -5

# ─── Seed test accounts if missing ───────────────────────────────────────────
echo "🌱 Seeding test accounts..."
npx tsx scripts/seed.ts 2>&1 | tail -5

# ─── Seed demo jobs if none exist ─────────────────────────────────────────────
echo "📋 Seeding demo jobs..."
npx tsx scripts/seed-jobs.ts 2>&1 | tail -3

# ─── Seed site/plan/credit configs ────────────────────────────────────────────
echo "⚙️  Seeding configs..."
npx tsx scripts/seed-configs.ts 2>&1 | tail -5

# ─── Seed notification templates ──────────────────────────────────────────────
echo "🔔 Seeding notification templates..."
npx tsx scripts/seed-notifications.ts 2>&1 | tail -3

# ─── Seed LLM AI config (idempotent — skips if already seeded) ───────────────
echo "🤖 Seeding LLM AI configuration..."
npx tsx scripts/seed-ai-config.ts 2>&1 | tail -3
npx tsx scripts/seed-ai-extra.ts 2>&1 | tail -6

# ─── Migrate SiteConfig to bilingual format ───────────────────────────────────
echo "🌐 Migrating SiteConfig to bilingual format..."
npx tsx scripts/migrate-siteconfig-locale.ts 2>&1 | tail -3

# ─── NextAuth URL ─────────────────────────────────────────────────────────────
if [ -n "$REPLIT_DEV_DOMAIN" ]; then
  export NEXTAUTH_URL="https://${REPLIT_DEV_DOMAIN}"
  export AUTH_URL="https://${REPLIT_DEV_DOMAIN}"
  echo ""
  echo "🌐 Auth URL: https://${REPLIT_DEV_DOMAIN}"
elif [ -n "$REPLIT_DOMAINS" ]; then
  FIRST_DOMAIN="${REPLIT_DOMAINS%%,*}"
  export NEXTAUTH_URL="https://${FIRST_DOMAIN}"
  export AUTH_URL="https://${FIRST_DOMAIN}"
  echo ""
  echo "🌐 Auth URL: https://${FIRST_DOMAIN}"
fi

echo ""
echo "📁 Ensuring storage directories exist..."
mkdir -p storage/pdfs storage/docx storage/images

echo ""
echo "🐍 Starting PDF Processor microservice on port 8001..."
export PDF_PROCESSOR_SERVICE_URL="http://localhost:8001"
PYTHON_BIN="/home/runner/workspace/.pythonlibs/bin/python"
GUNICORN_BIN="/home/runner/workspace/.pythonlibs/bin/gunicorn"

# Kill any stale instance from a previous run
pkill -f "gunicorn.*pdf-processor" 2>/dev/null || true
pkill -f "python.*app.py" 2>/dev/null || true
sleep 0.5

# Launch gunicorn if available, otherwise fall back to plain Flask
if [ -x "$GUNICORN_BIN" ]; then
  cd services/pdf-processor
  "$GUNICORN_BIN" app:app \
    --bind 0.0.0.0:8001 \
    --workers 2 \
    --timeout 120 \
    --log-level warning \
    --daemon \
    --pid /tmp/pdf-processor.pid \
    --access-logfile /tmp/pdf-processor-access.log \
    --error-logfile /tmp/pdf-processor-error.log
  cd - > /dev/null
else
  cd services/pdf-processor
  "$PYTHON_BIN" app.py > /tmp/pdf-processor-error.log 2>&1 &
  echo $! > /tmp/pdf-processor.pid
  cd - > /dev/null
fi

# Wait up to 12s for the service to become healthy
for i in $(seq 1 12); do
  sleep 1
  if curl -sf http://localhost:8001/health > /dev/null 2>&1; then
    echo "   ✅ PDF Processor ready after ${i}s"
    break
  fi
  if [ "$i" = "12" ]; then
    echo "   ⚠️  PDF Processor did not start in time — last error:"
    tail -5 /tmp/pdf-processor-error.log 2>/dev/null || echo "   (no error log)"
  fi
done

echo ""
echo "🚀 Starting Next.js dev server on port 5000..."
exec next dev -p 5000
