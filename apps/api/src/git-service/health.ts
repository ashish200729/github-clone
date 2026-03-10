import { loadGitServiceConfig } from "./config.js";

export interface GitServiceHealthResult {
  status: "ok" | "error";
  required: true;
  message: string;
  latencyMs?: number;
}

async function requestGitServiceHealth(): Promise<void> {
  const config = loadGitServiceConfig();
  const response = await fetch(new URL("/health", config.internalUrl), {
    method: "GET",
    headers: {
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`Git service health check failed with status ${response.status}.`);
  }

  const payload = (await response.json()) as { status?: string; message?: string };

  if (payload.status !== "ok" && payload.status !== "degraded") {
    throw new Error(payload.message || "Git service reported an unhealthy status.");
  }
}

export async function verifyGitServiceConnection(timeoutMs = 10_000): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  let lastError: unknown;

  while (Date.now() <= deadline) {
    try {
      await requestGitServiceHealth();
      return;
    } catch (error) {
      lastError = error;
      await new Promise((resolve) => setTimeout(resolve, 250));
    }
  }

  throw (lastError instanceof Error ? lastError : new Error(String(lastError ?? "Git service did not become ready.")));
}

export async function getGitServiceHealth(): Promise<GitServiceHealthResult> {
  const startedAt = performance.now();

  try {
    await requestGitServiceHealth();

    return {
      status: "ok",
      required: true,
      latencyMs: Math.round(performance.now() - startedAt),
      message: "Git service responded to /health.",
    };
  } catch (error) {
    return {
      status: "error",
      required: true,
      message: error instanceof Error ? error.message : String(error),
    };
  }
}
