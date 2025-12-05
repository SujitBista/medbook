"use client";

import React from "react";
import { Card, Button } from "@medbook/ui";
import { Appointment, AppointmentStatus } from "@medbook/types";
import { formatDateTime } from "./utils";
import Link from "next/link";

interface AppointmentListProps {
  appointments: Appointment[];
  title?: string;
  emptyMessage?: string;
  showPatientEmail?: boolean;
  showDoctorInfo?: boolean;
  onAppointmentClick?: (appointment: Appointment) => void;
  filterStatus?: AppointmentStatus;
  filterUpcoming?: boolean;
}

/**
 * Component for displaying a list of appointments
 */
export function AppointmentList({
  appointments,
  title = "Appointments",
  emptyMessage = "No appointments found",
  showPatientEmail = false,
  showDoctorInfo = false,
  onAppointmentClick,
  filterStatus,
  filterUpcoming = false,
}: AppointmentListProps) {
  // Filter appointments
  let filteredAppointments = appointments;

  if (filterStatus) {
    filteredAppointments = filteredAppointments.filter(
      (apt) => apt.status === filterStatus
    );
  }

  if (filterUpcoming) {
    const now = new Date();
    filteredAppointments = filteredAppointments.filter(
      (apt) => new Date(apt.startTime) >= now
    );
  }

  // Sort by start time (upcoming first)
  filteredAppointments = [...filteredAppointments].sort((a, b) => {
    return new Date(a.startTime).getTime() - new Date(b.startTime).getTime();
  });

  if (filteredAppointments.length === 0) {
    return (
      <Card title={title}>
        <div className="py-8 text-center">
          <p className="text-gray-600">{emptyMessage}</p>
        </div>
      </Card>
    );
  }

  return (
    <Card title={title}>
      <div className="space-y-4">
        {filteredAppointments.map((appointment) => (
          <div
            key={appointment.id}
            className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <span
                    className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                      appointment.status === AppointmentStatus.PENDING
                        ? "bg-yellow-100 text-yellow-800"
                        : appointment.status === AppointmentStatus.CONFIRMED
                          ? "bg-green-100 text-green-800"
                          : appointment.status === AppointmentStatus.CANCELLED
                            ? "bg-red-100 text-red-800"
                            : "bg-gray-100 text-gray-800"
                    }`}
                  >
                    {appointment.status}
                  </span>
                  <span className="text-sm text-gray-600">
                    {formatDateTime(appointment.startTime)}
                  </span>
                </div>

                <div className="space-y-1">
                  {showPatientEmail && appointment.patientEmail && (
                    <p className="text-sm text-gray-700">
                      <span className="font-medium">Patient:</span>{" "}
                      {appointment.patientEmail}
                    </p>
                  )}

                  {showDoctorInfo && (
                    <p className="text-sm text-gray-700">
                      <span className="font-medium">Doctor ID:</span>{" "}
                      {appointment.doctorId}
                    </p>
                  )}

                  <p className="text-sm text-gray-600">
                    Duration:{" "}
                    {Math.round(
                      (new Date(appointment.endTime).getTime() -
                        new Date(appointment.startTime).getTime()) /
                        60000
                    )}{" "}
                    minutes
                  </p>

                  {appointment.notes && (
                    <p className="text-sm text-gray-600 line-clamp-2">
                      <span className="font-medium">Notes:</span>{" "}
                      {appointment.notes}
                    </p>
                  )}
                </div>
              </div>

              <div className="ml-4 flex flex-col gap-2">
                {onAppointmentClick ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onAppointmentClick(appointment)}
                  >
                    View
                  </Button>
                ) : (
                  <Link href={`/appointments/${appointment.id}`}>
                    <Button variant="ghost" size="sm">
                      View Details
                    </Button>
                  </Link>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
