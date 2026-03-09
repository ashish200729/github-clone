import assert from "node:assert/strict";
import test from "node:test";
import { summarizeServiceHealth } from "../src/health.js";

test("summarizeServiceHealth reports ok when all dependencies are healthy", () => {
  const summary = summarizeServiceHealth([
    { name: "database", status: "ok", required: true },
    { name: "redis", status: "ok", required: true },
  ]);

  assert.deepEqual(summary, {
    status: "ok",
    httpStatus: 200,
    message: "API health check passed.",
  });
});

test("summarizeServiceHealth preserves hard failures for required dependencies", () => {
  const summary = summarizeServiceHealth([
    { name: "database", status: "ok", required: true },
    { name: "redis", status: "error", required: true },
  ]);

  assert.deepEqual(summary, {
    status: "error",
    httpStatus: 503,
    message: "API health check failed because required dependencies are unhealthy: redis.",
  });
});

test("summarizeServiceHealth reports degraded when only optional dependencies are impaired", () => {
  const summary = summarizeServiceHealth([
    { name: "database", status: "ok", required: true },
    { name: "redis", status: "degraded", required: false },
  ]);

  assert.deepEqual(summary, {
    status: "degraded",
    httpStatus: 200,
    message: "API health check passed with degraded dependencies: redis.",
  });
});
