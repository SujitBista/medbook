/**
 * Tests for DoctorRegistrationModal component
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DoctorRegistrationModal } from "../DoctorRegistrationModal";

// Mock fetch for image upload
global.fetch = vi.fn();

describe("DoctorRegistrationModal", () => {
  const mockOnClose = vi.fn();
  const mockOnSuccess = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    (global.fetch as ReturnType<typeof vi.fn>).mockClear();
  });

  it("does not render when isOpen is false", () => {
    render(
      <DoctorRegistrationModal
        isOpen={false}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
      />
    );

    expect(screen.queryByText(/Register New Doctor/i)).not.toBeInTheDocument();
  });

  it("renders modal when isOpen is true", () => {
    render(
      <DoctorRegistrationModal
        isOpen={true}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
      />
    );

    expect(screen.getByText(/Register New Doctor/i)).toBeInTheDocument();
  });

  it("renders all required form fields", () => {
    render(
      <DoctorRegistrationModal
        isOpen={true}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
      />
    );

    // Required fields
    expect(screen.getByLabelText(/Email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Password/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Confirm Password/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/First Name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Last Name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Phone Number/i)).toBeInTheDocument();
    expect(
      screen.getByLabelText(/Medical License Number/i)
    ).toBeInTheDocument();
  });

  it("renders optional form fields", () => {
    render(
      <DoctorRegistrationModal
        isOpen={true}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
      />
    );

    // Optional fields
    expect(screen.getByLabelText(/Specialization/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Bio/i)).toBeInTheDocument();
  });

  it("allows user to input values in form fields", async () => {
    const user = userEvent.setup();
    render(
      <DoctorRegistrationModal
        isOpen={true}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
      />
    );

    const emailInput = screen.getByLabelText(/Email/i);
    const firstNameInput = screen.getByLabelText(/First Name/i);
    const lastNameInput = screen.getByLabelText(/Last Name/i);

    await user.type(emailInput, "doctor@example.com");
    await user.type(firstNameInput, "John");
    await user.type(lastNameInput, "Doe");

    expect(emailInput).toHaveValue("doctor@example.com");
    expect(firstNameInput).toHaveValue("John");
    expect(lastNameInput).toHaveValue("Doe");
  });

  it("shows validation error for empty required fields", async () => {
    const user = userEvent.setup();
    render(
      <DoctorRegistrationModal
        isOpen={true}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
      />
    );

    const submitButton = screen.getByRole("button", {
      name: /Register Doctor/i,
    });
    await user.click(submitButton);

    // Should show validation errors for required fields
    await waitFor(() => {
      expect(screen.getByText(/Email is required/i)).toBeInTheDocument();
    });
  });

  it("shows error when passwords do not match", async () => {
    const user = userEvent.setup();
    render(
      <DoctorRegistrationModal
        isOpen={true}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
      />
    );

    const passwordInput = screen.getByLabelText(/Password/i);
    const confirmPasswordInput = screen.getByLabelText(/Confirm Password/i);

    await user.type(passwordInput, "password123");
    await user.type(confirmPasswordInput, "password456");

    const submitButton = screen.getByRole("button", {
      name: /Register Doctor/i,
    });
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/Passwords do not match/i)).toBeInTheDocument();
    });
  });

  it("calls onClose when close button is clicked", async () => {
    const user = userEvent.setup();
    render(
      <DoctorRegistrationModal
        isOpen={true}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
      />
    );

    const closeButton = screen.getByRole("button", { name: /Close/i });
    await user.click(closeButton);

    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it("validates email format", async () => {
    const user = userEvent.setup();
    render(
      <DoctorRegistrationModal
        isOpen={true}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
      />
    );

    const emailInput = screen.getByLabelText(/Email/i);
    await user.type(emailInput, "invalid-email");

    const submitButton = screen.getByRole("button", {
      name: /Register Doctor/i,
    });
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/Invalid email format/i)).toBeInTheDocument();
    });
  });

  it("validates password strength", async () => {
    const user = userEvent.setup();
    render(
      <DoctorRegistrationModal
        isOpen={true}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
      />
    );

    const emailInput = screen.getByLabelText(/Email/i);
    const passwordInput = screen.getByLabelText(/Password/i);
    const confirmPasswordInput = screen.getByLabelText(/Confirm Password/i);

    await user.type(emailInput, "doctor@example.com");
    await user.type(passwordInput, "short");
    await user.type(confirmPasswordInput, "short");

    const submitButton = screen.getByRole("button", {
      name: /Register Doctor/i,
    });
    await user.click(submitButton);

    await waitFor(() => {
      expect(
        screen.getByText(/Password must be at least 8 characters/i)
      ).toBeInTheDocument();
    });
  });

  it("allows toggling password visibility", async () => {
    const user = userEvent.setup();
    render(
      <DoctorRegistrationModal
        isOpen={true}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
      />
    );

    const passwordInput = screen.getByLabelText(
      /Password/i
    ) as HTMLInputElement;
    await user.type(passwordInput, "password123");

    // Find and click the visibility toggle button
    const toggleButtons = screen.getAllByRole("button", {
      name: /toggle password visibility/i,
    });
    if (toggleButtons.length > 0) {
      await user.click(toggleButtons[0]);
      // Password should be visible (type="text")
      expect(passwordInput.type).toBe("text");
    }
  });

  it("resets form when modal is closed and reopened", async () => {
    const user = userEvent.setup();
    const { rerender } = render(
      <DoctorRegistrationModal
        isOpen={true}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
      />
    );

    const emailInput = screen.getByLabelText(/Email/i);
    await user.type(emailInput, "doctor@example.com");

    // Close modal
    const closeButton = screen.getByRole("button", { name: /Close/i });
    await user.click(closeButton);
    expect(mockOnClose).toHaveBeenCalled();

    // Reopen modal
    rerender(
      <DoctorRegistrationModal
        isOpen={true}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
      />
    );

    // Form should be reset
    const newEmailInput = screen.getByLabelText(/Email/i);
    expect(newEmailInput).toHaveValue("");
  });
});
