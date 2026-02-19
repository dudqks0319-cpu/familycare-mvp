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

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export function isSupabaseConfigured(): boolean {
  return Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
}

function assertSupabaseConfigured(): { url: string; anonKey: string } {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new Error("Supabase 환경변수가 비어 있습니다. .env.local을 확인해 주세요.");
  }

  return { url: SUPABASE_URL, anonKey: SUPABASE_ANON_KEY };
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
