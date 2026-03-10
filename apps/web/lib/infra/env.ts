const REDIS_PROTOCOLS = new Set(["redis:", "rediss:"]);

export interface WebInfraEnv {
  REDIS_URL?: string;
  REDIS_CONNECT_TIMEOUT_MS: number;
}

function parsePositiveInteger(value: string | undefined, fallback: number, envName: string): number {
  if (value === undefined || value.trim() === "") {
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

function parseOptionalRedisUrl(value: string | undefined): string | undefined {
  if (!value || value.trim() === "") {
    return undefined;
  }

  let parsedUrl: URL;

  try {
    parsedUrl = new URL(value);
  } catch {
    throw new Error("REDIS_URL must be a valid Redis connection string.");
  }

  if (!REDIS_PROTOCOLS.has(parsedUrl.protocol)) {
    throw new Error("REDIS_URL must use redis:// or rediss://.");
  }

  return value;
}

export function loadWebInfraEnv(env: NodeJS.ProcessEnv = process.env): WebInfraEnv {
  return {
    REDIS_URL: parseOptionalRedisUrl(env.REDIS_URL),
    REDIS_CONNECT_TIMEOUT_MS: parsePositiveInteger(env.REDIS_CONNECT_TIMEOUT_MS, 10_000, "REDIS_CONNECT_TIMEOUT_MS"),
  };
}
