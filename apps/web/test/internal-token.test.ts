import assert from "node:assert/strict";
import test from "node:test";
import { buildInternalApiActorToken } from "../lib/auth/internal-token";

test("buildInternalApiActorToken binds the token to the request method and path", () => {
  const token = buildInternalApiActorToken(
    {
      id: "0d4516f5-b524-4d3a-aebf-8d3fe1f7a304",
      email: "ashish@example.com",
      role: "user",
    },
    "internal-secret",
    "post",
    "/api/internal/repos",
    new Date("2026-03-09T00:00:00.000Z"),
  );

  const [encodedPayload, encodedSignature] = token.split(".");
  const payload = JSON.parse(Buffer.from(encodedPayload, "base64url").toString("utf8")) as {
    aud: string;
    iss: string;
    method: string;
    path: string;
    sub: string;
    role: string | null;
    email: string | null;
    iat: number;
    exp: number;
  };

  assert.ok(encodedSignature.length > 0);
  assert.equal(payload.aud, "github-clone-api");
  assert.equal(payload.iss, "github-clone-web");
  assert.equal(payload.method, "POST");
  assert.equal(payload.path, "/api/internal/repos");
  assert.equal(payload.sub, "0d4516f5-b524-4d3a-aebf-8d3fe1f7a304");
  assert.equal(payload.role, "user");
  assert.equal(payload.email, "ashish@example.com");
  assert.ok(payload.exp > payload.iat);
});
