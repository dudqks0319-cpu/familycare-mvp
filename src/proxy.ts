import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

const AUTH_COOKIE_NAME = "familycare_auth";

export function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  const isProtectedPath =
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/settings") ||
    pathname.startsWith("/api/dashboard");

  if (!isProtectedPath) {
    return NextResponse.next();
  }

  const authCookie = request.cookies.get(AUTH_COOKIE_NAME);

  if (!authCookie) {
    return NextResponse.redirect(new URL("/auth?mode=login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/settings/:path*", "/api/dashboard/:path*"],
};
