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
  // Log the API URL being used (will show in Vercel function logs)
  console.log("[Doctors] API URL from env:", env.apiUrl);
  console.log(
    "[Doctors] NEXT_PUBLIC_API_URL from process.env:",
    process.env.NEXT_PUBLIC_API_URL || "not set"
  );
  // #region agent log
  if (typeof fetch !== "undefined") {
    fetch("http://127.0.0.1:7242/ingest/9fff1556-eb4e-4c8c-a035-40fce4d2fa93", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        location: "apps/web/app/api/doctors/route.ts:30",
        message: "GET request received",
        data: {
          url: req.url,
          apiUrl: env.apiUrl,
          nextPublicApiUrl: process.env.NEXT_PUBLIC_API_URL || "not set",
        },
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
    // #region agent log
    if (typeof fetch !== "undefined") {
      fetch(
        "http://127.0.0.1:7242/ingest/9fff1556-eb4e-4c8c-a035-40fce4d2fa93",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            location: "apps/web/app/api/doctors/route.ts:91",
            message: "Building backend URL",
            data: { envApiUrl: env.apiUrl, fullUrl: url, queryString },
            timestamp: Date.now(),
            sessionId: "debug-session",
            runId: "run1",
            hypothesisId: "A",
          }),
        }
      ).catch(() => {});
    }
    // #endregion

    // Call backend API (public endpoint, no auth required)
    let response: Response;
    try {
      response = await fetch(url, {
        headers: {
          "Content-Type": "application/json",
        },
        cache: "no-store", // Prevent Next.js caching
      });
      // #region agent log
      if (typeof fetch !== "undefined") {
        fetch(
          "http://127.0.0.1:7242/ingest/9fff1556-eb4e-4c8c-a035-40fce4d2fa93",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              location: "apps/web/app/api/doctors/route.ts:103",
              message: "Backend fetch response",
              data: {
                status: response.status,
                statusText: response.statusText,
                ok: response.ok,
                url,
              },
              timestamp: Date.now(),
              sessionId: "debug-session",
              runId: "run1",
              hypothesisId: "B",
            }),
          }
        ).catch(() => {});
      }
      // #endregion
    } catch (fetchError) {
      console.error("[Doctors] Fetch error (backend unavailable):", fetchError);
      // #region agent log
      if (typeof fetch !== "undefined") {
        fetch(
          "http://127.0.0.1:7242/ingest/9fff1556-eb4e-4c8c-a035-40fce4d2fa93",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              location: "apps/web/app/api/doctors/route.ts:117",
              message: "Backend fetch error",
              data: {
                error:
                  fetchError instanceof Error
                    ? fetchError.message
                    : String(fetchError),
                url,
              },
              timestamp: Date.now(),
              sessionId: "debug-session",
              runId: "run1",
              hypothesisId: "B",
            }),
          }
        ).catch(() => {});
      }
      // #endregion
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
      // #region agent log
      if (typeof fetch !== "undefined") {
        fetch(
          "http://127.0.0.1:7242/ingest/9fff1556-eb4e-4c8c-a035-40fce4d2fa93",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              location: "apps/web/app/api/doctors/route.ts:128",
              message: "Backend response parsed",
              data: {
                status: response.status,
                hasData: !!data,
                dataKeys:
                  data && typeof data === "object" ? Object.keys(data) : [],
              },
              timestamp: Date.now(),
              sessionId: "debug-session",
              runId: "run1",
              hypothesisId: "C",
            }),
          }
        ).catch(() => {});
      }
      // #endregion
    } catch (parseError) {
      console.error("[Doctors] Failed to parse backend response:", parseError);
      // #region agent log
      if (typeof fetch !== "undefined") {
        fetch(
          "http://127.0.0.1:7242/ingest/9fff1556-eb4e-4c8c-a035-40fce4d2fa93",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              location: "apps/web/app/api/doctors/route.ts:138",
              message: "Backend response parse error",
              data: {
                error:
                  parseError instanceof Error
                    ? parseError.message
                    : String(parseError),
                status: response.status,
              },
              timestamp: Date.now(),
              sessionId: "debug-session",
              runId: "run1",
              hypothesisId: "C",
            }),
          }
        ).catch(() => {});
      }
      // #endregion
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
