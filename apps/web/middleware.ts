import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Next.js Middleware
 * Handles authentication and route protection
 *
 * Note: In NextAuth v5, we use auth() as a wrapper that handles the request
 * properly in the edge runtime. The request is automatically passed to auth()
 * by Next.js middleware, and the session is available via req.auth in the wrapper callback.
 */
export default async function middleware(req: NextRequest) {
  // Handle OPTIONS preflight requests BEFORE auth() to avoid 400 errors
  // This is critical - OPTIONS requests must be handled before any auth() wrapper
  if (req.method === "OPTIONS") {
    // #region agent log
    if (typeof fetch !== "undefined") {
      fetch(
        "http://127.0.0.1:7242/ingest/9fff1556-eb4e-4c8c-a035-40fce4d2fa93",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            location: "apps/web/middleware.ts:16",
            message: "OPTIONS preflight handled before auth",
            data: {
              method: req.method,
              origin: req.headers.get("origin") || "none",
              url: req.url,
              pathname: req.nextUrl.pathname,
            },
            timestamp: Date.now(),
            sessionId: "debug-session",
            runId: "run1",
            hypothesisId: "A",
          }),
        }
      ).catch(() => {});
    }
    // #endregion
    return new NextResponse(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods":
          "GET, POST, PUT, DELETE, OPTIONS, PATCH",
        "Access-Control-Allow-Headers":
          "Content-Type, Authorization, X-Requested-With",
        "Access-Control-Max-Age": "86400",
      },
    });
  }

  // For non-OPTIONS requests, get session and handle routing
  // #region agent log
  if (typeof fetch !== "undefined") {
    fetch("http://127.0.0.1:7242/ingest/9fff1556-eb4e-4c8c-a035-40fce4d2fa93", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        location: "apps/web/middleware.ts:33",
        message: "Middleware entry (non-OPTIONS)",
        data: {
          method: req.method,
          pathname: req.nextUrl.pathname,
          origin: req.headers.get("origin") || "none",
          url: req.url,
        },
        timestamp: Date.now(),
        sessionId: "debug-session",
        runId: "run1",
        hypothesisId: "C",
      }),
    }).catch(() => {});
  }
  // #endregion

  const session = await auth();

  // Define protected routes
  const protectedRoutes = ["/dashboard", "/profile"];
  const isProtectedRoute = protectedRoutes.some((route) =>
    req.nextUrl.pathname.startsWith(route)
  );

  // Define admin-only routes
  const adminRoutes = ["/admin"];
  const isAdminRoute = adminRoutes.some((route) =>
    req.nextUrl.pathname.startsWith(route)
  );

  // Check if user has admin role
  const isAdmin = session?.user?.role === "ADMIN";
  // Type assertion needed because NextAuth session user type doesn't include mustResetPassword
  const mustResetPassword =
    (session?.user as { mustResetPassword?: boolean })?.mustResetPassword ??
    false;

  // Define auth routes (login, register) - redirect to home if already authenticated
  const authRoutes = ["/login", "/register"];
  const isAuthRoute = authRoutes.includes(req.nextUrl.pathname);

  // Password reset route - allow access if mustResetPassword is true
  const isResetPasswordRoute = req.nextUrl.pathname === "/reset-password";

  // If admin must reset password and is not on reset password page, redirect there
  if (session && isAdmin && mustResetPassword && !isResetPasswordRoute) {
    return NextResponse.redirect(new URL("/reset-password", req.url));
  }

  // If accessing reset password page but doesn't need to reset, redirect to admin
  if (isResetPasswordRoute && session && (!mustResetPassword || !isAdmin)) {
    return NextResponse.redirect(new URL("/admin", req.url));
  }

  // If accessing protected route without session, redirect to login
  if (isProtectedRoute && !session) {
    const loginUrl = new URL("/login", req.url);
    // Preserve both pathname and query parameters in callbackUrl
    const callbackUrl = req.nextUrl.pathname + req.nextUrl.search;
    loginUrl.searchParams.set("callbackUrl", callbackUrl);
    return NextResponse.redirect(loginUrl);
  }

  // If accessing admin route without session, redirect to login
  if (isAdminRoute && !session) {
    const loginUrl = new URL("/login", req.url);
    const callbackUrl = req.nextUrl.pathname + req.nextUrl.search;
    loginUrl.searchParams.set("callbackUrl", callbackUrl);
    return NextResponse.redirect(loginUrl);
  }

  // If accessing admin route without admin role, redirect to home
  if (isAdminRoute && session && !isAdmin) {
    return NextResponse.redirect(new URL("/", req.url));
  }

  // If accessing auth routes with session, redirect to home
  if (isAuthRoute && session) {
    return NextResponse.redirect(new URL("/", req.url));
  }

  return NextResponse.next();
}

// Configure which routes the middleware should run on
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!api|_next/static|_next/image|favicon.ico).*)",
  ],
};
