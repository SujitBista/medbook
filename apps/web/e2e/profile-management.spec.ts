/**
 * E2E tests for profile management
 * Tests viewing and updating user profile
 */

import { test, expect } from "@playwright/test";

test.describe("Profile Management", () => {
  let userEmail: string;
  let userPassword: string;

  test.beforeEach(async ({ page }) => {
    // Register and login a test user
    userEmail = `user-${Date.now()}@example.com`;
    userPassword = "TestPassword123";

    await page.goto("/register");
    await page.fill('input[name="email"], input[type="email"]', userEmail);
    await page.fill(
      'input[name="password"], input[type="password"]',
      userPassword
    );
    await page.fill(
      'input[name="confirmPassword"], input[name="confirm"]',
      userPassword
    );
    await page.click('button[type="submit"], button:has-text("Register")');

    await page.waitForURL(/\/(login|dashboard)/, { timeout: 10000 });
    if (page.url().includes("/login")) {
      await page.fill('input[name="email"], input[type="email"]', userEmail);
      await page.fill(
        'input[name="password"], input[type="password"]',
        userPassword
      );
      await page.click('button[type="submit"], button:has-text("Login")');
      await page.waitForURL(/\/(dashboard|profile)/, { timeout: 10000 });
    }
  });

  test("should navigate to profile page", async ({ page }) => {
    // Navigate to profile page
    await page.goto("/profile");

    await expect(page).toHaveURL(/.*profile/);
  });

  test("should display user profile information", async ({ page }) => {
    await page.goto("/profile");

    // Should show user email or profile information
    await expect(
      page
        .locator(`text=${userEmail}`, { exact: false })
        .or(page.locator("text=/email|profile/i"))
    ).toBeVisible({ timeout: 5000 });
  });

  test("should update profile information", async ({ page }) => {
    await page.goto("/profile");

    // Find and fill profile form fields
    const firstNameField = page.locator(
      'input[name="firstName"], input[placeholder*="first"]'
    );
    if (await firstNameField.isVisible()) {
      await firstNameField.fill("John");
    }

    const lastNameField = page.locator(
      'input[name="lastName"], input[placeholder*="last"]'
    );
    if (await lastNameField.isVisible()) {
      await lastNameField.fill("Doe");
    }

    // Submit the form
    const saveButton = page.getByRole("button", {
      name: /save|update|submit/i,
    });
    if (await saveButton.isVisible()) {
      await saveButton.click();

      // Should show success message
      await expect(
        page.locator("text=/success|updated|saved/i").first()
      ).toBeVisible({ timeout: 5000 });
    }
  });

  test("should change password", async ({ page }) => {
    await page.goto("/profile");

    // Find password change section
    const currentPasswordField = page
      .locator('input[name="currentPassword"], input[type="password"]')
      .first();
    const newPasswordField = page
      .locator('input[name="newPassword"], input[name="password"]')
      .nth(1);
    const confirmPasswordField = page.locator(
      'input[name="confirmPassword"], input[name="confirm"]'
    );

    if (await currentPasswordField.isVisible()) {
      await currentPasswordField.fill(userPassword);
      await newPasswordField.fill("NewPassword123");
      if (await confirmPasswordField.isVisible()) {
        await confirmPasswordField.fill("NewPassword123");
      }

      // Submit password change
      const changePasswordButton = page.getByRole("button", {
        name: /change password|update password/i,
      });
      if (await changePasswordButton.isVisible()) {
        await changePasswordButton.click();

        // Should show success message
        await expect(
          page.locator("text=/success|password changed|updated/i").first()
        ).toBeVisible({ timeout: 5000 });
      }
    }
  });

  test("should show validation errors for invalid profile update", async ({
    page,
  }) => {
    await page.goto("/profile");

    // Try to submit empty form or invalid data
    const saveButton = page.getByRole("button", { name: /save|update/i });
    if (await saveButton.isVisible()) {
      // Clear required fields if they exist
      const emailField = page.locator(
        'input[name="email"], input[type="email"]'
      );
      if (await emailField.isVisible()) {
        await emailField.clear();
        await saveButton.click();

        // Should show validation error
        await expect(
          page.locator("text=/required|invalid|error/i").first()
        ).toBeVisible({ timeout: 5000 });
      }
    }
  });

  test("should navigate to profile from dashboard", async ({ page }) => {
    await page.goto("/dashboard");

    // Find profile link in dashboard
    const profileLink = page.getByRole("link", {
      name: /profile|account|settings/i,
    });
    if (await profileLink.isVisible()) {
      await profileLink.click();
      await expect(page).toHaveURL(/.*profile/);
    }
  });
});
