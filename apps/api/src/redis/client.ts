import { createClient } from "redis";
import { loadRedisConfig, loadRedisRequired, normalizeRedisKeyPrefix, type RedisConfig } from "./config.js";

const REDIS_CLOSE_TIMEOUT_MS = 5_000;

export interface RedisHealthResult {
  status: "ok" | "degraded" | "error";
  required: boolean;
  message: string;
  latencyMs?: number;
}

type AppRedisClient = ReturnType<typeof createClient>;
type RedisClientFactory = (options: Parameters<typeof createClient>[0]) => AppRedisClient;

let redisClient: AppRedisClient | undefined;
let redisConfig: RedisConfig | undefined;
let initRedisPromise: Promise<AppRedisClient | undefined> | undefined;
let redisClientFactory: RedisClientFactory = (options) => createClient(options);

function buildRedisUnavailableHealth(required: boolean, message: string): RedisHealthResult {
  return {
    status: getRedisStatusForFailure(required),
    required,
    message,
  };
}

let redisHealth: RedisHealthResult = buildRedisUnavailableHealth(true, "Redis has not been initialized.");

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function setRedisHealth(nextHealth: RedisHealthResult): RedisHealthResult {
  redisHealth = nextHealth;
  return redisHealth;
}

function getRedisStatusForFailure(required: boolean): RedisHealthResult["status"] {
  return required ? "error" : "degraded";
}

function logRedisUnavailable(message: string, required: boolean): void {
  if (required) {
    console.error(message);
    return;
  }

  console.warn(`${message} Starting API in degraded mode because REDIS_REQUIRED=false.`);
}

function attachRedisListeners(client: AppRedisClient, config: RedisConfig): void {
  client.on("error", (error) => {
    const message = `Redis client error (${config.sanitizedUrl}): ${getErrorMessage(error)}`;
    console.error(message);
    setRedisHealth({
      status: getRedisStatusForFailure(config.required),
      required: config.required,
      message,
    });
  });

  client.on("connect", () => {
    console.info(`Redis client connecting to ${config.sanitizedUrl}.`);
  });

  client.on("ready", () => {
    console.info(`Redis client ready at ${config.sanitizedUrl}.`);
  });

  client.on("reconnecting", () => {
    console.warn(`Redis client reconnecting to ${config.sanitizedUrl}.`);
  });

  client.on("end", () => {
    console.info(`Redis client connection ended for ${config.sanitizedUrl}.`);
  });
}

function createRedisClient(config: RedisConfig): AppRedisClient {
  const client = redisClientFactory({
    url: config.url,
    socket: {
      connectTimeout: config.connectTimeoutMs,
    },
    disableOfflineQueue: true,
  });

  attachRedisListeners(client, config);

  return client;
}

function buildStartupErrorMessage(config: RedisConfig | undefined, error: unknown): string {
  if (config) {
    return `Redis startup check failed for ${config.sanitizedUrl}: ${getErrorMessage(error)}`;
  }

  return getErrorMessage(error);
}

async function pingClient(client: AppRedisClient, config: RedisConfig): Promise<RedisHealthResult> {
  const startedAt = performance.now();
  await client.ping();

  return setRedisHealth({
    status: "ok",
    required: config.required,
    latencyMs: Math.round(performance.now() - startedAt),
    message: `Redis responded to PING at ${config.sanitizedUrl}.`,
  });
}

async function destroyRedisClient(client: AppRedisClient): Promise<void> {
  if (!client.isOpen) {
    return;
  }

  try {
    client.destroy();
  } catch (error) {
    console.error(`Failed to destroy Redis client: ${getErrorMessage(error)}`);
  }
}

async function withTimeout<T>(operation: Promise<T>, timeoutMs: number, timeoutMessage: string): Promise<T> {
  let timeoutHandle: ReturnType<typeof setTimeout> | undefined;

  try {
    return await Promise.race([
      operation,
      new Promise<never>((_, reject) => {
        timeoutHandle = setTimeout(() => {
          reject(new Error(timeoutMessage));
        }, timeoutMs);
        timeoutHandle.unref?.();
      }),
    ]);
  } finally {
    if (timeoutHandle !== undefined) {
      clearTimeout(timeoutHandle);
    }
  }
}

export async function initRedis(): Promise<AppRedisClient | undefined> {
  if (redisClient?.isReady) {
    return redisClient;
  }

  if (initRedisPromise) {
    return initRedisPromise;
  }

  initRedisPromise = (async () => {
    let required: boolean;

    try {
      required = loadRedisRequired();
    } catch (error) {
      setRedisHealth(buildRedisUnavailableHealth(true, getErrorMessage(error)));
      throw error;
    }

    let config: RedisConfig;

    try {
      config = loadRedisConfig();
      redisConfig = config;
    } catch (error) {
      redisConfig = undefined;
      redisClient = undefined;

      const message = buildStartupErrorMessage(undefined, error);
      setRedisHealth(buildRedisUnavailableHealth(required, message));

      if (required) {
        throw error;
      }

      logRedisUnavailable(message, required);
      return undefined;
    }

    const client = redisClient ?? createRedisClient(config);
    redisClient = client;

    try {
      if (!client.isOpen) {
        await client.connect();
      }

      await pingClient(client, config);
      return client;
    } catch (error) {
      const message = buildStartupErrorMessage(config, error);

      setRedisHealth(buildRedisUnavailableHealth(config.required, message));

      await destroyRedisClient(client);
      redisClient = undefined;

      if (config.required) {
        throw new Error(message, { cause: error instanceof Error ? error : undefined });
      }

      logRedisUnavailable(message, config.required);
      return undefined;
    }
  })();

  try {
    return await initRedisPromise;
  } finally {
    initRedisPromise = undefined;
  }
}

export function getRedisClient(): AppRedisClient {
  if (!redisClient?.isReady) {
    throw new Error("Redis client is not initialized.");
  }

  return redisClient;
}

export async function getRedisHealth(): Promise<RedisHealthResult> {
  if (!redisClient || !redisConfig) {
    return redisHealth;
  }

  if (!redisClient.isReady) {
    return setRedisHealth(buildRedisUnavailableHealth(redisConfig.required, "Redis client is not ready."));
  }

  try {
    return await pingClient(redisClient, redisConfig);
  } catch (error) {
    return setRedisHealth(buildRedisUnavailableHealth(redisConfig.required, `Redis health check failed: ${getErrorMessage(error)}`));
  }
}

export function buildRedisKey(...parts: string[]): string {
  const prefix = redisConfig?.keyPrefix ?? normalizeRedisKeyPrefix(process.env.REDIS_KEY_PREFIX);
  const normalizedParts = parts
    .map((part) => part.trim().replace(/^:+/, "").replace(/:+$/, ""))
    .filter((part) => part.length > 0);

  return `${prefix}${normalizedParts.join(":")}`;
}

export async function setJson(key: string, value: unknown, ttlSeconds?: number): Promise<void> {
  const client = getRedisClient();
  const payload = JSON.stringify(value);

  if (ttlSeconds === undefined) {
    await client.set(key, payload);
    return;
  }

  if (!Number.isInteger(ttlSeconds) || ttlSeconds <= 0) {
    throw new Error("ttlSeconds must be a positive integer.");
  }

  await client.set(key, payload, {
    expiration: {
      type: "EX",
      value: ttlSeconds,
    },
  });
}

export async function getJson<T>(key: string): Promise<T | null> {
  const client = getRedisClient();
  const value = await client.get(key);

  if (value === null) {
    return null;
  }

  try {
    return JSON.parse(value) as T;
  } catch (error) {
    throw new Error(`Redis key "${key}" does not contain valid JSON: ${getErrorMessage(error)}`);
  }
}

export async function delKey(key: string): Promise<number> {
  const client = getRedisClient();
  return client.del(key);
}

export async function delKeys(keys: string[]): Promise<number> {
  if (keys.length === 0) {
    return 0;
  }

  const client = getRedisClient();
  let deletedCount = 0;

  for (const key of keys) {
    deletedCount += await client.del(key);
  }

  return deletedCount;
}

export async function delKeysByPattern(pattern: string): Promise<number> {
  const client = getRedisClient();
  const keys: string[] = [];

  for await (const key of client.scanIterator({
    MATCH: pattern,
    COUNT: 100,
  })) {
    if (typeof key === "string") {
      keys.push(key);
      continue;
    }

    keys.push(...key);
  }

  if (keys.length === 0) {
    return 0;
  }

  let deletedCount = 0;

  for (const key of keys) {
    deletedCount += await client.del(key);
  }

  return deletedCount;
}

export async function closeRedis(): Promise<void> {
  const client = redisClient;
  const required = redisConfig?.required ?? redisHealth.required;
  redisClient = undefined;
  redisConfig = undefined;
  initRedisPromise = undefined;

  if (!client) {
    setRedisHealth(buildRedisUnavailableHealth(required, "Redis has not been initialized."));
    return;
  }

  if (!client.isOpen) {
    setRedisHealth(buildRedisUnavailableHealth(required, "Redis client is closed."));
    return;
  }

  try {
    await withTimeout(client.close(), REDIS_CLOSE_TIMEOUT_MS, `Redis close exceeded ${REDIS_CLOSE_TIMEOUT_MS}ms.`);
    setRedisHealth(buildRedisUnavailableHealth(required, "Redis client is closed."));
  } catch (error) {
    await destroyRedisClient(client);
    const message = `Failed to close Redis client gracefully: ${getErrorMessage(error)}`;
    setRedisHealth(buildRedisUnavailableHealth(required, message));
    throw new Error(message, {
      cause: error instanceof Error ? error : undefined,
    });
  }
}

export function __setRedisClientFactoryForTests(factory: RedisClientFactory): void {
  redisClientFactory = factory;
}

export function __resetRedisStateForTests(): void {
  redisClient = undefined;
  redisConfig = undefined;
  initRedisPromise = undefined;
  redisClientFactory = (options) => createClient(options);
  redisHealth = buildRedisUnavailableHealth(true, "Redis has not been initialized.");
}
