#!/bin/bash
set -e

PROJECT_ROOT="$PWD"
export PATH="$PROJECT_ROOT/.pythonlibs/bin:$PATH"

if [ -n "$REPLIT_DOMAINS" ]; then
  FIRST_DOMAIN="${REPLIT_DOMAINS%%,*}"
  export NEXTAUTH_URL="https://${FIRST_DOMAIN}"
  export AUTH_URL="https://${FIRST_DOMAIN}"
elif [ -n "$REPLIT_DEV_DOMAIN" ]; then
  export NEXTAUTH_URL="https://${REPLIT_DEV_DOMAIN}"
  export AUTH_URL="https://${REPLIT_DEV_DOMAIN}"
fi

echo "NEXTAUTH_URL=${NEXTAUTH_URL}"

# ── Start PDF Processor microservice ─────────────────────────────────────────
# Run in a subshell with || true so any failure here CANNOT crash this script.
export PDF_PROCESSOR_SERVICE_URL="http://localhost:8001"

(
  GUNICORN_BIN="$PROJECT_ROOT/.pythonlibs/bin/gunicorn"

  pkill -f "gunicorn.*pdf-processor" 2>/dev/null || true

  if [ ! -x "$GUNICORN_BIN" ]; then
    echo "WARNING: gunicorn not found at $GUNICORN_BIN — PDF delivery will return 503"
    exit 0
  fi

  cd "$PROJECT_ROOT/services/pdf-processor"
  "$GUNICORN_BIN" app:app \
    --bind 0.0.0.0:8001 \
    --workers 2 \
    --timeout 120 \
    --log-level warning \
    --daemon \
    --pid /tmp/pdf-processor.pid \
    --access-logfile /tmp/pdf-processor-access.log \
    --error-logfile /tmp/pdf-processor-error.log

  echo "PDF Processor microservice started."
) || echo "WARNING: PDF Processor failed to start — PDF delivery will return 503"

echo "Ensuring storage directories exist..."
mkdir -p storage/pdfs storage/docx storage/images

echo "Starting Next.js production server on port 5000..."
exec "$PROJECT_ROOT/node_modules/.bin/next" start -p 5000
