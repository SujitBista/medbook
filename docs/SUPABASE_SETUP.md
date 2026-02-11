# Supabase Database Setup

This guide covers using [Supabase](https://supabase.com) as the PostgreSQL database for MedBook. Supabase is PostgreSQL-compatible; no schema changes are required. You only need to point `DATABASE_URL` (and optionally the connection pooler) at your Supabase project.

**Existing projects:** If you already use another PostgreSQL host, add `DIRECT_DATABASE_URL` to `packages/db/.env` (same value as `DATABASE_URL`) so Prisma migrations continue to work.

## Prerequisites

- A [Supabase](https://supabase.com) account
- MedBook repo with Prisma and API configured

## 1. Create a Supabase project

1. Go to [Supabase Dashboard](https://supabase.com/dashboard) and sign in.
2. Click **New project**.
3. Choose your organization, set **Name** (e.g. `medbook`), **Database Password**, and **Region**.
4. Click **Create new project** and wait for the project to be ready.

## 2. Get connection strings

1. In the project, open **Settings** (gear) → **Database**.
2. Under **Connection string**, choose the tab you need:
   - **URI** – use this for a single connection string (simplest).
   - **Session pooler** or **Transaction pooler** – use when you want connection pooling (e.g. serverless or high concurrency).

### Option A: Direct connection (recommended to start)

- Select the **URI** tab.
- Copy the **Connection string** (e.g. `postgresql://postgres.[project-ref]:[YOUR-PASSWORD]@aws-0-[region].pooler.supabase.com:5432/postgres`).
- Replace `[YOUR-PASSWORD]` with your database password.
- Use this as both `DATABASE_URL` and `DIRECT_DATABASE_URL` (see below).

Example:

```bash
DATABASE_URL="postgresql://postgres.xxxxx:YOUR_PASSWORD@aws-0-us-east-1.pooler.supabase.com:5432/postgres"
```

### Option B: Connection pooling (for production / serverless)

For the **running app** (e.g. Render), use the **Transaction** pooler to avoid exhausting connections:

- **Transaction pooler** (port **6543**): best for serverless and Prisma.
- In **Connection string** → **Transaction** (or **Session**), copy the URI and replace the password.

Use:

- **`DATABASE_URL`** = Transaction (or Session) pooler URI (for Prisma Client at runtime).
- **`DIRECT_DATABASE_URL`** = **Direct** connection URI (for migrations and introspection).

Get the **Direct** URI from **Settings** → **Database** → **Connection string** → **Direct** (host like `db.[project-ref].supabase.co`, port `5432`).

Example:

```bash
# App runtime (pooled)
DATABASE_URL="postgresql://postgres.xxxxx:YOUR_PASSWORD@aws-0-us-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true"

# Migrations and CLI (direct)
DIRECT_DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@db.xxxxx.supabase.co:5432/postgres"
```

## 3. Configure MedBook

### packages/db

1. In `packages/db/`, ensure `.env` exists (e.g. copy from `.env.example`).
2. Set at least:
   - `DATABASE_URL` = your Supabase connection string (direct or pooler, see above).
   - `DIRECT_DATABASE_URL` = same as `DATABASE_URL` if you use only one URL; if you use the pooler for the app, set this to the **direct** Supabase URL.

### apps/api (and any app that connects to the DB)

1. In `apps/api/`, set `DATABASE_URL` in `.env` (or in your host’s env) to the **same** value you use for the API at runtime (direct or pooler, same as in `packages/db` when running the API).
2. For Render/Vercel/etc., set `DATABASE_URL` (and `DIRECT_DATABASE_URL` in the build/release context if you run migrations there) in the dashboard.

## 4. Run migrations

From the repo root:

```bash
pnpm db:migrate:deploy
```

Or from `packages/db` with env set:

```bash
cd packages/db
DATABASE_URL="postgresql://..." DIRECT_DATABASE_URL="postgresql://..." npx prisma migrate deploy
```

Migrations run against the **direct** connection when `DIRECT_DATABASE_URL` is set; otherwise they use `DATABASE_URL`.

## 5. (Optional) Seed the database

Only in development/staging:

```bash
cd packages/db
DATABASE_URL="your-supabase-url" pnpm db:seed
```

## 6. Deploy (e.g. Render)

1. In Render (or your backend host), set **Environment**:
   - `DATABASE_URL` = your Supabase URI (direct or pooler, same as used by the API).
   - If you use the pooler for the app and a direct URL for migrations, also set `DIRECT_DATABASE_URL` for the **Release Command** (so `pnpm db:migrate:deploy` uses the direct URL).
2. **Release Command**: keep `pnpm db:migrate:deploy && pnpm db:generate` so migrations run on each deploy.
3. **Start Command**: unchanged (e.g. `cd apps/api && pnpm start`).

See [RENDER_SETUP.md](../RENDER_SETUP.md) for full Render steps.

## Connection string reference

| Use case           | Host / port                               | Typical use        |
| ------------------ | ----------------------------------------- | ------------------ |
| Direct             | `db.[ref].supabase.co:5432`               | Migrations, CLI    |
| Session pooler     | `aws-0-[region].pooler.supabase.com:5432` | Long-lived servers |
| Transaction pooler | `aws-0-[region].pooler.supabase.com:6543` | Serverless, Prisma |

- Use **direct** for a single, simple `DATABASE_URL` (and same for `DIRECT_DATABASE_URL`).
- Use **transaction pooler** for `DATABASE_URL` at runtime and **direct** for `DIRECT_DATABASE_URL` when you need pooling.

## Troubleshooting

- **Migrations fail with pooler URL**  
  Use the **direct** connection for migrations: set `DIRECT_DATABASE_URL` to the direct URI (Settings → Database → Direct).

- **Too many connections**  
  Use the **Transaction** pooler (port 6543) for `DATABASE_URL` and keep `DIRECT_DATABASE_URL` for migrations.

- **SSL**  
  Supabase uses SSL by default. If you see SSL errors, ensure your connection string does not disable SSL (e.g. avoid `?sslmode=disable` unless Supabase supports it for your plan).

- **Password special characters**  
  If your database password contains `#`, `@`, `/`, etc., URL-encode it in the connection string.

## Related docs

- [ENV.md](../ENV.md) – All environment variables
- [RENDER_SETUP.md](../RENDER_SETUP.md) – Backend deployment
- [DEPLOYMENT.md](../DEPLOYMENT.md) – Full deployment guide
