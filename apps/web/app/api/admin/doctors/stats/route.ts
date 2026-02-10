import { auth, generateBackendToken } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";
import { env } from "@/lib/env";

/**
 * GET /api/admin/doctors/stats
 * Get doctor statistics (admin only)
 */
export async function GET(req: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        {
          ok: false,
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
          ok: false,
          success: false,
          error: { code: "FORBIDDEN", message: "Admin access required" },
        },
        { status: 403 }
      );
    }

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
      const err =
        tokenError instanceof Error
          ? tokenError
          : new Error(String(tokenError));
      console.error(
        "[api/admin/doctors/stats] Failed to generate token:",
        err.message,
        err.stack
      );
      return NextResponse.json(
        {
          ok: false,
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
        url: `${env.apiUrl}/admin/doctors/stats`,
        hasToken: !!token,
      });
      response = await fetch(`${env.apiUrl}/admin/doctors/stats`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });
    } catch (fetchError) {
      const err =
        fetchError instanceof Error
          ? fetchError
          : new Error(String(fetchError));
      console.error(
        "[api/admin/doctors/stats] Fetch error (backend unavailable):",
        err.message,
        err.stack
      );
      return NextResponse.json(
        {
          ok: false,
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
      const err =
        parseError instanceof Error
          ? parseError
          : new Error(String(parseError));
      console.error(
        "[api/admin/doctors/stats] Failed to parse backend response:",
        err.message,
        err.stack
      );
      return NextResponse.json(
        {
          ok: false,
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
      console.error("[api/admin/doctors/stats] Backend returned error:", {
        status: response.status,
        statusText: response.statusText,
        body: data,
      });
      const errorPayload =
        typeof data === "object" && data !== null && "error" in (data as object)
          ? { ok: false, ...(data as object) }
          : {
              ok: false,
              success: false,
              error: {
                code: "BACKEND_ERROR",
                message:
                  (data as { error?: { message?: string } })?.error?.message ??
                  "Backend request failed",
              },
            };
      if (response.status === 401) {
        const errorMessage =
          (data as { error?: { message?: string } })?.error?.message ||
          "Invalid or expired token";
        return NextResponse.json(
          {
            ok: false,
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
      return NextResponse.json(errorPayload, { status: response.status });
    }

    return NextResponse.json(data);
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    console.error(
      "[api/admin/doctors/stats] Error fetching doctor stats:",
      err.message,
      err.stack
    );
    return NextResponse.json(
      {
        ok: false,
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: err.message || "Internal server error",
        },
      },
      { status: 500 }
    );
  }
}
