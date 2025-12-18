/**
 * Tests for AppointmentConfirmation Component (Task 4.3.1)
 * Tests the appointment confirmation display component
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AppointmentConfirmation } from "../AppointmentConfirmation";
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

describe("AppointmentConfirmation", () => {
  const mockAppointment: Appointment = {
    id: "apt-123",
    patientId: "patient-1",
    doctorId: "doctor-1",
    startTime: new Date("2024-12-15T10:00:00Z"),
    endTime: new Date("2024-12-15T10:30:00Z"),
    status: AppointmentStatus.CONFIRMED,
    createdAt: new Date("2024-11-01T00:00:00Z"),
    updatedAt: new Date("2024-11-01T00:00:00Z"),
    patientEmail: "patient@example.com",
    notes: "Regular checkup appointment",
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Rendering", () => {
    it("should render confirmation message", () => {
      render(<AppointmentConfirmation appointment={mockAppointment} />);

      expect(
        screen.getByText("Your appointment has been booked successfully!")
      ).toBeInTheDocument();
    });

    it("should display appointment ID", () => {
      render(<AppointmentConfirmation appointment={mockAppointment} />);

      expect(screen.getByText("Appointment ID")).toBeInTheDocument();
      expect(screen.getByText("apt-123")).toBeInTheDocument();
    });

    it("should display appointment date and time", () => {
      render(<AppointmentConfirmation appointment={mockAppointment} />);

      expect(screen.getByText("Date & Time")).toBeInTheDocument();
      // formatDateTime will format the date
    });

    it("should display appointment duration", () => {
      render(<AppointmentConfirmation appointment={mockAppointment} />);

      expect(screen.getByText("Duration")).toBeInTheDocument();
      expect(screen.getByText(/30 minutes/i)).toBeInTheDocument();
    });

    it("should display appointment status", () => {
      render(<AppointmentConfirmation appointment={mockAppointment} />);

      expect(screen.getByText("Status")).toBeInTheDocument();
      expect(screen.getByText("CONFIRMED")).toBeInTheDocument();
    });

    it("should display notes when present", () => {
      render(<AppointmentConfirmation appointment={mockAppointment} />);

      expect(screen.getByText("Notes")).toBeInTheDocument();
      expect(
        screen.getByText("Regular checkup appointment")
      ).toBeInTheDocument();
    });

    it("should not display notes section when notes are absent", () => {
      const appointmentWithoutNotes: Appointment = {
        ...mockAppointment,
        notes: undefined,
      };

      render(<AppointmentConfirmation appointment={appointmentWithoutNotes} />);

      expect(screen.queryByText("Notes")).not.toBeInTheDocument();
    });
  });

  describe("Doctor Name Display", () => {
    it("should display doctor name when provided", () => {
      render(
        <AppointmentConfirmation
          appointment={mockAppointment}
          doctorName="Dr. John Smith"
        />
      );

      expect(screen.getByText("Doctor")).toBeInTheDocument();
      expect(screen.getByText("Dr. John Smith")).toBeInTheDocument();
    });

    it("should not display doctor section when doctorName is not provided", () => {
      render(<AppointmentConfirmation appointment={mockAppointment} />);

      expect(screen.queryByText("Doctor")).not.toBeInTheDocument();
    });
  });

  describe("Patient Email Display", () => {
    it("should display patient email when present", () => {
      render(<AppointmentConfirmation appointment={mockAppointment} />);

      expect(screen.getByText("Patient")).toBeInTheDocument();
      expect(screen.getByText("patient@example.com")).toBeInTheDocument();
    });

    it("should not display patient section when email is absent", () => {
      const appointmentWithoutEmail: Appointment = {
        ...mockAppointment,
        patientEmail: undefined,
      };

      render(<AppointmentConfirmation appointment={appointmentWithoutEmail} />);

      expect(screen.queryByText("Patient")).not.toBeInTheDocument();
    });
  });

  describe("Status Badge Colors", () => {
    it("should apply correct color for PENDING status", () => {
      const pendingAppointment: Appointment = {
        ...mockAppointment,
        status: AppointmentStatus.PENDING,
      };

      render(<AppointmentConfirmation appointment={pendingAppointment} />);

      const statusBadge = screen.getByText("PENDING");
      expect(statusBadge).toHaveClass("bg-yellow-100", "text-yellow-800");
    });

    it("should apply correct color for CONFIRMED status", () => {
      render(<AppointmentConfirmation appointment={mockAppointment} />);

      const statusBadge = screen.getByText("CONFIRMED");
      expect(statusBadge).toHaveClass("bg-green-100", "text-green-800");
    });

    it("should apply correct color for CANCELLED status", () => {
      const cancelledAppointment: Appointment = {
        ...mockAppointment,
        status: AppointmentStatus.CANCELLED,
      };

      render(<AppointmentConfirmation appointment={cancelledAppointment} />);

      const statusBadge = screen.getByText("CANCELLED");
      expect(statusBadge).toHaveClass("bg-red-100", "text-red-800");
    });

    it("should apply correct color for COMPLETED status", () => {
      const completedAppointment: Appointment = {
        ...mockAppointment,
        status: AppointmentStatus.COMPLETED,
      };

      render(<AppointmentConfirmation appointment={completedAppointment} />);

      const statusBadge = screen.getByText("COMPLETED");
      expect(statusBadge).toHaveClass("bg-gray-100", "text-gray-800");
    });
  });

  describe("Actions", () => {
    it("should render 'View My Appointments' button with link to dashboard", () => {
      render(<AppointmentConfirmation appointment={mockAppointment} />);

      const viewButton = screen.getByText("View My Appointments");
      expect(viewButton).toBeInTheDocument();

      const link = viewButton.closest("a");
      expect(link).toHaveAttribute("href", "/dashboard");
    });

    it("should render close button when onClose is provided", async () => {
      const user = userEvent.setup();
      const handleClose = vi.fn();

      render(
        <AppointmentConfirmation
          appointment={mockAppointment}
          onClose={handleClose}
        />
      );

      const closeButton = screen.getByText("Close");
      expect(closeButton).toBeInTheDocument();

      await user.click(closeButton);
      expect(handleClose).toHaveBeenCalledTimes(1);
    });

    it("should not render close button when onClose is not provided", () => {
      render(<AppointmentConfirmation appointment={mockAppointment} />);

      expect(screen.queryByText("Close")).not.toBeInTheDocument();
    });
  });
});
