import "server-only";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export const AUTH_COOKIE_NAME = "familycare_auth";

export type AuthSession = {
  userId: string;
  email: string;
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
};

const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export function parseAuthSession(raw: string | undefined): AuthSession | null {
  if (!raw) {
    return null;
  }

  try {
    const parsed: unknown = JSON.parse(raw);

    if (!isRecord(parsed)) {
      return null;
    }

    const { userId, email, accessToken, refreshToken, expiresAt } = parsed;

    if (
      typeof userId !== "string" ||
      typeof email !== "string" ||
      typeof accessToken !== "string" ||
      typeof refreshToken !== "string" ||
      typeof expiresAt !== "number"
    ) {
      return null;
    }

    return { userId, email, accessToken, refreshToken, expiresAt };
  } catch {
    return null;
  }
}

export async function getAuthSessionFromCookie(): Promise<AuthSession | null> {
  const cookieStore = await cookies();
  const value = cookieStore.get(AUTH_COOKIE_NAME)?.value;

  const session = parseAuthSession(value);

  if (!session) {
    return null;
  }

  if (session.expiresAt * 1000 <= Date.now()) {
    cookieStore.delete(AUTH_COOKIE_NAME);
    return null;
  }

  return session;
}

export async function setAuthSessionCookie(session: AuthSession): Promise<void> {
  const cookieStore = await cookies();

  cookieStore.set(AUTH_COOKIE_NAME, JSON.stringify(session), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: COOKIE_MAX_AGE_SECONDS,
    expires: new Date(session.expiresAt * 1000),
  });
}

export async function clearAuthSessionCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(AUTH_COOKIE_NAME);
}

export async function requireAuthSession(): Promise<AuthSession> {
  const session = await getAuthSessionFromCookie();

  if (!session) {
    redirect("/auth?mode=login&error=로그인이%20필요합니다.");
  }

  return session;
}
