import assert from "node:assert/strict";
import test from "node:test";
import type { NextRequest } from "next/server";
import { classifyAuthRateLimit } from "../lib/infra/rate-limit";

function createMockRequest(pathname: string): NextRequest {
  return {
    nextUrl: new URL(`http://localhost:3000${pathname}`),
    headers: new Headers(),
  } as unknown as NextRequest;
}

test("classifyAuthRateLimit targets signin and callback endpoints only", () => {
  const signInPolicy = classifyAuthRateLimit(createMockRequest("/api/auth/signin/github"));
  const callbackPolicy = classifyAuthRateLimit(createMockRequest("/api/auth/callback/github"));
  const sessionPolicy = classifyAuthRateLimit(createMockRequest("/api/auth/session"));

  assert.equal(signInPolicy?.bucket, "auth-signin");
  assert.equal(callbackPolicy?.bucket, "auth-callback");
  assert.equal(sessionPolicy, null);
});
