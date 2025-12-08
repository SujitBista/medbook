/**
 * Appointment API routes
 * Proxies appointment requests to backend API with authentication
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { env } from "@/lib/env";
import jwt from "jsonwebtoken";

function generateBackendToken(userId: string, role: string): string {
  return jwt.sign({ id: userId, role }, env.jwtSecret, { expiresIn: "7d" });
}

/**
 * GET /api/appointments
 * Get appointments (requires patient ID or doctor ID in query params)
 */
export async function GET(req: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "UNAUTHORIZED", message: "Not authenticated" },
        },
        { status: 401 }
      );
    }

    // Get query params
    const { searchParams } = new URL(req.url);
    const patientId = searchParams.get("patientId");
    const doctorId = searchParams.get("doctorId");
    const all = searchParams.get("all"); // For admins to fetch all

    // Generate token for backend API
    const token = generateBackendToken(session.user.id, session.user.role);

    // Admins can fetch all appointments
    if (all === "true" && session.user.role === "ADMIN") {
      // Fetch all appointments by getting all doctors and their appointments
      // For now, we'll need to fetch from backend - but since there's no "all" endpoint,
      // we'll fetch all doctors first, then their appointments
      // This is a temporary solution - ideally we'd have a backend endpoint for this
      try {
        // Fetch all doctors (use hasAvailability=false to include all doctors)
        const doctorsResponse = await fetch(
          `${env.apiUrl}/doctors?hasAvailability=false&limit=100`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          }
        );

        if (!doctorsResponse.ok) {
          console.error(
            "[Appointments] Failed to fetch doctors:",
            doctorsResponse.status,
            doctorsResponse.statusText
          );
          throw new Error("Failed to fetch doctors");
        }

        const doctorsData = await doctorsResponse.json();
        console.log("[Appointments] Doctors response:", {
          success: doctorsData.success,
          count: doctorsData.data?.length,
        });
        // Backend returns doctors in "data" field, not "doctors"
        const doctors = doctorsData.data || [];

        if (doctors.length === 0) {
          console.log("[Appointments] No doctors found in the system");
          return NextResponse.json({
            success: true,
            data: [],
          });
        }

        // Fetch appointments for all doctors
        const appointmentPromises = doctors.map((doctor: { id: string }) =>
          fetch(`${env.apiUrl}/appointments/doctor/${doctor.id}`, {
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          }).then((res) => res.json())
        );

        const appointmentResults = await Promise.all(appointmentPromises);
        const allAppointments: Appointment[] = [];

        appointmentResults.forEach((result, index) => {
          if (result.success && result.data) {
            console.log(
              `[Appointments] Doctor ${doctors[index].id}: ${result.data.length} appointments`
            );
            allAppointments.push(...result.data);
          }
        });

        console.log(
          "[Appointments] Total appointments fetched:",
          allAppointments.length
        );

        // Remove duplicates (in case of any overlap)
        const uniqueAppointments = Array.from(
          new Map(allAppointments.map((apt) => [apt.id, apt])).values()
        );

        return NextResponse.json({
          success: true,
          data: uniqueAppointments,
        });
      } catch (error) {
        console.error("[Appointments] Error fetching all appointments:", error);
        return NextResponse.json(
          {
            success: false,
            error: {
              code: "INTERNAL_ERROR",
              message: "Failed to fetch all appointments",
            },
          },
          { status: 500 }
        );
      }
    }

    let url: string;
    if (patientId) {
      url = `${env.apiUrl}/appointments/patient/${patientId}`;
    } else if (doctorId) {
      url = `${env.apiUrl}/appointments/doctor/${doctorId}`;
    } else {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message:
              "Patient ID or Doctor ID is required (or use ?all=true for admins)",
          },
        },
        { status: 400 }
      );
    }

    console.log("[Appointments] Fetching appointments:", url);

    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(data, { status: response.status });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("[Appointments] Error fetching appointments:", error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: "Internal server error",
        },
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/appointments
 * Create appointment (requires authentication)
 */
export async function POST(req: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "UNAUTHORIZED", message: "Not authenticated" },
        },
        { status: 401 }
      );
    }

    const body = await req.json();

    // Generate token for backend API
    const token = generateBackendToken(session.user.id, session.user.role);

    console.log("[Appointments] Creating appointment:", body);

    // Call backend API
    const response = await fetch(`${env.apiUrl}/appointments`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(data, { status: response.status });
    }

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error("[Appointments] Error creating appointment:", error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: "Internal server error",
        },
      },
      { status: 500 }
    );
  }
}
