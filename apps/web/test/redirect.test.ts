import assert from "node:assert/strict";
import test from "node:test";
import { normalizeSafeRedirectPath, resolveAuthRedirect } from "../lib/auth/redirect";

test("normalizeSafeRedirectPath only accepts local relative paths", () => {
  assert.equal(normalizeSafeRedirectPath("/dashboard?tab=1"), "/dashboard?tab=1");
  assert.equal(normalizeSafeRedirectPath("https://evil.example"), "/dashboard");
  assert.equal(normalizeSafeRedirectPath("//evil.example"), "/dashboard");
});

test("resolveAuthRedirect keeps same-origin redirects and rejects external redirects", () => {
  assert.equal(resolveAuthRedirect("/settings", "http://localhost:3000"), "http://localhost:3000/settings");
  assert.equal(
    resolveAuthRedirect("http://localhost:3000/dashboard?tab=security", "http://localhost:3000"),
    "http://localhost:3000/dashboard?tab=security",
  );
  assert.equal(resolveAuthRedirect("https://evil.example/phish", "http://localhost:3000"), "http://localhost:3000");
});
