import "server-only";

import type { AuthSession } from "@/lib/auth-session";

type SupabaseAuthUser = {
  id: string;
  email?: string;
};

type SupabaseAuthPayload = {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  token_type?: string;
  user?: SupabaseAuthUser;
};

type SupabaseErrorPayload = {
  error?: string;
  error_description?: string;
  message?: string;
};

export const OAUTH_PROVIDERS = ["google", "kakao"] as const;

export type OAuthProvider = (typeof OAUTH_PROVIDERS)[number];

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

function trimTrailingSlash(value: string): string {
  return value.endsWith("/") ? value.slice(0, -1) : value;
}

export function getAppSiteUrl(): string {
  const rawSiteUrl =
    process.env.NEXT_PUBLIC_SITE_URL ??
    process.env.SITE_URL ??
    process.env.NEXT_PUBLIC_APP_URL;

  if (rawSiteUrl && rawSiteUrl.trim().length > 0) {
    return trimTrailingSlash(rawSiteUrl.trim());
  }

  if (process.env.VERCEL_URL) {
    return `https://${trimTrailingSlash(process.env.VERCEL_URL)}`;
  }

  return "http://localhost:3000";
}

export function getOAuthCallbackUrl(): string {
  return `${getAppSiteUrl()}/auth/callback`;
}

export function isSupabaseConfigured(): boolean {
  return Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
}

export function isOAuthProvider(value: string): value is OAuthProvider {
  return OAUTH_PROVIDERS.includes(value as OAuthProvider);
}

export function assertSupabaseConfigured(): { url: string; anonKey: string } {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new Error("Supabase 환경변수가 비어 있습니다. .env.local을 확인해 주세요.");
  }

  return { url: trimTrailingSlash(SUPABASE_URL), anonKey: SUPABASE_ANON_KEY };
}

function getErrorMessage(payload: SupabaseErrorPayload | null): string {
  if (!payload) {
    return "Supabase 요청 중 오류가 발생했습니다.";
  }

  return (
    payload.error_description ??
    payload.message ??
    payload.error ??
    "Supabase 요청 중 오류가 발생했습니다."
  );
}

function toAuthSession(payload: SupabaseAuthPayload): AuthSession {
  if (
    !payload.access_token ||
    !payload.refresh_token ||
    !payload.expires_in ||
    !payload.user?.id
  ) {
    throw new Error("Supabase에서 세션 토큰을 받지 못했습니다.");
  }

  return {
    userId: payload.user.id,
    email: payload.user.email ?? "",
    accessToken: payload.access_token,
    refreshToken: payload.refresh_token,
    expiresAt: Math.floor(Date.now() / 1000) + payload.expires_in,
  };
}

async function postAuth<TBody extends Record<string, string>>(
  endpoint: string,
  body: TBody,
): Promise<SupabaseAuthPayload> {
  const { url, anonKey } = assertSupabaseConfigured();

  const response = await fetch(`${url}${endpoint}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: anonKey,
    },
    body: JSON.stringify(body),
    cache: "no-store",
  });

  const payload = (await response.json().catch(() => null)) as
    | SupabaseAuthPayload
    | SupabaseErrorPayload
    | null;

  if (!response.ok) {
    throw new Error(getErrorMessage(payload as SupabaseErrorPayload | null));
  }

  return (payload ?? {}) as SupabaseAuthPayload;
}

async function postLogout(accessToken: string): Promise<void> {
  const { url, anonKey } = assertSupabaseConfigured();

  const response = await fetch(`${url}/auth/v1/logout`, {
    method: "POST",
    headers: {
      apikey: anonKey,
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    cache: "no-store",
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as
      | SupabaseErrorPayload
      | null;
    throw new Error(getErrorMessage(payload));
  }
}

export function buildOAuthAuthorizeUrl(params: {
  provider: OAuthProvider;
  codeChallenge: string;
  state: string;
  redirectTo?: string;
}): string {
  const { url } = assertSupabaseConfigured();
  const authorizeUrl = new URL(`${url}/auth/v1/authorize`);

  authorizeUrl.searchParams.set("provider", params.provider);
  authorizeUrl.searchParams.set("code_challenge", params.codeChallenge);
  authorizeUrl.searchParams.set("code_challenge_method", "s256");
  authorizeUrl.searchParams.set("state", params.state);
  authorizeUrl.searchParams.set("redirect_to", params.redirectTo ?? getOAuthCallbackUrl());

  return authorizeUrl.toString();
}

export async function exchangeOAuthCodeForSession(params: {
  authCode: string;
  codeVerifier: string;
}): Promise<AuthSession> {
  const payload = await postAuth("/auth/v1/token?grant_type=pkce", {
    auth_code: params.authCode,
    code_verifier: params.codeVerifier,
  });

  return toAuthSession(payload);
}

export async function refreshAccessToken(
  refreshToken: string,
): Promise<AuthSession> {
  const payload = await postAuth("/auth/v1/token?grant_type=refresh_token", {
    refresh_token: refreshToken,
  });

  return toAuthSession(payload);
}

export async function signOutSession(accessToken: string): Promise<void> {
  await postLogout(accessToken);
}

export async function signInWithPassword(params: {
  email: string;
  password: string;
}): Promise<AuthSession> {
  const payload = await postAuth("/auth/v1/token?grant_type=password", {
    email: params.email,
    password: params.password,
  });

  return toAuthSession(payload);
}

export async function signUpWithPassword(params: {
  email: string;
  password: string;
}): Promise<AuthSession | null> {
  const payload = await postAuth("/auth/v1/signup", {
    email: params.email,
    password: params.password,
  });

  if (!payload.access_token) {
    return null;
  }

  return toAuthSession(payload);
}
