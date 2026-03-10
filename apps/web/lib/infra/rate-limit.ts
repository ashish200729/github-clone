import type { NextRequest } from "next/server";
import { getWebRedisClient } from "@/lib/infra/redis";

export interface RateLimitPolicy {
  bucket: string;
  limit: number;
  windowSeconds: number;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetSeconds: number;
  retryAfterSeconds: number;
}

function getClientIdentifier(request: NextRequest): string {
  const forwardedFor = request.headers.get("x-forwarded-for");
  const firstForwardedIp = forwardedFor?.split(",")[0]?.trim();
  const realIp = request.headers.get("x-real-ip")?.trim();
  const userAgent = request.headers.get("user-agent")?.trim() || "unknown";
  const baseIdentifier = firstForwardedIp || realIp || "anonymous";

  return `${baseIdentifier}:${userAgent}`;
}

export function classifyAuthRateLimit(request: NextRequest): RateLimitPolicy | null {
  const pathname = request.nextUrl.pathname;

  if (pathname.includes("/api/auth/signin")) {
    return {
      bucket: "auth-signin",
      limit: 10,
      windowSeconds: 10 * 60,
    };
  }

  if (pathname.includes("/api/auth/callback/")) {
    return {
      bucket: "auth-callback",
      limit: 30,
      windowSeconds: 10 * 60,
    };
  }

  return null;
}

export async function consumeRateLimit(request: NextRequest, policy: RateLimitPolicy): Promise<RateLimitResult | null> {
  const client = await getWebRedisClient();

  if (!client) {
    return null;
  }

  const identifier = getClientIdentifier(request);
  const key = `ghclone:web:rate:${policy.bucket}:${identifier}`;
  const currentCount = await client.incr(key);

  if (currentCount === 1) {
    await client.expire(key, policy.windowSeconds);
  }

  const ttl = Math.max(await client.ttl(key), 0);

  return {
    allowed: currentCount <= policy.limit,
    remaining: Math.max(policy.limit - currentCount, 0),
    resetSeconds: ttl,
    retryAfterSeconds: ttl,
  };
}
