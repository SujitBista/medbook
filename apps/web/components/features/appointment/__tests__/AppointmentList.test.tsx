/**
 * Tests for AppointmentList Component (Task 4.4.1)
 * Tests the reusable appointment list component
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AppointmentList } from "../AppointmentList";
import { Appointment, AppointmentStatus } from "@medbook/types";

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

describe("AppointmentList", () => {
  const mockAppointments: Appointment[] = [
    {
      id: "apt-1",
      patientId: "patient-1",
      doctorId: "doctor-1",
      startTime: new Date("2024-12-15T10:00:00Z"),
      endTime: new Date("2024-12-15T10:30:00Z"),
      status: AppointmentStatus.PENDING,
      createdAt: new Date("2024-11-01T00:00:00Z"),
      updatedAt: new Date("2024-11-01T00:00:00Z"),
      patientEmail: "patient@example.com",
      notes: "Regular checkup",
    },
    {
      id: "apt-2",
      patientId: "patient-2",
      doctorId: "doctor-1",
      startTime: new Date("2024-12-16T14:00:00Z"),
      endTime: new Date("2024-12-16T14:30:00Z"),
      status: AppointmentStatus.CONFIRMED,
      createdAt: new Date("2024-11-01T00:00:00Z"),
      updatedAt: new Date("2024-11-01T00:00:00Z"),
      patientEmail: "patient2@example.com",
    },
    {
      id: "apt-3",
      patientId: "patient-3",
      doctorId: "doctor-2",
      startTime: new Date("2024-12-10T09:00:00Z"),
      endTime: new Date("2024-12-10T09:30:00Z"),
      status: AppointmentStatus.CANCELLED,
      createdAt: new Date("2024-11-01T00:00:00Z"),
      updatedAt: new Date("2024-11-01T00:00:00Z"),
      patientEmail: "patient3@example.com",
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Rendering", () => {
    it("should render list of appointments", () => {
      render(<AppointmentList appointments={mockAppointments} />);

      expect(screen.getByText("Appointments")).toBeInTheDocument();
      expect(screen.getAllByText(/View Details/i).length).toBe(3);
    });

    it("should render custom title", () => {
      render(
        <AppointmentList
          appointments={mockAppointments}
          title="My Appointments"
        />
      );

      expect(screen.getByText("My Appointments")).toBeInTheDocument();
    });

    it("should display appointment status badges", () => {
      render(<AppointmentList appointments={mockAppointments} />);

      expect(screen.getByText("PENDING")).toBeInTheDocument();
      expect(screen.getByText("CONFIRMED")).toBeInTheDocument();
      expect(screen.getByText("CANCELLED")).toBeInTheDocument();
    });

    it("should display appointment dates and times", () => {
      render(<AppointmentList appointments={mockAppointments} />);

      // Check that dates are displayed (formatDateTime will format them)
      const appointmentCards = screen.getAllByText(/View Details/i);
      expect(appointmentCards.length).toBe(3);
    });

    it("should display appointment duration", () => {
      render(<AppointmentList appointments={mockAppointments} />);

      expect(screen.getAllByText(/30 minutes/i).length).toBeGreaterThan(0);
    });

    it("should display notes when present", () => {
      render(<AppointmentList appointments={mockAppointments} />);

      expect(screen.getByText(/Regular checkup/i)).toBeInTheDocument();
    });
  });

  describe("Empty State", () => {
    it("should show empty message when no appointments", () => {
      render(<AppointmentList appointments={[]} />);

      expect(screen.getByText("No appointments found")).toBeInTheDocument();
    });

    it("should show custom empty message", () => {
      render(
        <AppointmentList
          appointments={[]}
          emptyMessage="No upcoming appointments"
        />
      );

      expect(screen.getByText("No upcoming appointments")).toBeInTheDocument();
    });
  });

  describe("Patient Email Display", () => {
    it("should show patient email when showPatientEmail is true", () => {
      render(
        <AppointmentList
          appointments={mockAppointments}
          showPatientEmail={true}
        />
      );

      expect(screen.getByText(/patient@example.com/i)).toBeInTheDocument();
      expect(screen.getByText(/patient2@example.com/i)).toBeInTheDocument();
    });

    it("should not show patient email when showPatientEmail is false", () => {
      render(
        <AppointmentList
          appointments={mockAppointments}
          showPatientEmail={false}
        />
      );

      // Patient email should not be visible in the text content
      const container = screen.getByText("Appointments").closest("div");
      expect(container).not.toHaveTextContent("Patient:");
    });
  });

  describe("Doctor Info Display", () => {
    it("should show doctor ID when showDoctorInfo is true", () => {
      render(
        <AppointmentList
          appointments={mockAppointments}
          showDoctorInfo={true}
        />
      );

      // Check for "Doctor ID:" label which appears when showDoctorInfo is true
      expect(screen.getAllByText(/Doctor ID:/i).length).toBeGreaterThan(0);
      // Check that doctor IDs are displayed (there are multiple appointments with doctor-1)
      const doctorIdElements = screen.getAllByText(/doctor-1/i);
      expect(doctorIdElements.length).toBeGreaterThan(0);
      expect(screen.getByText(/doctor-2/i)).toBeInTheDocument();
    });

    it("should not show doctor info when showDoctorInfo is false", () => {
      render(
        <AppointmentList
          appointments={mockAppointments}
          showDoctorInfo={false}
        />
      );

      const container = screen.getByText("Appointments").closest("div");
      expect(container).not.toHaveTextContent("Doctor ID:");
    });
  });

  describe("Filtering", () => {
    it("should filter by status", () => {
      render(
        <AppointmentList
          appointments={mockAppointments}
          filterStatus={AppointmentStatus.PENDING}
        />
      );

      expect(screen.getByText("PENDING")).toBeInTheDocument();
      expect(screen.queryByText("CONFIRMED")).not.toBeInTheDocument();
      expect(screen.queryByText("CANCELLED")).not.toBeInTheDocument();
    });

    it("should filter upcoming appointments", () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 1);

      const upcomingAppointment: Appointment = {
        ...mockAppointments[0],
        startTime: futureDate,
      };

      const pastAppointment: Appointment = {
        ...mockAppointments[2],
        startTime: new Date("2024-01-01T09:00:00Z"),
      };

      render(
        <AppointmentList
          appointments={[upcomingAppointment, pastAppointment]}
          filterUpcoming={true}
        />
      );

      // Should only show the upcoming appointment
      const viewButtons = screen.getAllByText(/View Details/i);
      expect(viewButtons.length).toBe(1);
    });
  });

  describe("Sorting", () => {
    it("should sort appointments by start time", () => {
      const unsortedAppointments: Appointment[] = [
        {
          ...mockAppointments[1], // Dec 16
          startTime: new Date("2024-12-16T14:00:00Z"),
        },
        {
          ...mockAppointments[0], // Dec 15
          startTime: new Date("2024-12-15T10:00:00Z"),
        },
        {
          ...mockAppointments[2], // Dec 10
          startTime: new Date("2024-12-10T09:00:00Z"),
        },
      ];

      render(<AppointmentList appointments={unsortedAppointments} />);

      const viewButtons = screen.getAllByText(/View Details/i);
      expect(viewButtons.length).toBe(3);
      // Appointments should be sorted (earliest first)
    });
  });

  describe("Click Handlers", () => {
    it("should call onAppointmentClick when provided", async () => {
      const user = userEvent.setup();
      const handleClick = vi.fn();

      render(
        <AppointmentList
          appointments={[mockAppointments[0]]}
          onAppointmentClick={handleClick}
        />
      );

      const viewButton = screen.getByText("View");
      await user.click(viewButton);

      expect(handleClick).toHaveBeenCalledTimes(1);
      expect(handleClick).toHaveBeenCalledWith(mockAppointments[0]);
    });

    it("should render link when onAppointmentClick is not provided", () => {
      render(<AppointmentList appointments={[mockAppointments[0]]} />);

      const link = screen.getByText("View Details").closest("a");
      expect(link).toHaveAttribute("href", "/appointments/apt-1");
    });
  });

  describe("Status Badge Colors", () => {
    it("should apply correct color for PENDING status", () => {
      render(
        <AppointmentList
          appointments={[
            {
              ...mockAppointments[0],
              status: AppointmentStatus.PENDING,
            },
          ]}
        />
      );

      const statusBadge = screen.getByText("PENDING");
      expect(statusBadge).toHaveClass("bg-yellow-100", "text-yellow-800");
    });

    it("should apply correct color for CONFIRMED status", () => {
      render(
        <AppointmentList
          appointments={[
            {
              ...mockAppointments[0],
              status: AppointmentStatus.CONFIRMED,
            },
          ]}
        />
      );

      const statusBadge = screen.getByText("CONFIRMED");
      expect(statusBadge).toHaveClass("bg-green-100", "text-green-800");
    });

    it("should apply correct color for CANCELLED status", () => {
      render(
        <AppointmentList
          appointments={[
            {
              ...mockAppointments[0],
              status: AppointmentStatus.CANCELLED,
            },
          ]}
        />
      );

      const statusBadge = screen.getByText("CANCELLED");
      expect(statusBadge).toHaveClass("bg-red-100", "text-red-800");
    });

    it("should apply correct color for COMPLETED status", () => {
      render(
        <AppointmentList
          appointments={[
            {
              ...mockAppointments[0],
              status: AppointmentStatus.COMPLETED,
            },
          ]}
        />
      );

      const statusBadge = screen.getByText("COMPLETED");
      expect(statusBadge).toHaveClass("bg-gray-100", "text-gray-800");
    });
  });
});
