"use client";

import { useRouter } from "next/navigation";
import { startTransition, useEffect, useEffectEvent, useRef, useState } from "react";
import {
  buildRepositoryEventDedupKey,
  parseRepositorySyncEvent,
  REPOSITORY_LIVE_EVENT_NAME,
  type RepositorySyncEvent,
} from "@/lib/live/events";

export type LiveConnectionState = "connecting" | "connected" | "reconnecting" | "errored";

export function useRepositoryLiveStatus(owner: string, repo: string): {
  connectionState: LiveConnectionState;
  latestEvent: RepositorySyncEvent | null;
} {
  const router = useRouter();
  const repositoryKey = `${owner}/${repo}`;
  const [connectionStateState, setConnectionStateState] = useState<{
    repositoryKey: string;
    state: LiveConnectionState;
  }>({
    repositoryKey,
    state: "connecting",
  });
  const [latestEventState, setLatestEventState] = useState<{
    repositoryKey: string;
    event: RepositorySyncEvent | null;
  }>({
    repositoryKey,
    event: null,
  });
  const seenEvents = useRef(new Set<string>());
  const reconnectAttemptCount = useRef(0);

  const connectionState = connectionStateState.repositoryKey === repositoryKey ? connectionStateState.state : "connecting";
  const latestEvent = latestEventState.repositoryKey === repositoryKey ? latestEventState.event : null;

  const handleIncomingEvent = useEffectEvent((rawValue: string) => {
    const event = parseRepositorySyncEvent(rawValue);

    if (!event || event.owner !== owner || event.repo !== repo) {
      return;
    }

    const dedupKey = buildRepositoryEventDedupKey(event);

    if (seenEvents.current.has(dedupKey)) {
      return;
    }

    seenEvents.current.add(dedupKey);
    setLatestEventState({
      repositoryKey,
      event,
    });

    if (event.status === "completed" || event.status === "failed") {
      startTransition(() => {
        router.refresh();
      });
    }
  });

  useEffect(() => {
    const streamUrl = new URL("/api/live", window.location.origin);
    streamUrl.searchParams.set("owner", owner);
    streamUrl.searchParams.set("repo", repo);

    seenEvents.current = new Set();
    const eventSource = new EventSource(streamUrl);

    eventSource.onopen = () => {
      reconnectAttemptCount.current = 0;
      setConnectionStateState({
        repositoryKey,
        state: "connected",
      });
    };

    const handleMessageEvent = (messageEvent: MessageEvent<string>) => {
      handleIncomingEvent(messageEvent.data);
    };

    eventSource.addEventListener(REPOSITORY_LIVE_EVENT_NAME, handleMessageEvent as EventListener);
    eventSource.onmessage = handleMessageEvent;

    eventSource.onerror = () => {
      reconnectAttemptCount.current += 1;
      setConnectionStateState({
        repositoryKey,
        state: reconnectAttemptCount.current <= 1 ? "reconnecting" : "errored",
      });
    };

    return () => {
      eventSource.removeEventListener(REPOSITORY_LIVE_EVENT_NAME, handleMessageEvent as EventListener);
      eventSource.onmessage = null;
      eventSource.close();
    };
  }, [owner, repo, repositoryKey]);

  return {
    connectionState,
    latestEvent,
  };
}
