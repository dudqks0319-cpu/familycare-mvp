import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { isPublicTestMode } from "@/lib/public-test-mode";

const AUTH_COOKIE_NAME = "familycare_auth";

export function proxy(request: NextRequest) {
  if (isPublicTestMode()) {
    return NextResponse.next();
  }

  const pathname = request.nextUrl.pathname;

  const isProtectedPath =
    pathname.startsWith("/settings") ||
    pathname.startsWith("/invite") ||
    pathname.startsWith("/api/dashboard");

  if (!isProtectedPath) {
    return NextResponse.next();
  }

  const authCookie = request.cookies.get(AUTH_COOKIE_NAME);

  if (!authCookie) {
    const redirectTarget = `${pathname}${request.nextUrl.search}`;
    const loginUrl = new URL("/auth?mode=login", request.url);
    loginUrl.searchParams.set("redirect", redirectTarget);

    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/settings/:path*",
    "/invite/:path*",
    "/api/dashboard/:path*",
  ],
};
