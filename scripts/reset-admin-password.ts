/**
 * Script to reset admin password in production database
 *
 * IMPORTANT: This script must be run from the packages/db directory
 * because it needs access to @prisma/client and bcrypt dependencies.
 *
 * Usage:
 *   cd packages/db && pnpm tsx ../../scripts/reset-admin-password.ts <email> <new-password>
 *
 * Example:
 *   cd packages/db && pnpm tsx ../../scripts/reset-admin-password.ts admin@medbook.com NewPassword123!
 *
 * Environment Variables:
 *   - DATABASE_URL: PostgreSQL connection string (required, must be in packages/db/.env)
 *
 * Note: Run from packages/db directory so Prisma can find the .env file and dependencies
 */

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";

/**
 * Validates password strength
 * Rules:
 * - Minimum 8 characters
 * - At least one uppercase letter
 * - At least one lowercase letter
 * - At least one number
 * - At least one special character (!@#$%^&*)
 */
function validatePassword(password: string): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (password.length < 8) {
    errors.push("Password must be at least 8 characters long");
  }

  if (!/[A-Z]/.test(password)) {
    errors.push("Password must contain at least one uppercase letter");
  }

  if (!/[a-z]/.test(password)) {
    errors.push("Password must contain at least one lowercase letter");
  }

  if (!/[0-9]/.test(password)) {
    errors.push("Password must contain at least one number");
  }

  if (!/[!@#$%^&*]/.test(password)) {
    errors.push(
      "Password must contain at least one special character (!@#$%^&*)"
    );
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

const prisma = new PrismaClient();

async function main() {
  const args = process.argv.slice(2);

  if (args.length < 2) {
    console.error("❌ Error: Missing required arguments");
    console.error("\nUsage:");
    console.error(
      "  pnpm tsx scripts/reset-admin-password.ts <email> <new-password>"
    );
    console.error("\nExample:");
    console.error(
      "  pnpm tsx scripts/reset-admin-password.ts admin@medbook.com NewPassword123!"
    );
    process.exit(1);
  }

  const email = args[0].toLowerCase().trim();
  const newPassword = args[1];

  // Validate password strength
  const passwordValidation = validatePassword(newPassword);
  if (!passwordValidation.valid) {
    console.error("❌ Error: Password does not meet requirements:");
    passwordValidation.errors.forEach((error) => {
      console.error(`  - ${error}`);
    });
    process.exit(1);
  }

  console.log(`🔐 Resetting password for: ${email}`);
  console.log("⏳ Connecting to database...");

  try {
    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        role: true,
        firstName: true,
        lastName: true,
      },
    });

    if (!user) {
      console.error(`❌ Error: User with email "${email}" not found`);
      process.exit(1);
    }

    console.log(
      `✅ Found user: ${user.firstName} ${user.lastName} (${user.role})`
    );

    // Hash new password
    console.log("⏳ Hashing password...");
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update password and clear mustResetPassword flag
    console.log("⏳ Updating password in database...");
    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        mustResetPassword: false,
      },
    });

    console.log("✅ Password reset successfully!");
    console.log(`\n📋 Summary:`);
    console.log(`   Email: ${user.email}`);
    console.log(`   Role: ${user.role}`);
    console.log(`   New password: ${newPassword}`);
    console.log(`   Must reset password: false`);
    console.log("\n⚠️  Remember to change this password after first login!");
  } catch (error) {
    console.error("❌ Error resetting password:", error);
    if (error instanceof Error) {
      console.error(`   ${error.message}`);
    }
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error("❌ Unexpected error:", error);
  process.exit(1);
});
