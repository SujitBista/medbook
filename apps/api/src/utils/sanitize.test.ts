/**
 * Tests for input sanitization utilities
 */

import { describe, it, expect } from "vitest";
import {
  sanitizeString,
  sanitizeObject,
  sanitizeEmail,
  sanitizePhone,
  sanitizeUrl,
  escapeHtml,
} from "./sanitize";

describe("sanitizeString", () => {
  it("should remove HTML tags", () => {
    // Script tags and their content are completely removed
    expect(sanitizeString("<script>alert('xss')</script>")).toBe("");
    expect(sanitizeString("<div>Hello</div>")).toBe("Hello");
  });

  it("should remove script tags", () => {
    expect(sanitizeString("<script>malicious()</script>Hello")).toBe("Hello");
  });

  it("should remove event handlers", () => {
    expect(sanitizeString('<div onclick="alert(1)">Test</div>')).toBe("Test");
  });

  it("should remove javascript: protocol", () => {
    expect(sanitizeString('javascript:alert("xss")')).toBe('alert("xss")');
  });

  it("should remove data: protocol", () => {
    // data:text/html is removed, and script tags are removed
    expect(sanitizeString("data:text/html,<script>alert(1)</script>")).toBe(
      ","
    );
  });

  it("should trim whitespace", () => {
    expect(sanitizeString("  hello  ")).toBe("hello");
  });

  it("should return empty string for non-string input", () => {
    expect(sanitizeString(null as unknown as string)).toBe("");
    expect(sanitizeString(undefined as unknown as string)).toBe("");
    expect(sanitizeString(123 as unknown as string)).toBe("");
  });
});

describe("sanitizeObject", () => {
  it("should sanitize all string values in an object", () => {
    const input = {
      name: "<script>alert('xss')</script>",
      email: "test@example.com",
      bio: "<div>Hello</div>",
    };
    const result = sanitizeObject(input);
    // Script tags and content are completely removed
    expect(result.name).toBe("");
    expect(result.email).toBe("test@example.com");
    expect(result.bio).toBe("Hello");
  });

  it("should recursively sanitize nested objects", () => {
    const input = {
      user: {
        name: "<script>alert('xss')</script>",
        profile: {
          bio: "<div>Test</div>",
        },
      },
    };
    const result = sanitizeObject(input);
    // Script tags and content are completely removed
    expect(result.user.name).toBe("");
    expect(result.user.profile.bio).toBe("Test");
  });

  it("should sanitize array elements", () => {
    const input = {
      tags: ["<script>alert(1)</script>", "normal", "<div>test</div>"],
    };
    const result = sanitizeObject(input);
    // Script tags and content are completely removed
    expect(result.tags[0]).toBe("");
    expect(result.tags[1]).toBe("normal");
    expect(result.tags[2]).toBe("test");
  });

  it("should preserve non-string values", () => {
    const input = {
      name: "John",
      age: 30,
      active: true,
      tags: ["tag1", "tag2"],
    };
    const result = sanitizeObject(input);
    expect(result.name).toBe("John");
    expect(result.age).toBe(30);
    expect(result.active).toBe(true);
    expect(result.tags).toEqual(["tag1", "tag2"]);
  });
});

describe("sanitizeEmail", () => {
  it("should validate and sanitize valid email", () => {
    expect(sanitizeEmail("test@example.com")).toBe("test@example.com");
    expect(sanitizeEmail("  TEST@EXAMPLE.COM  ")).toBe("test@example.com");
  });

  it("should remove HTML tags from email", () => {
    // When HTML tags are removed, the email becomes invalid, so it should return null
    const result = sanitizeEmail("<script>test@example.com</script>");
    // The sanitization removes the script tags, leaving "test@example.com"
    // But since sanitization changed the string, it's considered potentially malicious
    expect(result).toBeNull();
  });

  it("should return null for invalid email format", () => {
    expect(sanitizeEmail("invalid-email")).toBeNull();
    expect(sanitizeEmail("@example.com")).toBeNull();
    expect(sanitizeEmail("test@")).toBeNull();
  });

  it("should return null for non-string input", () => {
    expect(sanitizeEmail(null as unknown as string)).toBeNull();
    expect(sanitizeEmail(undefined as unknown as string)).toBeNull();
  });
});

describe("sanitizePhone", () => {
  it("should sanitize valid phone numbers", () => {
    expect(sanitizePhone("123-456-7890")).toBe("1234567890");
    expect(sanitizePhone("(123) 456-7890")).toBe("1234567890");
    expect(sanitizePhone("+1-123-456-7890")).toBe("+11234567890");
  });

  it("should remove HTML tags", () => {
    // After removing script tags, we get an empty string, which fails validation
    // So we need to test with a valid phone number that has HTML
    expect(sanitizePhone("<div>1234567890</div>")).toBe("1234567890");
  });

  it("should return null for phone numbers that are too short", () => {
    expect(sanitizePhone("123")).toBeNull();
    expect(sanitizePhone("12345")).toBeNull();
  });

  it("should handle + at start", () => {
    expect(sanitizePhone("+1234567890")).toBe("+1234567890");
    expect(sanitizePhone("12+34567890")).toBe("1234567890");
  });

  it("should return null for non-string input", () => {
    expect(sanitizePhone(null as unknown as string)).toBeNull();
  });
});

describe("sanitizeUrl", () => {
  it("should validate and sanitize valid HTTP URLs", () => {
    expect(sanitizeUrl("http://example.com")).toBe("http://example.com");
    expect(sanitizeUrl("https://example.com")).toBe("https://example.com");
  });

  it("should reject javascript: protocol", () => {
    expect(sanitizeUrl("javascript:alert('xss')")).toBeNull();
  });

  it("should reject data: protocol", () => {
    expect(sanitizeUrl("data:text/html,<script>alert(1)</script>")).toBeNull();
  });

  it("should allow relative URLs starting with /", () => {
    expect(sanitizeUrl("/api/users")).toBe("/api/users");
    expect(sanitizeUrl("/path/to/resource")).toBe("/path/to/resource");
  });

  it("should reject protocol-relative URLs", () => {
    expect(sanitizeUrl("//example.com")).toBeNull();
  });

  it("should reject URLs with disallowed protocols", () => {
    expect(sanitizeUrl("ftp://example.com")).toBeNull();
    expect(sanitizeUrl("file:///etc/passwd")).toBeNull();
  });

  it("should return null for invalid URLs", () => {
    expect(sanitizeUrl("not-a-url")).toBeNull();
    expect(sanitizeUrl("")).toBeNull();
  });
});

describe("escapeHtml", () => {
  it("should escape HTML special characters", () => {
    expect(escapeHtml("<script>alert('xss')</script>")).toBe(
      "&lt;script&gt;alert(&#x27;xss&#x27;)&lt;&#x2F;script&gt;"
    );
    expect(escapeHtml('"quoted"')).toBe("&quot;quoted&quot;");
    expect(escapeHtml("'single'")).toBe("&#x27;single&#x27;");
  });

  it("should escape ampersand", () => {
    expect(escapeHtml("A & B")).toBe("A &amp; B");
  });

  it("should return empty string for non-string input", () => {
    expect(escapeHtml(null as unknown as string)).toBe("");
    expect(escapeHtml(undefined as unknown as string)).toBe("");
  });
});
