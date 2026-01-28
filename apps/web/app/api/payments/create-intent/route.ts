import { auth, generateBackendToken } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";
import { env } from "@/lib/env";

/**
 * POST /api/payments/create-intent
 * Create a payment intent for an appointment
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

    const body = await req.json();

    // Generate token for backend API
    let token: string;
    try {
      token = generateBackendToken(session.user.id, session.user.role);
    } catch (tokenError) {
      console.error("[PaymentIntent] Failed to generate token:", tokenError);
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "TOKEN_GENERATION_ERROR",
            message: "Failed to generate authentication token",
          },
        },
        { status: 500 }
      );
    }

    // Call backend API
    const url = `${env.apiUrl}/payments/create-intent`;

    let response: Response;
    try {
      response = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
        cache: "no-store",
      });
    } catch (fetchError) {
      console.error("[PaymentIntent] Fetch error:", fetchError);
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "NETWORK_ERROR",
            message: "The service is temporarily unavailable",
          },
        },
        { status: 503 }
      );
    }

    let data: {
      success?: boolean;
      data?: {
        paymentIntentId?: string;
        clientSecret?: string;
      };
      error?: {
        code?: string;
        message?: string;
      };
      message?: string;
    };
    try {
      const text = await response.text();
      if (!text) {
        throw new Error("Empty response from backend");
      }
      data = JSON.parse(text);
    } catch (parseError) {
      console.error("[PaymentIntent] JSON parse error:", parseError);
      console.error("[PaymentIntent] Response status:", response.status);
      console.error(
        "[PaymentIntent] Response statusText:",
        response.statusText
      );
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "PARSE_ERROR",
            message: "Failed to parse response from payment service",
          },
        },
        { status: 500 }
      );
    }

    if (!response.ok) {
      console.error("[PaymentIntent] Backend error:", data);
      return NextResponse.json(data, { status: response.status });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("[PaymentIntent] Error:", error);
    const errorMessage =
      error instanceof Error ? error.message : "An unexpected error occurred";
    console.error("[PaymentIntent] Error details:", {
      message: errorMessage,
      stack: error instanceof Error ? error.stack : undefined,
    });
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: errorMessage,
        },
      },
      { status: 500 }
    );
  }
}
