"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import {
  clearAuthSessionCookie,
  setAuthSessionCookie,
} from "@/lib/auth-session";
import {
  generateOAuthState,
  generatePkcePair,
  OAUTH_CODE_VERIFIER_COOKIE_NAME,
  OAUTH_COOKIE_MAX_AGE_SECONDS,
  OAUTH_PROVIDER_COOKIE_NAME,
  OAUTH_STATE_COOKIE_NAME,
} from "@/lib/oauth-pkce";
import {
  buildOAuthAuthorizeUrl,
  getOAuthCallbackUrl,
  isOAuthProvider,
  isSupabaseConfigured,
  signInWithPassword,
  signUpWithPassword,
} from "@/lib/supabase-rest";

function asString(value: FormDataEntryValue | null): string {
  return typeof value === "string" ? value.trim() : "";
}

function getSafeErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return "처리 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.";
}

function buildRedirect(
  url: string,
  messageKey: "error" | "message",
  message: string,
) {
  return `${url}&${messageKey}=${encodeURIComponent(message)}`;
}

async function setOAuthTempCookies(params: {
  provider: string;
  codeVerifier: string;
  state: string;
}): Promise<void> {
  const cookieStore = await cookies();
  const secure = process.env.NODE_ENV === "production";

  cookieStore.set(OAUTH_CODE_VERIFIER_COOKIE_NAME, params.codeVerifier, {
    httpOnly: true,
    secure,
    sameSite: "lax",
    path: "/",
    maxAge: OAUTH_COOKIE_MAX_AGE_SECONDS,
  });

  cookieStore.set(OAUTH_STATE_COOKIE_NAME, params.state, {
    httpOnly: true,
    secure,
    sameSite: "lax",
    path: "/",
    maxAge: OAUTH_COOKIE_MAX_AGE_SECONDS,
  });

  cookieStore.set(OAUTH_PROVIDER_COOKIE_NAME, params.provider, {
    httpOnly: true,
    secure,
    sameSite: "lax",
    path: "/",
    maxAge: OAUTH_COOKIE_MAX_AGE_SECONDS,
  });
}

export async function startOAuthAction(formData: FormData): Promise<void> {
  if (!isSupabaseConfigured()) {
    redirect(
      buildRedirect(
        "/auth?mode=login",
        "error",
        "Supabase 환경변수가 설정되지 않았습니다. .env.local을 확인해 주세요.",
      ),
    );
  }

  const provider = asString(formData.get("provider")).toLowerCase();

  if (!isOAuthProvider(provider)) {
    redirect(
      buildRedirect(
        "/auth?mode=login",
        "error",
        "지원하지 않는 소셜 로그인 공급자입니다.",
      ),
    );
  }

  const { codeVerifier, codeChallenge } = generatePkcePair();
  const state = generateOAuthState();

  await setOAuthTempCookies({
    provider,
    codeVerifier,
    state,
  });

  const authorizeUrl = buildOAuthAuthorizeUrl({
    provider,
    codeChallenge,
    state,
    redirectTo: getOAuthCallbackUrl(),
  });

  redirect(authorizeUrl);
}

export async function loginAction(formData: FormData): Promise<void> {
  if (!isSupabaseConfigured()) {
    redirect(
      buildRedirect(
        "/auth?mode=login",
        "error",
        "Supabase 환경변수가 설정되지 않았습니다. .env.local을 확인해 주세요.",
      ),
    );
  }

  const email = asString(formData.get("email")).toLowerCase();
  const password = asString(formData.get("password"));

  if (!email || !password) {
    redirect(
      buildRedirect(
        "/auth?mode=login",
        "error",
        "이메일과 비밀번호를 모두 입력해 주세요.",
      ),
    );
  }

  try {
    const session = await signInWithPassword({ email, password });
    await setAuthSessionCookie(session);
    redirect("/dashboard");
  } catch (error) {
    redirect(
      buildRedirect("/auth?mode=login", "error", getSafeErrorMessage(error)),
    );
  }
}

export async function signupAction(formData: FormData): Promise<void> {
  if (!isSupabaseConfigured()) {
    redirect(
      buildRedirect(
        "/auth?mode=signup",
        "error",
        "Supabase 환경변수가 설정되지 않았습니다. .env.local을 확인해 주세요.",
      ),
    );
  }

  const email = asString(formData.get("email")).toLowerCase();
  const password = asString(formData.get("password"));

  if (!email || !password) {
    redirect(
      buildRedirect(
        "/auth?mode=signup",
        "error",
        "이메일과 비밀번호를 모두 입력해 주세요.",
      ),
    );
  }

  if (password.length < 8) {
    redirect(
      buildRedirect(
        "/auth?mode=signup",
        "error",
        "비밀번호는 8자 이상으로 설정해 주세요.",
      ),
    );
  }

  try {
    const session = await signUpWithPassword({ email, password });

    if (session) {
      await setAuthSessionCookie(session);
      redirect("/dashboard");
    }

    redirect(
      buildRedirect(
        "/auth?mode=login",
        "message",
        "가입 요청이 접수되었습니다. 이메일 인증 후 로그인해 주세요.",
      ),
    );
  } catch (error) {
    redirect(
      buildRedirect("/auth?mode=signup", "error", getSafeErrorMessage(error)),
    );
  }
}

export async function logoutAction(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(OAUTH_CODE_VERIFIER_COOKIE_NAME);
  cookieStore.delete(OAUTH_STATE_COOKIE_NAME);
  cookieStore.delete(OAUTH_PROVIDER_COOKIE_NAME);

  await clearAuthSessionCookie();
  redirect("/auth?mode=login&message=로그아웃되었습니다.");
}
