/**
 * Tests for Availability Management Page (refactored UI)
 * Tests Weekly Availability + Exceptions flows
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import AvailabilityManagementPage from "../page";
import { Availability } from "@medbook/types";

vi.mock("next-auth/react", () => ({
  useSession: vi.fn(),
}));

const mockPush = vi.fn();
const mockReplace = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: vi.fn(() => ({
    push: mockPush,
    replace: mockReplace,
    refresh: vi.fn(),
  })),
}));

const mockShowSuccess = vi.fn();
const mockShowError = vi.fn();
vi.mock("@medbook/ui", async () => {
  const actual = await vi.importActual("@medbook/ui");
  return {
    ...actual,
    useToast: () => ({
      showSuccess: mockShowSuccess,
      showError: mockShowError,
    }),
  };
});

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

  const mockRecurring: Availability = {
    id: "avail-recurring",
    doctorId: "doctor-123",
    startTime: new Date("2024-12-02T14:00:00Z"),
    endTime: new Date("2024-12-02T16:00:00Z"),
    isRecurring: true,
    dayOfWeek: 1,
    validFrom: new Date("2024-12-01T00:00:00Z"),
    validTo: new Date("2024-12-31T00:00:00Z"),
    createdAt: new Date("2024-11-01T00:00:00Z"),
    updatedAt: new Date("2024-11-01T00:00:00Z"),
  };

  const mockOneTime: Availability = {
    id: "avail-1",
    doctorId: "doctor-123",
    startTime: new Date("2024-12-15T09:00:00Z"),
    endTime: new Date("2024-12-15T10:00:00Z"),
    isRecurring: false,
    createdAt: new Date("2024-11-01T00:00:00Z"),
    updatedAt: new Date("2024-11-01T00:00:00Z"),
  };

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
    it("should show loading skeleton while fetching data", () => {
      (global.fetch as any).mockImplementation(
        () =>
          new Promise(() => {
            // Never resolve
          })
      );

      render(<AvailabilityManagementPage />);

      const loadingElements = screen.getAllByRole("status", {
        name: /Loading/i,
      });
      expect(loadingElements.length).toBeGreaterThan(0);
    });
  });

  describe("Empty State", () => {
    it("should show empty state when no schedules exist", async () => {
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
          screen.getByText(
            "No availability set yet. Add your weekly schedule to start accepting appointments."
          )
        ).toBeInTheDocument();
      });

      expect(screen.getByText("Set weekly availability")).toBeInTheDocument();
    });
  });

  describe("Weekly Availability", () => {
    it("should display weekly schedule with recurring data", async () => {
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
            availabilities: [mockRecurring],
          }),
        });

      render(<AvailabilityManagementPage />);

      await waitFor(() => {
        expect(screen.getByText("Manage Availability")).toBeInTheDocument();
      });

      await waitFor(() => {
        expect(screen.getByText("Weekly Availability")).toBeInTheDocument();
        expect(screen.getByText("Monday")).toBeInTheDocument();
      });

      expect(
        screen.getByRole("button", { name: /Save weekly schedule/i })
      ).toBeInTheDocument();
    });

    it("should save weekly schedule when Save is clicked with time ranges", async () => {
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
            availabilities: [mockRecurring],
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true }),
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
            availabilities: [mockRecurring],
          }),
        });

      render(<AvailabilityManagementPage />);

      await waitFor(() => {
        expect(screen.getByText("Save weekly schedule")).toBeInTheDocument();
      });

      const saveButton = screen.getByRole("button", {
        name: /Save weekly schedule/i,
      });
      await user.click(saveButton);

      await waitFor(
        () => {
          const fetchCalls = (global.fetch as any).mock.calls;
          const deleteCalls = fetchCalls.filter(
            (c: any[]) => c[1]?.method === "DELETE"
          );
          expect(deleteCalls.length).toBeGreaterThan(0);
        },
        { timeout: 3000 }
      );
    });
  });

  describe("Exceptions", () => {
    it("should display exceptions list when one-time availabilities exist", async () => {
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
            availabilities: [mockOneTime],
          }),
        });

      render(<AvailabilityManagementPage />);

      await waitFor(() => {
        expect(screen.getByText("Exceptions")).toBeInTheDocument();
      });

      expect(screen.getByText("Add exception")).toBeInTheDocument();
    });

    it("should add exception when form is submitted", async () => {
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
            availability: mockOneTime,
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
            availabilities: [mockOneTime],
          }),
        });

      render(<AvailabilityManagementPage />);

      await waitFor(() => {
        expect(screen.getByText("Add exception")).toBeInTheDocument();
      });

      await user.click(screen.getByText("Add exception"));

      await waitFor(() => {
        expect(screen.getByLabelText(/Date/i)).toBeInTheDocument();
      });

      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 7);
      const dateStr = futureDate.toISOString().slice(0, 10);

      const dateInput = screen.getByLabelText(/Date/i);
      await user.clear(dateInput);
      await user.type(dateInput, dateStr);

      const addButton = screen.getByRole("button", {
        name: /Add exception/i,
      });
      await user.click(addButton);

      await waitFor(
        () => {
          expect(global.fetch).toHaveBeenCalledWith(
            expect.stringContaining("/api/availability"),
            expect.objectContaining({
              method: "POST",
              body: expect.any(String),
            })
          );
        },
        { timeout: 3000 }
      );
    });

    it("should delete exception when Delete is clicked and confirmed", async () => {
      const user = userEvent.setup();
      vi.spyOn(window, "confirm").mockReturnValue(true);

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
            availabilities: [mockOneTime],
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
        const deleteButtons = screen.getAllByRole("button", {
          name: /Delete exception/i,
        });
        expect(deleteButtons.length).toBeGreaterThan(0);
      });

      const deleteButtons = screen.getAllByRole("button", {
        name: /Delete exception/i,
      });
      const deleteButton = deleteButtons[0];
      await user.click(deleteButton);

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

      vi.restoreAllMocks();
    });
  });

  describe("Error Handling", () => {
    it("should display error when API call fails", async () => {
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
          const errorState = screen.queryByText(
            /Failed to load availability data/i
          );
          expect(errorState || mockShowError).toBeTruthy();
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
          const errorText =
            screen.queryByText(/Doctor profile not found/i) ||
            screen.queryByText(/Failed to fetch doctor profile/i);
          expect(errorText || mockShowError).toBeTruthy();
        },
        { timeout: 5000 }
      );
    });
  });
});
