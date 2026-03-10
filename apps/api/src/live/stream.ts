import type { Request, Response } from "express";
import { ApiError } from "../http/errors.js";
import { getRedisClient } from "../redis/index.js";
import { getLatestRepositoryLiveEvent, getRepositoryLiveChannel, type RepositoryLiveEvent } from "./events.js";

function writeSseEvent(response: Response, eventName: string, payload: unknown): void {
  response.write(`event: ${eventName}\n`);
  response.write(`data: ${JSON.stringify(payload)}\n\n`);
}

export async function handleInternalLiveStream(request: Request, response: Response): Promise<void> {
  const actor = request.authenticatedActor;

  if (!actor) {
    throw new ApiError(500, "INTERNAL_AUTH_MISSING", "Authenticated actor context was missing after verification.");
  }

  const owner = typeof request.query.owner === "string" ? request.query.owner.trim() : "";
  const repo = typeof request.query.repo === "string" ? request.query.repo.trim() : "";

  response.status(200);
  response.setHeader("Content-Type", "text/event-stream");
  response.setHeader("Cache-Control", "no-store, no-transform");
  response.setHeader("Connection", "keep-alive");
  response.setHeader("X-Accel-Buffering", "no");
  response.flushHeaders?.();

  response.write(": connected\n\n");

  if (owner && repo) {
    const latestEvent = await getLatestRepositoryLiveEvent(actor.userId, owner, repo);

    if (latestEvent) {
      writeSseEvent(response, "repository.live", latestEvent);
    }
  }

  const subscriber = getRedisClient().duplicate();
  await subscriber.connect();

  const heartbeatTimer = setInterval(() => {
    response.write(": heartbeat\n\n");
  }, 15_000);
  heartbeatTimer.unref?.();

  const channel = getRepositoryLiveChannel(actor.userId);

  await subscriber.subscribe(channel, (rawMessage) => {
    let parsedEvent: RepositoryLiveEvent;

    try {
      parsedEvent = JSON.parse(rawMessage) as RepositoryLiveEvent;
    } catch {
      return;
    }

    if (owner && repo && (parsedEvent.owner !== owner || parsedEvent.repo !== repo)) {
      return;
    }

    writeSseEvent(response, "repository.live", parsedEvent);
  });

  request.on("close", () => {
    clearInterval(heartbeatTimer);
    subscriber.unsubscribe(channel).catch(() => undefined);
    subscriber.quit().catch(() => undefined);
    response.end();
  });
}
