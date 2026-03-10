import type { AuthenticatedAppUser } from "@/lib/auth/protection";
import { loadWebAuthEnv } from "@/lib/auth/env";
import { buildInternalApiActorToken, INTERNAL_AUTH_HEADER } from "@/lib/auth/internal-token";

interface InternalApiRequestOptions {
  user?: AuthenticatedAppUser;
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  body?: Record<string, unknown>;
  searchParams?: Record<string, string | undefined>;
}

export class InternalApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code?: string,
    readonly details?: Record<string, unknown>,
  ) {
    super(message);
  }
}

export async function fetchInternalApiJson<T>(
  path: string,
  { user, method = "GET", body, searchParams }: InternalApiRequestOptions,
): Promise<T> {
  const env = loadWebAuthEnv();
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const url = new URL(normalizedPath, env.API_INTERNAL_URL);

  for (const [key, value] of Object.entries(searchParams ?? {})) {
    if (value !== undefined) {
      url.searchParams.set(key, value);
    }
  }

  const authHeaderValue = user
    ? buildInternalApiActorToken(user, env.INTERNAL_API_AUTH_SECRET, method, normalizedPath)
    : null;

  let response: Response;

  try {
    response = await fetch(url, {
      method,
      cache: "no-store",
      headers: {
        Accept: "application/json",
        ...(authHeaderValue ? { [INTERNAL_AUTH_HEADER]: authHeaderValue } : {}),
        ...(body ? { "Content-Type": "application/json" } : {}),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
  } catch (error) {
    const details = error instanceof Error ? error.message : "Unknown network error";
    throw new InternalApiError(
      `The internal API is currently unreachable (${url.origin}).`,
      503,
      "INTERNAL_API_UNAVAILABLE",
      { details },
    );
  }

  if (!response.ok) {
    let message = `Internal API request failed with status ${response.status}.`;
    let code: string | undefined;
    let details: Record<string, unknown> | undefined;

    try {
      const payload = (await response.json()) as { error?: { code?: string; message?: string; details?: Record<string, unknown> } };
      if (payload.error?.message) {
        message = payload.error.message;
      }
      code = payload.error?.code;
      details = payload.error?.details;
    } catch {
      // Ignore JSON parsing failures for non-JSON error bodies.
    }

    throw new InternalApiError(message, response.status, code, details);
  }

  return (await response.json()) as T;
}
