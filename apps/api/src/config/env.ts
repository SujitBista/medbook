/**
 * Environment configuration
 * Validates and exports environment variables
 */

/**
 * Normalizes an origin URL (lowercase, no trailing slash)
 */
export function normalizeOrigin(origin: string): string {
  return origin.toLowerCase().replace(/\/$/, "");
}

/**
 * Parses comma-separated CORS origins and normalizes them
 */
function parseCorsOrigins(origins: string): string[] {
  return origins
    .split(",")
    .map((origin) => origin.trim())
    .filter((origin) => origin.length > 0)
    .map(normalizeOrigin);
}

const port = parseInt(process.env.PORT || "4000", 10);

/**
 * Gets JWT secret with production runtime validation
 * Allows development default but requires secret in production runtime
 */
function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;

  if (secret) {
    return secret;
  }

  // Require secret in production runtime
  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "JWT_SECRET is required in production. " +
        "Generate one with: openssl rand -base64 32"
    );
  }

  // Development: allow fallback with warning
  console.warn(
    "⚠️  Using development JWT_SECRET. Set JWT_SECRET in production!"
  );
  return "development-jwt-secret-change-in-production";
}

/**
 * Gets Resend API key with production runtime validation
 * Returns undefined in development if not set (emails will be logged instead)
 */
function getResendApiKey(): string | undefined {
  const apiKey = process.env.RESEND_API_KEY;

  if (apiKey) {
    return apiKey;
  }

  // Require API key in production runtime
  if (process.env.NODE_ENV === "production") {
    console.warn(
      "⚠️  RESEND_API_KEY not set. Emails will not be sent in production!"
    );
  }

  // Development: emails will be logged instead of sent
  return undefined;
}

export const env = {
  nodeEnv: process.env.NODE_ENV || "development",
  port,
  apiUrl: process.env.API_URL || `http://localhost:${port}`,
  corsOrigins: parseCorsOrigins(
    process.env.CORS_ORIGIN ||
      "http://localhost:3000,http://127.0.0.1:3000,http://[::1]:3000"
  ),
  corsAllowNoOrigin: process.env.CORS_ALLOW_NO_ORIGIN === "true",
  corsAllowNullOrigin: process.env.CORS_ALLOW_NULL_ORIGIN === "true",
  jwtSecret: getJwtSecret(),
  // Email configuration - use getters for lazy evaluation after dotenv loads
  get resendApiKey(): string | undefined {
    return getResendApiKey();
  },
  get emailFrom(): string {
    return process.env.EMAIL_FROM || "MedBook <noreply@medbook.com>";
  },
  get appUrl(): string {
    return process.env.APP_URL || "http://localhost:3000";
  },
};

export const isDevelopment = env.nodeEnv === "development";
export const isProduction = env.nodeEnv === "production";
