/**
 * Tests for Patient Dashboard Page (Task 4.5)
 * Tests the consolidated patient dashboard
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import PatientDashboardPage from "../page";
import { Appointment, AppointmentStatus } from "@medbook/types";

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
  usePathname: vi.fn(() => "/dashboard/patient"),
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

describe("PatientDashboardPage", () => {
  const mockSession = {
    user: {
      id: "patient-123",
      email: "patient@medbook.com",
      role: "PATIENT",
    },
    expires: "2024-12-31",
  };

  const mockAppointments: Appointment[] = [
    {
      id: "apt-1",
      patientId: "patient-123",
      doctorId: "doctor-1",
      startTime: new Date("2024-12-20T10:00:00Z").toISOString(), // Future
      endTime: new Date("2024-12-20T10:30:00Z").toISOString(),
      status: AppointmentStatus.PENDING,
      createdAt: new Date("2024-11-01T00:00:00Z").toISOString(),
      updatedAt: new Date("2024-11-01T00:00:00Z").toISOString(),
      patientEmail: "patient@medbook.com",
    },
    {
      id: "apt-2",
      patientId: "patient-123",
      doctorId: "doctor-1",
      startTime: new Date("2024-12-18T14:00:00Z").toISOString(), // Future
      endTime: new Date("2024-12-18T14:30:00Z").toISOString(),
      status: AppointmentStatus.CONFIRMED,
      createdAt: new Date("2024-11-01T00:00:00Z").toISOString(),
      updatedAt: new Date("2024-11-01T00:00:00Z").toISOString(),
      patientEmail: "patient@medbook.com",
    },
    {
      id: "apt-3",
      patientId: "patient-123",
      doctorId: "doctor-1",
      startTime: new Date("2024-11-01T09:00:00Z").toISOString(), // Past
      endTime: new Date("2024-11-01T09:30:00Z").toISOString(),
      status: AppointmentStatus.COMPLETED,
      createdAt: new Date("2024-10-01T00:00:00Z").toISOString(),
      updatedAt: new Date("2024-10-01T00:00:00Z").toISOString(),
      patientEmail: "patient@medbook.com",
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

      render(<PatientDashboardPage />);

      expect(mockPush).toHaveBeenCalledWith(
        "/login?callbackUrl=/dashboard/patient"
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

      render(<PatientDashboardPage />);

      expect(mockPush).toHaveBeenCalledWith("/admin");
    });

    it("should redirect to doctor dashboard if user is doctor", () => {
      (useSession as any).mockReturnValue({
        data: {
          ...mockSession,
          user: { ...mockSession.user, role: "DOCTOR" },
        },
        status: "authenticated",
      });

      render(<PatientDashboardPage />);

      expect(mockPush).toHaveBeenCalledWith("/dashboard");
    });

    it("should render page for authenticated patient", async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: [],
        }),
      });

      render(<PatientDashboardPage />);

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

      render(<PatientDashboardPage />);

      expect(screen.getByText("Loading dashboard...")).toBeInTheDocument();
    });
  });

  describe("Welcome Section", () => {
    it("should display welcome message", async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: [],
        }),
      });

      render(<PatientDashboardPage />);

      await waitFor(() => {
        expect(screen.getByText("Welcome back!")).toBeInTheDocument();
        expect(
          screen.getByText(
            /Manage your appointments and find doctors to book new appointments/i
          )
        ).toBeInTheDocument();
      });
    });
  });

  describe("Quick Actions", () => {
    it("should display quick action cards", async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: [],
        }),
      });

      render(<PatientDashboardPage />);

      await waitFor(() => {
        expect(screen.getByText("Book Appointment")).toBeInTheDocument();
        expect(screen.getByText("View All Appointments")).toBeInTheDocument();
        expect(screen.getByText("Browse Doctors")).toBeInTheDocument();
      });
    });

    it("should link quick actions to correct pages", async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: [],
        }),
      });

      render(<PatientDashboardPage />);

      await waitFor(() => {
        const bookLink = screen.getByText("Book Appointment").closest("a");
        expect(bookLink).toHaveAttribute("href", "/doctors");

        const viewAllLink = screen
          .getByText("View All Appointments")
          .closest("a");
        expect(viewAllLink).toHaveAttribute("href", "/appointments");

        const browseLink = screen.getByText("Browse Doctors").closest("a");
        expect(browseLink).toHaveAttribute("href", "/doctors");
      });
    });
  });

  describe("Upcoming Appointments", () => {
    it("should display upcoming appointments section", async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: mockAppointments,
        }),
      });

      render(<PatientDashboardPage />);

      await waitFor(() => {
        expect(screen.getByText("Upcoming Appointments")).toBeInTheDocument();
      });
    });

    it("should show up to 5 upcoming appointments", async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: mockAppointments,
        }),
      });

      render(<PatientDashboardPage />);

      await waitFor(() => {
        // Should show 2 upcoming appointments (apt-1 and apt-2)
        const viewButtons = screen.getAllByText(/View Details/i);
        expect(viewButtons.length).toBeGreaterThanOrEqual(2);
      });
    });

    it("should show empty state when no upcoming appointments", async () => {
      const pastAppointments: Appointment[] = [
        {
          ...mockAppointments[2], // Past appointment
        },
      ];

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: pastAppointments,
        }),
      });

      render(<PatientDashboardPage />);

      await waitFor(() => {
        expect(
          screen.getByText(/You don't have any upcoming appointments/i)
        ).toBeInTheDocument();
        expect(
          screen.getByText("Book Your First Appointment")
        ).toBeInTheDocument();
      });
    });

    it("should show 'View All' link when there are upcoming appointments", async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: mockAppointments,
        }),
      });

      render(<PatientDashboardPage />);

      await waitFor(() => {
        const viewAllLink = screen.getByText("View All");
        expect(viewAllLink).toBeInTheDocument();
        expect(viewAllLink.closest("a")).toHaveAttribute(
          "href",
          "/appointments"
        );
      });
    });
  });

  describe("Recent Appointments", () => {
    it("should display recent appointments section when there are past appointments", async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: mockAppointments,
        }),
      });

      render(<PatientDashboardPage />);

      await waitFor(() => {
        expect(screen.getByText("Recent Appointments")).toBeInTheDocument();
      });
    });

    it("should not display recent appointments section when there are no past appointments", async () => {
      const futureAppointments: Appointment[] = [
        mockAppointments[0],
        mockAppointments[1],
      ];

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: futureAppointments,
        }),
      });

      render(<PatientDashboardPage />);

      await waitFor(() => {
        expect(
          screen.queryByText("Recent Appointments")
        ).not.toBeInTheDocument();
      });
    });
  });

  describe("Error Handling", () => {
    it("should display error message when API call fails", async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        json: async () => ({
          success: false,
          error: { message: "Failed to fetch appointments" },
        }),
      });

      render(<PatientDashboardPage />);

      await waitFor(() => {
        expect(
          screen.getByText("Failed to fetch appointments")
        ).toBeInTheDocument();
        expect(screen.getByText("Retry")).toBeInTheDocument();
      });
    });

    it("should retry fetching when retry button is clicked", async () => {
      const user = userEvent.setup();

      (global.fetch as any)
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

      render(<PatientDashboardPage />);

      await waitFor(() => {
        expect(screen.getByText("Retry")).toBeInTheDocument();
      });

      const retryButton = screen.getByText("Retry");
      await user.click(retryButton);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledTimes(2);
      });
    });
  });
});
