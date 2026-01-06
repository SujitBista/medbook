#!/bin/bash

# Script to create Render service for medbook-api
# Usage: ./scripts/create-render-service.sh
# 
# Prerequisites:
# 1. RENDER_API_KEY environment variable must be set
# 2. GitHub repository must be connected to Render account

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "🚀 Creating Render service for medbook-api..."
echo ""

# Check if API key is set
if [ -z "$RENDER_API_KEY" ]; then
  echo -e "${RED}❌ Error: RENDER_API_KEY environment variable is not set${NC}"
  echo ""
  echo "Please set it first:"
  echo "  1. Go to https://dashboard.render.com/account/api-keys"
  echo "  2. Create a new API key"
  echo "  3. Run: export RENDER_API_KEY=your_api_key"
  echo "  4. Then run this script again"
  exit 1
fi

# Get repository URL
REPO_URL=$(git remote get-url origin 2>/dev/null || echo "")
if [ -z "$REPO_URL" ]; then
  echo -e "${RED}❌ Error: Could not determine repository URL${NC}"
  exit 1
fi

# Convert SSH URL to HTTPS if needed
if [[ $REPO_URL == git@* ]]; then
  REPO_URL=$(echo $REPO_URL | sed 's/git@github.com:/https:\/\/github.com\//' | sed 's/\.git$//')
fi

echo "📋 Configuration:"
echo "  Repository: $REPO_URL"
echo "  Service Name: medbook-api"
echo "  Build Command: pnpm install --frozen-lockfile && pnpm build --filter=api"
echo "  Start Command: cd apps/api && pnpm start"
echo ""

# Get user info to determine owner
echo "🔍 Getting account information..."
OWNER_INFO=$(curl -s -H "Authorization: Bearer $RENDER_API_KEY" \
  "https://api.render.com/v1/owners" 2>/dev/null)

if [ $? -ne 0 ] || [ -z "$OWNER_INFO" ]; then
  echo -e "${RED}❌ Error: Failed to authenticate with Render API${NC}"
  echo "Please verify your RENDER_API_KEY is correct"
  exit 1
fi

OWNER_ID=$(echo "$OWNER_INFO" | jq -r '.[0].owner.id // .owner.id // empty' 2>/dev/null)
OWNER_TYPE=$(echo "$OWNER_INFO" | jq -r '.[0].owner.type // .owner.type // "user"' 2>/dev/null)

if [ -z "$OWNER_ID" ]; then
  echo -e "${RED}❌ Error: Could not determine owner ID${NC}"
  echo "API Response: $OWNER_INFO"
  exit 1
fi

echo "✅ Authenticated as owner: $OWNER_ID ($OWNER_TYPE)"
echo ""

# Check if service already exists
echo "🔍 Checking if service already exists..."
EXISTING_SERVICES=$(curl -s -H "Authorization: Bearer $RENDER_API_KEY" \
  "https://api.render.com/v1/services?ownerId=$OWNER_ID" 2>/dev/null)

EXISTING_SERVICE=$(echo "$EXISTING_SERVICES" | jq -r ".[] | select(.service.name == \"medbook-api\") | .service.id" 2>/dev/null)

if [ -n "$EXISTING_SERVICE" ]; then
  echo -e "${YELLOW}⚠️  Service 'medbook-api' already exists with ID: $EXISTING_SERVICE${NC}"
  echo ""
  echo "Service ID: $EXISTING_SERVICE"
  echo ""
  echo "📋 Add this to GitHub Secrets:"
  echo "  RENDER_SERVICE_ID = $EXISTING_SERVICE"
  exit 0
fi

# Create the service
echo "📦 Creating new service..."
echo ""

# Prepare service creation payload
PAYLOAD=$(cat <<EOF
{
  "type": "web_service",
  "name": "medbook-api",
  "ownerId": "$OWNER_ID",
  "repo": "$REPO_URL",
  "branch": "main",
  "rootDir": "",
  "buildCommand": "pnpm install --frozen-lockfile && pnpm build --filter=api",
  "startCommand": "cd apps/api && pnpm start",
  "planId": "starter",
  "region": "oregon",
  "envVars": [
    {
      "key": "NODE_ENV",
      "value": "production"
    },
    {
      "key": "PORT",
      "value": "10000"
    }
  ],
  "healthCheckPath": "/api/v1/health"
}
EOF
)

# Create service via API
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST \
  -H "Authorization: Bearer $RENDER_API_KEY" \
  -H "Content-Type: application/json" \
  -d "$PAYLOAD" \
  "https://api.render.com/v1/services" 2>/dev/null)

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

if [ "$HTTP_CODE" != "201" ] && [ "$HTTP_CODE" != "200" ]; then
  echo -e "${RED}❌ Error: Failed to create service${NC}"
  echo "HTTP Status: $HTTP_CODE"
  echo "Response: $BODY"
  exit 1
fi

# Extract service ID
SERVICE_ID=$(echo "$BODY" | jq -r '.service.id // .id // empty' 2>/dev/null)

if [ -z "$SERVICE_ID" ]; then
  echo -e "${RED}❌ Error: Service created but could not extract service ID${NC}"
  echo "Response: $BODY"
  exit 1
fi

echo -e "${GREEN}✅ Service created successfully!${NC}"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📋 Service Information:"
echo "  Service Name: medbook-api"
echo "  Service ID:   $SERVICE_ID"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "🔐 Next Steps:"
echo ""
echo "1. Add GitHub Secrets:"
echo "   Repository → Settings → Secrets and variables → Actions"
echo ""
echo "   Secret 1:"
echo "   Name:  RENDER_SERVICE_ID"
echo "   Value: $SERVICE_ID"
echo ""
echo "   Secret 2:"
echo "   Name:  RENDER_API_KEY"
echo "   Value: <your Render API key>"
echo ""
echo "2. Configure Environment Variables in Render Dashboard:"
echo "   https://dashboard.render.com/web/$SERVICE_ID"
echo "   Go to: Environment tab"
echo ""
echo "   Required variables:"
echo "   - DATABASE_URL (your PostgreSQL connection string)"
echo "   - JWT_SECRET (generate: openssl rand -base64 32)"
echo "   - API_URL (your Render service URL)"
echo "   - CORS_ORIGIN (your frontend URL)"
echo ""
echo "3. View your service:"
echo "   https://dashboard.render.com/web/$SERVICE_ID"
echo ""



