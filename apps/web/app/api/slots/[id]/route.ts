/**
 * Slot API routes by ID
 * Proxies slot requests to backend API with authentication
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { env } from "@/lib/env";
import jwt from "jsonwebtoken";

function generateBackendToken(userId: string, role: string): string {
  return jwt.sign({ id: userId, role }, env.jwtSecret, { expiresIn: "7d" });
}

/**
 * GET /api/slots/[id]
 * Get slot by ID
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Call backend API (public endpoint, no auth required)
    const response = await fetch(`${env.apiUrl}/slots/${id}`, {
      headers: {
        "Content-Type": "application/json",
      },
      cache: "no-store",
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(data, { status: response.status });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("[Slots] Error fetching slot:", error);
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
 * DELETE /api/slots/[id]
 * Delete a slot (requires authentication - admin/doctor only)
 * Will return 409 CONFLICT if the slot has non-cancelled appointments
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
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

    // Only admins and doctors can delete slots
    if (session.user.role !== "ADMIN" && session.user.role !== "DOCTOR") {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "FORBIDDEN",
            message: "Only admins and doctors can delete slots",
          },
        },
        { status: 403 }
      );
    }

    // Get doctorId from request body
    const body = await req.json().catch(() => ({}));
    const { doctorId } = body;

    if (!doctorId) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "VALIDATION_ERROR", message: "Doctor ID is required" },
        },
        { status: 400 }
      );
    }

    // Generate token for backend API
    const token = generateBackendToken(session.user.id, session.user.role);

    console.log("[Slots] Deleting slot:", id);

    // Call backend API
    const response = await fetch(`${env.apiUrl}/slots/${id}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ doctorId }),
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(data, { status: response.status });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("[Slots] Error deleting slot:", error);
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
