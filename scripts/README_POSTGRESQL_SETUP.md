# Render PostgreSQL Database Setup

This guide explains how to set up a PostgreSQL database on Render for the MedBook application.

## Prerequisites

1. **Render Account**: You need a Render account with database creation permissions
2. **Render API Key**: Create an API key from [Render Account Settings](https://dashboard.render.com/account/api-keys)
3. **jq installed**: Required for JSON parsing (install with `brew install jq` on macOS)

## Quick Setup

### Option 1: Using Render Dashboard (Recommended)

**Note:** The Render API doesn't currently support database creation via API. You must create the database manually via the dashboard.

1. Go to [Render Dashboard](https://dashboard.render.com)
2. Click **"New +"** → **"PostgreSQL"**
3. Configure:
   - **Name**: `medbook-db` (or your preferred name)
   - **Database**: `medbook`
   - **User**: `medbook_user` (or leave auto-generated)
   - **Region**: Choose closest to your users (e.g., `Oregon`)
   - **Plan**: `Starter` (or your preferred plan)
4. Click **"Create Database"**
5. Wait for provisioning (usually 1-2 minutes)
6. Copy the **Internal Database URL** or **External Database URL**

### Option 2: Using the Helper Script

The script helps you check existing databases and retrieve connection strings:

1. **Set your Render API key**:

   ```bash
   export RENDER_API_KEY=your_api_key_here
   ```

2. **Run the helper script**:

   ```bash
   ./scripts/create-render-postgresql.sh
   ```

3. **Customize options** (optional):

   ```bash
   DB_NAME=medbook-prod-db DB_PLAN=standard ./scripts/create-render-postgresql.sh
   ```

   Available plans: `starter`, `standard`, `pro`

The script will:

- List all existing PostgreSQL databases
- Check if your specified database exists
- Provide connection details if found
- Give step-by-step instructions if database doesn't exist

1. Go to [Render Dashboard](https://dashboard.render.com)
2. Click **"New +"** → **"PostgreSQL"**
3. Configure:
   - **Name**: `medbook-db` (or your preferred name)
   - **Database**: `medbook`
   - **User**: `medbook_user` (or auto-generated)
   - **Region**: Choose closest to your users (e.g., `Oregon`)
   - **Plan**: `Starter` (or your preferred plan)
4. Click **"Create Database"**
5. Wait for provisioning (usually 1-2 minutes)
6. Copy the **Internal Database URL** or **External Database URL**

## Getting Database Connection String

After the database is created, you can get the connection string:

### From Render Dashboard

1. Go to your database page
2. Find the **"Connections"** section
3. Copy either:
   - **Internal Database URL** (for services in the same Render account)
   - **External Database URL** (for external connections)

### Using Render CLI

```bash
# List all services (including databases)
render services list -o json | jq '.[] | select(.service.type == "postgresql")'

# Get specific database info
render services list -o json | jq '.[] | select(.service.name == "medbook-db")'
```

### Using the Script

The script will automatically display the connection string if available after creation.

## Configuration

### Add DATABASE_URL to Your Render Service

1. Go to your Render service dashboard
2. Navigate to **"Environment"** tab
3. Add environment variable:
   - **Key**: `DATABASE_URL`
   - **Value**: Your database connection string (from above)

### Example Connection String Format

```
postgresql://medbook_user:password@dpg-xxxxx-a.oregon-postgres.render.com/medbook_xxxx
```

## Running Migrations

After setting up the database and configuring `DATABASE_URL`:

1. **From your local machine** (if using external connection):

   ```bash
   cd packages/db
   export DATABASE_URL="your-database-connection-string"
   pnpm prisma migrate deploy
   ```

2. **From Render service** (if using internal connection):
   - Add a build step or one-time job to run migrations
   - Or SSH into the service and run migrations manually

## Seeding the Database (Optional)

```bash
cd packages/db
export DATABASE_URL="your-database-connection-string"
pnpm prisma db seed
```

## Troubleshooting

### Script Fails with Authentication Error

- Verify your `RENDER_API_KEY` is correct
- Check that the API key has read permissions for services
- Ensure you're authenticated: `render whoami`

### Database Creation via API Not Supported

**Important:** The Render API doesn't currently support creating databases programmatically. You must create databases via the Render Dashboard. The script is a helper tool that:

- Lists existing databases
- Retrieves connection strings for existing databases
- Provides manual creation instructions

If you need to create a database, use the Render Dashboard as described in Option 1 above.

### Connection Issues

- Verify `DATABASE_URL` is set correctly in your service
- Check database status in Render dashboard (should be "Available")
- Ensure you're using the correct connection string type:
  - **Internal URL** for Render services
  - **External URL** for external connections

### Migration Failures

- Ensure `DATABASE_URL` is accessible from where you're running migrations
- Check database is fully provisioned (status should be "Available")
- Verify Prisma schema matches your database structure

## Next Steps

After setting up the database:

1. ✅ Add `DATABASE_URL` to your Render service environment variables
2. ✅ Run database migrations
3. ✅ (Optional) Seed the database with initial data
4. ✅ Test your application connection
5. ✅ Set up database backups (Render handles this automatically)

## Additional Resources

- [Render Database Documentation](https://render.com/docs/databases)
- [Render API Documentation](https://render.com/docs/api)
- [Prisma Migration Guide](https://www.prisma.io/docs/guides/migrate)
