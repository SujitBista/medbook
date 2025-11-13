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

export const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '4000', 10),
  apiUrl: process.env.API_URL || `http://localhost:${process.env.PORT || '4000'}`,
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:3000',
} as const;

export const isDevelopment = env.nodeEnv === 'development';
export const isProduction = env.nodeEnv === 'production';

