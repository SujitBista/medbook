/**
 * GET /api/availability/windows
 * Capacity windows for a doctor on a date (public)
 * Query: doctorId, date (YYYY-MM-DD)
 */

import { NextRequest, NextResponse } from "next/server";
import { env } from "@/lib/env";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const doctorId = searchParams.get("doctorId");
    const date = searchParams.get("date");

    if (!doctorId || !date) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "doctorId and date are required",
          },
        },
        { status: 400 }
      );
    }

    const url = `${env.apiUrl}/availability/windows?doctorId=${encodeURIComponent(doctorId)}&date=${encodeURIComponent(date)}`;

    const response = await fetch(url, {
      headers: { "Content-Type": "application/json" },
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
    console.error("[AvailabilityWindows] Error:", error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: "Failed to fetch availability",
        },
      },
      { status: 500 }
    );
  }
}
