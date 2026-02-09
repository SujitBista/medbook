/**
 * Appointment cancel API route
 * Proxies cancel requests to backend API with authentication.
 * Returns appointment + refundDecision + paymentSummary.
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { env } from "@/lib/env";
import jwt from "jsonwebtoken";

function generateBackendToken(userId: string, role: string): string {
  return jwt.sign({ id: userId, role }, env.jwtSecret, { expiresIn: "7d" });
}

/**
 * POST /api/appointments/[id]/cancel
 * Cancel appointment (requires authentication). Applies refund policy.
 */
export async function POST(
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

    const body = await req.json().catch(() => ({}));
    const token = generateBackendToken(session.user.id, session.user.role);

    const response = await fetch(`${env.apiUrl}/appointments/${id}/cancel`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ reason: body.reason }),
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(data, { status: response.status });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("[Appointments] Error cancelling appointment:", error);
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
