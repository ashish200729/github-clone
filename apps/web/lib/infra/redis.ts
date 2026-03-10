import { createClient } from "redis";
import { loadWebInfraEnv } from "@/lib/infra/env";

type AppRedisClient = ReturnType<typeof createClient>;

let redisClient: AppRedisClient | null = null;
let redisClientPromise: Promise<AppRedisClient | null> | null = null;

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export async function getWebRedisClient(): Promise<AppRedisClient | null> {
  if (redisClient?.isReady) {
    return redisClient;
  }

  if (redisClientPromise) {
    return redisClientPromise;
  }

  redisClientPromise = (async () => {
    const env = loadWebInfraEnv();

    if (!env.REDIS_URL) {
      return null;
    }

    const client = createClient({
      url: env.REDIS_URL,
      socket: {
        connectTimeout: env.REDIS_CONNECT_TIMEOUT_MS,
      },
      disableOfflineQueue: true,
    });

    client.on("error", (error) => {
      console.warn("[web-redis] Client error.", { message: getErrorMessage(error) });
    });

    await client.connect();
    redisClient = client;
    return client;
  })();

  try {
    return await redisClientPromise;
  } finally {
    redisClientPromise = null;
  }
}
