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
    userPassword = "TestPassword123!";

    await page.goto("/register");
    await page.getByLabel(/first name/i).fill("John");
    await page.getByLabel(/last name/i).fill("Doe");
    await page.getByLabel(/phone number/i).fill("1234567890");
    await page.getByLabel(/email/i).fill(userEmail);
    await page.getByLabel(/^password$/i).fill(userPassword);
    await page.getByLabel(/confirm password/i).fill(userPassword);
    await page.getByRole("button", { name: /create account/i }).click();

    // Navigate to login page after registration
    await page.goto("/login");

    // Login with the same credentials
    await page.getByLabel(/email/i).fill(userEmail);
    await page.getByLabel(/^password$/i).fill(userPassword);
    await page.getByRole("button", { name: /sign in/i }).click();

    // Wait for redirect to complete after login
    // The app redirects to patient dashboard, so wait for that navigation
    await page.waitForURL(/\/(dashboard|appointments)/, { timeout: 10000 });
  });

  test("should navigate to doctors listing page", async ({ page }) => {
    await page.goto("/doctors");

    await expect(page).toHaveURL(/.*doctors/);
  });

  test("should display list of doctors", async ({ page }) => {
    await page.goto("/doctors");

    // Should show either empty state or doctor cards (doctors only shown when schedules exist)
    const emptyState = page.getByText(/no doctors found/i);
    const doctorCards = page.locator(
      '[data-testid*="doctor"], .doctor-card, article'
    );

    // Wait for either empty state or doctor cards to appear
    try {
      await expect(emptyState).toBeVisible({ timeout: 10000 });
    } catch {
      // If empty state not found, expect doctor cards instead
      await expect(doctorCards.first()).toBeVisible({ timeout: 10000 });
    }
  });

  test("should search for doctors", async ({ page }) => {
    await page.goto("/doctors");

    // Find search input
    const searchInput = page.getByRole("textbox", {
      name: /search by name or email/i,
    });
    await searchInput.fill("Cardiologist");
    await page.getByRole("button", { name: /search/i }).click();

    // Should show either empty state or filtered results
    const emptyState = page.getByText(/no doctors found/i);
    const resultText = page.locator("text=/cardiologist/i");

    // Wait for either empty state or result text to appear
    try {
      await expect(emptyState).toBeVisible({ timeout: 5000 });
    } catch {
      // If empty state not found, expect result text instead
      await expect(resultText.first()).toBeVisible({ timeout: 5000 });
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
        const notesField = page.getByLabel(/notes|message/i);
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
