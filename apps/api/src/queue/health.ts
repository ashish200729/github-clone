import { getRepositoryQueue } from "./repository-queue.js";
import { getJson } from "../redis/index.js";
import { buildRedisKey } from "../redis/index.js";

const WORKER_HEARTBEAT_FRESHNESS_MS = 60_000;
export const REPOSITORY_WORKER_HEARTBEAT_KEY = buildRedisKey("queue", "worker", "repo-maintenance", "heartbeat");

export interface QueueHealthResult {
  status: "ok" | "degraded" | "error";
  required: false;
  message: string;
  counts?: Record<string, number>;
  worker?: {
    status: "ok" | "degraded" | "error";
    lastSeenAt?: string;
  };
}

export async function getQueueHealth(): Promise<QueueHealthResult> {
  try {
    const queue = getRepositoryQueue();
    const [counts, lastSeenAt] = await Promise.all([
      queue.getJobCounts("waiting", "active", "delayed", "failed", "completed"),
      getJson<string>(REPOSITORY_WORKER_HEARTBEAT_KEY),
    ]);

    const hasRecentHeartbeat =
      typeof lastSeenAt === "string" && Date.now() - new Date(lastSeenAt).getTime() <= WORKER_HEARTBEAT_FRESHNESS_MS;

    if (!hasRecentHeartbeat) {
      return {
        status: "degraded",
        required: false,
        message: "Queue is reachable, but the repository worker heartbeat is stale or missing.",
        counts,
        worker: {
          status: "degraded",
          lastSeenAt: typeof lastSeenAt === "string" ? lastSeenAt : undefined,
        },
      };
    }

    return {
      status: "ok",
      required: false,
      message: "Queue and repository worker heartbeat are healthy.",
      counts,
      worker: {
        status: "ok",
        lastSeenAt,
      },
    };
  } catch (error) {
    return {
      status: "error",
      required: false,
      message: error instanceof Error ? error.message : String(error),
    };
  }
}
