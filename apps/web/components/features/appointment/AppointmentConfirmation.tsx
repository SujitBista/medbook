"use client";

import React from "react";
import { Card, Button } from "@medbook/ui";
import { Appointment } from "@medbook/types";
import { formatDateTime } from "./utils";
import Link from "next/link";

interface AppointmentConfirmationProps {
  appointment: Appointment;
  doctorName?: string;
  onClose?: () => void;
}

/**
 * Component for displaying appointment confirmation
 */
export function AppointmentConfirmation({
  appointment,
  doctorName,
  onClose,
}: AppointmentConfirmationProps) {
  return (
    <Card title="Appointment Confirmed">
      <div className="space-y-4">
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <svg
              className="w-6 h-6 text-green-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <h3 className="text-lg font-semibold text-green-900">
              Your appointment has been booked successfully!
            </h3>
          </div>
        </div>

        <div className="space-y-3">
          <div>
            <p className="text-sm text-gray-600">Appointment ID</p>
            <p className="font-mono text-sm text-gray-900">{appointment.id}</p>
          </div>

          {doctorName && (
            <div>
              <p className="text-sm text-gray-600">Doctor</p>
              <p className="font-semibold text-gray-900">{doctorName}</p>
            </div>
          )}

          {appointment.patientEmail && (
            <div>
              <p className="text-sm text-gray-600">Patient</p>
              <p className="font-semibold text-gray-900">
                {appointment.patientEmail}
              </p>
            </div>
          )}

          <div>
            <p className="text-sm text-gray-600">Date & Time</p>
            <p className="font-semibold text-gray-900">
              {formatDateTime(appointment.startTime)}
            </p>
          </div>

          <div>
            <p className="text-sm text-gray-600">Duration</p>
            <p className="text-gray-900">
              {Math.round(
                (new Date(appointment.endTime).getTime() -
                  new Date(appointment.startTime).getTime()) /
                  60000
              )}{" "}
              minutes
            </p>
          </div>

          <div>
            <p className="text-sm text-gray-600">Status</p>
            <span
              className={`inline-block px-2 py-1 rounded text-sm font-medium ${
                appointment.status === "PENDING"
                  ? "bg-yellow-100 text-yellow-800"
                  : appointment.status === "CONFIRMED"
                    ? "bg-green-100 text-green-800"
                    : appointment.status === "CANCELLED"
                      ? "bg-red-100 text-red-800"
                      : "bg-gray-100 text-gray-800"
              }`}
            >
              {appointment.status}
            </span>
          </div>

          {appointment.notes && (
            <div>
              <p className="text-sm text-gray-600">Notes</p>
              <p className="text-gray-900">{appointment.notes}</p>
            </div>
          )}
        </div>

        <div
          className="pt-4 border-t border-gray-200 flex gap-3"
          style={{ visibility: "visible", display: "flex" }}
        >
          <Link href="/dashboard" className="flex-1">
            <Button variant="primary" className="w-full">
              View My Appointments
            </Button>
          </Link>
          {onClose && (
            <Button variant="secondary" onClick={onClose}>
              Close
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}
