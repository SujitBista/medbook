#!/bin/bash

# Script to help set up Render PostgreSQL database for medbook
# Note: Render API doesn't support database creation via API yet
# This script helps you check existing databases and provides setup instructions
# Usage: ./scripts/create-render-postgresql.sh
# 
# Prerequisites:
# 1. RENDER_API_KEY environment variable must be set (for checking existing databases)
# 2. Render account with database access

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo "🐘 Render PostgreSQL Database Setup Helper"
echo ""
echo -e "${BLUE}ℹ️  Note: Render API doesn't support database creation via API yet.${NC}"
echo -e "${BLUE}   This script will help you check existing databases and provide setup instructions.${NC}"
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

# Default database name
DB_NAME="${DB_NAME:-medbook-db}"
DB_PLAN="${DB_PLAN:-starter}"  # Options: starter, standard, pro

echo "📋 Configuration:"
echo "  Database Name: $DB_NAME"
echo "  Plan: $DB_PLAN"
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

# Check if database already exists
echo "🔍 Checking for existing PostgreSQL databases..."
EXISTING_SERVICES=$(curl -s -H "Authorization: Bearer $RENDER_API_KEY" \
  "https://api.render.com/v1/services?ownerId=$OWNER_ID" 2>/dev/null)

# List all PostgreSQL databases
ALL_DBS=$(echo "$EXISTING_SERVICES" | jq -r '.[] | select(.service.type == "postgresql") | "\(.service.id)|\(.service.name)"' 2>/dev/null)

if [ -n "$ALL_DBS" ]; then
  echo -e "${GREEN}✅ Found existing PostgreSQL databases:${NC}"
  echo ""
  echo "$ALL_DBS" | while IFS='|' read -r db_id db_name; do
    echo "  - $db_name (ID: $db_id)"
  done
  echo ""
fi

EXISTING_DB=$(echo "$EXISTING_SERVICES" | jq -r ".[] | select(.service.name == \"$DB_NAME\" and .service.type == \"postgresql\") | .service.id" 2>/dev/null)

if [ -n "$EXISTING_DB" ]; then
  echo -e "${YELLOW}⚠️  Database '$DB_NAME' already exists with ID: $EXISTING_DB${NC}"
  echo ""
  
  # Get database connection info
  echo "🔍 Fetching database connection details..."
  DB_INFO=$(curl -s -H "Authorization: Bearer $RENDER_API_KEY" \
    "https://api.render.com/v1/services/$EXISTING_DB" 2>/dev/null)
  
  # Try multiple possible fields for connection string
  DB_CONNECTION_STRING=$(echo "$DB_INFO" | jq -r '.service.databaseConnectionString // .service.connectionString // .databaseConnectionString // .connectionString // empty' 2>/dev/null)
  
  # Get database status
  DB_STATUS=$(echo "$DB_INFO" | jq -r '.service.status // empty' 2>/dev/null)
  
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo ""
  echo "📋 Database Information:"
  echo "  Database Name: $DB_NAME"
  echo "  Database ID:   $EXISTING_DB"
  if [ -n "$DB_STATUS" ]; then
    echo "  Status:        $DB_STATUS"
  fi
  echo ""
  if [ -n "$DB_CONNECTION_STRING" ]; then
    echo -e "${GREEN}✅ Connection String Found:${NC}"
    echo "  $DB_CONNECTION_STRING"
  else
    echo -e "${YELLOW}⚠️  Connection string not available via API${NC}"
    echo "  Get it from: https://dashboard.render.com/databases/$EXISTING_DB"
    echo "  Look for 'Internal Database URL' or 'External Database URL'"
  fi
  echo ""
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo ""
  echo "🔐 Next Steps:"
  echo ""
  echo "1. Add DATABASE_URL to your Render service environment variables:"
  echo "   https://dashboard.render.com/web/<your-service-id>"
  echo "   Go to: Environment tab"
  echo ""
  if [ -n "$DB_CONNECTION_STRING" ]; then
    echo "   DATABASE_URL = $DB_CONNECTION_STRING"
    echo ""
    echo "   💡 Use 'Internal Database URL' if connecting from Render services"
    echo "   💡 Use 'External Database URL' if connecting from outside Render"
  else
    echo "   DATABASE_URL = <get from Render dashboard>"
    echo ""
    echo "   To get the connection string:"
    echo "   1. Go to: https://dashboard.render.com/databases/$EXISTING_DB"
    echo "   2. Find 'Connections' section"
    echo "   3. Copy 'Internal Database URL' (for Render services)"
    echo "      or 'External Database URL' (for external connections)"
  fi
  echo ""
  echo "2. View your database dashboard:"
  echo "   https://dashboard.render.com/databases/$EXISTING_DB"
  echo ""
  echo "3. Run database migrations:"
  echo "   cd packages/db"
  echo "   export DATABASE_URL=\"<your-connection-string>\""
  echo "   pnpm prisma migrate deploy"
  echo ""
  exit 0
fi

# Database doesn't exist, provide manual creation instructions
echo -e "${YELLOW}⚠️  Database '$DB_NAME' not found.${NC}"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📋 Manual Database Creation Instructions"
echo ""
echo -e "${BLUE}The Render API doesn't support database creation yet.${NC}"
echo -e "${BLUE}Please create the database manually via the Render Dashboard:${NC}"
echo ""
echo "1. Go to Render Dashboard:"
echo "   https://dashboard.render.com"
echo ""
echo "2. Click \"New +\" → \"PostgreSQL\""
echo ""
echo "3. Configure your database:"
echo "   - Name: $DB_NAME"
echo "   - Database: medbook"
echo "   - User: medbook_user (or leave auto-generated)"
echo "   - Region: Oregon (or your preferred region)"
echo "   - Plan: $DB_PLAN"
echo ""
echo "4. Click \"Create Database\""
echo ""
echo "5. Wait for provisioning (usually 1-2 minutes)"
echo ""
echo "6. After creation, run this script again to get connection details:"
echo "   ./scripts/create-render-postgresql.sh"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "💡 Alternative: Use an existing database"
if [ -n "$ALL_DBS" ]; then
  echo ""
  echo "You have existing databases. You can use one of them or create a new one."
  echo "To use an existing database, note its ID and check it with:"
  echo "  render services list -o json | jq '.[] | select(.service.id == \"<db-id>\")'"
else
  echo ""
  echo "No existing databases found. Create one via the dashboard first."
fi
echo ""

