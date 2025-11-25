import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Middleware to protect routes
 * Redirects unauthenticated users to login page
 *
 * Note: In NextAuth v5, we use auth() as a wrapper that handles the request
 * properly in the edge runtime. The request is automatically passed to auth()
 * by Next.js middleware, and the session is available via req.auth in the wrapper callback.
 */
export default auth(async (req) => {
  const request = req as NextRequest;
  const session = await req.auth;

  // Define protected routes
  const protectedRoutes = ["/dashboard", "/profile"];
  const isProtectedRoute = protectedRoutes.some((route) =>
    request.nextUrl.pathname.startsWith(route)
  );

  // Define auth routes (login, register) - redirect to home if already authenticated
  const authRoutes = ["/login", "/register"];
  const isAuthRoute = authRoutes.includes(request.nextUrl.pathname);

  // If accessing protected route without session, redirect to login
  if (isProtectedRoute && !session) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("callbackUrl", request.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  // If accessing auth routes with session, redirect to home
  if (isAuthRoute && session) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return NextResponse.next();
});

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
