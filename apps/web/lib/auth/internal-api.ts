import type { AuthenticatedAppUser } from "@/lib/auth/protection";
import { loadWebAuthEnv } from "@/lib/auth/env";
import { buildInternalApiActorToken, INTERNAL_AUTH_HEADER } from "@/lib/auth/internal-token";

interface InternalApiRequestOptions {
  user: AuthenticatedAppUser;
  method?: "GET" | "POST";
  body?: Record<string, unknown>;
}

export class InternalApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

export async function fetchInternalApiJson<T>(
  path: string,
  { user, method = "GET", body }: InternalApiRequestOptions,
): Promise<T> {
  const env = loadWebAuthEnv();
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const url = new URL(normalizedPath, env.API_INTERNAL_URL);
  const authHeaderValue = buildInternalApiActorToken(user, env.INTERNAL_API_AUTH_SECRET, method, normalizedPath);

  const response = await fetch(url, {
    method,
    cache: "no-store",
    headers: {
      Accept: "application/json",
      [INTERNAL_AUTH_HEADER]: authHeaderValue,
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });

  if (!response.ok) {
    let message = `Internal API request failed with status ${response.status}.`;

    try {
      const payload = (await response.json()) as { error?: { message?: string } };
      if (payload.error?.message) {
        message = payload.error.message;
      }
    } catch {
      // Ignore JSON parsing failures for non-JSON error bodies.
    }

    throw new InternalApiError(message, response.status);
  }

  return (await response.json()) as T;
}
