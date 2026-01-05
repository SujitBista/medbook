/**
 * Public Doctors API route
 * Proxies doctor listing requests to backend API (public endpoint)
 */

import { NextRequest, NextResponse } from "next/server";
import { env } from "@/lib/env";

/**
 * OPTIONS handler for CORS preflight
 */
export async function OPTIONS(req: NextRequest) {
  // #region agent log
  if (typeof fetch !== "undefined") {
    fetch("http://127.0.0.1:7242/ingest/9fff1556-eb4e-4c8c-a035-40fce4d2fa93", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        location: "apps/web/app/api/doctors/route.ts:13",
        message: "OPTIONS preflight received",
        data: { origin: req.headers.get("origin") || "none", url: req.url },
        timestamp: Date.now(),
        sessionId: "debug-session",
        runId: "run1",
        hypothesisId: "A",
      }),
    }).catch(() => {});
  }
  // #endregion
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "Access-Control-Max-Age": "86400",
    },
  });
}

/**
 * GET /api/doctors
 * Get all doctors (public endpoint, no auth required)
 */
export async function GET(req: NextRequest) {
  // #region agent log
  if (typeof fetch !== "undefined") {
    fetch("http://127.0.0.1:7242/ingest/9fff1556-eb4e-4c8c-a035-40fce4d2fa93", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        location: "apps/web/app/api/doctors/route.ts:30",
        message: "GET request received",
        data: { url: req.url, apiUrl: env.apiUrl },
        timestamp: Date.now(),
        sessionId: "debug-session",
        runId: "run1",
        hypothesisId: "A",
      }),
    }).catch(() => {});
  }
  // #endregion
  try {
    // Get query parameters
    const { searchParams } = new URL(req.url);
    const page = searchParams.get("page");
    const limit = searchParams.get("limit");
    const search = searchParams.get("search");
    const specialization = searchParams.get("specialization");
    const city = searchParams.get("city");
    const state = searchParams.get("state");
    const sortBy = searchParams.get("sortBy");
    const sortOrder = searchParams.get("sortOrder");
    const hasAvailability = searchParams.get("hasAvailability");

    // Build query string
    const queryParams = new URLSearchParams();
    if (page) queryParams.append("page", page);
    if (limit) queryParams.append("limit", limit);
    if (search) queryParams.append("search", search);
    if (specialization) queryParams.append("specialization", specialization);
    if (city) queryParams.append("city", city);
    if (state) queryParams.append("state", state);
    if (sortBy) queryParams.append("sortBy", sortBy);
    if (sortOrder) queryParams.append("sortOrder", sortOrder);
    // Default to true: only show doctors with availability (public endpoint)
    // Allow override via query parameter for admin/edge cases
    queryParams.append("hasAvailability", hasAvailability ?? "true");

    const queryString = queryParams.toString();
    const url = `${env.apiUrl}/doctors${queryString ? `?${queryString}` : ""}`;

    console.log("[Doctors] Fetching doctors:", url);

    // Call backend API (public endpoint, no auth required)
    let response: Response;
    try {
      response = await fetch(url, {
        headers: {
          "Content-Type": "application/json",
        },
        cache: "no-store", // Prevent Next.js caching
      });
    } catch (fetchError) {
      console.error("[Doctors] Fetch error (backend unavailable):", fetchError);
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "NETWORK_ERROR",
            message:
              "The service is temporarily unavailable. Please try again later.",
          },
        },
        { status: 502 }
      );
    }

    let data: unknown;
    try {
      const text = await response.text();
      data = text ? JSON.parse(text) : {};
    } catch (parseError) {
      console.error("[Doctors] Failed to parse backend response:", parseError);
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "PARSE_ERROR",
            message: "Invalid response from backend server",
          },
        },
        { status: 500 }
      );
    }

    if (!response.ok) {
      return NextResponse.json(data, { status: response.status });
    }

    // Add cache control headers to prevent browser caching
    return NextResponse.json(data, {
      headers: {
        "Cache-Control":
          "no-store, no-cache, must-revalidate, proxy-revalidate",
        Pragma: "no-cache",
        Expires: "0",
      },
    });
  } catch (error) {
    console.error("[Doctors] Unexpected error:", error);
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
