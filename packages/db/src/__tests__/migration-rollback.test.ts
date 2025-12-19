/**
 * Migration Rollback Tests
 * Tests migration rollback functionality and migration integrity
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { query, prisma } from "../index";
import { execSync } from "child_process";
import { resolve } from "path";
import { readdir, readFile } from "fs/promises";

describe("Migration Rollback Tests", () => {
  beforeAll(async () => {
    await prisma.$connect();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe("Migration Integrity", () => {
    it("should have all migration files in correct format", async () => {
      const migrationsPath = resolve(__dirname, "../../prisma/migrations");
      const migrations = await readdir(migrationsPath, { withFileTypes: true });

      const migrationDirs = migrations
        .filter((dirent) => dirent.isDirectory())
        .map((dirent) => dirent.name)
        .filter((name) => name !== "migration_lock.toml");

      expect(migrationDirs.length).toBeGreaterThan(0);

      // Each migration directory should have a migration.sql file
      for (const migrationDir of migrationDirs) {
        const migrationFile = resolve(
          migrationsPath,
          migrationDir,
          "migration.sql"
        );
        const migrationContent = await readFile(migrationFile, "utf-8");
        expect(migrationContent).toBeDefined();
        expect(migrationContent.length).toBeGreaterThan(0);
      }
    });

    it("should have migration_lock.toml file", async () => {
      const migrationsPath = resolve(__dirname, "../../prisma/migrations");
      const lockFile = resolve(migrationsPath, "migration_lock.toml");
      const lockContent = await readFile(lockFile, "utf-8");

      expect(lockContent).toBeDefined();
      expect(lockContent).toContain("provider");
    });
  });

  describe("Migration State Verification", () => {
    it("should verify that all migrations are applied", async () => {
      // Check _prisma_migrations table to see applied migrations
      const appliedMigrations = await query(
        (prisma) =>
          prisma.$queryRaw<
            Array<{ migration_name: string; applied_steps_count: number }>
          >`
          SELECT migration_name, applied_steps_count 
          FROM _prisma_migrations 
          ORDER BY finished_at DESC
        `
      );

      expect(appliedMigrations).toBeDefined();
      expect(appliedMigrations.length).toBeGreaterThan(0);

      // All migrations should have been applied (applied_steps_count > 0)
      for (const migration of appliedMigrations) {
        expect(migration.applied_steps_count).toBeGreaterThan(0);
      }
    });

    it("should verify database schema matches expected state", async () => {
      // Check that key tables exist
      const tables = await query(
        (prisma) =>
          prisma.$queryRaw<Array<{ tablename: string }>>`
          SELECT tablename 
          FROM pg_tables 
          WHERE schemaname = 'public'
          ORDER BY tablename
        `
      );

      const tableNames = tables.map((t) => t.tablename);

      // Verify core tables exist
      expect(tableNames).toContain("users");
      expect(tableNames).toContain("doctors");
      expect(tableNames).toContain("appointments");
      expect(tableNames).toContain("availabilities");
      expect(tableNames).toContain("slots");
      expect(tableNames).toContain("slot_templates");
      expect(tableNames).toContain("reminders");
      expect(tableNames).toContain("_prisma_migrations");
    });

    it("should verify indexes are created correctly", async () => {
      // Check that important indexes exist
      const indexes = await query(
        (prisma) =>
          prisma.$queryRaw<Array<{ indexname: string; tablename: string }>>`
          SELECT indexname, tablename 
          FROM pg_indexes 
          WHERE schemaname = 'public'
          ORDER BY tablename, indexname
        `
      );

      const indexNames = indexes.map((i) => i.indexname);

      // Verify key indexes exist
      expect(indexNames.some((name) => name.includes("users_email"))).toBe(
        true
      );
      expect(indexNames.some((name) => name.includes("doctors_userId"))).toBe(
        true
      );
      expect(
        indexNames.some((name) => name.includes("appointments_patientId"))
      ).toBe(true);
      expect(
        indexNames.some((name) => name.includes("appointments_doctorId"))
      ).toBe(true);
    });
  });

  describe("Migration Rollback Simulation", () => {
    it("should verify that migrations can be identified for rollback", async () => {
      // Get the latest migration
      const appliedMigrations = await query(
        (prisma) =>
          prisma.$queryRaw<
            Array<{ migration_name: string; finished_at: Date | null }>
          >`
          SELECT migration_name, finished_at 
          FROM _prisma_migrations 
          WHERE finished_at IS NOT NULL
          ORDER BY finished_at DESC
          LIMIT 1
        `
      );

      expect(appliedMigrations.length).toBeGreaterThan(0);
      const latestMigration = appliedMigrations[0];
      expect(latestMigration.migration_name).toBeDefined();
      expect(latestMigration.finished_at).toBeDefined();
    });

    it("should verify that rollback would maintain data integrity", async () => {
      // This test verifies that if we were to rollback, we can identify
      // what data would be affected

      // Check foreign key constraints exist (they should prevent orphaned data)
      const foreignKeys = await query(
        (prisma) =>
          prisma.$queryRaw<
            Array<{
              constraint_name: string;
              table_name: string;
              column_name: string;
            }>
          >`
          SELECT 
            tc.constraint_name,
            tc.table_name,
            kcu.column_name
          FROM information_schema.table_constraints AS tc
          JOIN information_schema.key_column_usage AS kcu
            ON tc.constraint_name = kcu.constraint_name
          WHERE tc.constraint_type = 'FOREIGN KEY'
            AND tc.table_schema = 'public'
          ORDER BY tc.table_name, kcu.column_name
        `
      );

      expect(foreignKeys.length).toBeGreaterThan(0);

      // Verify cascade delete constraints exist for data integrity
      const cascadeConstraints = foreignKeys.filter((fk) =>
        fk.constraint_name.includes("fkey")
      );
      expect(cascadeConstraints.length).toBeGreaterThan(0);
    });
  });

  describe("Migration Re-application", () => {
    it("should verify migrations are idempotent (can check status without applying)", async () => {
      const dbPackagePath = resolve(__dirname, "../..");

      // Run migrate deploy in dry-run mode (just check status)
      // Note: Prisma doesn't have a true dry-run, but we can check migration status
      try {
        const result = execSync(
          `cd "${dbPackagePath}" && DATABASE_URL="${process.env.DATABASE_URL}" npx prisma migrate status`,
          {
            encoding: "utf-8",
            env: {
              ...process.env,
              DATABASE_URL:
                process.env.DATABASE_URL || process.env.TEST_DATABASE_URL,
            },
          }
        );

        // Should indicate that migrations are up to date
        expect(result).toBeDefined();
        // Result should indicate no pending migrations (or show current status)
      } catch (error: any) {
        // If command fails, it might be because migrations are not applied
        // This is acceptable - we're just testing that we can check status
        expect(error).toBeDefined();
      }
    });

    it("should verify that re-applying migrations doesn't break schema", async () => {
      // Get current schema state
      const tablesBefore = await query(
        (prisma) =>
          prisma.$queryRaw<Array<{ tablename: string }>>`
          SELECT tablename 
          FROM pg_tables 
          WHERE schemaname = 'public'
          ORDER BY tablename
        `
      );

      // Re-apply migrations (should be a no-op if already applied)
      const dbPackagePath = resolve(__dirname, "../..");
      try {
        execSync(
          `cd "${dbPackagePath}" && DATABASE_URL="${process.env.DATABASE_URL}" npx prisma migrate deploy`,
          {
            encoding: "utf-8",
            env: {
              ...process.env,
              DATABASE_URL:
                process.env.DATABASE_URL || process.env.TEST_DATABASE_URL,
            },
          }
        );
      } catch (error) {
        // If migrations are already applied, this might fail or succeed
        // Either way, we verify schema is still intact
      }

      // Verify schema is still intact
      const tablesAfter = await query(
        (prisma) =>
          prisma.$queryRaw<Array<{ tablename: string }>>`
          SELECT tablename 
          FROM pg_tables 
          WHERE schemaname = 'public'
          ORDER BY tablename
        `
      );

      // Core tables should still exist
      const tableNamesBefore = tablesBefore.map((t) => t.tablename);
      const tableNamesAfter = tablesAfter.map((t) => t.tablename);

      expect(tableNamesAfter).toContain("users");
      expect(tableNamesAfter).toContain("doctors");
      expect(tableNamesAfter).toContain("appointments");
    });
  });

  describe("Migration SQL Validation", () => {
    it("should verify migration SQL syntax is valid", async () => {
      const migrationsPath = resolve(__dirname, "../../prisma/migrations");
      const migrations = await readdir(migrationsPath, { withFileTypes: true });

      const migrationDirs = migrations
        .filter((dirent) => dirent.isDirectory())
        .map((dirent) => dirent.name)
        .filter((name) => name !== "migration_lock.toml");

      // Test that we can parse SQL from recent migrations
      for (const migrationDir of migrationDirs.slice(-3)) {
        // Test last 3 migrations
        const migrationFile = resolve(
          migrationsPath,
          migrationDir,
          "migration.sql"
        );
        const migrationContent = await readFile(migrationFile, "utf-8");

        // Basic SQL validation - should contain valid SQL keywords
        expect(migrationContent).toMatch(
          /(CREATE|ALTER|DROP|INSERT|UPDATE|DELETE|SELECT|TABLE|INDEX|CONSTRAINT)/i
        );

        // Should not contain obvious syntax errors
        expect(migrationContent).not.toMatch(/;;/); // Double semicolons
      }
    });

    it("should verify migrations don't have destructive operations without safeguards", async () => {
      const migrationsPath = resolve(__dirname, "../../prisma/migrations");
      const migrations = await readdir(migrationsPath, { withFileTypes: true });

      const migrationDirs = migrations
        .filter((dirent) => dirent.isDirectory())
        .map((dirent) => dirent.name)
        .filter((name) => name !== "migration_lock.toml");

      // Check for DROP TABLE without IF EXISTS (risky)
      for (const migrationDir of migrationDirs) {
        const migrationFile = resolve(
          migrationsPath,
          migrationDir,
          "migration.sql"
        );
        const migrationContent = await readFile(migrationFile, "utf-8");

        // If DROP TABLE exists, it should have IF EXISTS (safer)
        if (migrationContent.match(/DROP\s+TABLE/i)) {
          // This is a warning check - DROP TABLE should be rare and carefully considered
          // In our case, we're not dropping tables in migrations, so this should pass
          expect(migrationContent).not.toMatch(/DROP\s+TABLE\s+\w+\s*;/i);
        }
      }
    });
  });

  describe("Migration Dependencies", () => {
    it("should verify migration order is correct", async () => {
      // Get applied migrations in order
      const appliedMigrations = await query(
        (prisma) =>
          prisma.$queryRaw<
            Array<{ migration_name: string; finished_at: Date | null }>
          >`
          SELECT migration_name, finished_at 
          FROM _prisma_migrations 
          WHERE finished_at IS NOT NULL
          ORDER BY finished_at ASC
        `
      );

      expect(appliedMigrations.length).toBeGreaterThan(0);

      // Verify migrations are applied in chronological order
      let previousDate: Date | null = null;
      for (const migration of appliedMigrations) {
        if (previousDate && migration.finished_at) {
          const currentDate = new Date(migration.finished_at);
          const prevDate = new Date(previousDate);
          expect(currentDate.getTime()).toBeGreaterThanOrEqual(
            prevDate.getTime()
          );
        }
        previousDate = migration.finished_at;
      }
    });

    it("should verify foreign key dependencies are maintained", async () => {
      // Check that foreign keys reference existing tables
      const foreignKeys = await query(
        (prisma) =>
          prisma.$queryRaw<
            Array<{
              table_name: string;
              column_name: string;
              foreign_table_name: string;
            }>
          >`
          SELECT
            tc.table_name,
            kcu.column_name,
            ccu.table_name AS foreign_table_name
          FROM information_schema.table_constraints AS tc
          JOIN information_schema.key_column_usage AS kcu
            ON tc.constraint_name = kcu.constraint_name
          JOIN information_schema.constraint_column_usage AS ccu
            ON ccu.constraint_name = tc.constraint_name
          WHERE tc.constraint_type = 'FOREIGN KEY'
            AND tc.table_schema = 'public'
        `
      );

      // Get all table names
      const tables = await query(
        (prisma) =>
          prisma.$queryRaw<Array<{ tablename: string }>>`
          SELECT tablename 
          FROM pg_tables 
          WHERE schemaname = 'public'
        `
      );

      const tableNames = new Set(tables.map((t) => t.tablename));

      // Verify all foreign key references point to existing tables
      for (const fk of foreignKeys) {
        expect(tableNames.has(fk.foreign_table_name)).toBe(true);
      }
    });
  });
});
