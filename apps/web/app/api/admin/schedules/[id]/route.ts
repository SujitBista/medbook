/**
 * PATCH /api/admin/schedules/[id] - Update capacity schedule (admin only)
 * DELETE /api/admin/schedules/[id] - Delete capacity schedule (admin only)
 */

import { NextRequest, NextResponse } from "next/server";
import { auth, generateBackendToken } from "@/lib/auth";
import { env } from "@/lib/env";

async function proxy(
  req: NextRequest,
  id: string,
  method: "PATCH" | "DELETE",
  body?: unknown
): Promise<NextResponse> {
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
  if (session.user.role !== "ADMIN") {
    return NextResponse.json(
      {
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
    console.error("[AdminSchedules] Failed to generate token:", tokenError);
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

  const url = `${env.apiUrl}/admin/schedules/${encodeURIComponent(id)}`;
  const init: RequestInit = {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    cache: "no-store",
  };
  if (body !== undefined && method === "PATCH") {
    init.body = JSON.stringify(body);
  }

  let response: Response;
  try {
    response = await fetch(url, init);
  } catch (fetchError) {
    console.error("[AdminSchedules] Fetch error:", fetchError);
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
  } catch {
    data = {
      success: false,
      error: {
        code: "PARSE_ERROR",
        message: "Invalid response from backend server",
      },
    };
  }

  return NextResponse.json(data, { status: response.status });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!id) {
    return NextResponse.json(
      {
        success: false,
        error: { code: "VALIDATION_ERROR", message: "Schedule ID is required" },
      },
      { status: 400 }
    );
  }
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      {
        success: false,
        error: { code: "VALIDATION_ERROR", message: "Invalid JSON body" },
      },
      { status: 400 }
    );
  }
  return proxy(req, id, "PATCH", body);
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!id) {
    return NextResponse.json(
      {
        success: false,
        error: { code: "VALIDATION_ERROR", message: "Schedule ID is required" },
      },
      { status: 400 }
    );
  }
  return proxy(req, id, "DELETE");
}
