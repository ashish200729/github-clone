import assert from "node:assert/strict";
import test from "node:test";
import { buildRepositoryEventDedupKey, parseRepositorySyncEvent, REPOSITORY_LIVE_EVENT_NAME } from "../lib/live/events";

test("parseRepositorySyncEvent accepts valid repository sync payloads", () => {
  const event = parseRepositorySyncEvent(
    JSON.stringify({
      eventType: "repository.sync.completed",
      entityType: "repository",
      owner: "ashish200729",
      repo: "anthropic",
      status: "completed",
      timestamp: "2026-03-09T12:00:00.000Z",
      jobId: "repo-sync:c1b5e2a3",
    }),
  );

  assert.ok(event);
  assert.equal(event?.owner, "ashish200729");
  assert.equal(buildRepositoryEventDedupKey(event!), "ashish200729/anthropic:repo-sync:c1b5e2a3:completed");
  assert.equal(REPOSITORY_LIVE_EVENT_NAME, "repository.live");
});

test("parseRepositorySyncEvent accepts started events and rejects mismatched event/status pairs", () => {
  const startedEvent = parseRepositorySyncEvent(
    JSON.stringify({
      eventType: "repository.sync.started",
      entityType: "repository",
      owner: "ashish200729",
      repo: "anthropic",
      status: "processing",
      timestamp: "2026-03-09T12:00:00.000Z",
    }),
  );

  assert.ok(startedEvent);
  assert.equal(startedEvent?.status, "processing");
  assert.equal(
    parseRepositorySyncEvent(
      JSON.stringify({
        eventType: "repository.sync.started",
        entityType: "repository",
        owner: "ashish200729",
        repo: "anthropic",
        status: "completed",
        timestamp: "2026-03-09T12:00:00.000Z",
      }),
    ),
    null,
  );
});

test("parseRepositorySyncEvent rejects malformed payloads", () => {
  assert.equal(parseRepositorySyncEvent("{"), null);
  assert.equal(
    parseRepositorySyncEvent(
      JSON.stringify({
        eventType: "repository.sync.completed",
        entityType: "repository",
        owner: "ashish200729",
      }),
    ),
    null,
  );
});
