#!/bin/bash

# Setup script for test database
# This script creates a test database and runs migrations

set -e

echo "🔧 Setting up test database..."

# Get database connection details from environment or use defaults
DB_USER="${DB_USER:-$(whoami)}"
DB_NAME="${TEST_DB_NAME:-medbook_test}"
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"

# Check if PostgreSQL is running (using environment variables)
if ! pg_isready -h "$DB_HOST" -p "$DB_PORT" > /dev/null 2>&1; then
    echo "❌ PostgreSQL is not running at $DB_HOST:$DB_PORT!"
    echo ""
    echo "Please start PostgreSQL first:"
    echo "  brew services start postgresql@14"
    echo "  # OR"
    echo "  pg_ctl -D /usr/local/var/postgresql@14 start"
    echo ""
    echo "Or set DB_HOST and DB_PORT if using a different location:"
    echo "  export DB_HOST=your-host"
    echo "  export DB_PORT=your-port"
    echo ""
    exit 1
fi

echo "✅ PostgreSQL is running at $DB_HOST:$DB_PORT"

echo "📊 Database configuration:"
echo "  User: $DB_USER"
echo "  Database: $DB_NAME"
echo "  Host: $DB_HOST"
echo "  Port: $DB_PORT"
echo ""

# Create test database if it doesn't exist
echo "📦 Creating test database '$DB_NAME'..."
psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d postgres -tc "SELECT 1 FROM pg_database WHERE datname = '$DB_NAME'" | grep -q 1 || \
    psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d postgres -c "CREATE DATABASE $DB_NAME;" || {
    echo "⚠️  Database might already exist, continuing..."
}

echo "✅ Test database '$DB_NAME' is ready"
echo ""

# Set DATABASE_URL for migrations
export DATABASE_URL="postgresql://$DB_USER@$DB_HOST:$DB_PORT/$DB_NAME"

# Run migrations
echo "🔄 Running migrations on test database..."
cd packages/db
pnpm db:migrate:deploy

echo ""
echo "✅ Test database setup complete!"
echo ""
echo "Set this environment variable for tests:"
echo "  export TEST_DATABASE_URL=\"$DATABASE_URL\""
echo ""
echo "Or add to your shell profile (~/.zshrc or ~/.bashrc):"
echo "  echo 'export TEST_DATABASE_URL=\"$DATABASE_URL\"' >> ~/.zshrc"

