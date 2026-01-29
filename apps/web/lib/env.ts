/**
 * Environment variables configuration
 * This file provides type-safe access to environment variables
 * Compatible with Edge Runtime (used in middleware)
 */

function getEnvVar(key: string, defaultValue?: string): string {
  const value = process.env[key];
  if (!value && defaultValue === undefined) {
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
  // - For Vercel: only require secret if explicitly in runtime phase
  //   - During build: VERCEL is set but NEXT_PHASE is not "phase-production-server"
  //   - During runtime: NEXT_PHASE should be "phase-production-server" or similar
  // - For other platforms: check for runtime-specific environment variables
  //
  // IMPORTANT: When running 'next start' with NODE_ENV=production, Next.js sets
  // NEXT_PHASE="phase-production-server", so self-hosted deployments are protected.

  // Check if we're in a build phase - if so, allow fallback secret
  const nextPhase = process.env.NEXT_PHASE;
  const isBuildPhase =
    (nextPhase?.includes("build") ?? false) ||
    nextPhase === "phase-production-build" ||
    nextPhase === "phase-development-build";

  // If we're in a build phase, allow fallback (don't throw error)
  if (isBuildPhase) {
    // Build time: allow fallback with warning
    try {
      console.warn(
        "⚠️  Using development NEXTAUTH_SECRET during build. " +
          "CRITICAL: Set NEXTAUTH_SECRET when running in production!"
      );
    } catch {
      // Ignore if console is not available (Edge Runtime)
    }
    return "development-secret-change-in-production";
  }

  // Check if we're explicitly in runtime (not building)
  // For Vercel: only require secret if NEXT_PHASE indicates runtime
  // This prevents requiring secret during build when VERCEL env vars are set
  // During Vercel builds: VERCEL is set but NEXT_PHASE is not "phase-production-server"
  // During Vercel runtime: NEXT_PHASE should be "phase-production-server"
  const isExplicitRuntime =
    nextPhase === "phase-production-server" || // next start in production or Vercel runtime
    // Other serverless platforms (these are only set at runtime, not during build)
    process.env.AWS_LAMBDA_FUNCTION_NAME !== undefined || // AWS Lambda runtime
    process.env.AWS_EXECUTION_ENV !== undefined || // AWS runtime
    process.env.K_SERVICE !== undefined || // Cloud Run runtime
    process.env.FUNCTION_TARGET !== undefined || // Cloud Functions runtime
    process.env.RAILWAY_ENVIRONMENT !== undefined || // Railway runtime
    process.env.RENDER !== undefined; // Render runtime

  // Require secret for confirmed production runtime
  // This covers: next start, Vercel runtime, AWS, Cloud Run, Railway, Render, etc.
  // Note: Vercel builds are excluded because NEXT_PHASE won't be "phase-production-server" during build
  if (process.env.NODE_ENV === "production" && isExplicitRuntime) {
    throw new Error(
      "NEXTAUTH_SECRET is required in production runtime. " +
        "Generate one with: openssl rand -base64 32"
    );
  }

  // Build time or development: allow fallback with warning
  // Note: For self-hosted deployments, ensure NEXTAUTH_SECRET is set when running next start
  // Note: In Edge Runtime, console.warn may not be available, so we use a try-catch
  try {
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
  } catch {
    // Ignore if console is not available (Edge Runtime)
  }
  return "development-secret-change-in-production";
}

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;

  if (secret) {
    return secret;
  }

  // Use same fallback as backend for development
  // In production, JWT_SECRET should be set to match backend
  try {
    if (process.env.NODE_ENV === "production") {
      console.warn(
        "⚠️  JWT_SECRET is not set. This should match the backend JWT_SECRET in production!"
      );
    }
  } catch {
    // Ignore if console is not available (Edge Runtime)
  }
  return "development-jwt-secret-change-in-production";
}

// Export env object - ensure it's a named export for Edge Runtime compatibility
const env = {
  // NextAuth
  nextAuthUrl: getEnvVar("NEXTAUTH_URL", "http://localhost:3000"),
  // NEXTAUTH_SECRET is required for production but can use a default for development builds
  // In production, this MUST be set to a secure random string
  nextAuthSecret: getNextAuthSecret(),

  // JWT Secret for backend API calls (should match backend JWT_SECRET)
  jwtSecret: getJwtSecret(),

  // API
  apiUrl: (() => {
    const apiUrl = getEnvVar(
      "NEXT_PUBLIC_API_URL",
      "http://localhost:4000/api/v1"
    );
    // Validate API URL - ensure it's not empty or just a slash
    if (!apiUrl || apiUrl === "/" || apiUrl.trim() === "") {
      console.error(
        "[Env] Invalid NEXT_PUBLIC_API_URL detected. Using default.",
        { received: apiUrl }
      );
      return "http://localhost:4000/api/v1";
    }
    return apiUrl;
  })(),

  // Stripe
  stripePublishableKey: (() => {
    // In Next.js, NEXT_PUBLIC_ variables are available in both server and client
    // Access directly from process.env (Next.js handles the loading)
    const key = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || "";

    // Debug logging in development (server-side only)
    if (
      typeof window === "undefined" &&
      process.env.NODE_ENV === "development"
    ) {
      console.log("[Env] Stripe publishable key check:", {
        found: !!key,
        length: key?.length || 0,
        startsWith: key?.substring(0, 8) || "N/A",
        rawEnv: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
          ? "SET"
          : "NOT SET",
        allNextPublicKeys: Object.keys(process.env).filter((k) =>
          k.startsWith("NEXT_PUBLIC_")
        ),
      });
    }

    // Also log on client-side in development
    if (
      typeof window !== "undefined" &&
      process.env.NODE_ENV === "development"
    ) {
      console.log("[Env] Client-side Stripe key:", {
        found: !!key,
        length: key?.length || 0,
      });
    }

    return key;
  })(),
} as const;

export { env };
