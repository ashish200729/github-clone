import dotenv from "dotenv";
import path from "node:path";
import { URL } from "node:url";
import { fileURLToPath } from "node:url";

const DEFAULT_POOL_MAX = 10;
const DEFAULT_IDLE_TIMEOUT_MS = 30_000;
const DEFAULT_CONNECTION_TIMEOUT_MS = 10_000;
const envFilePath = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../.env");

type DatabaseSslMode = "disable" | "require";

export interface DatabaseConfig {
  connectionString: string;
  max: number;
  idleTimeoutMillis: number;
  connectionTimeoutMillis: number;
  ssl?: false | { rejectUnauthorized: true };
}

dotenv.config({ path: envFilePath, quiet: true });

function parsePositiveInteger(value: string | undefined, fallback: number, envName: string): number {
  if (value === undefined) {
    return fallback;
  }

  const parsedValue = Number.parseInt(value, 10);

  if (!Number.isInteger(parsedValue) || parsedValue <= 0) {
    throw new Error(`${envName} must be a positive integer.`);
  }

  return parsedValue;
}

function parseSslMode(value: string | undefined): DatabaseSslMode {
  if (value === undefined) {
    return "disable";
  }

  if (value === "disable") {
    return "disable";
  }

  if (value === "require") {
    return "require";
  }

  throw new Error('DATABASE_SSL must be either "disable" or "require".');
}

function validateConnectionString(connectionString: string): string {
  let parsedUrl: URL;

  try {
    parsedUrl = new URL(connectionString);
  } catch {
    throw new Error("DATABASE_URL must be a valid PostgreSQL connection string.");
  }

  if (!["postgres:", "postgresql:"].includes(parsedUrl.protocol)) {
    throw new Error("DATABASE_URL must use the postgres:// or postgresql:// protocol.");
  }

  return connectionString;
}

export function loadDatabaseConfig(env: NodeJS.ProcessEnv = process.env): DatabaseConfig {
  const databaseUrl = env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required.");
  }

  const sslMode = parseSslMode(env.DATABASE_SSL);
  const ssl =
    env.DATABASE_SSL === undefined ? undefined : sslMode === "require" ? ({ rejectUnauthorized: true } as const) : false;

  return {
    connectionString: validateConnectionString(databaseUrl),
    max: parsePositiveInteger(env.DATABASE_POOL_MAX, DEFAULT_POOL_MAX, "DATABASE_POOL_MAX"),
    idleTimeoutMillis: parsePositiveInteger(
      env.DATABASE_IDLE_TIMEOUT_MS,
      DEFAULT_IDLE_TIMEOUT_MS,
      "DATABASE_IDLE_TIMEOUT_MS",
    ),
    connectionTimeoutMillis: parsePositiveInteger(
      env.DATABASE_CONNECTION_TIMEOUT_MS,
      DEFAULT_CONNECTION_TIMEOUT_MS,
      "DATABASE_CONNECTION_TIMEOUT_MS",
    ),
    ssl,
  };
}
