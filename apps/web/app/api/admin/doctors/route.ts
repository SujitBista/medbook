import { auth, generateBackendToken } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";
import { env } from "@/lib/env";

/**
 * GET /api/admin/doctors
 * Get all doctors with pagination and search (admin only)
 */
export async function GET(req: NextRequest) {
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

    // Check if user is admin
    if (session.user.role !== "ADMIN") {
      return NextResponse.json(
        {
          success: false,
          error: { code: "FORBIDDEN", message: "Admin access required" },
        },
        { status: 403 }
      );
    }

    // Get query parameters
    const { searchParams } = new URL(req.url);
    const page = searchParams.get("page");
    const limit = searchParams.get("limit");
    const search = searchParams.get("search");
    const specialization = searchParams.get("specialization");

    // Build query string
    const queryParams = new URLSearchParams();
    if (page) queryParams.append("page", page);
    if (limit) queryParams.append("limit", limit);
    if (search) queryParams.append("search", search);
    if (specialization) queryParams.append("specialization", specialization);

    const queryString = queryParams.toString();
    const url = `${env.apiUrl}/admin/doctors${queryString ? `?${queryString}` : ""}`;

    // Generate token for backend API
    let token: string;
    try {
      token = generateBackendToken(session.user.id, session.user.role);
      console.log("[AdminDoctors] Token generated successfully", {
        userId: session.user.id,
        role: session.user.role,
        tokenLength: token.length,
      });
    } catch (tokenError) {
      console.error("[AdminDoctors] Failed to generate token:", tokenError);
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "TOKEN_GENERATION_ERROR",
            message:
              "Failed to generate authentication token. Please check JWT_SECRET configuration.",
          },
        },
        { status: 500 }
      );
    }

    // Call backend API
    let response: Response;
    try {
      console.log("[AdminDoctors] Calling backend API:", {
        url,
        hasToken: !!token,
      });
      response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        cache: "no-store", // Always fetch fresh data
      });
    } catch (fetchError) {
      console.error(
        "[AdminDoctors] Fetch error (backend unavailable):",
        fetchError
      );
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
      console.error(
        "[AdminDoctors] Failed to parse backend response:",
        parseError
      );
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

    // Return with cache-control headers to prevent browser caching
    return NextResponse.json(data, {
      headers: {
        "Cache-Control": "no-cache, no-store, must-revalidate",
        Pragma: "no-cache",
        Expires: "0",
      },
    });
  } catch (error) {
    console.error("[AdminDoctors] Error fetching doctors:", error);
    return NextResponse.json(
      {
        success: false,
        error: { code: "INTERNAL_ERROR", message: "Internal server error" },
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/doctors
 * Register a new doctor user (admin only)
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

    // Check if user is admin
    if (session.user.role !== "ADMIN") {
      return NextResponse.json(
        {
          success: false,
          error: { code: "FORBIDDEN", message: "Admin access required" },
        },
        { status: 403 }
      );
    }

    const body = await req.json();

    // Generate token for backend API
    let token: string;
    try {
      token = generateBackendToken(session.user.id, session.user.role);
      console.log("[AdminDoctorRegistration] Token generated successfully", {
        userId: session.user.id,
        role: session.user.role,
        tokenLength: token.length,
      });
    } catch (tokenError) {
      console.error(
        "[AdminDoctorRegistration] Failed to generate token:",
        tokenError
      );
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "TOKEN_GENERATION_ERROR",
            message:
              "Failed to generate authentication token. Please check JWT_SECRET configuration.",
          },
        },
        { status: 500 }
      );
    }

    // Call backend API
    let response: Response;
    try {
      console.log("[AdminDoctorRegistration] Calling backend API:", {
        url: `${env.apiUrl}/admin/doctors`,
        hasToken: !!token,
      });
      response = await fetch(`${env.apiUrl}/admin/doctors`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });
    } catch (fetchError) {
      console.error(
        "[AdminDoctorRegistration] Fetch error (backend unavailable):",
        fetchError
      );
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
      console.error(
        "[AdminDoctorRegistration] Failed to parse backend response:",
        parseError
      );
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
      console.error("[AdminDoctorRegistration] Backend API error:", {
        status: response.status,
        statusText: response.statusText,
        data,
      });
      // If it's an authentication error, provide more helpful message
      if (response.status === 401) {
        const errorMessage =
          (data as { error?: { message?: string } })?.error?.message ||
          "Invalid or expired token";
        return NextResponse.json(
          {
            success: false,
            error: {
              code: "AUTHENTICATION_ERROR",
              message:
                errorMessage +
                ". This may indicate a JWT_SECRET mismatch between frontend and backend.",
            },
          },
          { status: response.status }
        );
      }
      return NextResponse.json(data, { status: response.status });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("[AdminDoctorRegistration] Error registering doctor:", error);
    return NextResponse.json(
      {
        success: false,
        error: { code: "INTERNAL_ERROR", message: "Internal server error" },
      },
      { status: 500 }
    );
  }
}
