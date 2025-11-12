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

export const env = {
  // NextAuth
  nextAuthUrl: getEnvVar("NEXTAUTH_URL", "http://localhost:3000"),
  nextAuthSecret: getEnvVar("NEXTAUTH_SECRET"),

  // API
  apiUrl: getEnvVar("NEXT_PUBLIC_API_URL", "http://localhost:4000/api/v1"),
} as const;

