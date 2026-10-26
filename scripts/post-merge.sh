#!/bin/bash
set -e

echo "Running post-merge setup..."

echo "Installing dependencies..."
npm install --legacy-peer-deps

echo "Generating Prisma client..."
npx prisma generate

echo "Syncing database schema..."
npx prisma db push --accept-data-loss

echo "Post-merge setup complete."
