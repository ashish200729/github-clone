import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import test from "node:test";
import { loadInternalAuthConfig } from "../src/auth/config.js";
import { verifyInternalApiActorToken } from "../src/auth/internal.js";

const actor = {
  aud: "github-clone-api",
  iss: "github-clone-web",
  sub: "0d4516f5-b524-4d3a-aebf-8d3fe1f7a304",
  email: "ashish@example.com",
  role: "user",
  method: "GET",
  path: "/api/internal/viewer",
  iat: 1_741_478_400,
  exp: 1_741_478_430,
} as const;

function sign(payload: object, secret: string): string {
  const encodedPayload = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
  const signature = createHmac("sha256", secret).update(encodedPayload).digest("base64url");
  return `${encodedPayload}.${signature}`;
}

test("loadInternalAuthConfig requires the shared internal secret", () => {
  assert.equal(loadInternalAuthConfig({ INTERNAL_API_AUTH_SECRET: "secret" }).secret, "secret");
  assert.throws(() => loadInternalAuthConfig({ INTERNAL_API_AUTH_SECRET: " " }), {
    message: "INTERNAL_API_AUTH_SECRET is required.",
  });
});

test("verifyInternalApiActorToken accepts a valid token", () => {
  const token = sign(actor, "internal-secret");

  const verified = verifyInternalApiActorToken(
    token,
    "internal-secret",
    "GET",
    "/api/internal/viewer",
    new Date("2025-03-09T00:00:10.000Z"),
  );

  assert.deepEqual(verified, {
    userId: actor.sub,
    email: actor.email,
    role: actor.role,
  });
});

test("verifyInternalApiActorToken rejects forged or mismatched requests", () => {
  const token = sign(actor, "internal-secret");

  assert.throws(
    () => verifyInternalApiActorToken(token, "wrong-secret", "GET", "/api/internal/viewer", new Date("2025-03-09T00:00:10.000Z")),
    {
      message: "Forwarded identity signature is invalid.",
    },
  );

  assert.throws(
    () => verifyInternalApiActorToken(token, "internal-secret", "POST", "/api/internal/viewer", new Date("2025-03-09T00:00:10.000Z")),
    {
      message: "Forwarded identity token method does not match the request.",
    },
  );
});
