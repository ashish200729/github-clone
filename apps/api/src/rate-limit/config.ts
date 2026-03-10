import { getRedisClient } from "../redis/index.js";

export interface RateLimitPolicy {
  windowMs: number;
  limit: number;
  standardHeaders?: "draft-8";
  passOnStoreError: boolean;
}

export const RATE_LIMIT_POLICIES = {
  repoCreate: {
    windowMs: 60 * 60 * 1000,
    limit: 20,
    standardHeaders: "draft-8",
    passOnStoreError: false,
  },
  repoWrite: {
    windowMs: 10 * 60 * 1000,
    limit: 60,
    standardHeaders: "draft-8",
    passOnStoreError: false,
  },
  repoToken: {
    windowMs: 60 * 60 * 1000,
    limit: 40,
    standardHeaders: "draft-8",
    passOnStoreError: false,
  },
  expensiveRead: {
    windowMs: 60 * 1000,
    limit: 180,
    standardHeaders: "draft-8",
    passOnStoreError: true,
  },
  liveStream: {
    windowMs: 60 * 1000,
    limit: 30,
    standardHeaders: "draft-8",
    passOnStoreError: false,
  },
} satisfies Record<string, RateLimitPolicy>;

export function getRateLimitSendCommand(): (command: string, ...args: string[]) => Promise<any> {
  return async (command: string, ...args: string[]) => {
    const client = getRedisClient();
    return await client.sendCommand([command, ...args]);
  };
}
