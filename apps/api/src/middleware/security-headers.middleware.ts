/**
 * Security headers middleware
 * Sets security-related HTTP headers to protect against common vulnerabilities
 */

import type { Request, Response, NextFunction, RequestHandler } from "express";
import helmet from "helmet";
import { env } from "../config/env";

/**
 * Security headers middleware configured for production
 * Uses helmet with sensible defaults and custom configuration
 */
export const securityHeadersMiddleware: RequestHandler = helmet({
  // Content Security Policy - configure based on your needs
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"], // Allow inline styles (needed for some frameworks)
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"], // Allow data URIs and HTTPS images
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  // Cross-Origin Embedder Policy
  crossOriginEmbedderPolicy: false, // Set to true if you need COEP
  // Cross-Origin Opener Policy
  crossOriginOpenerPolicy: { policy: "same-origin" },
  // Cross-Origin Resource Policy
  crossOriginResourcePolicy: { policy: "same-origin" },
  // DNS Prefetch Control
  dnsPrefetchControl: true,
  // Frameguard - prevent clickjacking
  frameguard: { action: "deny" },
  // Hide powered-by header
  hidePoweredBy: true,
  // HSTS - HTTP Strict Transport Security
  hsts: {
    maxAge: 31536000, // 1 year
    includeSubDomains: true,
    preload: false, // Set to true if you want to be in HSTS preload list
  },
  // IE No Open
  ieNoOpen: true,
  // No Sniff - prevent MIME type sniffing
  noSniff: true,
  // Origin Agent Cluster
  originAgentCluster: true,
  // Referrer Policy
  referrerPolicy: { policy: "strict-origin-when-cross-origin" },
});

/**
 * Custom security headers middleware
 * Adds additional security headers not covered by helmet
 */
export function customSecurityHeadersMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // X-Content-Type-Options: nosniff (already handled by helmet, but explicit)
  res.setHeader("X-Content-Type-Options", "nosniff");

  // X-Frame-Options: DENY (already handled by helmet, but explicit)
  res.setHeader("X-Frame-Options", "DENY");

  // X-XSS-Protection (deprecated but still used by older browsers)
  res.setHeader("X-XSS-Protection", "1; mode=block");

  // Permissions Policy (formerly Feature Policy)
  // Set restrictive permissions policy to disable unnecessary browser features
  res.setHeader(
    "Permissions-Policy",
    [
      "accelerometer=()",
      "ambient-light-sensor=()",
      "autoplay=()",
      "battery=()",
      "camera=()",
      "cross-origin-isolated=()",
      "display-capture=()",
      "document-domain=()",
      "encrypted-media=()",
      "execution-while-not-rendered=()",
      "execution-while-rendered=()",
      "fullscreen=(self)",
      "geolocation=()",
      "gyroscope=()",
      "keyboard-map=()",
      "magnetometer=()",
      "microphone=()",
      "midi=()",
      "navigation-override=()",
      "payment=()",
      "picture-in-picture=()",
      "publickey-credentials-get=()",
      "screen-wake-lock=()",
      "sync-xhr=()",
      "usb=()",
      "web-share=()",
      "xr-spatial-tracking=()",
    ].join(", ")
  );

  // Don't expose server information
  res.removeHeader("X-Powered-By");

  // Note: HSTS is already handled by helmet, no need to set it again

  next();
}

/**
 * Combined security headers middleware
 * Applies both helmet and custom security headers
 */
export const securityHeaders: RequestHandler[] = [
  securityHeadersMiddleware,
  customSecurityHeadersMiddleware,
];
