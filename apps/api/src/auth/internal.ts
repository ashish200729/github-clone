import { createHmac, timingSafeEqual } from "node:crypto";

export const INTERNAL_AUTH_HEADER = "x-github-clone-internal-auth";
const INTERNAL_TOKEN_CLOCK_SKEW_SECONDS = 5;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

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

export interface AuthenticatedInternalActor {
  userId: string;
  email: string | null;
  role: "user" | "admin" | null;
}

export class InternalAuthVerificationError extends Error {}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parsePayload(encodedPayload: string): InternalApiActorTokenPayload {
  let parsedValue: unknown;

  try {
    parsedValue = JSON.parse(Buffer.from(encodedPayload, "base64url").toString("utf8")) as unknown;
  } catch {
    throw new InternalAuthVerificationError("Forwarded identity payload is not valid JSON.");
  }

  if (!isRecord(parsedValue)) {
    throw new InternalAuthVerificationError("Forwarded identity payload must be an object.");
  }

  const {
    aud,
    iss,
    sub,
    email,
    role,
    method,
    path,
    iat,
    exp,
  } = parsedValue;

  if (aud !== "github-clone-api" || iss !== "github-clone-web") {
    throw new InternalAuthVerificationError("Forwarded identity audience or issuer is invalid.");
  }

  if (typeof sub !== "string" || !UUID_PATTERN.test(sub)) {
    throw new InternalAuthVerificationError("Forwarded identity subject is invalid.");
  }

  if (email !== null && (typeof email !== "string" || !email.includes("@"))) {
    throw new InternalAuthVerificationError("Forwarded identity email is invalid.");
  }

  if (role !== null && role !== "user" && role !== "admin") {
    throw new InternalAuthVerificationError("Forwarded identity role is invalid.");
  }

  if (typeof method !== "string" || method.length === 0) {
    throw new InternalAuthVerificationError("Forwarded identity method is invalid.");
  }

  if (typeof path !== "string" || !path.startsWith("/")) {
    throw new InternalAuthVerificationError("Forwarded identity path is invalid.");
  }

  if (typeof iat !== "number" || typeof exp !== "number" || !Number.isInteger(iat) || !Number.isInteger(exp)) {
    throw new InternalAuthVerificationError("Forwarded identity timestamps are invalid.");
  }

  const issuedAt = iat;
  const expiresAt = exp;

  if (expiresAt <= issuedAt) {
    throw new InternalAuthVerificationError("Forwarded identity expiration must be after issuance.");
  }

  return {
    aud,
    iss,
    sub,
    email,
    role,
    method,
    path,
    iat: issuedAt,
    exp: expiresAt,
  };
}

function createSignature(encodedPayload: string, secret: string): Buffer {
  return createHmac("sha256", secret).update(encodedPayload).digest();
}

function normalizeRequestPath(requestPath: string): string {
  try {
    return new URL(requestPath, "http://internal.invalid").pathname;
  } catch {
    return requestPath.split("?")[0] ?? requestPath;
  }
}

export function verifyInternalApiActorToken(
  token: string,
  secret: string,
  requestMethod: string,
  requestPath: string,
  now = new Date(),
): AuthenticatedInternalActor {
  const [encodedPayload, encodedSignature, ...rest] = token.split(".");

  if (!encodedPayload || !encodedSignature || rest.length > 0) {
    throw new InternalAuthVerificationError("Forwarded identity token format is invalid.");
  }

  const actualSignature = Buffer.from(encodedSignature, "base64url");
  const expectedSignature = createSignature(encodedPayload, secret);

  if (actualSignature.length !== expectedSignature.length || !timingSafeEqual(actualSignature, expectedSignature)) {
    throw new InternalAuthVerificationError("Forwarded identity signature is invalid.");
  }

  const payload = parsePayload(encodedPayload);
  const nowInSeconds = Math.floor(now.getTime() / 1000);

  if (payload.exp + INTERNAL_TOKEN_CLOCK_SKEW_SECONDS < nowInSeconds) {
    throw new InternalAuthVerificationError("Forwarded identity token has expired.");
  }

  if (payload.iat - INTERNAL_TOKEN_CLOCK_SKEW_SECONDS > nowInSeconds) {
    throw new InternalAuthVerificationError("Forwarded identity token was issued in the future.");
  }

  if (payload.method !== requestMethod.toUpperCase()) {
    throw new InternalAuthVerificationError("Forwarded identity token method does not match the request.");
  }

  if (payload.path !== normalizeRequestPath(requestPath)) {
    throw new InternalAuthVerificationError("Forwarded identity token path does not match the request.");
  }

  return {
    userId: payload.sub,
    email: payload.email,
    role: payload.role,
  };
}
