import test from "node:test";
import assert from "node:assert/strict";
import { loadRedisConfig, loadRedisRequired, normalizeRedisKeyPrefix, sanitizeRedisUrl } from "../src/redis/config.js";

test("loadRedisConfig parses a valid Redis env contract", () => {
  const config = loadRedisConfig({
    REDIS_URL: "rediss://user:secret@example.redis.cloud:6380/1",
    REDIS_KEY_PREFIX: ":auth:session::",
    REDIS_CONNECT_TIMEOUT_MS: "15000",
    REDIS_REQUIRED: "false",
  });

  assert.deepEqual(config, {
    url: "rediss://user:secret@example.redis.cloud:6380/1",
    sanitizedUrl: "rediss://example.redis.cloud:6380/1",
    keyPrefix: "auth:session:",
    connectTimeoutMs: 15000,
    required: false,
  });
});

test("loadRedisRequired rejects invalid boolean values", () => {
  assert.throws(() => loadRedisRequired({ REDIS_REQUIRED: "maybe" }), {
    message: 'REDIS_REQUIRED must be either "true" or "false".',
  });
});

test("loadRedisConfig rejects invalid Redis URLs", () => {
  assert.throws(
    () =>
      loadRedisConfig({
        REDIS_URL: "https://example.com",
        REDIS_REQUIRED: "true",
      }),
    {
      message: "REDIS_URL must use the redis:// or rediss:// protocol.",
    },
  );
});

test("loadRedisConfig rejects malformed numeric env values", () => {
  assert.throws(
    () =>
      loadRedisConfig({
        REDIS_URL: "redis://localhost:6379",
        REDIS_CONNECT_TIMEOUT_MS: "10s",
      }),
    {
      message: "REDIS_CONNECT_TIMEOUT_MS must be a positive integer.",
    },
  );
});

test("normalizeRedisKeyPrefix enforces a usable prefix", () => {
  assert.equal(normalizeRedisKeyPrefix("::ghclone:api::"), "ghclone:api:");
  assert.throws(() => normalizeRedisKeyPrefix("::::"), {
    message: "REDIS_KEY_PREFIX must include at least one non-colon character.",
  });
});

test("sanitizeRedisUrl removes Redis credentials from logs", () => {
  assert.equal(sanitizeRedisUrl("redis://default:secret@localhost:6379/2"), "redis://localhost:6379/2");
});
