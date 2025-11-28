import { auth } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";
import { env } from "@/lib/env";
import jwt from "jsonwebtoken";

/**
 * Generate JWT token for backend API calls
 * Uses the same secret as the backend
 */
function generateBackendToken(userId: string, role: string): string {
  // Use JWT secret from env config (matches backend fallback in development)
  return jwt.sign({ id: userId, role }, env.jwtSecret, { expiresIn: "7d" });
}

/**
 * PUT /api/users/password
 * Change user password
 */
export async function PUT(req: NextRequest) {
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

    // Call backend API
    console.log("[Password API] Calling backend:", {
      url: `${env.apiUrl}/users/password`,
      userId: session.user.id,
      hasToken: !!token,
    });

    const response = await fetch(`${env.apiUrl}/users/password`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    console.log("[Password API] Backend response:", {
      status: response.status,
      statusText: response.statusText,
      ok: response.ok,
    });

    let data;
    try {
      const responseText = await response.text();
      console.log("[Password API] Response text:", responseText);
      data = JSON.parse(responseText);
    } catch (parseError) {
      console.error("[Password API] Failed to parse response:", parseError);
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "PARSE_ERROR",
            message: "Invalid response from server",
          },
        },
        { status: 500 }
      );
    }

    if (!response.ok) {
      console.error("[Password API] Backend error:", data);
      return NextResponse.json(data, { status: response.status });
    }

    console.log("[Password API] Success:", data);
    return NextResponse.json(data);
  } catch (error) {
    console.error("Error changing password:", error);
    return NextResponse.json(
      {
        success: false,
        error: { code: "INTERNAL_ERROR", message: "Internal server error" },
      },
      { status: 500 }
    );
  }
}
