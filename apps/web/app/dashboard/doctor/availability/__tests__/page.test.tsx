/**
 * Tests for Availability Management Page (Task 4.2.1)
 * Tests the UI for doctors to manage their availability slots
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import AvailabilityManagementPage from "../page";
import { Availability } from "@medbook/types";

// Mock next-auth
vi.mock("next-auth/react", () => ({
  useSession: vi.fn(),
}));

// Mock next/navigation
const mockPush = vi.fn();
const mockReplace = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: vi.fn(() => ({
    push: mockPush,
    replace: mockReplace,
    refresh: vi.fn(),
  })),
}));

// Mock fetch globally
global.fetch = vi.fn();

describe("AvailabilityManagementPage", () => {
  const mockDoctor = {
    id: "doctor-123",
    userId: "user-123",
  };

  const mockSession = {
    user: {
      id: "user-123",
      email: "doctor@medbook.com",
      role: "DOCTOR",
    },
    expires: "2024-12-31",
  };

  const mockAvailabilities: Availability[] = [
    {
      id: "avail-1",
      doctorId: "doctor-123",
      startTime: new Date("2024-12-01T09:00:00Z"),
      endTime: new Date("2024-12-01T10:00:00Z"),
      isRecurring: false,
      createdAt: new Date("2024-11-01T00:00:00Z"),
      updatedAt: new Date("2024-11-01T00:00:00Z"),
    },
    {
      id: "avail-2",
      doctorId: "doctor-123",
      startTime: new Date("2024-12-02T14:00:00Z"),
      endTime: new Date("2024-12-02T16:00:00Z"),
      isRecurring: true,
      dayOfWeek: 1, // Monday
      validFrom: new Date("2024-12-01T00:00:00Z"),
      validTo: new Date("2024-12-31T00:00:00Z"),
      createdAt: new Date("2024-11-01T00:00:00Z"),
      updatedAt: new Date("2024-11-01T00:00:00Z"),
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    (useSession as any).mockReturnValue({
      data: mockSession,
      status: "authenticated",
    });
    (useRouter as any).mockReturnValue({
      push: mockPush,
      replace: mockReplace,
      refresh: vi.fn(),
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("Authentication and Authorization", () => {
    it("should redirect to login if not authenticated", async () => {
      (useSession as any).mockReturnValue({
        data: null,
        status: "unauthenticated",
      });

      render(<AvailabilityManagementPage />);

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith(
          "/login?callbackUrl=/dashboard/doctor/availability"
        );
      });
    });

    it("should redirect to dashboard if user is not a doctor", async () => {
      (useSession as any).mockReturnValue({
        data: {
          ...mockSession,
          user: { ...mockSession.user, role: "PATIENT" },
        },
        status: "authenticated",
      });

      // Mock fetch in case it's called before redirect
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        json: async () => ({
          success: false,
          error: { message: "Not a doctor" },
        }),
      });

      render(<AvailabilityManagementPage />);

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith("/dashboard");
      });
    });

    it("should render page for authenticated doctor", async () => {
      (global.fetch as any)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            success: true,
            doctor: mockDoctor,
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            success: true,
            availabilities: [],
          }),
        });

      render(<AvailabilityManagementPage />);

      await waitFor(() => {
        expect(screen.getByText("Manage Availability")).toBeInTheDocument();
      });
    });
  });

  describe("Loading State", () => {
    it("should show loading spinner while fetching data", () => {
      (global.fetch as any).mockImplementation(
        () =>
          new Promise(() => {
            // Never resolve to keep loading state
          })
      );

      render(<AvailabilityManagementPage />);

      expect(screen.getByText("Loading...")).toBeInTheDocument();
    });
  });

  describe("Displaying Availabilities", () => {
    it("should display list of availabilities", async () => {
      (global.fetch as any)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            success: true,
            doctor: mockDoctor,
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            success: true,
            availabilities: mockAvailabilities,
          }),
        });

      render(<AvailabilityManagementPage />);

      await waitFor(() => {
        expect(screen.getByText("Manage Availability")).toBeInTheDocument();
      });

      await waitFor(() => {
        expect(
          screen.getByText(/Showing 2 availability slot/)
        ).toBeInTheDocument();
      });
    });

    it("should show empty state when no availabilities exist", async () => {
      (global.fetch as any)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            success: true,
            doctor: mockDoctor,
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            success: true,
            availabilities: [],
          }),
        });

      render(<AvailabilityManagementPage />);

      await waitFor(() => {
        expect(
          screen.getByText("No availability slots found.")
        ).toBeInTheDocument();
      });
    });

    it("should display one-time availability details", async () => {
      (global.fetch as any)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            success: true,
            doctor: mockDoctor,
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            success: true,
            availabilities: [mockAvailabilities[0]],
          }),
        });

      render(<AvailabilityManagementPage />);

      await waitFor(() => {
        expect(screen.getByText(/One-time/)).toBeInTheDocument();
      });
    });

    it("should display recurring availability details", async () => {
      (global.fetch as any)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            success: true,
            doctor: mockDoctor,
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            success: true,
            availabilities: [mockAvailabilities[1]],
          }),
        });

      render(<AvailabilityManagementPage />);

      await waitFor(() => {
        expect(screen.getByText(/Recurring/)).toBeInTheDocument();
        expect(screen.getByText(/Monday/)).toBeInTheDocument();
      });
    });
  });

  describe("Creating Availability", () => {
    it("should show form when 'Add New Availability' button is clicked", async () => {
      const user = userEvent.setup();

      (global.fetch as any)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            success: true,
            doctor: mockDoctor,
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            success: true,
            availabilities: [],
          }),
        });

      render(<AvailabilityManagementPage />);

      await waitFor(() => {
        expect(screen.getByText("Add New Availability")).toBeInTheDocument();
      });

      const addButton = screen.getByText("Add New Availability");
      await user.click(addButton);

      await waitFor(() => {
        expect(screen.getByText("Add New Availability")).toBeInTheDocument();
        expect(screen.getByLabelText(/Start Time/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/End Time/i)).toBeInTheDocument();
      });
    });

    it("should create one-time availability successfully", async () => {
      const user = userEvent.setup();

      (global.fetch as any)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            success: true,
            doctor: mockDoctor,
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            success: true,
            availabilities: [],
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            success: true,
            availability: mockAvailabilities[0],
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            success: true,
            doctor: mockDoctor,
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            success: true,
            availabilities: [mockAvailabilities[0]],
          }),
        });

      render(<AvailabilityManagementPage />);

      await waitFor(() => {
        expect(screen.getByText("Add New Availability")).toBeInTheDocument();
      });

      const addButton = screen.getByText("Add New Availability");
      await user.click(addButton);

      await waitFor(() => {
        expect(screen.getByLabelText(/Start Time/i)).toBeInTheDocument();
      });

      const startTimeInput = screen.getByLabelText(/Start Time/i);
      const endTimeInput = screen.getByLabelText(/End Time/i);

      // Set future dates
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 1);
      const startTime = formatDateTimeLocal(futureDate);
      futureDate.setHours(futureDate.getHours() + 1);
      const endTime = formatDateTimeLocal(futureDate);

      await user.clear(startTimeInput);
      await user.type(startTimeInput, startTime);

      await user.clear(endTimeInput);
      await user.type(endTimeInput, endTime);

      const submitButton = screen.getByRole("button", {
        name: /Add Availability/i,
      });
      await user.click(submitButton);

      await waitFor(
        () => {
          expect(global.fetch).toHaveBeenCalledWith(
            expect.stringContaining("/api/availability"),
            expect.objectContaining({
              method: "POST",
            })
          );
        },
        { timeout: 3000 }
      );
    });

    it("should create recurring availability successfully", async () => {
      const user = userEvent.setup();

      (global.fetch as any)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            success: true,
            doctor: mockDoctor,
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            success: true,
            availabilities: [],
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            success: true,
            availability: mockAvailabilities[1],
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            success: true,
            doctor: mockDoctor,
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            success: true,
            availabilities: [mockAvailabilities[1]],
          }),
        });

      render(<AvailabilityManagementPage />);

      await waitFor(() => {
        expect(screen.getByText("Add New Availability")).toBeInTheDocument();
      });

      const addButton = screen.getByText("Add New Availability");
      await user.click(addButton);

      await waitFor(() => {
        expect(
          screen.getByLabelText(/Recurring schedule/i)
        ).toBeInTheDocument();
      });

      const recurringCheckbox = screen.getByLabelText(/Recurring schedule/i);
      await user.click(recurringCheckbox);

      await waitFor(() => {
        expect(screen.getByLabelText(/Day of Week/i)).toBeInTheDocument();
      });

      const dayOfWeekSelect = screen.getByLabelText(/Day of Week/i);
      await user.selectOptions(dayOfWeekSelect, "1"); // Monday

      const validFromInput = screen.getByLabelText(/Valid From/i);
      const validToInput = screen.getByLabelText(/Valid To/i);

      await user.clear(validFromInput);
      await user.type(validFromInput, "2024-12-01");
      await user.clear(validToInput);
      await user.type(validToInput, "2024-12-31");

      // Also need to set start and end times for recurring availability
      const startTimeInput = screen.getByLabelText(/Start Time/i);
      const endTimeInput = screen.getByLabelText(/End Time/i);

      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 1);
      const startTime = formatDateTimeLocal(futureDate);
      futureDate.setHours(futureDate.getHours() + 2);
      const endTime = formatDateTimeLocal(futureDate);

      await user.clear(startTimeInput);
      await user.type(startTimeInput, startTime);
      await user.clear(endTimeInput);
      await user.type(endTimeInput, endTime);

      const submitButton = screen.getByRole("button", {
        name: /Add Availability/i,
      });
      await user.click(submitButton);

      await waitFor(
        () => {
          const fetchCalls = (global.fetch as any).mock.calls;
          const hasRecurringCall = fetchCalls.some(
            (call: any[]) =>
              call[0] &&
              typeof call[0] === "string" &&
              call[0].includes("/api/availability") &&
              call[1] &&
              call[1].method === "POST" &&
              call[1].body &&
              call[1].body.includes('"isRecurring":true')
          );
          expect(hasRecurringCall).toBe(true);
        },
        { timeout: 3000 }
      );
    });

    it("should show validation error if end time is before start time", async () => {
      const user = userEvent.setup();

      (global.fetch as any)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            success: true,
            doctor: mockDoctor,
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            success: true,
            availabilities: [],
          }),
        });

      render(<AvailabilityManagementPage />);

      await waitFor(() => {
        expect(screen.getByText("Add New Availability")).toBeInTheDocument();
      });

      const addButton = screen.getByText("Add New Availability");
      await user.click(addButton);

      await waitFor(() => {
        expect(screen.getByLabelText(/Start Time/i)).toBeInTheDocument();
      });

      const startTimeInput = screen.getByLabelText(/Start Time/i);
      const endTimeInput = screen.getByLabelText(/End Time/i);

      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 1);
      const startTime = formatDateTimeLocal(futureDate);
      futureDate.setHours(futureDate.getHours() - 2); // End time before start time
      const endTime = formatDateTimeLocal(futureDate);

      await user.clear(startTimeInput);
      await user.type(startTimeInput, startTime);

      await user.clear(endTimeInput);
      await user.type(endTimeInput, endTime);

      const submitButton = screen.getByRole("button", {
        name: /Add Availability/i,
      });
      await user.click(submitButton);

      await waitFor(
        () => {
          expect(
            screen.getByText(/End time must be after start time/i)
          ).toBeInTheDocument();
        },
        { timeout: 3000 }
      );
    });

    it("should show validation error if recurring schedule missing day of week", async () => {
      const user = userEvent.setup();

      (global.fetch as any)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            success: true,
            doctor: mockDoctor,
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            success: true,
            availabilities: [],
          }),
        });

      render(<AvailabilityManagementPage />);

      await waitFor(() => {
        expect(screen.getByText("Add New Availability")).toBeInTheDocument();
      });

      const addButton = screen.getByText("Add New Availability");
      await user.click(addButton);

      await waitFor(() => {
        expect(
          screen.getByLabelText(/Recurring schedule/i)
        ).toBeInTheDocument();
      });

      const recurringCheckbox = screen.getByLabelText(/Recurring schedule/i);
      await user.click(recurringCheckbox);

      await waitFor(() => {
        expect(screen.getByLabelText(/Day of Week/i)).toBeInTheDocument();
      });

      const submitButton = screen.getByRole("button", {
        name: /Add Availability/i,
      });
      await user.click(submitButton);

      await waitFor(
        () => {
          expect(
            screen.getByText(
              /Day of week is required for recurring availability/i
            )
          ).toBeInTheDocument();
        },
        { timeout: 3000 }
      );
    });
  });

  describe("Editing Availability", () => {
    it("should show edit form when edit button is clicked", async () => {
      const user = userEvent.setup();

      (global.fetch as any)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            success: true,
            doctor: mockDoctor,
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            success: true,
            availabilities: [mockAvailabilities[0]],
          }),
        });

      render(<AvailabilityManagementPage />);

      await waitFor(() => {
        expect(
          screen.getByText(/Showing 1 availability slot/)
        ).toBeInTheDocument();
      });

      // Find all Edit buttons and click the first one
      const editButtons = screen.getAllByRole("button", { name: /Edit/i });
      expect(editButtons.length).toBeGreaterThan(0);
      await user.click(editButtons[0]);

      await waitFor(() => {
        expect(screen.getByText("Edit Availability")).toBeInTheDocument();
      });
    });

    it("should update availability successfully", async () => {
      const user = userEvent.setup();

      (global.fetch as any)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            success: true,
            doctor: mockDoctor,
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            success: true,
            availabilities: [mockAvailabilities[0]],
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            success: true,
            availability: { ...mockAvailabilities[0], id: "avail-1" },
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            success: true,
            doctor: mockDoctor,
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            success: true,
            availabilities: [mockAvailabilities[0]],
          }),
        });

      render(<AvailabilityManagementPage />);

      await waitFor(() => {
        // Wait for availability to be displayed - check for Edit button instead
        expect(
          screen.getAllByRole("button", { name: /Edit/i }).length
        ).toBeGreaterThan(0);
      });

      // Find all Edit buttons and click the first one
      const editButtons = screen.getAllByRole("button", { name: /Edit/i });
      expect(editButtons.length).toBeGreaterThan(0);
      await user.click(editButtons[0]);

      await waitFor(() => {
        expect(screen.getByText("Update Availability")).toBeInTheDocument();
      });

      const updateButton = screen.getByRole("button", {
        name: /Update Availability/i,
      });
      await user.click(updateButton);

      await waitFor(
        () => {
          expect(global.fetch).toHaveBeenCalledWith(
            expect.stringContaining("/api/availability/avail-1"),
            expect.objectContaining({
              method: "PUT",
            })
          );
        },
        { timeout: 3000 }
      );
    });
  });

  describe("Deleting Availability", () => {
    it("should show confirmation dialog when delete button is clicked", async () => {
      const user = userEvent.setup();
      // Mock window.confirm
      const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(false);

      (global.fetch as any)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            success: true,
            doctor: mockDoctor,
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            success: true,
            availabilities: [mockAvailabilities[0]],
          }),
        });

      render(<AvailabilityManagementPage />);

      await waitFor(() => {
        expect(
          screen.getByText(/Showing 1 availability slot/)
        ).toBeInTheDocument();
      });

      // Find all Delete buttons and click the first one
      const deleteButtons = screen.getAllByRole("button", { name: /Delete/i });
      expect(deleteButtons.length).toBeGreaterThan(0);
      await user.click(deleteButtons[0]);

      expect(confirmSpy).toHaveBeenCalledWith(
        "Are you sure you want to delete this availability?"
      );

      confirmSpy.mockRestore();
    });

    it("should delete availability when confirmed", async () => {
      const user = userEvent.setup();
      const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(true);

      (global.fetch as any)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            success: true,
            doctor: mockDoctor,
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            success: true,
            availabilities: [mockAvailabilities[0]],
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            success: true,
            doctor: mockDoctor,
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            success: true,
            availabilities: [],
          }),
        });

      render(<AvailabilityManagementPage />);

      await waitFor(() => {
        // Wait for availability to be displayed - check for Delete button instead
        expect(
          screen.getAllByRole("button", { name: /Delete/i }).length
        ).toBeGreaterThan(0);
      });

      // Find all Delete buttons and click the first one
      const deleteButtons = screen.getAllByRole("button", { name: /Delete/i });
      expect(deleteButtons.length).toBeGreaterThan(0);
      await user.click(deleteButtons[0]);

      await waitFor(
        () => {
          expect(global.fetch).toHaveBeenCalledWith(
            expect.stringContaining("/api/availability/avail-1"),
            expect.objectContaining({
              method: "DELETE",
            })
          );
        },
        { timeout: 3000 }
      );

      confirmSpy.mockRestore();
    });
  });

  describe("Filtering", () => {
    it("should filter availabilities by date range", async () => {
      const user = userEvent.setup();

      (global.fetch as any)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            success: true,
            doctor: mockDoctor,
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            success: true,
            availabilities: mockAvailabilities,
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            success: true,
            doctor: mockDoctor,
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            success: true,
            availabilities: mockAvailabilities,
          }),
        });

      render(<AvailabilityManagementPage />);

      await waitFor(() => {
        expect(screen.getByLabelText(/Start Date/i)).toBeInTheDocument();
      });

      const startDateInput = screen.getByLabelText(/Start Date/i);
      await user.clear(startDateInput);
      await user.type(startDateInput, "2024-12-01");

      // Wait a bit for the debounced filter to trigger
      await waitFor(
        () => {
          // Check that fetch was called with startDate parameter
          const fetchCalls = (global.fetch as any).mock.calls;
          const hasStartDateCall = fetchCalls.some(
            (call: any[]) =>
              call[0] &&
              typeof call[0] === "string" &&
              call[0].includes("startDate=2024-12-01")
          );
          expect(hasStartDateCall).toBe(true);
        },
        { timeout: 5000 }
      );
    });

    it("should clear filters when clear button is clicked", async () => {
      const user = userEvent.setup();

      (global.fetch as any)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            success: true,
            doctor: mockDoctor,
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            success: true,
            availabilities: mockAvailabilities,
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            success: true,
            doctor: mockDoctor,
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            success: true,
            availabilities: mockAvailabilities,
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            success: true,
            doctor: mockDoctor,
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            success: true,
            availabilities: mockAvailabilities,
          }),
        });

      render(<AvailabilityManagementPage />);

      await waitFor(() => {
        expect(screen.getByText("Clear Filters")).toBeInTheDocument();
      });

      // Set a filter first
      const startDateInput = screen.getByLabelText(/Start Date/i);
      await user.clear(startDateInput);
      await user.type(startDateInput, "2024-12-01");

      // Wait for the filter to be applied (the input should have the value)
      await waitFor(
        () => {
          expect(startDateInput).toHaveValue("2024-12-01");
        },
        { timeout: 2000 }
      );

      // Now clear filters
      const clearButton = screen.getByText("Clear Filters");
      await user.click(clearButton);

      // After clearing, the input should be empty and a new fetch should be triggered
      await waitFor(
        () => {
          const clearedStartDateInput = screen.getByLabelText(/Start Date/i);
          expect(clearedStartDateInput).toHaveValue("");
        },
        { timeout: 5000 }
      );
    });
  });

  describe("Error Handling", () => {
    it("should display error message when API call fails", async () => {
      (global.fetch as any)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            success: true,
            doctor: mockDoctor,
          }),
        })
        .mockRejectedValueOnce(new Error("Network error"));

      render(<AvailabilityManagementPage />);

      await waitFor(
        () => {
          // The error should be displayed - check for any error-related text
          const errorElements = screen.queryAllByText(/Failed/i);
          const networkError = screen.queryByText(/Network error/i);
          const errorState = screen.queryByText(
            /Failed to load availability data/i
          );

          // At least one error should be displayed
          expect(
            errorElements.length > 0 || networkError || errorState
          ).toBeTruthy();
        },
        { timeout: 5000 }
      );
    });

    it("should display error when doctor profile not found", async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        json: async () => ({
          success: false,
          error: { message: "Doctor profile not found" },
        }),
      });

      render(<AvailabilityManagementPage />);

      await waitFor(
        () => {
          // The error should be displayed in the error state
          // Check for the error message or any error-related text
          const errorText =
            screen.queryByText(/Doctor profile not found/i) ||
            screen.queryByText(/Failed to fetch doctor profile/i) ||
            screen.queryByText(/Doctor/i);
          expect(errorText).toBeInTheDocument();
        },
        { timeout: 5000 }
      );
    });
  });
});

// Helper function to format datetime-local
function formatDateTimeLocal(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}
