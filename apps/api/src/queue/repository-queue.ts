import { Queue, QueueEvents } from "bullmq";
import { getBullConnectionOptions } from "./config.js";
import { QUEUE_NAMES } from "./names.js";
import type { RepositorySyncJobPayload } from "./types.js";

let repositoryQueue: Queue<RepositorySyncJobPayload, void, string> | undefined;
let repositoryQueueEvents: QueueEvents | undefined;

export function getRepositoryQueue(): Queue<RepositorySyncJobPayload, void, string> {
  if (!repositoryQueue) {
    repositoryQueue = new Queue<RepositorySyncJobPayload, void, string>(QUEUE_NAMES.repoMaintenance, {
      connection: getBullConnectionOptions("queue"),
      defaultJobOptions: {
        attempts: 5,
        backoff: {
          type: "exponential",
          delay: 2_000,
        },
        removeOnComplete: 100,
        removeOnFail: 200,
      },
    });
  }

  return repositoryQueue;
}

export function getRepositoryQueueEvents(): QueueEvents {
  if (!repositoryQueueEvents) {
    repositoryQueueEvents = new QueueEvents(QUEUE_NAMES.repoMaintenance, {
      connection: getBullConnectionOptions("events"),
    });
  }

  return repositoryQueueEvents;
}

export async function enqueueRepositorySyncJob(payload: RepositorySyncJobPayload): Promise<string> {
  const queue = getRepositoryQueue();
  const job = await queue.add("repo-sync", payload, {
    jobId: `repo-sync:${payload.repoId}`,
  });

  return job.id ?? `repo-sync:${payload.repoId}`;
}

export async function closeRepositoryQueueResources(): Promise<void> {
  const queue = repositoryQueue;
  const queueEvents = repositoryQueueEvents;
  repositoryQueue = undefined;
  repositoryQueueEvents = undefined;

  await Promise.allSettled([queue?.close(), queueEvents?.close()].filter(Boolean));
}
