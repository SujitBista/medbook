#!/bin/bash

# Script to get Render Service ID for medbook-api
# Usage: ./scripts/get-render-service-id.sh

set -e

echo "🔍 Fetching Render services..."
echo ""

# List services and filter for medbook-api
SERVICE_INFO=$(render services list -o json 2>/dev/null | jq -r '.[] | select(.name == "medbook-api" or .name | contains("medbook")) | "\(.name)|\(.id)|\(.serviceDetails.url // "N/A")"')

if [ -z "$SERVICE_INFO" ]; then
  echo "❌ No service named 'medbook-api' found."
  echo ""
  echo "Available services:"
  render services list -o json | jq -r '.[] | "  - \(.name) (ID: \(.id))"'
  echo ""
  echo "💡 If you haven't created the service yet, follow RENDER_SETUP.md"
  exit 1
fi

echo "✅ Found service(s):"
echo ""
echo "$SERVICE_INFO" | while IFS='|' read -r name id url; do
  echo "  Service Name: $name"
  echo "  Service ID:   $id"
  echo "  URL:          $url"
  echo ""
done

echo "📋 Copy the Service ID above and add it to GitHub Secrets:"
echo "   Repository → Settings → Secrets and variables → Actions"
echo "   Secret name: RENDER_SERVICE_ID"
echo "   Secret value: <Service ID from above>"
echo ""



