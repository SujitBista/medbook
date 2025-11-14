/**
 * Environment configuration
 * Validates and exports environment variables
 */

function getEnvVar(key: string, defaultValue?: string): string {
  const value = process.env[key] || defaultValue;
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

/**
 * Normalizes an origin URL (lowercase, no trailing slash)
 */
function normalizeOrigin(origin: string): string {
  return origin.toLowerCase().replace(/\/$/, '');
}

/**
 * Parses comma-separated CORS origins and normalizes them
 */
function parseCorsOrigins(origins: string): string[] {
  return origins
    .split(',')
    .map((origin) => origin.trim())
    .filter((origin) => origin.length > 0)
    .map(normalizeOrigin);
}

const port = parseInt(process.env.PORT || '4000', 10);

export const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port,
  apiUrl: process.env.API_URL || `http://localhost:${port}`,
  corsOrigins: parseCorsOrigins(
    process.env.CORS_ORIGIN || 'http://localhost:3000,http://127.0.0.1:3000,http://[::1]:3000'
  ),
  corsAllowNoOrigin: process.env.CORS_ALLOW_NO_ORIGIN === 'true',
  corsAllowNullOrigin: process.env.CORS_ALLOW_NULL_ORIGIN === 'true',
} as const;

export const isDevelopment = env.nodeEnv === 'development';
export const isProduction = env.nodeEnv === 'production';

