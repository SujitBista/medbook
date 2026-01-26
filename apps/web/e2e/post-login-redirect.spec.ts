/**
 * E2E tests for post-login redirect to appointment confirm step.
 * Verifies that when an unauthenticated user selects a slot, clicks "Sign in to book",
 * and completes login, they are redirected back to the confirm page with the selection restored.
 *
 * Requires: doctors with available slots (seed data or manual setup).
 * Run against local dev stack (web + API + DB).
 */

import { test, expect } from "@playwright/test";

test.describe("Post-login redirect to confirm step", () => {
  test("redirects back to confirm step with slot preserved after sign-in", async ({
    page,
  }) => {
    const email = `redirect-${Date.now()}@example.com`;
    const password = "TestPassword123!";

    // Register a user (we will not log in yet)
    await page.goto("/register");
    await page.getByLabel(/first name/i).fill("Jane");
    await page.getByLabel(/last name/i).fill("Doe");
    await page.getByLabel(/phone number/i).fill("1234567890");
    await page.getByLabel(/email/i).fill(email);
    await page.getByLabel(/^password$/i).fill(password);
    await page.getByLabel(/confirm password/i).fill(password);
    await page.getByRole("button", { name: /create account/i }).click();

    // Wait for redirect to login, then go to doctors (still unauthenticated)
    await page.waitForURL(/.*login/, { timeout: 10000 });
    await page.goto("/doctors");

    // Navigate to first doctor detail page
    const firstDoctor = page
      .locator('[data-testid*="doctor"], .doctor-card, article')
      .first();
    if (!(await firstDoctor.isVisible())) {
      test.skip();
      return;
    }
    await firstDoctor.click();
    await page.waitForURL(/\/doctors\/[^/]+/, { timeout: 10000 });

    // Select first available time slot
    const timeSlot = page
      .locator(
        '[data-testid*="slot"], .time-slot, button:has-text(/AM|PM|\\d{1,2}:\\d{2}/)'
      )
      .first();
    if (!(await timeSlot.isVisible())) {
      test.skip();
      return;
    }
    await timeSlot.click();

    // Click "Sign in to book" (or "Sign In to Book")
    const signInToBook = page.getByRole("link", {
      name: /sign in to book/i,
    });
    await expect(signInToBook).toBeVisible({ timeout: 5000 });
    await signInToBook.click();

    // Should be on login with callbackUrl containing slotId and confirm=1
    await page.waitForURL(/.*login/, { timeout: 5000 });
    const loginUrl = page.url();
    const url = new URL(loginUrl);
    const callbackUrl = url.searchParams.get("callbackUrl");
    expect(callbackUrl).toBeTruthy();
    expect(callbackUrl).toMatch(/\/doctors\/.+/);
    expect(callbackUrl).toContain("slotId=");
    expect(callbackUrl).toContain("confirm=1");

    // Log in
    await page.getByLabel(/email/i).fill(email);
    await page.getByLabel(/^password$/i).fill(password);
    await page.getByRole("button", { name: /sign in/i }).click();

    // Should redirect back to doctor page (with confirm params)
    await page.waitForURL(/\/doctors\/[^/]+/, { timeout: 10000 });

    // Confirm step should be visible: booking form with "Confirm your appointment"
    const confirmForm = page.getByTestId("booking-confirm-form");
    await expect(confirmForm).toBeVisible({ timeout: 10000 });

    const confirmHeading = page.getByText(/confirm your appointment/i);
    await expect(confirmHeading).toBeVisible();
  });
});
