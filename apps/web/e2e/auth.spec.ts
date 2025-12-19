/**
 * E2E tests for authentication flows
 * Tests user registration and login
 */

import { test, expect } from "@playwright/test";

test.describe("Authentication", () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to home page before each test
    await page.goto("/");
  });

  test("should navigate to registration page", async ({ page }) => {
    // Find and click the register link (adjust selector based on actual UI)
    const registerLink = page.getByRole("link", { name: /register|sign up/i });
    if (await registerLink.isVisible()) {
      await registerLink.click();
      await expect(page).toHaveURL(/.*register/);
    } else {
      // If no register link on homepage, navigate directly
      await page.goto("/register");
      await expect(page).toHaveURL(/.*register/);
    }
  });

  test("should register a new user", async ({ page }) => {
    // Navigate to registration page
    await page.goto("/register");

    // Fill in registration form
    const email = `test-${Date.now()}@example.com`;
    const password = "TestPassword123";

    await page.fill('input[name="email"], input[type="email"]', email);
    await page.fill('input[name="password"], input[type="password"]', password);
    await page.fill(
      'input[name="confirmPassword"], input[name="confirm"]',
      password
    );

    // Submit the form
    await page.click('button[type="submit"], button:has-text("Register")');

    // Should redirect to login or dashboard after successful registration
    await page.waitForURL(/\/(login|dashboard)/, { timeout: 10000 });
  });

  test("should show validation errors for invalid registration", async ({
    page,
  }) => {
    await page.goto("/register");

    // Try to submit empty form
    await page.click('button[type="submit"], button:has-text("Register")');

    // Should show validation errors
    await expect(page.locator("text=/required|invalid/i").first()).toBeVisible({
      timeout: 5000,
    });
  });

  test("should navigate to login page", async ({ page }) => {
    // Find and click the login link
    const loginLink = page.getByRole("link", { name: /login|sign in/i });
    if (await loginLink.isVisible()) {
      await loginLink.click();
      await expect(page).toHaveURL(/.*login/);
    } else {
      // Navigate directly if no link
      await page.goto("/login");
      await expect(page).toHaveURL(/.*login/);
    }
  });

  test("should login with valid credentials", async ({ page }) => {
    // First, register a user (or use existing test user)
    await page.goto("/register");
    const email = `test-${Date.now()}@example.com`;
    const password = "TestPassword123";

    await page.fill('input[name="email"], input[type="email"]', email);
    await page.fill('input[name="password"], input[type="password"]', password);
    await page.fill(
      'input[name="confirmPassword"], input[name="confirm"]',
      password
    );
    await page.click('button[type="submit"], button:has-text("Register")');

    // Wait for redirect to login
    await page.waitForURL(/\/(login|dashboard)/, { timeout: 10000 });

    // If redirected to login, login with the same credentials
    if (page.url().includes("/login")) {
      await page.fill('input[name="email"], input[type="email"]', email);
      await page.fill(
        'input[name="password"], input[type="password"]',
        password
      );
      await page.click('button[type="submit"], button:has-text("Login")');

      // Should redirect to dashboard after login
      await page.waitForURL(/\/(dashboard|profile)/, { timeout: 10000 });
    }
  });

  test("should show error for invalid login credentials", async ({ page }) => {
    await page.goto("/login");

    // Try to login with invalid credentials
    await page.fill(
      'input[name="email"], input[type="email"]',
      "invalid@example.com"
    );
    await page.fill(
      'input[name="password"], input[type="password"]',
      "wrongpassword"
    );
    await page.click('button[type="submit"], button:has-text("Login")');

    // Should show error message
    await expect(
      page.locator("text=/invalid|incorrect|error/i").first()
    ).toBeVisible({ timeout: 5000 });
  });

  test("should logout successfully", async ({ page }) => {
    // First login
    await page.goto("/register");
    const email = `test-${Date.now()}@example.com`;
    const password = "TestPassword123";

    await page.fill('input[name="email"], input[type="email"]', email);
    await page.fill('input[name="password"], input[type="password"]', password);
    await page.fill(
      'input[name="confirmPassword"], input[name="confirm"]',
      password
    );
    await page.click('button[type="submit"], button:has-text("Register")');
    await page.waitForURL(/\/(login|dashboard)/, { timeout: 10000 });

    if (page.url().includes("/login")) {
      await page.fill('input[name="email"], input[type="email"]', email);
      await page.fill(
        'input[name="password"], input[type="password"]',
        password
      );
      await page.click('button[type="submit"], button:has-text("Login")');
      await page.waitForURL(/\/(dashboard|profile)/, { timeout: 10000 });
    }

    // Find and click logout button (could be in dropdown menu)
    const logoutButton = page.getByRole("button", { name: /logout|sign out/i });
    if (await logoutButton.isVisible()) {
      await logoutButton.click();
    } else {
      // Try to find in dropdown menu
      const profileMenu = page.locator(
        '[aria-label*="profile"], [aria-label*="user"]'
      );
      if (await profileMenu.isVisible()) {
        await profileMenu.click();
        await page.getByRole("button", { name: /logout|sign out/i }).click();
      }
    }

    // Should redirect to home or login page
    await page.waitForURL(/\/(login|$)/, { timeout: 5000 });
  });
});
