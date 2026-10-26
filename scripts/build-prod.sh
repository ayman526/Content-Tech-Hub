#!/bin/bash
set -e

echo "Generating Prisma client..."
npx prisma generate

echo "Syncing database schema..."
npx prisma db push --accept-data-loss

echo "Seeding required data..."
npx tsx scripts/seed.ts
npx tsx scripts/seed-configs.ts
npx tsx scripts/seed-notifications.ts
npx tsx scripts/seed-ai-config.ts
npx tsx scripts/seed-ai-extra.ts
npx tsx scripts/migrate-siteconfig-locale.ts

echo "Setting up Python environment..."
python3 -m venv .pythonlibs --upgrade-deps 2>/dev/null || python3 -m venv .pythonlibs
.pythonlibs/bin/pip install --quiet --upgrade pip
.pythonlibs/bin/pip install --quiet \
  flask \
  gunicorn \
  pdfminer.six \
  pymupdf \
  pdfplumber \
  ocrmypdf \
  arabic-reshaper \
  python-bidi \
  python-pptx \
  lxml \
  pillow \
  fpdf2

echo "Ensuring PDF Unicode fonts are present..."
mkdir -p services/pdf-processor/fonts
_FONT_BASE="https://cdn.jsdelivr.net/fontsource/fonts"
if [ ! -s "services/pdf-processor/fonts/NotoSans-Regular.ttf" ]; then
  curl -sL "$_FONT_BASE/noto-sans@latest/latin-400-normal.ttf" \
    -o services/pdf-processor/fonts/NotoSans-Regular.ttf || true
fi
if [ ! -s "services/pdf-processor/fonts/NotoSansArabic-Regular.ttf" ]; then
  curl -sL "$_FONT_BASE/noto-sans-arabic@latest/arabic-400-normal.ttf" \
    -o services/pdf-processor/fonts/NotoSansArabic-Regular.ttf || true
fi

echo "Building Next.js app..."
export PATH="$PWD/.pythonlibs/bin:$PATH"
npx next build
