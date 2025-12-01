/**
 * Public Doctors API route
 * Proxies doctor listing requests to backend API (public endpoint)
 */

import { NextRequest, NextResponse } from "next/server";
import { env } from "@/lib/env";

/**
 * GET /api/doctors
 * Get all doctors (public endpoint, no auth required)
 */
export async function GET(req: NextRequest) {
  try {
    // Get query parameters
    const { searchParams } = new URL(req.url);
    const page = searchParams.get("page");
    const limit = searchParams.get("limit");
    const search = searchParams.get("search");
    const specialization = searchParams.get("specialization");
    const hasAvailability = searchParams.get("hasAvailability");

    // Build query string
    const queryParams = new URLSearchParams();
    if (page) queryParams.append("page", page);
    if (limit) queryParams.append("limit", limit);
    if (search) queryParams.append("search", search);
    if (specialization) queryParams.append("specialization", specialization);
    // Default to true: only show doctors with availability (public endpoint)
    // Allow override via query parameter for admin/edge cases
    queryParams.append("hasAvailability", hasAvailability ?? "true");

    const queryString = queryParams.toString();
    const url = `${env.apiUrl}/doctors${queryString ? `?${queryString}` : ""}`;

    console.log("[Doctors] Fetching doctors:", url);

    // Call backend API (public endpoint, no auth required)
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
    console.error("[Doctors] Error fetching doctors:", error);
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
