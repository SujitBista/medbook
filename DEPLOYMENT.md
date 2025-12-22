# Deployment Guide

This guide covers deploying the MedBook application to production environments.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Environment Variables](#environment-variables)
- [Database Setup](#database-setup)
- [Frontend Deployment (Vercel)](#frontend-deployment-vercel)
- [Backend Deployment](#backend-deployment)
  - [Railway](#railway)
  - [Render](#render)
- [CI/CD Pipeline](#cicd-pipeline)
- [Monitoring and Error Tracking](#monitoring-and-error-tracking)
- [Domain and SSL Configuration](#domain-and-ssl-configuration)
- [Post-Deployment Checklist](#post-deployment-checklist)

## Prerequisites

Before deploying, ensure you have:

1. **GitHub Repository** with your code
2. **Production Database** (PostgreSQL 14+)
3. **Vercel Account** (for frontend deployment)
4. **Railway or Render Account** (for backend deployment)
5. **Domain Name** (optional but recommended)
6. **Email Service** (Resend API key for sending emails)

## Environment Variables

### Frontend (Web App) - Vercel

Set these in Vercel's environment variables dashboard:

```bash
# Required
NEXTAUTH_URL=https://your-domain.com
NEXTAUTH_SECRET=<generate-with-openssl-rand-base64-32>
NEXT_PUBLIC_API_URL=https://api.your-domain.com/api/v1

# Optional: Sentry
NEXT_PUBLIC_SENTRY_DSN=your-sentry-dsn
```

### Backend (API) - Railway/Render

Set these in your backend deployment platform:

```bash
# Required
NODE_ENV=production
PORT=4000
API_URL=https://api.your-domain.com
JWT_SECRET=<generate-with-openssl-rand-base64-32>
DATABASE_URL=postgresql://user:password@host:5432/medbook
CORS_ORIGIN=https://your-domain.com
CORS_ALLOW_NO_ORIGIN=false
CORS_ALLOW_NULL_ORIGIN=false

# Email Configuration
RESEND_API_KEY=your-resend-api-key
EMAIL_FROM=MedBook <noreply@your-domain.com>
APP_URL=https://your-domain.com

# Optional: n8n
N8N_WEBHOOK_BASE_URL=https://n8n.your-domain.com/webhook
N8N_ENABLED=true
N8N_WEBHOOK_TIMEOUT=10000

# Optional: Sentry
SENTRY_DSN=your-sentry-dsn
SENTRY_ENVIRONMENT=production
```

### Generating Secrets

Generate secure secrets using:

```bash
# NextAuth Secret
openssl rand -base64 32

# JWT Secret
openssl rand -base64 32
```

## Database Setup

### Option 1: Railway PostgreSQL

1. Create a new PostgreSQL service in Railway
2. Copy the `DATABASE_URL` connection string
3. Set it as an environment variable in your backend deployment

### Option 2: Render PostgreSQL

1. Create a new PostgreSQL database in Render
2. Copy the `Internal Database URL` or `External Database URL`
3. Set it as an environment variable in your backend deployment

### Option 3: Supabase/Neon/Other Managed PostgreSQL

1. Create a new database instance
2. Copy the connection string
3. Set it as an environment variable in your backend deployment

### Running Migrations

After setting up the database, run migrations:

```bash
# Using Railway CLI
railway run pnpm db:migrate:deploy

# Or manually
cd packages/db
DATABASE_URL=your-production-database-url pnpm db:migrate:deploy
```

### Seeding Database (Optional)

**⚠️ Only seed in development/staging, never in production!**

If you need to seed initial data:

```bash
cd packages/db
DATABASE_URL=your-production-database-url pnpm db:seed
```

## Frontend Deployment (Vercel)

### Initial Setup

1. **Install Vercel CLI** (optional, for local testing):

   ```bash
   npm install -g vercel
   ```

2. **Connect Repository to Vercel**:
   - Go to [Vercel Dashboard](https://vercel.com/dashboard)
   - Click "Add New Project"
   - Import your GitHub repository
   - Configure project settings:
     - **Framework Preset**: Next.js
     - **Root Directory**: `apps/web`
     - **Build Command**: `cd ../.. && pnpm build --filter=web`
     - **Output Directory**: `.next`
     - **Install Command**: `cd ../.. && pnpm install --frozen-lockfile`

3. **Set Environment Variables**:
   - Go to Project Settings → Environment Variables
   - Add all required variables (see [Environment Variables](#environment-variables))

4. **Deploy**:
   - Vercel will automatically deploy on push to `main` branch
   - Or trigger manual deployment from the dashboard

### Vercel Configuration

The `vercel.json` file in the root directory configures:

- Build commands for monorepo
- API route rewrites
- Framework settings

### Custom Domain

1. Go to Project Settings → Domains
2. Add your custom domain
3. Follow DNS configuration instructions
4. SSL certificate is automatically provisioned by Vercel

## Backend Deployment

### Railway

#### Initial Setup

1. **Install Railway CLI** (optional):

   ```bash
   npm install -g @railway/cli
   railway login
   ```

2. **Create New Project**:
   - Go to [Railway Dashboard](https://railway.app/dashboard)
   - Click "New Project"
   - Select "Deploy from GitHub repo"
   - Choose your repository

3. **Configure Service**:
   - Railway will auto-detect the project
   - Set **Root Directory**: `apps/api`
   - Set **Start Command**: `pnpm start`
   - Set **Build Command**: `pnpm install --frozen-lockfile && pnpm build --filter=api`

4. **Add PostgreSQL Service**:
   - Click "New" → "Database" → "Add PostgreSQL"
   - Railway will automatically set `DATABASE_URL` environment variable

5. **Set Environment Variables**:
   - Go to Variables tab
   - Add all required variables (see [Environment Variables](#environment-variables))

6. **Deploy**:
   - Railway will automatically deploy on push to `main` branch
   - Or trigger manual deployment from the dashboard

#### Railway Configuration

The `railway.json` file in the root directory configures:

- Build commands
- Start commands
- Restart policies

### Render

#### Initial Setup

1. **Create New Web Service**:
   - Go to [Render Dashboard](https://dashboard.render.com)
   - Click "New" → "Web Service"
   - Connect your GitHub repository

2. **Configure Service**:
   - **Name**: `medbook-api`
   - **Environment**: `Node`
   - **Root Directory**: `apps/api`
   - **Build Command**: `pnpm install --frozen-lockfile && pnpm build --filter=api`
   - **Start Command**: `pnpm start`
   - **Plan**: Starter (or higher for production)

3. **Add PostgreSQL Database**:
   - Click "New" → "PostgreSQL"
   - Create database instance
   - Copy the `Internal Database URL`
   - Set as `DATABASE_URL` in web service environment variables

4. **Set Environment Variables**:
   - Go to Environment tab
   - Add all required variables (see [Environment Variables](#environment-variables))

5. **Deploy**:
   - Render will automatically deploy on push to `main` branch
   - Or trigger manual deployment from the dashboard

#### Render Configuration

The `render.yaml` file in the root directory defines:

- Service configuration
- Build and start commands
- Health check paths
- Environment variables

## CI/CD Pipeline

### GitHub Actions

The deployment workflow (`.github/workflows/deploy.yml`) automatically:

1. **Runs Tests**: Executes all tests before deployment
2. **Lints Code**: Ensures code quality
3. **Type Checks**: Validates TypeScript types
4. **Deploys Frontend**: Deploys to Vercel on successful tests
5. **Deploys Backend**: Deploys to Railway/Render on successful tests

### Required GitHub Secrets

Set these in your repository settings (Settings → Secrets and variables → Actions):

```bash
# Vercel
VERCEL_TOKEN=your-vercel-token
VERCEL_ORG_ID=your-vercel-org-id
VERCEL_PROJECT_ID=your-vercel-project-id

# Railway (if using Railway)
RAILWAY_TOKEN=your-railway-token
RAILWAY_SERVICE_ID=your-railway-service-id

# Render (if using Render)
RENDER_API_KEY=your-render-api-key
RENDER_SERVICE_ID=your-render-service-id
```

### Getting Vercel Credentials

1. Go to [Vercel Account Settings](https://vercel.com/account/tokens)
2. Create a new token
3. Get Org ID and Project ID from project settings URL or API

### Getting Railway Credentials

1. Install Railway CLI: `npm install -g @railway/cli`
2. Login: `railway login`
3. Get token: `railway whoami`
4. Get service ID from Railway dashboard

### Getting Render Credentials

1. Go to [Render Account Settings](https://dashboard.render.com/account/api-keys)
2. Create a new API key
3. Get service ID from service settings URL

## Monitoring and Error Tracking

### Sentry Setup

1. **Create Sentry Project**:
   - Go to [Sentry.io](https://sentry.io)
   - Create a new project for your application

2. **Install Sentry SDK** (if not already installed):

   ```bash
   # Frontend
   cd apps/web
   pnpm add @sentry/nextjs

   # Backend
   cd apps/api
   pnpm add @sentry/node
   ```

3. **Configure Sentry**:
   - Set `SENTRY_DSN` environment variable
   - Set `SENTRY_ENVIRONMENT=production`
   - Initialize Sentry in your application code

4. **Set Environment Variables**:

   ```bash
   # Frontend
   NEXT_PUBLIC_SENTRY_DSN=your-sentry-dsn

   # Backend
   SENTRY_DSN=your-sentry-dsn
   SENTRY_ENVIRONMENT=production
   ```

### Health Checks

The backend includes a health check endpoint at `/health`:

```bash
curl https://api.your-domain.com/health
```

Configure this in your deployment platform for automatic health monitoring.

## Domain and SSL Configuration

### Frontend Domain (Vercel)

1. Go to Project Settings → Domains
2. Add your custom domain
3. Follow DNS configuration instructions:
   - Add CNAME record pointing to Vercel
   - Or add A records for apex domain
4. SSL certificate is automatically provisioned

### Backend Domain (Railway/Render)

#### Railway

1. Go to Service Settings → Networking
2. Generate a domain or add custom domain
3. Configure DNS records as instructed
4. SSL is automatically provisioned

#### Render

1. Go to Service Settings → Custom Domains
2. Add your custom domain
3. Configure DNS records (CNAME or A records)
4. SSL certificate is automatically provisioned

### DNS Configuration Example

```
# Frontend (Vercel)
app.your-domain.com    CNAME    cname.vercel-dns.com

# Backend API (Railway/Render)
api.your-domain.com    CNAME    your-service.railway.app
# or
api.your-domain.com    CNAME    your-service.onrender.com
```

## Post-Deployment Checklist

After deployment, verify:

- [ ] Frontend is accessible at your domain
- [ ] Backend API is accessible and responding
- [ ] Health check endpoint returns 200 OK
- [ ] Database migrations ran successfully
- [ ] Environment variables are set correctly
- [ ] CORS is configured properly (frontend can call backend)
- [ ] Authentication is working (login/register)
- [ ] Email notifications are sending (test with a registration)
- [ ] SSL certificates are active (HTTPS)
- [ ] Monitoring/error tracking is configured
- [ ] CI/CD pipeline is working (test with a small change)
- [ ] Database backups are configured
- [ ] Logs are accessible in deployment platform

## Troubleshooting

### Frontend Deployment Issues

**Build Fails**:

- Check build logs in Vercel dashboard
- Verify all dependencies are in `package.json`
- Ensure monorepo structure is correct

**Environment Variables Not Working**:

- Verify variables are set in Vercel dashboard
- Check variable names match exactly (case-sensitive)
- Redeploy after adding new variables

### Backend Deployment Issues

**Application Won't Start**:

- Check logs in Railway/Render dashboard
- Verify `DATABASE_URL` is set correctly
- Ensure `JWT_SECRET` is set in production
- Check port configuration matches platform requirements

**Database Connection Errors**:

- Verify `DATABASE_URL` format is correct
- Check database is accessible from deployment platform
- Ensure database allows connections from deployment IP

**CORS Errors**:

- Verify `CORS_ORIGIN` includes your frontend domain
- Check frontend `NEXT_PUBLIC_API_URL` matches backend URL
- Ensure no trailing slashes in URLs

### CI/CD Issues

**Deployment Not Triggering**:

- Verify workflow file is in `.github/workflows/`
- Check branch name matches workflow triggers
- Ensure GitHub Actions are enabled for repository

**Tests Failing in CI**:

- Check test database setup
- Verify environment variables in CI
- Review test logs for specific failures

## Additional Resources

- [Vercel Documentation](https://vercel.com/docs)
- [Railway Documentation](https://docs.railway.app)
- [Render Documentation](https://render.com/docs)
- [Next.js Deployment](https://nextjs.org/docs/deployment)
- [Prisma Deployment](https://www.prisma.io/docs/guides/deployment)

## Support

For deployment issues:

1. Check deployment platform logs
2. Review environment variable configuration
3. Verify database connectivity
4. Check CI/CD workflow logs
5. Review application logs for errors
