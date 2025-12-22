/**
 * Input sanitization utilities
 * Provides functions to sanitize user input and prevent XSS and injection attacks
 */

/**
 * Sanitizes a string by removing potentially dangerous characters
 * Removes HTML tags, script tags, and other potentially malicious content
 *
 * @param input - The string to sanitize
 * @returns Sanitized string
 */
export function sanitizeString(input: string): string {
  if (typeof input !== "string") {
    return "";
  }

  // Remove script tags and their content first (before removing other HTML tags)
  let sanitized = input.replace(
    /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
    ""
  );

  // Remove remaining HTML tags
  sanitized = sanitized.replace(/<[^>]*>/g, "");

  // Remove event handlers (onclick, onerror, etc.)
  sanitized = sanitized.replace(/\s*on\w+\s*=\s*["'][^"']*["']/gi, "");

  // Remove javascript: protocol
  sanitized = sanitized.replace(/javascript:/gi, "");

  // Remove data: protocol (can be used for XSS)
  sanitized = sanitized.replace(/data:text\/html/gi, "");

  // Trim whitespace
  sanitized = sanitized.trim();

  return sanitized;
}

/**
 * Sanitizes an object by recursively sanitizing all string values
 *
 * @param input - The object to sanitize
 * @returns Sanitized object
 */
export function sanitizeObject<T extends Record<string, unknown>>(input: T): T {
  if (!input || typeof input !== "object") {
    return input;
  }

  const sanitized = { ...input };

  for (const key in sanitized) {
    if (Object.prototype.hasOwnProperty.call(sanitized, key)) {
      const value = sanitized[key];

      if (typeof value === "string") {
        sanitized[key] = sanitizeString(value) as T[Extract<keyof T, string>];
      } else if (value && typeof value === "object" && !Array.isArray(value)) {
        sanitized[key] = sanitizeObject(
          value as Record<string, unknown>
        ) as T[Extract<keyof T, string>];
      } else if (Array.isArray(value)) {
        sanitized[key] = value.map((item) => {
          if (typeof item === "string") {
            return sanitizeString(item);
          }
          if (item && typeof item === "object") {
            return sanitizeObject(item as Record<string, unknown>);
          }
          return item;
        }) as T[Extract<keyof T, string>];
      }
    }
  }

  return sanitized;
}

/**
 * Validates and sanitizes an email address
 *
 * @param email - The email to validate and sanitize
 * @returns Sanitized email or null if invalid
 */
export function sanitizeEmail(email: string): string | null {
  if (!email || typeof email !== "string") {
    return null;
  }

  // Basic email validation regex
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  // Trim and lowercase
  const trimmed = email.trim().toLowerCase();

  // Validate format
  if (!emailRegex.test(trimmed)) {
    return null;
  }

  // Additional sanitization - remove any HTML/script tags
  const sanitized = sanitizeString(trimmed);

  // Re-validate after sanitization
  if (!emailRegex.test(sanitized)) {
    return null;
  }

  return sanitized;
}

/**
 * Validates and sanitizes a phone number
 * Removes non-digit characters except + at the start
 *
 * @param phone - The phone number to sanitize
 * @returns Sanitized phone number or null if invalid
 */
export function sanitizePhone(phone: string): string | null {
  if (!phone || typeof phone !== "string") {
    return null;
  }

  // Remove HTML tags but preserve content (don't use sanitizeString which removes script content)
  let sanitized = phone.replace(/<[^>]*>/g, "");

  // Remove all non-digit characters except + at the start
  sanitized = sanitized.replace(/[^\d+]/g, "");

  // Ensure + is only at the start
  if (sanitized.includes("+") && !sanitized.startsWith("+")) {
    sanitized = sanitized.replace(/\+/g, "");
  }

  // Basic validation - should have at least 10 digits
  const digitsOnly = sanitized.replace(/\+/g, "");
  if (digitsOnly.length < 10) {
    return null;
  }

  return sanitized;
}

/**
 * Sanitizes a URL to prevent XSS and open redirect attacks
 *
 * @param url - The URL to sanitize
 * @param allowedProtocols - Array of allowed protocols (default: ['http', 'https'])
 * @returns Sanitized URL or null if invalid
 */
export function sanitizeUrl(
  url: string,
  allowedProtocols: string[] = ["http", "https"]
): string | null {
  if (!url || typeof url !== "string") {
    return null;
  }

  // Remove HTML/script tags first
  let sanitized = sanitizeString(url.trim());

  // If sanitization removed everything or made it invalid, return null
  if (!sanitized || sanitized.trim() === "") {
    return null;
  }

  // Check for javascript: or data: protocols
  if (
    sanitized.toLowerCase().startsWith("javascript:") ||
    sanitized.toLowerCase().startsWith("data:")
  ) {
    return null;
  }

  // Validate protocol
  try {
    const urlObj = new URL(sanitized);
    const protocol = urlObj.protocol.replace(":", "");

    if (!allowedProtocols.includes(protocol.toLowerCase())) {
      return null;
    }

    return sanitized;
  } catch {
    // If URL parsing fails, it might be a relative URL
    // Only allow relative URLs that don't start with // (which could be protocol-relative)
    if (sanitized.startsWith("//")) {
      return null;
    }

    // Allow relative URLs that start with /
    if (sanitized.startsWith("/")) {
      return sanitized;
    }

    return null;
  }
}

/**
 * Escapes special characters in a string for use in HTML
 * Prevents XSS attacks when rendering user input
 *
 * @param input - The string to escape
 * @returns HTML-escaped string
 */
export function escapeHtml(input: string): string {
  if (typeof input !== "string") {
    return "";
  }

  const htmlEscapes: Record<string, string> = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#x27;",
    "/": "&#x2F;",
  };

  return input.replace(/[&<>"'/]/g, (match) => htmlEscapes[match] || match);
}
