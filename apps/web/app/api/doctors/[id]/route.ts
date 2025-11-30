/**
 * Doctor API routes by ID
 * Proxies doctor requests to backend API
 */

import { NextRequest, NextResponse } from "next/server";
import { env } from "@/lib/env";

/**
 * GET /api/doctors/[id]
 * Get doctor by ID (public endpoint)
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Call backend API (public endpoint, no auth required)
    const response = await fetch(`${env.apiUrl}/doctors/${id}`, {
      headers: {
        "Content-Type": "application/json",
      },
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(data, { status: response.status });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("[Doctors] Error fetching doctor by ID:", error);
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
