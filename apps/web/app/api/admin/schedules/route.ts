/**
 * Admin schedules API (capacity windows)
 * GET /api/admin/schedules - list (query: doctorId?, date?, startDate?, endDate?)
 * POST /api/admin/schedules - create (body: doctorId, date, startTime, endTime, maxPatients)
 */

import { NextRequest, NextResponse } from "next/server";
import { auth, generateBackendToken } from "@/lib/auth";
import { env } from "@/lib/env";

async function getToken(session: { user: { id?: string; role?: string } }) {
  const id = session.user?.id;
  if (!id) throw new Error("No user id");
  return generateBackendToken(id, session.user.role ?? "ADMIN");
}

function requireAdmin(
  session: { user?: { id?: string; role?: string } } | null
) {
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
        error: { code: "FORBIDDEN", message: "Admin required" },
      },
      { status: 403 }
    );
  }
  return null;
}

export async function GET(req: NextRequest) {
  const session = await auth();
  const err = requireAdmin(session);
  if (err) return err;

  try {
    const { searchParams } = new URL(req.url);
    const q = new URLSearchParams();
    const doctorId = searchParams.get("doctorId");
    const date = searchParams.get("date");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    if (doctorId) q.set("doctorId", doctorId);
    if (date) q.set("date", date);
    if (startDate) q.set("startDate", startDate);
    if (endDate) q.set("endDate", endDate);
    const token = await getToken(session!);
    const url = `${env.apiUrl}/admin/schedules${q.toString() ? `?${q}` : ""}`;
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      cache: "no-store",
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok)
      return NextResponse.json(data, { status: response.status });
    return NextResponse.json(data);
  } catch (e) {
    console.error("[AdminSchedules] GET error:", e);
    return NextResponse.json(
      {
        success: false,
        error: { code: "INTERNAL_ERROR", message: "Failed to fetch schedules" },
      },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  const session = await auth();
  const err = requireAdmin(session);
  if (err) return err;

  try {
    const body = await req.json();
    const token = await getToken(session!);
    const response = await fetch(`${env.apiUrl}/admin/schedules`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
      cache: "no-store",
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok)
      return NextResponse.json(data, { status: response.status });
    return NextResponse.json(data);
  } catch (e) {
    console.error("[AdminSchedules] POST error:", e);
    return NextResponse.json(
      {
        success: false,
        error: { code: "INTERNAL_ERROR", message: "Failed to create schedule" },
      },
      { status: 500 }
    );
  }
}
