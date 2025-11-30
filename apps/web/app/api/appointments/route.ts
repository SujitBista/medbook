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

    // Generate token for backend API
    const token = generateBackendToken(session.user.id, session.user.role);

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
            message: "Patient ID or Doctor ID is required",
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
