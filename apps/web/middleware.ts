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

  // Define admin-only routes
  const adminRoutes = ["/admin"];
  const isAdminRoute = adminRoutes.some((route) =>
    request.nextUrl.pathname.startsWith(route)
  );

  // Check if user has admin role
  const isAdmin = session?.user?.role === "ADMIN";
  // Type assertion needed because NextAuth session user type doesn't include mustResetPassword
  const mustResetPassword =
    (session?.user as { mustResetPassword?: boolean })?.mustResetPassword ??
    false;

  // Define auth routes (login, register) - redirect to home if already authenticated
  const authRoutes = ["/login", "/register"];
  const isAuthRoute = authRoutes.includes(request.nextUrl.pathname);

  // Password reset route - allow access if mustResetPassword is true
  const isResetPasswordRoute = request.nextUrl.pathname === "/reset-password";

  // If admin must reset password and is not on reset password page, redirect there
  if (session && isAdmin && mustResetPassword && !isResetPasswordRoute) {
    return NextResponse.redirect(new URL("/reset-password", request.url));
  }

  // If accessing reset password page but doesn't need to reset, redirect to admin
  if (isResetPasswordRoute && session && (!mustResetPassword || !isAdmin)) {
    return NextResponse.redirect(new URL("/admin", request.url));
  }

  // If accessing protected route without session, redirect to login
  if (isProtectedRoute && !session) {
    const loginUrl = new URL("/login", request.url);
    // Preserve both pathname and query parameters in callbackUrl
    const callbackUrl = request.nextUrl.pathname + request.nextUrl.search;
    loginUrl.searchParams.set("callbackUrl", callbackUrl);
    return NextResponse.redirect(loginUrl);
  }

  // If accessing admin route without session, redirect to login
  if (isAdminRoute && !session) {
    const loginUrl = new URL("/login", request.url);
    const callbackUrl = request.nextUrl.pathname + request.nextUrl.search;
    loginUrl.searchParams.set("callbackUrl", callbackUrl);
    return NextResponse.redirect(loginUrl);
  }

  // If accessing admin route without admin role, redirect to home
  if (isAdminRoute && session && !isAdmin) {
    return NextResponse.redirect(new URL("/", request.url));
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
