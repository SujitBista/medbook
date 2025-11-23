# Environment Variables Documentation

This document describes all environment variables used across the MedBook monorepo.

## Quick Start

1. Copy `.env.example` files to `.env` in each directory:

   ```bash
   cp packages/db/.env.example packages/db/.env  # Database package (for Prisma)
   cp apps/api/.env.example apps/api/.env        # API server
   cp apps/web/.env.example apps/web/.env        # Web app
   ```

   **Important:** The database `.env` file must be in `packages/db/` (not the root) because Prisma commands run from that directory and only load `.env` files from the current working directory or `prisma/.env`.

2. Configure the required variables (see sections below)

3. Generate a NextAuth secret:
   ```bash
   openssl rand -base64 32
   ```

## Database Package Environment Variables

Located in `packages/db/.env`

**Important:** The `.env` file must be placed in `packages/db/` (not the repository root) because Prisma commands execute from that directory and only load `.env` files from:

- The current working directory (`packages/db/`)
- Or `packages/db/prisma/.env` (special Prisma location)

### `DATABASE_URL` (Required)

PostgreSQL connection string for Prisma.

**Format:** `postgresql://user:password@host:port/database`

**Example:**

```bash
DATABASE_URL=postgresql://postgres:password@localhost:5432/medbook
```

**Used by:** `packages/db` (Prisma)

---

### `SEED_PASSWORD` (Optional)

Custom password for seeded users during development.

- If not set, defaults to `password123`
- Only used when running `pnpm db:seed`
- **Never use default password in production!**

**Example:**

```bash
SEED_PASSWORD=my-dev-password
```

**Used by:** `packages/db/prisma/seed.ts`

---

## API Server Environment Variables

Located in `apps/api/.env`

### `NODE_ENV` (Optional)

Node.js environment mode.

**Values:** `development` | `production` | `test`

**Default:** `development`

**Example:**

```bash
NODE_ENV=production
```

---

### `PORT` (Optional)

Port number for the API server.

**Default:** `4000`

**Example:**

```bash
PORT=4000
```

---

### `API_URL` (Optional)

Full URL where the API is accessible.

**Default:** `http://localhost:{PORT}`

**Example:**

```bash
API_URL=http://localhost:4000
# or in production:
API_URL=https://api.medbook.com
```

---

### `CORS_ORIGIN` (Optional)

Comma-separated list of allowed CORS origins. Origins are automatically normalized (lowercase, no trailing slash).

**Default:** `http://localhost:3000,http://127.0.0.1:3000,http://[::1]:3000`

**Example:**

```bash
# Development
CORS_ORIGIN=http://localhost:3000,http://127.0.0.1:3000

# Production (multiple domains)
CORS_ORIGIN=https://app.medbook.com,https://staging.medbook.com
```

**Security Note:** Only include trusted origins. The API uses strict whitelist-based CORS policy.

---

### `CORS_ALLOW_NO_ORIGIN` (Optional)

Allow requests with no Origin header (e.g., Postman, curl, server-to-server requests).

**Values:** `true` | `false`

**Default:** `false`

**Example:**

```bash
CORS_ALLOW_NO_ORIGIN=true
```

**⚠️ Security Warning:** Only enable in development or for trusted server-to-server communication.

---

### `CORS_ALLOW_NULL_ORIGIN` (Optional)

Allow requests with `Origin: null` (file:// protocol, sandboxed iframes).

**Values:** `true` | `false`

**Default:** `false`

**Example:**

```bash
CORS_ALLOW_NULL_ORIGIN=true
```

**⚠️ Security Warning:** Only enable if you specifically need to support file:// protocol or sandboxed iframes.

---

## Web App Environment Variables

Located in `apps/web/.env`

### `NEXTAUTH_URL` (Optional)

Base URL of your application. Used by NextAuth.js for authentication callbacks.

**Default:** `http://localhost:3000`

**Example:**

```bash
# Development
NEXTAUTH_URL=http://localhost:3000

# Production
NEXTAUTH_URL=https://app.medbook.com
```

---

### `NEXTAUTH_SECRET` (Required)

Secret key used by NextAuth.js to encrypt JWT tokens and hash email verification tokens.

**Generate a secret:**

```bash
openssl rand -base64 32
```

**Example:**

```bash
NEXTAUTH_SECRET=your-generated-secret-key-here
```

**⚠️ Important:**

- Must be set in production
- Keep this secret secure
- Use a different secret for each environment

---

### `NEXT_PUBLIC_API_URL` (Optional)

Public API URL accessible from the browser. This is prefixed with `NEXT_PUBLIC_` so it's available in client-side code.

**Default:** `http://localhost:4000/api/v1`

**Example:**

```bash
# Development
NEXT_PUBLIC_API_URL=http://localhost:4000/api/v1

# Production
NEXT_PUBLIC_API_URL=https://api.medbook.com/api/v1
```

---

## Environment-Specific Configuration

### Development

```bash
# packages/db/.env
DATABASE_URL=postgresql://postgres:password@localhost:5432/medbook

# apps/api/.env
NODE_ENV=development
PORT=4000
CORS_ORIGIN=http://localhost:3000

# apps/web/.env
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=dev-secret-key-change-in-production
NEXT_PUBLIC_API_URL=http://localhost:4000/api/v1
```

### Production

```bash
# packages/db/.env
DATABASE_URL=postgresql://user:password@prod-db-host:5432/medbook

# apps/api/.env
NODE_ENV=production
PORT=4000
API_URL=https://api.medbook.com
CORS_ORIGIN=https://app.medbook.com
CORS_ALLOW_NO_ORIGIN=false
CORS_ALLOW_NULL_ORIGIN=false

# apps/web/.env
NEXTAUTH_URL=https://app.medbook.com
NEXTAUTH_SECRET=<strong-random-secret>
NEXT_PUBLIC_API_URL=https://api.medbook.com/api/v1
```

---

## Security Best Practices

1. **Never commit `.env` files** - They are in `.gitignore`
2. **Use strong secrets** - Generate `NEXTAUTH_SECRET` using `openssl rand -base64 32`
3. **Restrict CORS origins** - Only include trusted domains
4. **Use different secrets per environment** - Don't reuse secrets between dev/staging/prod
5. **Rotate secrets regularly** - Especially if compromised
6. **Use environment-specific values** - Different values for dev/staging/production

---

## Troubleshooting

### Missing Environment Variable Error

If you see an error like `Missing required environment variable: NEXTAUTH_SECRET`:

1. Check that you've copied `.env.example` to `.env`
2. Verify the variable name matches exactly (case-sensitive)
3. Ensure there are no extra spaces or quotes around values

### CORS Errors

If you're getting CORS errors:

1. Check `CORS_ORIGIN` includes your frontend URL
2. Verify origins are normalized (no trailing slashes, lowercase)
3. For development, you can temporarily enable `CORS_ALLOW_NO_ORIGIN=true`

### Database Connection Errors

If Prisma can't connect:

1. Verify `DATABASE_URL` format is correct
2. Check database is running and accessible
3. Test connection: `psql $DATABASE_URL`

---

## Related Documentation

- [API Server README](../apps/api/README.md) - API-specific environment setup
- [Database Package README](../packages/db/README.md) - Database setup and migrations
- [NextAuth.js Documentation](https://next-auth.js.org/configuration/options#nextauth_secret) - NextAuth configuration
