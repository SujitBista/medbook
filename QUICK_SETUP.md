# Quick Render Service Creation

I've created an automated script to create the Render service for you! Here's how to use it:

## Step 1: Get Your Render API Key (2 minutes)

1. Go to: https://dashboard.render.com/account/api-keys
2. Click **"New API Key"**
3. Name it: `GitHub Deploy`
4. Select permissions:
   - ✅ **Read & Deploy** (required)
   - ✅ **Read** (for status checks)
5. Click **"Create API Key"**
6. **Copy the API key immediately** (it won't be shown again)

## Step 2: Run the Creation Script

```bash
# Set the API key (replace with your actual key)
export RENDER_API_KEY=your_api_key_here

# Run the script
./scripts/create-render-service.sh
```

The script will:

- ✅ Create the `medbook-api` service
- ✅ Configure build and start commands
- ✅ Set up basic environment variables
- ✅ Output the Service ID for GitHub secrets

## Step 3: Add GitHub Secrets

After the script completes, it will show you the Service ID. Add it to GitHub:

**GitHub Repository** → **Settings** → **Secrets and variables** → **Actions** → **New repository secret**

Add these two secrets:

- `RENDER_SERVICE_ID` = (Service ID from script output)
- `RENDER_API_KEY` = (The same API key you used above)

## Step 4: Configure Environment Variables in Render

Go to your Render service dashboard and add:

- `DATABASE_URL` = Your PostgreSQL connection string
- `JWT_SECRET` = Generate with: `openssl rand -base64 32`
- `API_URL` = Your Render service URL (will be shown in dashboard)
- `CORS_ORIGIN` = Your frontend URL(s)

---

**That's it!** The service will be created and ready for deployment.
