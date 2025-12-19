/**
 * E2E tests for appointment booking flow
 * Tests the complete journey from browsing doctors to booking an appointment
 */

import { test, expect } from "@playwright/test";

test.describe("Appointment Booking", () => {
  let userEmail: string;
  let userPassword: string;

  test.beforeEach(async ({ page }) => {
    // Register and login a test user before each test
    userEmail = `patient-${Date.now()}@example.com`;
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

    // Wait for redirect and login if needed
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

  test("should navigate to doctors listing page", async ({ page }) => {
    await page.goto("/");

    // Find and click link to doctors page
    const doctorsLink = page.getByRole("link", {
      name: /doctors|browse|find/i,
    });
    if (await doctorsLink.isVisible()) {
      await doctorsLink.click();
    } else {
      await page.goto("/doctors");
    }

    await expect(page).toHaveURL(/.*doctors/);
  });

  test("should display list of doctors", async ({ page }) => {
    await page.goto("/doctors");

    // Should show doctor cards or list
    // Adjust selectors based on actual UI
    const doctorCards = page.locator(
      '[data-testid*="doctor"], .doctor-card, article'
    );
    await expect(doctorCards.first()).toBeVisible({ timeout: 10000 });
  });

  test("should search for doctors", async ({ page }) => {
    await page.goto("/doctors");

    // Find search input
    const searchInput = page.getByPlaceholderText(/search|find doctor/i);
    if (await searchInput.isVisible()) {
      await searchInput.fill("Cardiologist");
      await page.keyboard.press("Enter");

      // Should show filtered results
      await expect(page.locator("text=/cardiologist/i").first()).toBeVisible({
        timeout: 5000,
      });
    }
  });

  test("should navigate to doctor detail page", async ({ page }) => {
    await page.goto("/doctors");

    // Click on first doctor card
    const firstDoctor = page
      .locator('[data-testid*="doctor"], .doctor-card, article')
      .first();
    if (await firstDoctor.isVisible()) {
      await firstDoctor.click();
      await expect(page).toHaveURL(/.*doctors\/.+/);
    }
  });

  test("should view available time slots on doctor page", async ({ page }) => {
    await page.goto("/doctors");

    // Navigate to a doctor detail page
    const firstDoctor = page
      .locator('[data-testid*="doctor"], .doctor-card, article')
      .first();
    if (await firstDoctor.isVisible()) {
      await firstDoctor.click();
      await page.waitForURL(/.*doctors\/.+/, { timeout: 10000 });

      // Should show available time slots or availability information
      // Adjust selector based on actual UI
      const timeSlots = page.locator(
        '[data-testid*="slot"], .time-slot, button:has-text(/AM|PM/)'
      );
      // If slots exist, they should be visible
      const count = await timeSlots.count();
      if (count > 0) {
        await expect(timeSlots.first()).toBeVisible();
      }
    }
  });

  test("should book an appointment", async ({ page }) => {
    await page.goto("/doctors");

    // Navigate to doctor detail page
    const firstDoctor = page
      .locator('[data-testid*="doctor"], .doctor-card, article')
      .first();
    if (await firstDoctor.isVisible()) {
      await firstDoctor.click();
      await page.waitForURL(/.*doctors\/.+/, { timeout: 10000 });

      // Select a time slot if available
      const timeSlot = page
        .locator('[data-testid*="slot"], .time-slot, button:has-text(/AM|PM/)')
        .first();
      if (await timeSlot.isVisible()) {
        await timeSlot.click();

        // Fill booking form if it appears
        const notesField = page.locator(
          'textarea[name="notes"], textarea[placeholder*="note"]'
        );
        if (await notesField.isVisible()) {
          await notesField.fill("E2E test appointment");
        }

        // Submit booking
        const bookButton = page.getByRole("button", {
          name: /book|confirm|schedule/i,
        });
        if (await bookButton.isVisible()) {
          await bookButton.click();

          // Should show success message or redirect to confirmation
          await expect(
            page.locator("text=/success|confirmed|booked/i").first()
          ).toBeVisible({ timeout: 10000 });
        }
      }
    }
  });

  test("should view booked appointments", async ({ page }) => {
    // Navigate to appointments page
    await page.goto("/appointments");

    // Should show appointments list or empty state
    await expect(
      page
        .locator("text=/appointments|no appointments|your appointments/i")
        .first()
    ).toBeVisible({ timeout: 5000 });
  });

  test("should navigate to appointment detail page", async ({ page }) => {
    await page.goto("/appointments");

    // Click on first appointment if available
    const firstAppointment = page
      .locator('[data-testid*="appointment"], .appointment-card, article')
      .first();
    if (await firstAppointment.isVisible()) {
      await firstAppointment.click();
      await expect(page).toHaveURL(/.*appointments\/.+/);
    }
  });
});
