#!/bin/bash
# Run Prisma migrations in production via a Render one-off job.
# Prerequisites: Render CLI installed and logged in (render login);
#   render whoami should succeed.
#
# Usage:
#   ./scripts/run-render-migrate.sh [SERVICE_ID]
#
# If SERVICE_ID is omitted, it is taken from RENDER_SERVICE_ID, or
# it is resolved from the first Render service whose name is
# "medbook-api" or contains "medbook".

set -e

SERVICE_ID="${1:-$RENDER_SERVICE_ID}"

if [ -z "$SERVICE_ID" ]; then
  echo "🔍 Resolving service ID for medbook-api..."
  SERVICE_ID=$(render services list -o json 2>/dev/null | jq -r 'if type == "array" then [.[] | select(.name == "medbook-api" or (.name | test("medbook"; "i")))] | .[0].id // empty else empty end')
  if [ -z "$SERVICE_ID" ]; then
    echo "❌ Could not find medbook service and no SERVICE_ID was provided."
    echo "   Ensure you're logged in: render login (or set RENDER_API_KEY)."
    echo ""
    echo "Usage: $0 [SERVICE_ID]"
    echo "   or: RENDER_SERVICE_ID=srv-xxx $0"
    echo ""
    echo "List services: render services list -o json | jq '.[].name, .[].id'"
    exit 1
  fi
  echo "   Using service: $SERVICE_ID"
fi

echo "📦 Creating one-off job to run: pnpm db:migrate:deploy"
echo "   (Job uses the service build and env; DATABASE_URL must be set on the service.)"
echo ""

render jobs create "$SERVICE_ID" \
  --start-command "pnpm db:migrate:deploy" \
  --confirm

echo ""
echo "✅ Job created. Check status: render jobs list $SERVICE_ID -o json"
