import { auth, generateBackendToken } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";
import { env } from "@/lib/env";

/**
 * GET /api/admin/doctors/[id]
 * Get doctor by ID (admin only)
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
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

    // Generate token for backend API
    let token: string;
    try {
      token = generateBackendToken(session.user.id, session.user.role);
      console.log("[AdminDoctors] Token generated successfully (GET)", {
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
      console.log("[AdminDoctors] Calling backend API (GET):", {
        url: `${env.apiUrl}/admin/doctors/${id}`,
        hasToken: !!token,
      });
      response = await fetch(`${env.apiUrl}/admin/doctors/${id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
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
      console.error("[AdminDoctors] Backend API error:", {
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
    console.error("[AdminDoctors] Error fetching doctor:", error);
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
 * PUT /api/admin/doctors/[id]
 * Update doctor profile (admin only)
 */
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
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
      console.log("[AdminDoctors] Token generated successfully (PUT)", {
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
      console.log("[AdminDoctors] Calling backend API (PUT):", {
        url: `${env.apiUrl}/admin/doctors/${id}`,
        hasToken: !!token,
      });
      response = await fetch(`${env.apiUrl}/admin/doctors/${id}`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
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
      console.error("[AdminDoctors] Backend API error:", {
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
    console.error("[AdminDoctors] Error updating doctor:", error);
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
 * DELETE /api/admin/doctors/[id]
 * Delete doctor (admin only)
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
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

    // Generate token for backend API
    let token: string;
    try {
      token = generateBackendToken(session.user.id, session.user.role);
      console.log("[AdminDoctors] Token generated successfully (DELETE)", {
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
      console.log("[AdminDoctors] Calling backend API (DELETE):", {
        url: `${env.apiUrl}/admin/doctors/${id}`,
        hasToken: !!token,
      });
      response = await fetch(`${env.apiUrl}/admin/doctors/${id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
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
      console.error("[AdminDoctors] Backend API error:", {
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
    console.error("[AdminDoctors] Error deleting doctor:", error);
    return NextResponse.json(
      {
        success: false,
        error: { code: "INTERNAL_ERROR", message: "Internal server error" },
      },
      { status: 500 }
    );
  }
}
