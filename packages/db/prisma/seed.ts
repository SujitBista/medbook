import { PrismaClient, UserRole } from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

/**
 * Seed the database with initial data
 * This script creates sample users for development and testing
 *
 * Set SEED_PASSWORD environment variable to customize the password.
 * Default: 'password123' (development only)
 */
async function main() {
  console.log("🌱 Starting database seed...");

  // Get password from environment variable or use default for development
  const defaultPassword = process.env.SEED_PASSWORD || "password123";

  if (!process.env.SEED_PASSWORD) {
    console.log(
      "⚠️  Using default password (password123). Set SEED_PASSWORD env var to customize."
    );
  }

  const hashedPassword = await bcrypt.hash(defaultPassword, 10);

  // Sample users data
  const users = [
    // Admin users - must reset password on first login
    {
      email: "admin@medbook.com",
      password: hashedPassword,
      role: UserRole.ADMIN,
      mustResetPassword: true,
      firstName: "Admin",
      lastName: "User",
      phoneNumber: "555-0001",
    },
    {
      email: "admin2@medbook.com",
      password: hashedPassword,
      role: UserRole.ADMIN,
      mustResetPassword: true,
      firstName: "Admin",
      lastName: "Two",
      phoneNumber: "555-0002",
    },
    // Doctor users
    {
      email: "doctor@medbook.com",
      password: hashedPassword,
      role: UserRole.DOCTOR,
      firstName: "Doctor",
      lastName: "Smith",
      phoneNumber: "555-1001",
    },
    {
      email: "doctor.smith@medbook.com",
      password: hashedPassword,
      role: UserRole.DOCTOR,
      firstName: "John",
      lastName: "Smith",
      phoneNumber: "555-1002",
    },
    {
      email: "doctor.jones@medbook.com",
      password: hashedPassword,
      role: UserRole.DOCTOR,
      firstName: "Jane",
      lastName: "Jones",
      phoneNumber: "555-1003",
    },
    // Patient users
    {
      email: "patient@medbook.com",
      password: hashedPassword,
      role: UserRole.PATIENT,
      firstName: "Patient",
      lastName: "User",
      phoneNumber: "555-2001",
    },
    {
      email: "patient.john@medbook.com",
      password: hashedPassword,
      role: UserRole.PATIENT,
      firstName: "John",
      lastName: "Doe",
      phoneNumber: "555-2002",
    },
    {
      email: "patient.jane@medbook.com",
      password: hashedPassword,
      role: UserRole.PATIENT,
      firstName: "Jane",
      lastName: "Doe",
      phoneNumber: "555-2003",
    },
    {
      email: "patient.bob@medbook.com",
      password: hashedPassword,
      role: UserRole.PATIENT,
      firstName: "Bob",
      lastName: "Smith",
      phoneNumber: "555-2004",
    },
  ];

  // Clear existing users (optional - comment out if you want to keep existing data)
  console.log("🗑️  Clearing existing users...");
  await prisma.user.deleteMany({});

  // Create users
  console.log(`📝 Creating ${users.length} users...`);
  for (const userData of users) {
    const user = await prisma.user.upsert({
      where: { email: userData.email },
      update: {
        password: userData.password,
        role: userData.role,
        mustResetPassword: userData.mustResetPassword ?? false,
        firstName: userData.firstName,
        lastName: userData.lastName,
        phoneNumber: userData.phoneNumber,
      },
      create: userData,
    });
    console.log(
      `  ✓ Created/Updated ${user.role.toLowerCase()}: ${user.email}`
    );
  }

  // Display summary
  const userCounts = await prisma.user.groupBy({
    by: ["role"],
    _count: true,
  });

  console.log("\n📊 Seed Summary:");
  userCounts.forEach(({ role, _count }) => {
    console.log(`  ${role}: ${_count} user(s)`);
  });

  console.log("\n✅ Database seed completed successfully!");
  if (!process.env.SEED_PASSWORD) {
    console.log("\n📌 Default password for all users: password123");
  }
  console.log("⚠️  Remember to change passwords in production!");
}

main()
  .catch((e) => {
    console.error("❌ Error seeding database:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
