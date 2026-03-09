import assert from "node:assert/strict";
import test from "node:test";
import { loadWebAuthEnv } from "../lib/auth/env";

const validEnv = {
  AUTH_SECRET: "auth-secret",
  AUTH_GITHUB_ID: "github-id",
  AUTH_GITHUB_SECRET: "github-secret",
  DATABASE_URL: "postgresql://postgres:postgres@localhost:5432/github_clone",
  DATABASE_SSL: "disable",
  API_INTERNAL_URL: "http://localhost:4000",
  INTERNAL_API_AUTH_SECRET: "internal-secret",
};

test("loadWebAuthEnv validates required auth env", () => {
  const env = loadWebAuthEnv(validEnv as unknown as NodeJS.ProcessEnv);

  assert.equal(env.AUTH_SECRET, "auth-secret");
  assert.equal(env.DATABASE_SSL, "disable");
  assert.equal(env.API_INTERNAL_URL, "http://localhost:4000");
});

test("loadWebAuthEnv rejects missing auth secret", () => {
  assert.throws(() => loadWebAuthEnv({ ...validEnv, AUTH_SECRET: " " } as unknown as NodeJS.ProcessEnv), {
    message: "AUTH_SECRET is required.",
  });
});

test("loadWebAuthEnv rejects invalid internal API URL", () => {
  assert.throws(() => loadWebAuthEnv({ ...validEnv, API_INTERNAL_URL: "ftp://internal" } as unknown as NodeJS.ProcessEnv), {
    message: "API_INTERNAL_URL must use http: or https:.",
  });
});
