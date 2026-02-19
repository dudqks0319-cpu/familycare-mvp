import "server-only";

import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "node:crypto";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { refreshAccessToken } from "@/lib/supabase-rest";

export const AUTH_COOKIE_NAME = "familycare_auth";

export type AuthSession = {
  userId: string;
  email: string;
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
};

const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;
const SESSION_KEY_SALT = "familycare-auth-session";
const ENCRYPTION_ALGORITHM = "aes-256-gcm";
const SESSION_ENCRYPTION_KEY = process.env.SESSION_ENCRYPTION_KEY?.trim() || "";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function getCookieSecurityOptions(expiresAt: number) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: COOKIE_MAX_AGE_SECONDS,
    expires: new Date(expiresAt * 1000),
  };
}

function getEncryptionKey(): Buffer | null {
  if (!SESSION_ENCRYPTION_KEY) {
    return null;
  }

  return scryptSync(SESSION_ENCRYPTION_KEY, SESSION_KEY_SALT, 32);
}

function assertEncryptionReady(): Buffer {
  const key = getEncryptionKey();

  if (!key) {
    if (process.env.NODE_ENV === "production") {
      throw new Error(
        "SESSION_ENCRYPTION_KEY 환경변수가 필요합니다. .env.local 또는 배포 환경변수에 설정해 주세요.",
      );
    }

    throw new Error("세션 암호화 키가 설정되지 않았습니다.");
  }

  return key;
}

function parseSessionJson(rawJson: string): AuthSession | null {
  try {
    const parsed: unknown = JSON.parse(rawJson);

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

function encryptText(plainText: string): string {
  const key = assertEncryptionReady();
  const iv = randomBytes(16);
  const cipher = createCipheriv(ENCRYPTION_ALGORITHM, key, iv);

  const encrypted = Buffer.concat([cipher.update(plainText, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return `${iv.toString("hex")}:${authTag.toString("hex")}:${encrypted.toString("hex")}`;
}

function decryptText(cipherText: string): string | null {
  const key = getEncryptionKey();

  if (!key) {
    return null;
  }

  const parts = cipherText.split(":");

  if (parts.length !== 3) {
    return null;
  }

  const [ivHex, authTagHex, encryptedHex] = parts;

  try {
    const decipher = createDecipheriv(
      ENCRYPTION_ALGORITHM,
      key,
      Buffer.from(ivHex, "hex"),
    );
    decipher.setAuthTag(Buffer.from(authTagHex, "hex"));

    const decrypted = Buffer.concat([
      decipher.update(Buffer.from(encryptedHex, "hex")),
      decipher.final(),
    ]);

    return decrypted.toString("utf8");
  } catch {
    return null;
  }
}

export function serializeAuthSession(session: AuthSession): string {
  const json = JSON.stringify(session);

  if (!SESSION_ENCRYPTION_KEY) {
    if (process.env.NODE_ENV === "production") {
      throw new Error(
        "SESSION_ENCRYPTION_KEY 환경변수가 필요합니다. .env.local 또는 배포 환경변수에 설정해 주세요.",
      );
    }

    return json;
  }

  return encryptText(json);
}

export function parseAuthSession(raw: string | undefined): AuthSession | null {
  if (!raw) {
    return null;
  }

  const plainSession = parseSessionJson(raw);

  if (plainSession) {
    return plainSession;
  }

  const decrypted = decryptText(raw);

  if (!decrypted) {
    return null;
  }

  return parseSessionJson(decrypted);
}

export async function getAuthSessionFromCookie(): Promise<AuthSession | null> {
  const cookieStore = await cookies();
  const value = cookieStore.get(AUTH_COOKIE_NAME)?.value;

  const session = parseAuthSession(value);

  if (!session) {
    return null;
  }

  if (session.expiresAt * 1000 <= Date.now()) {
    try {
      const refreshedSession = await refreshAccessToken(session.refreshToken);
      await setAuthSessionCookie(refreshedSession);
      return refreshedSession;
    } catch {
      cookieStore.delete(AUTH_COOKIE_NAME);
      return null;
    }
  }

  return session;
}

export async function setAuthSessionCookie(session: AuthSession): Promise<void> {
  const cookieStore = await cookies();

  cookieStore.set(AUTH_COOKIE_NAME, serializeAuthSession(session), {
    ...getCookieSecurityOptions(session.expiresAt),
  });
}

export async function clearAuthSessionCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(AUTH_COOKIE_NAME);
}

export function getAuthCookieOptions(expiresAt: number) {
  return getCookieSecurityOptions(expiresAt);
}

export async function requireAuthSession(): Promise<AuthSession> {
  const session = await getAuthSessionFromCookie();

  if (!session) {
    redirect("/auth?mode=login&error=로그인이%20필요합니다.");
  }

  return session;
}
