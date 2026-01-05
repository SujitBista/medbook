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
 * Calls the backend users/profile endpoint and returns the parsed response.
 * Centralizes logging and network / parse error handling.
 */
async function callBackendProfileApi(
  method: "GET" | "PUT",
  token: string,
  body?: unknown
) {
  const url = `${env.apiUrl}/users/profile`;

  console.log("[Profile API] Calling backend:", {
    url,
    method,
    hasToken: !!token,
  });

  let response: Response;
  try {
    response = await fetch(url, {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      ...(method === "PUT" && { body: JSON.stringify(body ?? {}) }),
    });
  } catch (fetchError) {
    console.error(
      "[Profile API] Fetch error (network/server connectivity issue):",
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

  console.log("[Profile API] Backend response:", {
    status: response.status,
    statusText: response.statusText,
    ok: response.ok,
  });

  let data: unknown;
  try {
    const text = await response.text();
    console.log("[Profile API] Response text:", text);
    data = text ? JSON.parse(text) : {};
  } catch (parseError) {
    console.error(
      "[Profile API] Failed to parse backend response:",
      parseError
    );
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "PARSE_ERROR",
          message: "Invalid response from profile service",
        },
      },
      { status: 500 }
    );
  }

  if (!response.ok) {
    console.error("[Profile API] Backend returned error:", data);
    return NextResponse.json(data, { status: response.status });
  }

  console.log("[Profile API] Success:", data);
  return NextResponse.json(data);
}

/**
 * GET /api/users/profile
 * Get current user profile
 */
export async function GET(_req: NextRequest) {
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

    const token = generateBackendToken(session.user.id, session.user.role);

    return await callBackendProfileApi("GET", token);
  } catch (error) {
    console.error("Error fetching profile:", error);
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
 * PUT /api/users/profile
 * Update current user profile
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

    const token = generateBackendToken(session.user.id, session.user.role);

    return await callBackendProfileApi("PUT", token, body);
  } catch (error) {
    console.error("Error updating profile:", error);
    return NextResponse.json(
      {
        success: false,
        error: { code: "INTERNAL_ERROR", message: "Internal server error" },
      },
      { status: 500 }
    );
  }
}
