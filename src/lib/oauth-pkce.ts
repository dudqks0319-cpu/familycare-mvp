import "server-only";

import { createHash, randomBytes } from "node:crypto";

export const OAUTH_CODE_VERIFIER_COOKIE_NAME = "familycare_oauth_verifier";
export const OAUTH_STATE_COOKIE_NAME = "familycare_oauth_state";
export const OAUTH_PROVIDER_COOKIE_NAME = "familycare_oauth_provider";
export const OAUTH_REDIRECT_COOKIE_NAME = "familycare_oauth_redirect";

export const OAUTH_COOKIE_MAX_AGE_SECONDS = 60 * 10;

function toBase64Url(buffer: Buffer): string {
  return buffer
    .toString("base64")
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replace(/=+$/g, "");
}

export function generatePkcePair(): {
  codeVerifier: string;
  codeChallenge: string;
} {
  const codeVerifier = toBase64Url(randomBytes(32));
  const codeChallenge = toBase64Url(
    createHash("sha256").update(codeVerifier).digest(),
  );

  return {
    codeVerifier,
    codeChallenge,
  };
}

export function generateOAuthState(): string {
  return toBase64Url(randomBytes(24));
}
