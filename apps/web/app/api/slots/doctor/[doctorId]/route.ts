/**
 * Slots API routes
 * Proxies slot requests to backend API
 */

import { NextRequest, NextResponse } from "next/server";
import { env } from "@/lib/env";

/**
 * GET /api/slots/doctor/[doctorId]
 * Get slots by doctor ID (public endpoint - no authentication required)
 * Query params: startDate, endDate, status (optional)
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ doctorId: string }> }
) {
  try {
    const { doctorId } = await params;
    const { searchParams } = new URL(req.url);
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const status = searchParams.get("status");

    if (!doctorId) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "VALIDATION_ERROR", message: "Doctor ID is required" },
        },
        { status: 400 }
      );
    }

    // Build query string
    const queryParams = new URLSearchParams();
    if (startDate) queryParams.append("startDate", startDate);
    if (endDate) queryParams.append("endDate", endDate);
    if (status) queryParams.append("status", status);

    // Call backend API (public endpoint, no auth required)
    const queryString = queryParams.toString();
    const url = `${env.apiUrl}/slots/doctor/${doctorId}${
      queryString ? `?${queryString}` : ""
    }`;

    console.log("[Slots] Fetching slots:", url);

    const response = await fetch(url, {
      headers: {
        "Content-Type": "application/json",
      },
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(data, { status: response.status });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("[Slots] Error fetching slots:", error);
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
