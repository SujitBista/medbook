import { PrismaClient } from "@prisma/client";
import { config } from "dotenv";
import { resolve } from "path";

// Load environment variables from packages/db/.env
// Prisma needs DATABASE_URL to be available when PrismaClient is instantiated
config({ path: resolve(__dirname, "../.env") });

// Create a singleton Prisma client instance
const prisma = new PrismaClient({
  log:
    process.env.NODE_ENV === "development"
      ? ["query", "error", "warn"]
      : ["error"],
});

/**
 * Helper function to execute queries
 * Provides a consistent interface for database operations
 *
 * @example
 * const user = await query((prisma) => prisma.user.findUnique({ where: { id } }));
 */
export async function query<T>(
  callback: (prisma: PrismaClient) => Promise<T>
): Promise<T> {
  return callback(prisma);
}

/**
 * Helper function to execute transactions
 * Ensures atomic operations across multiple database calls
 *
 * @example
 * const result = await withTransaction(async (tx) => {
 *   const user = await tx.user.create({ data: {...} });
 *   await tx.profile.create({ data: { userId: user.id } });
 *   return user;
 * });
 */
export async function withTransaction<T>(
  callback: (
    tx: Omit<
      PrismaClient,
      "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends"
    >
  ) => Promise<T>
): Promise<T> {
  return prisma.$transaction(callback);
}

/**
 * Health check function to verify database connection
 * Returns true if database is accessible, false otherwise
 */
export async function checkDatabaseHealth(): Promise<boolean> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return true;
  } catch {
    return false;
  }
}

export { prisma };
export * from "@prisma/client";
