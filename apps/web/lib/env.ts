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
  // Allow a default for development (Next.js sets NODE_ENV=production during build)
  // In actual production runtime, this should be set via environment variable
  // TODO: Validate at runtime that a proper secret is set in production
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
