import { test, expect } from "@playwright/test";

/**
 * E2E tests for authentication flows
 * Tests user registration and login
 */
test.describe("Authentication", () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to home page before each test
    await page.goto("/");
  });

  test("should navigate to registration page", async ({ page }) => {
    // Find and click the register link (adjust selector based on actual UI)
    const registerLink = page.getByRole("link", {
      name: /create account|sign up|register/i,
    });
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
    const password = "TestPassword123!";

    await page.getByLabel(/email/i).fill(email);
    await page.getByLabel(/^password$/i).fill(password);
    await page.getByLabel(/confirm password/i).fill(password);

    // Submit the form
    await page.getByRole("button", { name: /create account/i }).click();

    // Wait for "Sign in" link to appear after successful registration
    const signInLink = page.getByRole("link", { name: /sign in/i });
    await expect(signInLink).toBeVisible({ timeout: 10000 });
    await signInLink.click();
  });

  test("should show validation errors for invalid registration", async ({
    page,
  }) => {
    await page.goto("/register");

    // Try to submit empty form
    await page.getByRole("button", { name: /create account/i }).click();

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
    const password = "TestPassword123!";

    await page.getByLabel(/email/i).fill(email);
    await page.getByLabel(/^password$/i).fill(password);
    await page.getByLabel(/confirm password/i).fill(password);
    await page.getByRole("button", { name: /create account/i }).click();

    // Wait for "Sign in" link to appear after successful registration
    const signInLink = page.getByRole("link", { name: /sign in/i });
    await expect(signInLink).toBeVisible({ timeout: 10000 });
    await signInLink.click();

    // Login with the same credentials
    await page.getByLabel(/email/i).fill(email);
    await page.getByLabel(/^password$/i).fill(password);
    await page.getByRole("button", { name: /sign in/i }).click();

    // Should redirect to dashboard after login
    await page.waitForURL(/\/(dashboard|profile)/, { timeout: 10000 });
  });

  test("should show error for invalid login credentials", async ({ page }) => {
    await page.goto("/login");

    // Try to login with invalid credentials
    await page.getByLabel(/email/i).fill("invalid@example.com");
    await page.getByLabel(/^password$/i).fill("wrongpassword!");
    await page.getByRole("button", { name: /sign in/i }).click();

    // Should show error message
    await expect(
      page.locator("text=/invalid|incorrect|error/i").first()
    ).toBeVisible({ timeout: 5000 });
  });

  test("should logout successfully", async ({ page }) => {
    // First login
    await page.goto("/register");
    const email = `test-${Date.now()}@example.com`;
    const password = "TestPassword123!";

    await page.getByLabel(/email/i).fill(email);
    await page.getByLabel(/^password$/i).fill(password);
    await page.getByLabel(/confirm password/i).fill(password);
    await page.getByRole("button", { name: /create account/i }).click();

    // Wait for "Sign in" link to appear after successful registration
    const signInLink = page.getByRole("link", { name: /sign in/i });
    await expect(signInLink).toBeVisible({ timeout: 10000 });
    await signInLink.click();

    // Login with the same credentials
    await page.getByLabel(/email/i).fill(email);
    await page.getByLabel(/^password$/i).fill(password);
    await page.getByRole("button", { name: /sign in/i }).click();
    await page.waitForURL(/\/(dashboard|profile)/, { timeout: 10000 });

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
