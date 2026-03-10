import type { NextRequest } from "next/server";
import { auth } from "@/auth";
import { loadWebAuthEnv } from "@/lib/auth/env";
import { buildInternalApiActorToken, INTERNAL_AUTH_HEADER } from "@/lib/auth/internal-token";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const session = await auth();

  if (!session?.user?.id) {
    return new Response("Unauthorized", {
      status: 401,
    });
  }

  const env = loadWebAuthEnv();
  const upstreamUrl = new URL("/api/internal/live", env.API_INTERNAL_URL);

  for (const [key, value] of request.nextUrl.searchParams.entries()) {
    upstreamUrl.searchParams.set(key, value);
  }

  const actorToken = buildInternalApiActorToken(
    {
      id: session.user.id,
      email: session.user.email,
      role: session.user.role,
    },
    env.INTERNAL_API_AUTH_SECRET,
    "GET",
    "/api/internal/live",
  );

  const upstreamResponse = await fetch(upstreamUrl, {
    method: "GET",
    cache: "no-store",
    headers: {
      Accept: "text/event-stream",
      [INTERNAL_AUTH_HEADER]: actorToken,
    },
  });

  if (!upstreamResponse.ok || !upstreamResponse.body) {
    return new Response(await upstreamResponse.text(), {
      status: upstreamResponse.status,
      headers: {
        "Content-Type": upstreamResponse.headers.get("content-type") ?? "text/plain; charset=utf-8",
      },
    });
  }

  return new Response(upstreamResponse.body, {
    status: upstreamResponse.status,
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-store, no-transform",
      Connection: "keep-alive",
      ...(upstreamResponse.headers.get("x-request-id")
        ? {
            "x-request-id": upstreamResponse.headers.get("x-request-id") as string,
          }
        : {}),
    },
  });
}
