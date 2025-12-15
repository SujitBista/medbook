/**
 * Slots API routes
 * Proxies slot requests to backend API
 */

import { NextRequest, NextResponse } from "next/server";
import { env } from "@/lib/env";

// Disable caching for this route - slots must always be fresh
export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * GET /api/slots/doctor/[doctorId]
 * Get slots by doctor ID (public endpoint - no authentication required)
 * Query params: startDate, endDate, status (optional)
 *
 * Always returns fresh data from the backend to ensure deleted
 * availabilities/slots don't appear as "ghost slots"
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
    // Use cache: 'no-store' to ensure fresh data on every request
    const queryString = queryParams.toString();
    const url = `${env.apiUrl}/slots/doctor/${doctorId}${
      queryString ? `?${queryString}` : ""
    }`;

    if (process.env.NODE_ENV === "development") {
      console.log("[Slots] Fetching slots:", url);
    }

    const response = await fetch(url, {
      headers: {
        "Content-Type": "application/json",
      },
      cache: "no-store", // Always fetch fresh data
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(data, { status: response.status });
    }

    // Return with cache-control headers to prevent browser caching
    return NextResponse.json(data, {
      headers: {
        "Cache-Control": "no-cache, no-store, must-revalidate",
        Pragma: "no-cache",
        Expires: "0",
      },
    });
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
