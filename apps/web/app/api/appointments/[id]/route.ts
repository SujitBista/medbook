/**
 * Appointment API routes for individual appointments
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
 * GET /api/appointments/[id]
 * Get appointment by ID (requires authentication)
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "Appointment ID is required",
          },
        },
        { status: 400 }
      );
    }

    // Generate token for backend API
    const token = generateBackendToken(session.user.id, session.user.role);

    console.log("[Appointments] Fetching appointment:", id);

    // Call backend API
    const response = await fetch(`${env.apiUrl}/appointments/${id}`, {
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
    console.error("[Appointments] Error fetching appointment:", error);
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
 * PUT /api/appointments/[id]
 * Update appointment (requires authentication)
 */
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "Appointment ID is required",
          },
        },
        { status: 400 }
      );
    }

    const body = await req.json();

    // Generate token for backend API
    const token = generateBackendToken(session.user.id, session.user.role);

    console.log("[Appointments] Updating appointment:", id, body);

    // Call backend API
    const response = await fetch(`${env.apiUrl}/appointments/${id}`, {
      method: "PUT",
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

    return NextResponse.json(data);
  } catch (error) {
    console.error("[Appointments] Error updating appointment:", error);
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
