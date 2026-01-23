# Render Backend Deployment Setup Guide

This guide will help you set up Render deployment for the MedBook API backend.

## Prerequisites

- ✅ Render CLI installed (`render --version` should work)
- ✅ Authenticated with Render CLI (`render whoami` shows your account)
- ✅ GitHub repository access

## Step 1: Create Render Service

You have two options to create the service:

### Option A: Using Render Dashboard (Recommended)

1. Go to [Render Dashboard](https://dashboard.render.com)
2. Click **"New +"** → **"Web Service"**
3. Connect your GitHub repository:
   - Select **"Build and deploy from a Git repository"**
   - Choose your `medbook` repository
   - Select the `main` branch (or your preferred branch)
4. Configure the service:
   - **Name**: `medbook-api` (or your preferred name)
   - **Environment**: `Node`
   - **Region**: Choose closest to your users
   - **Branch**: `main`
   - **Root Directory**: Leave empty (monorepo root)
   - **Build Command**: `pnpm install --frozen-lockfile && pnpm build --filter=api`
   - **Release Command**: `pnpm db:migrate:deploy && pnpm db:generate`
   - **Start Command**: `cd apps/api && pnpm start`
   - **Plan**: `Starter` (or your preferred plan)

   **Important:** Do **not** put `prisma migrate deploy` (or `pnpm prisma ...`) in the Start Command. The Prisma CLI is only available in the `@app/db` package. Migrations must run via the **Release Command** from the repo root.

5. Click **"Create Web Service"**

### Option B: Using render.yaml (Alternative)

The `render.yaml` file is already configured. You can use it if Render supports YAML-based service creation in your account.

## Step 2: Get Service ID

After creating the service, you need to get the **Service ID**:

### Method 1: From Render Dashboard

1. Go to your service page
2. The Service ID is in the URL: `https://dashboard.render.com/web/[SERVICE_ID]`
   - Or look in the service settings

### Method 2: Using Render CLI

```bash
# List all services
render services list -o json

# Find your service (medbook-api) and note the "id" field
```

**⚠️ IMPORTANT: Copy the Service ID - you'll need it for GitHub secrets!**

## Step 3: Create Render API Key

1. Go to [Render Account Settings](https://dashboard.render.com/account/api-keys)
2. Click **"New API Key"**
3. Configure:
   - **Name**: `GitHub Deploy`
   - **Permissions**:
     - ✅ **Read & Deploy** (minimum required)
     - ✅ **Read** (for service status)
   - **Note**: Do NOT select "Full Access" unless absolutely necessary
4. Click **"Create API Key"**
5. **⚠️ COPY THE API KEY IMMEDIATELY** - it won't be shown again!

## Step 4: Configure Environment Variables in Render

In your Render service dashboard, go to **"Environment"** and add these variables:

### Required Variables:

- `NODE_ENV` = `production`
- `PORT` = `10000` (or let Render auto-assign)
- `DATABASE_URL` = Your PostgreSQL connection string
- `JWT_SECRET` = Generate with: `openssl rand -base64 32`
- `API_URL` = Your Render service URL (e.g., `https://medbook-api.onrender.com`)

### Optional Variables (configure as needed):

- `CORS_ORIGIN` = Your frontend URL(s), comma-separated
- `CORS_ALLOW_NO_ORIGIN` = `true` ⚠️ **REQUIRED for NextAuth server-to-server requests**
  - **Critical:** Must be set to `true` in production to allow NextAuth's authorize function to make server-to-server requests
  - Without this, login will fail with CredentialsSignin error
  - Default: `false` (will block authentication)
- `RESEND_API_KEY` = Your Resend API key (for emails)
- `EMAIL_FROM` = `MedBook <noreply@yourdomain.com>`
- `APP_URL` = Your frontend URL
- `N8N_WEBHOOK_BASE_URL` = Your n8n webhook URL (if using)
- `N8N_ENABLED` = `true` or `false`

## Step 5: Add GitHub Secrets

Go to your GitHub repository → **Settings** → **Secrets and variables** → **Actions**

Add these secrets:

### Required Secrets:

1. **`RENDER_SERVICE_ID`**
   - Value: The Service ID from Step 2
   - Example: `srv-abc123xyz456`

2. **`RENDER_API_KEY`**
   - Value: The API key from Step 3
   - Example: `rnd_abc123xyz456...`

## Step 6: Verify Setup

1. **Check GitHub Actions**:
   - Go to your repository → **Actions** tab
   - The workflow should show the `deploy-backend` job
   - It will skip until secrets are added

2. **Test Render Service**:

   ```bash
   # Check service status
   render services list -o json

   # View logs
   render logs <service-id> -o text
   ```

3. **Test Health Endpoint**:
   - Once deployed, visit: `https://your-service.onrender.com/api/v1/health`
   - Should return: `{"status":"ok","timestamp":"...","database":"connected"}`

## Step 7: Enable Auto-Deploy (Optional)

In Render dashboard:

1. Go to your service → **Settings** → **Build & Deploy**
2. Enable **"Auto-Deploy"** for your branch
3. Connect GitHub (if not already connected)

## Run migrations in production (one-off)

If you need to run migrations **now** (e.g. before the next deploy, or the Release Command did not run):

1. **Render CLI one-off job** (recommended; uses the service’s build and `DATABASE_URL`):

   ```bash
   # Ensure you’re logged in: render login (or set RENDER_API_KEY)
   ./scripts/run-render-migrate.sh [SERVICE_ID]
   ```

   Or with the CLI only:

   ```bash
   render jobs create <SERVICE_ID> --start-command "pnpm db:migrate:deploy" --confirm
   ```

   Get `<SERVICE_ID>` from the service URL (`/web/srv-xxx`) or: `render services list -o json | jq '.[] | "\(.name) \(.id)"'`

2. **SSH into the service** (paid plans; same build and env):

   ```bash
   render ssh <SERVICE_ID>
   # in the shell:
   pnpm db:migrate:deploy
   exit
   ```

## Troubleshooting

### Service won't start

- Check logs: `render logs <service-id> -o text`
- Verify all required environment variables are set
- Check build command completes successfully

### Deployment fails in GitHub Actions

- Verify secrets are set correctly
- Check service ID matches your Render service
- Ensure API key has correct permissions

### Database connection issues

- Verify `DATABASE_URL` is correct
- Check database is accessible from Render
- Ensure database migrations have run

### `Command "prisma" not found` or `ERR_PNPM_RECURSIVE_EXEC_FIRST_FAIL  Command "prisma" not found`

This happens when the **Start Command** includes `pnpm prisma migrate deploy` (or similar). The `prisma` CLI is not available in `apps/api`; it lives in the `@app/db` package.

**Fix:** Use the **Release Command** to run migrations from the repo root instead of the Start Command. (If the service uses `render.yaml`, the Release Command is already set there; ensure the Render Dashboard has not overridden it.)

1. In Render → Service → **Build & Deploy**:
   - **Release Command:** `pnpm db:migrate:deploy && pnpm db:generate`
   - **Start Command:** `cd apps/api && pnpm start` (do **not** include `prisma` or `migrate` here)
2. Save and redeploy. The Release Command runs before the new instance serves traffic and uses the correct script from the monorepo root.

### 500 on GET /api/admin/doctors – `column doctors.stripeAccountId does not exist`

The `stripeAccountId` column was added in a migration. If migrations never ran in production (e.g. **Release Command** was missing or wrong, or you saw `Command "prisma" not found`), the column is missing.

1. **Fix the Release Command** (recommended): In Render → Build & Deploy, set **Release Command** to `pnpm db:migrate:deploy && pnpm db:generate` and **Start Command** to `cd apps/api && pnpm start` only. Redeploy so migrations run.
2. **One-off fix** (if you need the app working before the next deploy): In Render Shell or locally with prod `DATABASE_URL`:
   ```bash
   pnpm db:migrate:deploy
   ```
   Or run this SQL on the production DB:
   ```sql
   ALTER TABLE "doctors" ADD COLUMN IF NOT EXISTS "stripeAccountId" TEXT;
   ```

## Next Steps

After setup is complete:

1. ✅ Push this branch: `deploy/render-api`
2. ✅ Create a Pull Request to `main`
3. ✅ After merge, GitHub Actions will automatically deploy on push to `main`

---

**Need Help?**

- Render Docs: https://render.com/docs
- Render CLI: `render --help`
