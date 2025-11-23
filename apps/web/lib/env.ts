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

  // During build, Next.js sets NODE_ENV=production but we need to allow builds to succeed.
  // We detect runtime by checking if we're actually running a server (not building).
  //
  // Detection strategy:
  // - If NEXT_PHASE === "phase-production-server", we're definitely in runtime (next start)
  // - If platform runtime indicators are present, we're in runtime (Vercel, AWS, etc.)
  // - During build, NEXT_PHASE won't be "phase-production-server", so builds succeed
  //
  // IMPORTANT: When running 'next start' with NODE_ENV=production, Next.js sets
  // NEXT_PHASE="phase-production-server", so self-hosted deployments are protected.
  const isDefinitelyRuntime =
    process.env.NEXT_PHASE === "phase-production-server" || // next start in production
    process.env.VERCEL === "1" ||
    process.env.VERCEL_ENV === "production" ||
    process.env.AWS_LAMBDA_FUNCTION_NAME !== undefined ||
    process.env.AWS_EXECUTION_ENV !== undefined ||
    process.env.K_SERVICE !== undefined || // Cloud Run
    process.env.FUNCTION_TARGET !== undefined || // Cloud Functions
    process.env.RAILWAY_ENVIRONMENT !== undefined ||
    process.env.RENDER !== undefined;

  // Require secret for confirmed production runtime (including self-hosted with next start)
  // This covers: next start, Vercel, AWS, Cloud Run, Railway, Render, etc.
  // Self-hosted: next start sets NEXT_PHASE="phase-production-server", so it's protected
  if (process.env.NODE_ENV === "production" && isDefinitelyRuntime) {
    throw new Error(
      "NEXTAUTH_SECRET is required in production runtime. " +
        "Generate one with: openssl rand -base64 32"
    );
  }

  // Build time or development: allow fallback with warning
  // Note: For self-hosted deployments, ensure NEXTAUTH_SECRET is set when running next start
  if (process.env.NODE_ENV === "production") {
    console.warn(
      "⚠️  Using development NEXTAUTH_SECRET during build. " +
        "CRITICAL: Set NEXTAUTH_SECRET when running 'next start' in production!"
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
