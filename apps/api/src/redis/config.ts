import dotenv from "dotenv";
import path from "node:path";
import { URL, fileURLToPath } from "node:url";

const DEFAULT_REDIS_KEY_PREFIX = "ghclone:api:";
const DEFAULT_REDIS_CONNECT_TIMEOUT_MS = 10_000;
const envFilePath = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../.env");

export interface RedisConfig {
  url: string;
  sanitizedUrl: string;
  keyPrefix: string;
  connectTimeoutMs: number;
  required: boolean;
}

dotenv.config({ path: envFilePath, quiet: true });

function parsePositiveInteger(value: string | undefined, fallback: number, envName: string): number {
  if (value === undefined) {
    return fallback;
  }

  const normalizedValue = value.trim();

  if (!/^\d+$/.test(normalizedValue)) {
    throw new Error(`${envName} must be a positive integer.`);
  }

  const parsedValue = Number.parseInt(normalizedValue, 10);

  if (!Number.isInteger(parsedValue) || parsedValue <= 0) {
    throw new Error(`${envName} must be a positive integer.`);
  }

  return parsedValue;
}

function parseRequiredBoolean(value: string | undefined, fallback: boolean, envName: string): boolean {
  if (value === undefined) {
    return fallback;
  }

  if (value === "true") {
    return true;
  }

  if (value === "false") {
    return false;
  }

  throw new Error(`${envName} must be either "true" or "false".`);
}

export function normalizeRedisKeyPrefix(value: string | undefined): string {
  const rawValue = value?.trim() ?? DEFAULT_REDIS_KEY_PREFIX;
  const normalizedValue = rawValue.replace(/^:+/, "").replace(/:+$/, "");

  if (!normalizedValue) {
    throw new Error("REDIS_KEY_PREFIX must include at least one non-colon character.");
  }

  return `${normalizedValue}:`;
}

export function loadRedisRequired(env: NodeJS.ProcessEnv = process.env): boolean {
  return parseRequiredBoolean(env.REDIS_REQUIRED, true, "REDIS_REQUIRED");
}

export function sanitizeRedisUrl(value: string): string {
  const parsedUrl = new URL(value);
  const port = parsedUrl.port ? `:${parsedUrl.port}` : "";
  const database = parsedUrl.pathname && parsedUrl.pathname !== "/" ? parsedUrl.pathname : "";

  return `${parsedUrl.protocol}//${parsedUrl.hostname}${port}${database}`;
}

function validateRedisUrl(value: string): string {
  let parsedUrl: URL;

  try {
    parsedUrl = new URL(value);
  } catch {
    throw new Error("REDIS_URL must be a valid Redis connection string.");
  }

  if (!["redis:", "rediss:"].includes(parsedUrl.protocol)) {
    throw new Error("REDIS_URL must use the redis:// or rediss:// protocol.");
  }

  return value;
}

export function loadRedisConfig(env: NodeJS.ProcessEnv = process.env): RedisConfig {
  const required = loadRedisRequired(env);
  const redisUrl = env.REDIS_URL?.trim();

  if (!redisUrl) {
    throw new Error(
      required ? "REDIS_URL is required when REDIS_REQUIRED=true." : "REDIS_URL is required to enable Redis.",
    );
  }

  const url = validateRedisUrl(redisUrl);

  return {
    url,
    sanitizedUrl: sanitizeRedisUrl(url),
    keyPrefix: normalizeRedisKeyPrefix(env.REDIS_KEY_PREFIX),
    connectTimeoutMs: parsePositiveInteger(
      env.REDIS_CONNECT_TIMEOUT_MS,
      DEFAULT_REDIS_CONNECT_TIMEOUT_MS,
      "REDIS_CONNECT_TIMEOUT_MS",
    ),
    required,
  };
}
