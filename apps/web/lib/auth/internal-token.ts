import { createHmac } from "node:crypto";
import type { AuthenticatedAppUser } from "@/lib/auth/protection";

export const INTERNAL_AUTH_HEADER = "x-github-clone-internal-auth";
const INTERNAL_TOKEN_TTL_SECONDS = 30;

export interface InternalApiActorTokenPayload {
  aud: "github-clone-api";
  iss: "github-clone-web";
  sub: string;
  email: string | null;
  role: "user" | "admin" | null;
  method: string;
  path: string;
  iat: number;
  exp: number;
}

function toBase64Url(value: string): string {
  return Buffer.from(value, "utf8").toString("base64url");
}

function signPayload(encodedPayload: string, secret: string): string {
  return createHmac("sha256", secret).update(encodedPayload).digest("base64url");
}

export function buildInternalApiActorToken(
  user: AuthenticatedAppUser,
  secret: string,
  method: string,
  path: string,
  now = new Date(),
): string {
  const issuedAt = Math.floor(now.getTime() / 1000);
  const payload: InternalApiActorTokenPayload = {
    aud: "github-clone-api",
    iss: "github-clone-web",
    sub: user.id,
    email: user.email ?? null,
    role: user.role ?? null,
    method: method.toUpperCase(),
    path,
    iat: issuedAt,
    exp: issuedAt + INTERNAL_TOKEN_TTL_SECONDS,
  };

  const encodedPayload = toBase64Url(JSON.stringify(payload));
  const signature = signPayload(encodedPayload, secret);

  return `${encodedPayload}.${signature}`;
}
