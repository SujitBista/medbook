/**
 * Environment variables configuration
 * This file provides type-safe access to environment variables
 */

function getEnvVar(key: string, defaultValue?: string): string {
  const value = process.env[key];
  if (!value && !defaultValue) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value || defaultValue || "";
}

function getNextAuthSecret(): string {
  const secret = process.env.NEXTAUTH_SECRET;

  if (secret) {
    return secret;
  }

  // Runtime check: only allow fallback in actual development runtime
  // Next.js sets NODE_ENV=production during build, so we check multiple indicators
  const isProductionRuntime =
    process.env.NODE_ENV === "production" &&
    (process.env.VERCEL_ENV === "production" ||
      process.env.NEXT_PUBLIC_VERCEL_ENV === "production" ||
      process.env.VERCEL === "1"); // Vercel sets this in production

  if (isProductionRuntime) {
    // Production runtime: fail fast if secret is missing
    throw new Error(
      "NEXTAUTH_SECRET is required in production. " +
        "Generate one with: openssl rand -base64 32"
    );
  }

  // Development or build time: allow fallback with warning
  console.warn(
    "⚠️  Using development NEXTAUTH_SECRET. Set NEXTAUTH_SECRET in production!"
  );
  return "development-secret-change-in-production";
}

export const env = {
  // NextAuth
  nextAuthUrl: getEnvVar("NEXTAUTH_URL", "http://localhost:3000"),
  // NEXTAUTH_SECRET is required for production but can use a default for development builds
  // In production, this MUST be set to a secure random string
  nextAuthSecret: getNextAuthSecret(),

  // API
  apiUrl: getEnvVar("NEXT_PUBLIC_API_URL", "http://localhost:4000/api/v1"),
} as const;
