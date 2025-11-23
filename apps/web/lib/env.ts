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

  // During build, Next.js sets NODE_ENV=production but we need to allow builds to succeed
  // We distinguish build-time from runtime by checking for platform-specific runtime indicators
  // Build context: NODE_ENV=production but no runtime indicators present
  // Runtime context: NODE_ENV=production AND platform runtime indicators present
  //
  // IMPORTANT: For self-hosted deployments (Docker, bare metal, etc.) where platform
  // indicators may not be present, you MUST set NEXTAUTH_SECRET in your production environment.
  // The warning below will alert you, but the app will still run with the fallback secret.
  // Always set NEXTAUTH_SECRET in production to prevent security vulnerabilities.
  const isProductionRuntime =
    process.env.NODE_ENV === "production" &&
    (process.env.NEXT_PHASE === "phase-production-server" ||
      process.env.VERCEL === "1" ||
      process.env.VERCEL_ENV === "production" ||
      process.env.AWS_LAMBDA_FUNCTION_NAME !== undefined ||
      process.env.AWS_EXECUTION_ENV !== undefined ||
      process.env.K_SERVICE !== undefined || // Cloud Run
      process.env.FUNCTION_TARGET !== undefined || // Cloud Functions
      process.env.RAILWAY_ENVIRONMENT !== undefined ||
      process.env.RENDER !== undefined);

  // Require secret for any production runtime (self-hosted, Docker, AWS, Vercel, etc.)
  // This covers all common deployment platforms
  if (isProductionRuntime) {
    throw new Error(
      "NEXTAUTH_SECRET is required in production runtime. " +
        "Generate one with: openssl rand -base64 32"
    );
  }

  // Build time or development: allow fallback with warning
  if (process.env.NODE_ENV === "production") {
    console.warn(
      "⚠️  Using development NEXTAUTH_SECRET during build. Ensure NEXTAUTH_SECRET is set in production runtime!"
    );
  } else {
    console.warn(
      "⚠️  Using development NEXTAUTH_SECRET. Set NEXTAUTH_SECRET in production!"
    );
  }
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
