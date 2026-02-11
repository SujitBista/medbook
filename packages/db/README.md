# @app/db - Database Package

This package contains the Prisma schema, migrations, and database client for the MedBook application.

## Setup

1. Install dependencies:

   ```bash
   pnpm install
   ```

2. Set up environment variables in `packages/db/.env` (copy from `.env.example`):

   ```bash
   DATABASE_URL=postgresql://user:password@localhost:5432/medbook
   DIRECT_DATABASE_URL=postgresql://user:password@localhost:5432/medbook
   ```

   Use the same value for both unless you use a connection pooler (e.g. [Supabase](https://supabase.com)); see [Supabase setup](../../docs/SUPABASE_SETUP.md).

3. Generate Prisma Client:
   ```bash
   pnpm db:generate
   ```

## Migrations

### Creating a Migration

To create a new migration after modifying `schema.prisma`:

```bash
pnpm db:migrate
```

This will:

- Create a new migration file in `prisma/migrations/`
- Apply the migration to your database
- Regenerate Prisma Client

### Creating a Migration Without Applying

To create a migration file without applying it:

```bash
pnpm db:migrate:create
```

Then apply it later with:

```bash
pnpm db:migrate:deploy
```

**Important:** After applying the migration with `db:migrate:deploy`, you must regenerate the Prisma Client to sync types:

```bash
pnpm db:generate
```

**Note:** If you need the Prisma Client regenerated immediately, consider using `pnpm db:migrate` instead, which creates, applies, and regenerates the client in one step.

### Applying Migrations (Production)

To apply pending migrations in production:

```bash
pnpm db:migrate:deploy
```

### Migration Workflow

1. **Development:**
   - Modify `schema.prisma`
   - Run `pnpm db:migrate` (creates, applies migration, and regenerates Prisma Client)
   - Commit both `schema.prisma` and migration files

   **Alternative workflow (create-only):**
   - Modify `schema.prisma`
   - Run `pnpm db:migrate:create` (creates migration file only)
   - Review the migration file
   - Run `pnpm db:migrate:deploy` (applies migration)
   - Run `pnpm db:generate` (regenerates Prisma Client)
   - Commit both `schema.prisma` and migration files

2. **Production:**
   - Deploy code with new migrations
   - Run `pnpm db:migrate:deploy` to apply pending migrations
   - Run `pnpm db:generate` to regenerate Prisma Client (if schema changed)

### Resetting Database (Development Only)

⚠️ **Warning:** This will delete all data!

```bash
pnpm db:migrate:reset
```

## Seeding Database

To populate the database with sample data for development and testing:

```bash
pnpm db:seed
```

This will:

- Create sample users (admins, doctors, and patients)
- Use default password: `password123` for all users
- Clear existing users before seeding (to avoid duplicates)

**Note:** The seed script uses bcrypt to hash passwords. All seeded users will have the password `password123` (hashed). Remember to change passwords in production!

### Seed Script Location

- Seed script: `prisma/seed.ts`
- Run from root: `pnpm db:seed`
- Run from package: `pnpm --filter @app/db db:seed`

## Prisma Client

After generating the client, import it in your code:

```typescript
import { prisma, query, withTransaction, checkDatabaseHealth } from '@app/db';

// Use prisma directly
const user = await prisma.user.findUnique({ where: { id } });

// Or use helper functions
const user = await query((prisma) =>
  prisma.user.findUnique({ where: { id } })
);

// Use transactions
const result = await withTransaction(async (tx) => {
  const user = await tx.user.create({ data: {...} });
  return user;
});
```

## Scripts

- `db:generate` - Generate Prisma Client
- `db:migrate` - Create and apply migration (dev)
- `db:migrate:deploy` - Apply pending migrations (production)
- `db:migrate:create` - Create migration without applying
- `db:migrate:reset` - Reset database (dev only, deletes all data)
- `db:seed` - Seed database with sample data

## Schema Location

- Schema: `prisma/schema.prisma`
- Migrations: `prisma/migrations/`

## Database Connection Helpers

The package exports several helper functions:

- `prisma` - Prisma Client instance
- `query()` - Execute queries with consistent interface
- `withTransaction()` - Execute transactions atomically
- `checkDatabaseHealth()` - Verify database connection

See `src/index.ts` for implementation details.
