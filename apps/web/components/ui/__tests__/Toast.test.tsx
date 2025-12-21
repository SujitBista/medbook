import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ToastComponent, Toast } from "@medbook/ui";

describe("ToastComponent", () => {
  const mockToast: Toast = {
    id: "test-toast-1",
    message: "Test message",
    type: "success",
    duration: 5000,
  };

  const mockOnClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders toast message", () => {
    render(<ToastComponent toast={mockToast} onClose={mockOnClose} />);
    expect(screen.getByText("Test message")).toBeInTheDocument();
  });

  it("renders success icon for success type", () => {
    render(
      <ToastComponent
        toast={{ ...mockToast, type: "success" }}
        onClose={mockOnClose}
      />
    );
    expect(screen.getByText("✓")).toBeInTheDocument();
  });

  it("renders error icon for error type", () => {
    render(
      <ToastComponent
        toast={{ ...mockToast, type: "error" }}
        onClose={mockOnClose}
      />
    );
    expect(screen.getByText("✕")).toBeInTheDocument();
  });

  it("renders warning icon for warning type", () => {
    render(
      <ToastComponent
        toast={{ ...mockToast, type: "warning" }}
        onClose={mockOnClose}
      />
    );
    expect(screen.getByText("⚠")).toBeInTheDocument();
  });

  it("renders info icon for info type", () => {
    render(
      <ToastComponent
        toast={{ ...mockToast, type: "info" }}
        onClose={mockOnClose}
      />
    );
    expect(screen.getByText("ℹ")).toBeInTheDocument();
  });

  it("calls onClose when close button is clicked", async () => {
    const user = userEvent.setup({ delay: null });
    render(<ToastComponent toast={mockToast} onClose={mockOnClose} />);

    const closeButton = screen.getByLabelText("Close notification");
    await user.click(closeButton);

    expect(mockOnClose).toHaveBeenCalledWith("test-toast-1");
  });

  it("has proper ARIA attributes", () => {
    render(<ToastComponent toast={mockToast} onClose={mockOnClose} />);
    const toast = screen.getByRole("alert");
    expect(toast).toHaveAttribute("aria-live", "assertive");
  });

  it("auto-closes after duration", async () => {
    render(<ToastComponent toast={mockToast} onClose={mockOnClose} />);

    vi.advanceTimersByTime(5000);

    await waitFor(() => {
      expect(mockOnClose).toHaveBeenCalledWith("test-toast-1");
    });
  });

  it("does not auto-close when duration is 0", async () => {
    render(
      <ToastComponent
        toast={{ ...mockToast, duration: 0 }}
        onClose={mockOnClose}
      />
    );

    vi.advanceTimersByTime(10000);

    await waitFor(
      () => {
        expect(mockOnClose).not.toHaveBeenCalled();
      },
      { timeout: 100 }
    );
  });
});
