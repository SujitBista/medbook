#!/bin/bash
# Fix doctors.stripeAccountId column issue by running the migration SQL directly
# This script can be run locally with DATABASE_URL set to production

set -e

echo "🔧 Fixing doctors.stripeAccountId column..."
echo ""

if [ -z "$DATABASE_URL" ]; then
  echo "❌ Error: DATABASE_URL environment variable is not set"
  echo ""
  echo "Please set it to your production database URL:"
  echo "  export DATABASE_URL='postgresql://user:password@host:port/database'"
  echo ""
  echo "You can find it in Render Dashboard → Database → Connect → Internal Database URL"
  exit 1
fi

echo "📦 Running migration SQL..."
echo ""

cd packages/db

# Run the migration SQL directly
psql "$DATABASE_URL" << 'EOF'
-- Add stripeAccountId to doctors if missing (idempotent fix for production)
ALTER TABLE "doctors" ADD COLUMN IF NOT EXISTS "stripeAccountId" TEXT;
EOF

if [ $? -eq 0 ]; then
  echo ""
  echo "✅ Successfully added stripeAccountId column to doctors table"
  echo ""
  echo "You can verify by checking the table:"
  echo "  psql \"$DATABASE_URL\" -c \"\\d doctors\" | grep stripeAccountId"
else
  echo ""
  echo "❌ Failed to run migration. Please check the DATABASE_URL and try again."
  exit 1
fi
