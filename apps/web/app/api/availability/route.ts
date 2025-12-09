/**
 * Availability API routes
 * Proxies availability requests to backend API with authentication
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { env } from "@/lib/env";
import jwt from "jsonwebtoken";

function generateBackendToken(userId: string, role: string): string {
  return jwt.sign({ id: userId, role }, env.jwtSecret, { expiresIn: "7d" });
}

/**
 * GET /api/availability
 * Get availabilities (requires doctor ID in query params)
 * Public endpoint - no authentication required (matches backend)
 */
export async function GET(req: NextRequest) {
  try {
    // Get doctor ID from query params
    const { searchParams } = new URL(req.url);
    const doctorId = searchParams.get("doctorId");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

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

    // Call backend API (public endpoint, no auth required)
    const queryString = queryParams.toString();
    const url = `${env.apiUrl}/availability/doctor/${doctorId}${
      queryString ? `?${queryString}` : ""
    }`;

    console.log("[Availability] Fetching availabilities:", url);

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
    console.error("[Availability] Error fetching availabilities:", error);
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
 * POST /api/availability
 * Create availability slot
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

    console.log("[Availability] Creating availability:", body);

    // Call backend API
    const response = await fetch(`${env.apiUrl}/availability`, {
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
    console.error("[Availability] Error creating availability:", error);
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
