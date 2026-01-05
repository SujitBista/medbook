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

    const url = `${env.apiUrl}/doctors/${id}`;

    // Call backend API (public endpoint, no auth required)
    let response: Response;
    try {
      response = await fetch(url, {
        headers: {
          "Content-Type": "application/json",
        },
      });
    } catch (fetchError) {
      console.error("[Doctors] Fetch error (backend unavailable):", fetchError);
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
      console.error("[Doctors] Failed to parse backend response:", parseError);
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

    return NextResponse.json(data);
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
