import assert from "node:assert/strict";
import test from "node:test";
import { buildAuthDatabasePoolConfig } from "../lib/auth/postgres";

test("buildAuthDatabasePoolConfig does not rely on unsupported startup options", () => {
  const config = buildAuthDatabasePoolConfig({
    AUTH_SECRET: "auth-secret",
    AUTH_GITHUB_ID: "github-id",
    AUTH_GITHUB_SECRET: "github-secret",
    DATABASE_URL: "postgresql://postgres:postgres@localhost:5432/github_clone",
    DATABASE_SSL: "disable",
    API_INTERNAL_URL: "http://localhost:4000",
    INTERNAL_API_AUTH_SECRET: "internal-secret",
  } as unknown as NodeJS.ProcessEnv);

  assert.equal(config.options, undefined);
});
