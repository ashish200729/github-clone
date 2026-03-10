import type { NextRequest } from "next/server";
import { handlers } from "@/auth";
import { classifyAuthRateLimit, consumeRateLimit } from "@/lib/infra/rate-limit";

async function applyAuthRateLimit(request: NextRequest): Promise<Response | null> {
  const policy = classifyAuthRateLimit(request);

  if (!policy) {
    return null;
  }

  try {
    const result = await consumeRateLimit(request, policy);

    if (!result || result.allowed) {
      return null;
    }

    return new Response(
      JSON.stringify({
        error: {
          code: "RATE_LIMITED",
          message: "Too many authentication attempts. Please wait and try again.",
        },
      }),
      {
        status: 429,
        headers: {
          "Content-Type": "application/json; charset=utf-8",
          "Retry-After": String(result.retryAfterSeconds),
          "X-RateLimit-Remaining": String(result.remaining),
          "X-RateLimit-Reset": String(result.resetSeconds),
        },
      },
    );
  } catch (error) {
    console.warn("[auth-rate-limit] Failed to apply Redis-backed rate limiting.", {
      message: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}

export async function GET(request: NextRequest, context: { params: Promise<{ nextauth: string[] }> }) {
  const rateLimitedResponse = await applyAuthRateLimit(request);

  if (rateLimitedResponse) {
    return rateLimitedResponse;
  }

  void context;
  return await handlers.GET(request);
}

export async function POST(request: NextRequest, context: { params: Promise<{ nextauth: string[] }> }) {
  const rateLimitedResponse = await applyAuthRateLimit(request);

  if (rateLimitedResponse) {
    return rateLimitedResponse;
  }

  void context;
  return await handlers.POST(request);
}
