/**
 * Tests for Doctor Dashboard Page (Task 4.6)
 * Tests the consolidated doctor dashboard
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import DoctorDashboardPage from "../page";
import { Appointment, AppointmentStatus, Doctor } from "@medbook/types";

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
  usePathname: vi.fn(() => "/dashboard/doctor"),
}));

// Mock next/link
vi.mock("next/link", () => ({
  default: ({
    children,
    href,
  }: {
    children: React.ReactNode;
    href: string;
  }) => <a href={href}>{children}</a>,
}));

// Mock fetch globally
global.fetch = vi.fn();

describe("DoctorDashboardPage", () => {
  const mockSession = {
    user: {
      id: "doctor-user-123",
      email: "doctor@medbook.com",
      role: "DOCTOR",
    },
    expires: "2024-12-31",
  };

  const mockDoctor: Doctor = {
    id: "doctor-123",
    userId: "doctor-user-123",
    specialization: "Cardiology",
    bio: "Experienced cardiologist",
    userEmail: "doctor@medbook.com",
    createdAt: new Date("2024-01-01T00:00:00Z"),
    updatedAt: new Date("2024-01-01T00:00:00Z"),
  };

  const mockAppointments: Appointment[] = [
    {
      id: "apt-1",
      patientId: "patient-1",
      doctorId: "doctor-123",
      startTime: new Date("2024-12-20T10:00:00Z"), // Future
      endTime: new Date("2024-12-20T10:30:00Z"),
      status: AppointmentStatus.PENDING,
      createdAt: new Date("2024-11-01T00:00:00Z"),
      updatedAt: new Date("2024-11-01T00:00:00Z"),
      patientEmail: "patient@example.com",
    },
    {
      id: "apt-2",
      patientId: "patient-2",
      doctorId: "doctor-123",
      startTime: new Date("2024-12-18T14:00:00Z"), // Future
      endTime: new Date("2024-12-18T14:30:00Z"),
      status: AppointmentStatus.CONFIRMED,
      createdAt: new Date("2024-11-01T00:00:00Z"),
      updatedAt: new Date("2024-11-01T00:00:00Z"),
      patientEmail: "patient2@example.com",
    },
    {
      id: "apt-3",
      patientId: "patient-3",
      doctorId: "doctor-123",
      startTime: new Date("2024-11-01T09:00:00Z"), // Past
      endTime: new Date("2024-11-01T09:30:00Z"),
      status: AppointmentStatus.COMPLETED,
      createdAt: new Date("2024-10-01T00:00:00Z"),
      updatedAt: new Date("2024-10-01T00:00:00Z"),
      patientEmail: "patient3@example.com",
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
    it("should redirect to login if not authenticated", () => {
      (useSession as any).mockReturnValue({
        data: null,
        status: "unauthenticated",
      });

      render(<DoctorDashboardPage />);

      expect(mockPush).toHaveBeenCalledWith(
        "/login?callbackUrl=/dashboard/doctor"
      );
    });

    it("should redirect to admin dashboard if user is admin", () => {
      (useSession as any).mockReturnValue({
        data: {
          ...mockSession,
          user: { ...mockSession.user, role: "ADMIN" },
        },
        status: "authenticated",
      });

      render(<DoctorDashboardPage />);

      expect(mockPush).toHaveBeenCalledWith("/admin");
    });

    it("should redirect to patient dashboard if user is patient", () => {
      (useSession as any).mockReturnValue({
        data: {
          ...mockSession,
          user: { ...mockSession.user, role: "PATIENT" },
        },
        status: "authenticated",
      });

      render(<DoctorDashboardPage />);

      expect(mockPush).toHaveBeenCalledWith("/dashboard/patient");
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
            data: [],
          }),
        });

      render(<DoctorDashboardPage />);

      await waitFor(() => {
        expect(screen.getByText("Welcome back!")).toBeInTheDocument();
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

      render(<DoctorDashboardPage />);

      expect(screen.getByText("Loading dashboard...")).toBeInTheDocument();
    });
  });

  describe("Doctor Profile Loading", () => {
    it("should fetch doctor profile on mount", async () => {
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
            data: [],
          }),
        });

      render(<DoctorDashboardPage />);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining("/api/doctors/user/doctor-user-123")
        );
      });
    });

    it("should display error when doctor profile not found", async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        json: async () => ({
          success: false,
          error: { message: "Doctor profile not found" },
        }),
      });

      render(<DoctorDashboardPage />);

      await waitFor(() => {
        expect(
          screen.getByText(/Doctor profile not found/i)
        ).toBeInTheDocument();
      });
    });
  });

  describe("Welcome Section", () => {
    it("should display welcome message", async () => {
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
            data: [],
          }),
        });

      render(<DoctorDashboardPage />);

      await waitFor(() => {
        expect(screen.getByText("Welcome back!")).toBeInTheDocument();
        expect(
          screen.getByText(
            /Manage your appointments, availability, and patient information/i
          )
        ).toBeInTheDocument();
      });
    });
  });

  describe("Quick Actions", () => {
    it("should display quick action cards", async () => {
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
            data: [],
          }),
        });

      render(<DoctorDashboardPage />);

      await waitFor(() => {
        expect(screen.getByText("Manage Availability")).toBeInTheDocument();
        expect(screen.getByText("View All Appointments")).toBeInTheDocument();
        expect(screen.getByText("My Profile")).toBeInTheDocument();
      });
    });

    it("should link quick actions to correct pages", async () => {
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
            data: [],
          }),
        });

      render(<DoctorDashboardPage />);

      await waitFor(() => {
        const availabilityLink = screen
          .getByText("Manage Availability")
          .closest("a");
        expect(availabilityLink).toHaveAttribute(
          "href",
          "/dashboard/doctor/availability"
        );

        const viewAllLink = screen
          .getByText("View All Appointments")
          .closest("a");
        expect(viewAllLink).toHaveAttribute("href", "/appointments");

        const profileLink = screen.getByText("My Profile").closest("a");
        expect(profileLink).toHaveAttribute("href", "/profile");
      });
    });
  });

  describe("Upcoming Appointments", () => {
    it("should display upcoming appointments section", async () => {
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
            data: mockAppointments,
          }),
        });

      render(<DoctorDashboardPage />);

      await waitFor(() => {
        expect(screen.getByText("Upcoming Appointments")).toBeInTheDocument();
      });
    });

    it("should show patient email in appointments", async () => {
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
            data: mockAppointments,
          }),
        });

      render(<DoctorDashboardPage />);

      await waitFor(() => {
        expect(screen.getByText("patient@example.com")).toBeInTheDocument();
        expect(screen.getByText("patient2@example.com")).toBeInTheDocument();
      });
    });

    it("should show empty state when no upcoming appointments", async () => {
      const pastAppointments: Appointment[] = [
        {
          ...mockAppointments[2], // Past appointment
        },
      ];

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
            data: pastAppointments,
          }),
        });

      render(<DoctorDashboardPage />);

      await waitFor(() => {
        expect(
          screen.getByText(/You don't have any upcoming appointments/i)
        ).toBeInTheDocument();
        expect(screen.getByText("Set Your Availability")).toBeInTheDocument();
      });
    });
  });

  describe("Recent Appointments", () => {
    it("should display recent appointments section when there are past appointments", async () => {
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
            data: mockAppointments,
          }),
        });

      render(<DoctorDashboardPage />);

      await waitFor(() => {
        expect(screen.getByText("Recent Appointments")).toBeInTheDocument();
      });
    });

    it("should not display recent appointments section when there are no past appointments", async () => {
      const futureAppointments: Appointment[] = [
        mockAppointments[0],
        mockAppointments[1],
      ];

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
            data: futureAppointments,
          }),
        });

      render(<DoctorDashboardPage />);

      await waitFor(() => {
        expect(
          screen.queryByText("Recent Appointments")
        ).not.toBeInTheDocument();
      });
    });
  });

  describe("Error Handling", () => {
    it("should display error message when appointments API call fails", async () => {
      (global.fetch as any)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            success: true,
            doctor: mockDoctor,
          }),
        })
        .mockResolvedValueOnce({
          ok: false,
          json: async () => ({
            success: false,
            error: { message: "Failed to fetch appointments" },
          }),
        });

      render(<DoctorDashboardPage />);

      // Wait for loading to complete first
      await waitFor(
        () => {
          expect(
            screen.queryByText("Loading dashboard...")
          ).not.toBeInTheDocument();
        },
        { timeout: 3000 }
      );

      // Wait for error message to appear
      await waitFor(
        () => {
          expect(
            screen.getByText(/Failed to fetch appointments/i)
          ).toBeInTheDocument();
        },
        { timeout: 5000 }
      );

      // Wait for Retry button (it should be in the document after error appears)
      await waitFor(
        () => {
          expect(screen.getByText("Retry")).toBeInTheDocument();
        },
        { timeout: 2000 }
      );
    }, 12000); // Allow 12s total for CI (waitFor timeouts sum to 10s)

    it("should retry fetching when retry button is clicked", async () => {
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
          ok: false,
          json: async () => ({
            success: false,
            error: { message: "Failed to fetch appointments" },
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            success: true,
            data: [],
          }),
        });

      render(<DoctorDashboardPage />);

      await waitFor(() => {
        expect(screen.getByText("Retry")).toBeInTheDocument();
      });

      const retryButton = screen.getByText("Retry");
      await user.click(retryButton);

      await waitFor(() => {
        // Should have called fetch for doctor profile + 2 appointment fetches
        expect(global.fetch).toHaveBeenCalledTimes(3);
      });
    });
  });
});
