import { NextRequest, NextResponse } from "next/server";

/**
 * OPTIONS handler for root API route
 * Handles CORS preflight requests to the root API endpoint
 */
export async function OPTIONS(req: NextRequest) {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS, PATCH",
      "Access-Control-Allow-Headers":
        "Content-Type, Authorization, X-Requested-With",
      "Access-Control-Max-Age": "86400",
    },
  });
}

/**
 * GET handler for root API route
 * Returns API information
 */
export async function GET(req: NextRequest) {
  return NextResponse.json({
    message: "MedBook API",
    version: "1.0.0",
  });
}
