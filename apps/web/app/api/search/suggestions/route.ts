/**
 * Search suggestions API route
 * Proxies to backend GET /search/suggestions?q=<text>
 */

import { NextRequest, NextResponse } from "next/server";
import { env } from "@/lib/env";

export interface SuggestionDepartment {
  label: string;
  slug: string;
}

export interface SuggestionDoctor {
  id: string;
  name: string;
  department: string;
}

export interface SearchSuggestionsResponse {
  departments: SuggestionDepartment[];
  doctors: SuggestionDoctor[];
}

/**
 * GET /api/search/suggestions?q=<text>
 * Returns { departments: [{ label, slug }], doctors: [{ id, name, department }] }
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q") ?? "";

    const queryString = new URLSearchParams({ q: q.trim() }).toString();
    const url = `${env.apiUrl}/search/suggestions${queryString ? `?${queryString}` : ""}`;

    const response = await fetch(url, {
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
    });

    const data = (await response.json()) as SearchSuggestionsResponse;

    if (!response.ok) {
      return NextResponse.json(data, { status: response.status });
    }

    return NextResponse.json(data, {
      headers: {
        "Cache-Control":
          "no-store, no-cache, must-revalidate, proxy-revalidate",
        Pragma: "no-cache",
        Expires: "0",
      },
    });
  } catch (error) {
    console.error("[SearchSuggestions] Error:", error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: "Failed to fetch suggestions",
        },
      },
      { status: 500 }
    );
  }
}
