export type RepositorySyncEventStatus = "queued" | "processing" | "completed" | "failed" | "retrying";
export type RepositorySyncEventType =
  | "repository.sync.queued"
  | "repository.sync.started"
  | "repository.sync.completed"
  | "repository.sync.failed"
  | "repository.sync.retrying";

export const REPOSITORY_LIVE_EVENT_NAME = "repository.live";

export interface RepositorySyncEvent {
  eventType: RepositorySyncEventType;
  entityType: "repository";
  owner: string;
  repo: string;
  repositoryId?: string;
  status: RepositorySyncEventStatus;
  timestamp: string;
  jobId?: string;
  correlationId?: string;
  message?: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function parseRepositorySyncEvent(rawValue: string): RepositorySyncEvent | null {
  let parsedValue: unknown;

  try {
    parsedValue = JSON.parse(rawValue) as unknown;
  } catch {
    return null;
  }

  if (!isRecord(parsedValue)) {
    return null;
  }

  if (
    parsedValue.entityType !== "repository" ||
    typeof parsedValue.owner !== "string" ||
    typeof parsedValue.repo !== "string" ||
    typeof parsedValue.status !== "string" ||
    typeof parsedValue.timestamp !== "string" ||
    typeof parsedValue.eventType !== "string"
  ) {
    return null;
  }

  if (
    parsedValue.eventType !== "repository.sync.queued" &&
    parsedValue.eventType !== "repository.sync.started" &&
    parsedValue.eventType !== "repository.sync.completed" &&
    parsedValue.eventType !== "repository.sync.failed" &&
    parsedValue.eventType !== "repository.sync.retrying"
  ) {
    return null;
  }

  if (
    parsedValue.status !== "queued" &&
    parsedValue.status !== "processing" &&
    parsedValue.status !== "completed" &&
    parsedValue.status !== "failed" &&
    parsedValue.status !== "retrying"
  ) {
    return null;
  }

  if (
    (parsedValue.eventType === "repository.sync.started" && parsedValue.status !== "processing") ||
    (parsedValue.eventType === "repository.sync.queued" && parsedValue.status !== "queued") ||
    (parsedValue.eventType === "repository.sync.completed" && parsedValue.status !== "completed") ||
    (parsedValue.eventType === "repository.sync.failed" && parsedValue.status !== "failed") ||
    (parsedValue.eventType === "repository.sync.retrying" && parsedValue.status !== "retrying")
  ) {
    return null;
  }

  return {
    eventType: parsedValue.eventType,
    entityType: "repository",
    owner: parsedValue.owner,
    repo: parsedValue.repo,
    repositoryId: typeof parsedValue.repositoryId === "string" ? parsedValue.repositoryId : undefined,
    status: parsedValue.status,
    timestamp: parsedValue.timestamp,
    jobId: typeof parsedValue.jobId === "string" ? parsedValue.jobId : undefined,
    correlationId: typeof parsedValue.correlationId === "string" ? parsedValue.correlationId : undefined,
    message: typeof parsedValue.message === "string" ? parsedValue.message : undefined,
  };
}

export function buildRepositoryEventDedupKey(event: RepositorySyncEvent): string {
  return `${event.owner}/${event.repo}:${event.jobId ?? "no-job"}:${event.status}`;
}
