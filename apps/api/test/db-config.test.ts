import assert from "node:assert/strict";
import test from "node:test";
import { loadDatabaseConfig } from "../src/db/config.js";

test("loadDatabaseConfig parses a valid PostgreSQL env contract", () => {
  const config = loadDatabaseConfig({
    DATABASE_URL: "postgresql://postgres:secret@localhost:5432/github_clone",
    DATABASE_POOL_MAX: "15",
    DATABASE_IDLE_TIMEOUT_MS: "30000",
    DATABASE_CONNECTION_TIMEOUT_MS: "10000",
    DATABASE_SSL: "require",
  });

  assert.deepEqual(config, {
    connectionString: "postgresql://postgres:secret@localhost:5432/github_clone",
    max: 15,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
    ssl: { rejectUnauthorized: true },
  });
});

test("loadDatabaseConfig rejects malformed numeric env values", () => {
  assert.throws(
    () =>
      loadDatabaseConfig({
        DATABASE_URL: "postgresql://postgres:secret@localhost:5432/github_clone",
        DATABASE_POOL_MAX: "10workers",
      }),
    {
      message: "DATABASE_POOL_MAX must be a positive integer.",
    },
  );
});

test("loadDatabaseConfig rejects invalid ssl mode", () => {
  assert.throws(
    () =>
      loadDatabaseConfig({
        DATABASE_URL: "postgresql://postgres:secret@localhost:5432/github_clone",
        DATABASE_SSL: "enabled",
      }),
    {
      message: 'DATABASE_SSL must be either "disable" or "require".',
    },
  );
});
