import assert from "node:assert/strict";
import test from "node:test";
import { buildGitTransportToken } from "../src/repos/transport-token.js";

test("buildGitTransportToken creates a signed repo-scoped token", () => {
  const originalEnv = process.env;

  process.env = {
    ...originalEnv,
    GIT_SERVICE_URL: "http://localhost:8080",
    GIT_SERVICE_INTERNAL_TOKEN: "git-internal-secret",
    GIT_TRANSPORT_TOKEN_SECRET: "transport-secret",
    GIT_TRANSPORT_TOKEN_TTL_SECONDS: "3600",
  };

  try {
    const { token, expiresAt } = buildGitTransportToken(
      {
        sub: "0d4516f5-b524-4d3a-aebf-8d3fe1f7a304",
        owner: "ashish",
        repo: "project-alpha",
        scope: ["read", "write"],
      },
      new Date("2026-03-09T00:00:00.000Z"),
    );

    const [encodedPayload, encodedSignature] = token.split(".");
    const payload = JSON.parse(Buffer.from(encodedPayload, "base64url").toString("utf8")) as {
      aud: string;
      iss: string;
      owner: string;
      repo: string;
      scope: string[];
      exp: number;
      iat: number;
    };

    assert.ok(encodedSignature.length > 0);
    assert.equal(payload.aud, "github-clone-git");
    assert.equal(payload.iss, "github-clone-api");
    assert.equal(payload.owner, "ashish");
    assert.equal(payload.repo, "project-alpha");
    assert.deepEqual(payload.scope, ["read", "write"]);
    assert.equal(expiresAt, "2026-03-09T01:00:00.000Z");
  } finally {
    process.env = originalEnv;
  }
});
