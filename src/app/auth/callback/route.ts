import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { AUTH_COOKIE_NAME, type AuthSession } from "@/lib/auth-session";
import {
  OAUTH_CODE_VERIFIER_COOKIE_NAME,
  OAUTH_PROVIDER_COOKIE_NAME,
  OAUTH_STATE_COOKIE_NAME,
} from "@/lib/oauth-pkce";
import {
  exchangeOAuthCodeForSession,
  isOAuthProvider,
  isSupabaseConfigured,
} from "@/lib/supabase-rest";

function buildAuthErrorRedirect(requestUrl: string, message: string): URL {
  const redirectUrl = new URL("/auth?mode=login", requestUrl);
  redirectUrl.searchParams.set("error", message);
  return redirectUrl;
}

function clearOAuthCookies(response: NextResponse): void {
  response.cookies.set(OAUTH_CODE_VERIFIER_COOKIE_NAME, "", {
    path: "/",
    maxAge: 0,
  });
  response.cookies.set(OAUTH_STATE_COOKIE_NAME, "", {
    path: "/",
    maxAge: 0,
  });
  response.cookies.set(OAUTH_PROVIDER_COOKIE_NAME, "", {
    path: "/",
    maxAge: 0,
  });
}

function setAuthCookie(response: NextResponse, session: AuthSession): void {
  response.cookies.set(AUTH_COOKIE_NAME, JSON.stringify(session), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
    expires: new Date(session.expiresAt * 1000),
  });
}

function errorRedirect(requestUrl: string, message: string): NextResponse {
  const response = NextResponse.redirect(buildAuthErrorRedirect(requestUrl, message));
  clearOAuthCookies(response);
  return response;
}

export async function GET(request: Request) {
  if (!isSupabaseConfigured()) {
    return errorRedirect(
      request.url,
      "Supabase 환경변수가 설정되지 않았습니다. .env.local을 확인해 주세요.",
    );
  }

  const requestUrl = new URL(request.url);
  const error = requestUrl.searchParams.get("error");
  const errorDescription = requestUrl.searchParams.get("error_description");

  if (error) {
    return errorRedirect(request.url, errorDescription ?? error);
  }

  const code = requestUrl.searchParams.get("code");
  const state = requestUrl.searchParams.get("state");

  const cookieStore = await cookies();
  const cookieState = cookieStore.get(OAUTH_STATE_COOKIE_NAME)?.value;
  const codeVerifier = cookieStore.get(OAUTH_CODE_VERIFIER_COOKIE_NAME)?.value;
  const provider = cookieStore.get(OAUTH_PROVIDER_COOKIE_NAME)?.value;

  if (!code || !state || !cookieState || !codeVerifier || !provider) {
    return errorRedirect(
      request.url,
      "소셜 로그인 세션 정보가 만료되었습니다. 다시 시도해 주세요.",
    );
  }

  if (!isOAuthProvider(provider)) {
    return errorRedirect(
      request.url,
      "소셜 로그인 공급자 정보가 올바르지 않습니다.",
    );
  }

  if (cookieState !== state) {
    return errorRedirect(
      request.url,
      "로그인 상태 검증에 실패했습니다. 다시 시도해 주세요.",
    );
  }

  try {
    const session = await exchangeOAuthCodeForSession({
      authCode: code,
      codeVerifier,
    });

    const response = NextResponse.redirect(new URL("/dashboard", request.url));
    setAuthCookie(response, session);
    clearOAuthCookies(response);
    return response;
  } catch (unknownError) {
    const errorMessage =
      unknownError instanceof Error
        ? unknownError.message
        : "소셜 로그인 처리 중 오류가 발생했습니다.";

    return errorRedirect(request.url, errorMessage);
  }
}
