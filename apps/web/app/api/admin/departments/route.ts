/**
 * GET /api/admin/departments - List departments (admin only)
 * POST /api/admin/departments - Create department (admin only)
 */

import { NextRequest, NextResponse } from "next/server";
import { auth, generateBackendToken } from "@/lib/auth";
import { env } from "@/lib/env";

async function proxy(
  req: NextRequest,
  method: "GET" | "POST",
  body?: unknown
): Promise<NextResponse> {
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

  let token: string;
  try {
    token = generateBackendToken(session.user.id, session.user.role);
  } catch (tokenError) {
    const err =
      tokenError instanceof Error ? tokenError : new Error(String(tokenError));
    console.error(
      "[api/admin/departments] Failed to generate token:",
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

  const url = `${env.apiUrl}/admin/departments`;
  const init: RequestInit = {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    cache: "no-store",
  };
  if (body !== undefined && method === "POST") {
    init.body = JSON.stringify(body);
  }

  let response: Response;
  try {
    response = await fetch(url, init);
  } catch (fetchError) {
    const err =
      fetchError instanceof Error ? fetchError : new Error(String(fetchError));
    console.error(
      "[api/admin/departments] Fetch error (backend unavailable):",
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
      parseError instanceof Error ? parseError : new Error(String(parseError));
    console.error(
      "[api/admin/departments] Failed to parse backend response:",
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
    console.error("[api/admin/departments] Backend returned error:", {
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
    return NextResponse.json(errorPayload, {
      status: response.status,
    });
  }

  return NextResponse.json(data, {
    status: response.status,
    headers: {
      "Cache-Control": "no-cache, no-store, must-revalidate",
      Pragma: "no-cache",
      Expires: "0",
    },
  });
}

export async function GET(req: NextRequest) {
  try {
    return await proxy(req, "GET");
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    console.error("[api/admin/departments] GET error:", err.message, err.stack);
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

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      {
        ok: false,
        success: false,
        error: { code: "VALIDATION_ERROR", message: "Invalid JSON body" },
      },
      { status: 400 }
    );
  }
  try {
    return await proxy(req, "POST", body);
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    console.error(
      "[api/admin/departments] POST error:",
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
