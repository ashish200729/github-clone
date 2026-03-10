import rateLimit, { type Options } from "express-rate-limit";
import { RedisStore } from "rate-limit-redis";
import type { Request } from "express";
import { ApiError } from "../http/errors.js";
import type { RateLimitPolicy } from "./config.js";
import { getRateLimitSendCommand } from "./config.js";

function getClientIdentifier(request: Request): string {
  const actorId = request.authenticatedActor?.userId?.trim();

  if (actorId) {
    return `user:${actorId}`;
  }

  const ipAddress = request.ip?.trim() || request.socket.remoteAddress?.trim() || "unknown";
  return `ip:${ipAddress}`;
}

export function createRateLimitMiddleware(scope: string, policy: RateLimitPolicy) {
  const options: Partial<Options> = {
    windowMs: policy.windowMs,
    limit: policy.limit,
    standardHeaders: policy.standardHeaders,
    legacyHeaders: false,
    passOnStoreError: policy.passOnStoreError,
    keyGenerator: (request) => `${scope}:${getClientIdentifier(request)}`,
    store: new RedisStore({
      sendCommand: getRateLimitSendCommand() as any,
    }),
    handler: (request, response) => {
      const error = new ApiError(429, "RATE_LIMITED", "Too many requests. Please retry after the current rate-limit window.");
      console.warn("[rate-limit] Request blocked.", {
        scope,
        requestId: request.requestId,
        key: `${scope}:${getClientIdentifier(request)}`,
        path: request.originalUrl,
        method: request.method,
      });
      response.status(error.status).json({
        error: {
          code: error.code,
          message: error.message,
        },
      });
    },
  };

  return rateLimit(options);
}
