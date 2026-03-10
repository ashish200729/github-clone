import type { ConnectionOptions } from "bullmq";
import { loadRedisConfig } from "../redis/index.js";

function parseRedisDatabase(pathname: string): number | undefined {
  const normalized = pathname.replace(/^\//, "");

  if (!normalized) {
    return undefined;
  }

  const parsed = Number.parseInt(normalized, 10);
  return Number.isInteger(parsed) ? parsed : undefined;
}

export function getBullConnectionOptions(role: string): ConnectionOptions {
  const redisConfig = loadRedisConfig();
  const parsedUrl = new URL(redisConfig.url);

  return {
    host: parsedUrl.hostname,
    port: parsedUrl.port ? Number.parseInt(parsedUrl.port, 10) : 6379,
    username: parsedUrl.username || undefined,
    password: parsedUrl.password || undefined,
    db: parseRedisDatabase(parsedUrl.pathname),
    tls: parsedUrl.protocol === "rediss:" ? {} : undefined,
    connectionName: `github-clone-api-queue:${role}`,
    maxRetriesPerRequest: null,
    enableReadyCheck: true,
    connectTimeout: redisConfig.connectTimeoutMs,
  };
}
