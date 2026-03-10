import { buildRedisKey, getJson, getRedisClient, setJson } from "../redis/index.js";

export interface RepositoryLiveEvent {
  version: 1;
  eventType: "repository.sync.queued" | "repository.sync.started" | "repository.sync.completed" | "repository.sync.failed";
  entityType: "repository";
  entityId: string;
  owner: string;
  repo: string;
  userId: string;
  jobId: string;
  correlationId: string;
  status: "queued" | "processing" | "completed" | "failed";
  timestamp: string;
  message?: string;
}

const LIVE_EVENT_TTL_SECONDS = 5 * 60;

function buildUserChannel(userId: string): string {
  return buildRedisKey("live", "user", userId);
}

function buildLatestEventKey(userId: string, owner: string, repo: string): string {
  return buildRedisKey("live", "latest", "user", userId, owner, repo);
}

export async function publishRepositoryLiveEvent(event: RepositoryLiveEvent): Promise<void> {
  const client = getRedisClient();
  const payload = JSON.stringify(event);

  await setJson(buildLatestEventKey(event.userId, event.owner, event.repo), event, LIVE_EVENT_TTL_SECONDS);
  await client.publish(buildUserChannel(event.userId), payload);
}

export async function getLatestRepositoryLiveEvent(
  userId: string,
  owner: string,
  repo: string,
): Promise<RepositoryLiveEvent | null> {
  return await getJson<RepositoryLiveEvent>(buildLatestEventKey(userId, owner, repo));
}

export function getRepositoryLiveChannel(userId: string): string {
  return buildUserChannel(userId);
}
