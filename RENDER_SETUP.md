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
   - **Start Command**: `cd apps/api && pnpm start`
   - **Plan**: `Starter` (or your preferred plan)
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

## Next Steps

After setup is complete:

1. ✅ Push this branch: `deploy/render-api`
2. ✅ Create a Pull Request to `main`
3. ✅ After merge, GitHub Actions will automatically deploy on push to `main`

---

**Need Help?**

- Render Docs: https://render.com/docs
- Render CLI: `render --help`
