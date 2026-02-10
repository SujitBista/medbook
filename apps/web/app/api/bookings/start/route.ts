/**
 * POST /api/bookings/start
 * Start capacity booking: create PENDING_PAYMENT appointment + PaymentIntent
 * Body: { scheduleId }
 * Returns: { clientSecret, appointmentId }
 */

import { auth, generateBackendToken } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";
import { env } from "@/lib/env";

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

    if (session.user.role !== "PATIENT") {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "FORBIDDEN",
            message: "Only patients can book appointments.",
          },
        },
        { status: 403 }
      );
    }

    const body = await req.json();
    const scheduleId = body?.scheduleId;

    if (!scheduleId || typeof scheduleId !== "string") {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "scheduleId is required",
          },
        },
        { status: 400 }
      );
    }

    let token: string;
    try {
      token = generateBackendToken(session.user.id, session.user.role);
    } catch (tokenError) {
      console.error("[BookingsStart] Failed to generate token:", tokenError);
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "TOKEN_GENERATION_ERROR",
            message: "Failed to generate authentication token",
          },
        },
        { status: 500 }
      );
    }

    const response = await fetch(`${env.apiUrl}/bookings/start`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ scheduleId }),
      cache: "no-store",
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      return NextResponse.json(
        data.success === false ? data : { success: false, error: data },
        { status: response.status }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("[BookingsStart] Error:", error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: "Failed to start booking",
        },
      },
      { status: 500 }
    );
  }
}
