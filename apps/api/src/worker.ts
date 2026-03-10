import { Worker } from "bullmq";
import { ensureApiEnvLoaded } from "./env/load.js";
import { verifyDatabaseConnection, getDatabasePool, closeDatabasePool } from "./db/index.js";
import { initRedis, closeRedis, setJson } from "./redis/index.js";
import { getBullConnectionOptions } from "./queue/config.js";
import { QUEUE_NAMES } from "./queue/names.js";
import { REPOSITORY_WORKER_HEARTBEAT_KEY } from "./queue/health.js";
import { publishRepositoryLiveEvent } from "./live/events.js";
import { warmRepositoryReadModels } from "./repos/service.js";
import type { RepositorySyncJobPayload } from "./queue/types.js";
import { QueueEvents } from "bullmq";

ensureApiEnvLoaded();

async function runWorker(): Promise<void> {
  await verifyDatabaseConnection();
  await initRedis();

  const worker = new Worker<RepositorySyncJobPayload>(
    QUEUE_NAMES.repoMaintenance,
    async (job) => {
      const data = job.data;

      await publishRepositoryLiveEvent({
        version: 1,
        eventType: "repository.sync.started",
        entityType: "repository",
        entityId: data.repoId,
        owner: data.ownerHandle,
        repo: data.repoName,
        userId: data.ownerId,
        jobId: job.id ?? `repo-sync:${data.repoId}`,
        correlationId: data.correlationId,
        status: "processing",
        timestamp: new Date().toISOString(),
        message: "Repository synchronization is running.",
      });

      try {
        const repository = await warmRepositoryReadModels(getDatabasePool(), data.repoId);

        await publishRepositoryLiveEvent({
          version: 1,
          eventType: "repository.sync.completed",
          entityType: "repository",
          entityId: repository.id,
          owner: repository.ownerHandle,
          repo: repository.name,
          userId: repository.ownerId,
          jobId: job.id ?? `repo-sync:${repository.id}`,
          correlationId: data.correlationId,
          status: "completed",
          timestamp: new Date().toISOString(),
          message: "Repository synchronization completed.",
        });
      } catch (error) {
        await publishRepositoryLiveEvent({
          version: 1,
          eventType: "repository.sync.failed",
          entityType: "repository",
          entityId: data.repoId,
          owner: data.ownerHandle,
          repo: data.repoName,
          userId: data.ownerId,
          jobId: job.id ?? `repo-sync:${data.repoId}`,
          correlationId: data.correlationId,
          status: "failed",
          timestamp: new Date().toISOString(),
          message: error instanceof Error ? error.message : "Repository synchronization failed.",
        });

        throw error;
      }
    },
    {
      connection: getBullConnectionOptions("worker"),
      concurrency: 4,
    },
  );

  const queueEvents = new QueueEvents(QUEUE_NAMES.repoMaintenance, {
    connection: getBullConnectionOptions("worker-events"),
  });

  queueEvents.on("failed", ({ jobId, failedReason }) => {
    console.error("[queue] Repository job failed.", { jobId, failedReason });
  });

  queueEvents.on("completed", ({ jobId }) => {
    console.info("[queue] Repository job completed.", { jobId });
  });

  const heartbeatTimer = setInterval(async () => {
    try {
      await setJson(REPOSITORY_WORKER_HEARTBEAT_KEY, new Date().toISOString(), 120);
    } catch (error) {
      console.warn("[queue] Failed to write worker heartbeat.", {
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }, 15_000);
  heartbeatTimer.unref?.();

  await setJson(REPOSITORY_WORKER_HEARTBEAT_KEY, new Date().toISOString(), 120);

  const shutdown = async () => {
    clearInterval(heartbeatTimer);
    await Promise.allSettled([worker.close(), queueEvents.close()]);
    await Promise.allSettled([closeRedis(), closeDatabasePool()]);
    process.exit(0);
  };

  process.once("SIGINT", shutdown);
  process.once("SIGTERM", shutdown);

  console.log("repository worker listening for BullMQ jobs");
}

await runWorker();
