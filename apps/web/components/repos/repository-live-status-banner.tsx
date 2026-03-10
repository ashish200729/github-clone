"use client";

import { useRepositoryLiveStatus } from "@/lib/live/use-repository-live-status";

interface RepositoryLiveStatusBannerProps {
  owner: string;
  repo: string;
}

function getConnectionMessage(state: ReturnType<typeof useRepositoryLiveStatus>["connectionState"]): string | null {
  if (state === "reconnecting") {
    return "Live repository updates are reconnecting.";
  }

  if (state === "errored") {
    return "Live repository updates are temporarily unavailable. The page still works, but status may be stale until refresh.";
  }

  return null;
}

export function RepositoryLiveStatusBanner({ owner, repo }: RepositoryLiveStatusBannerProps) {
  const { connectionState, latestEvent } = useRepositoryLiveStatus(owner, repo);
  const connectionMessage = getConnectionMessage(connectionState);

  if (!connectionMessage && !latestEvent) {
    return null;
  }

  if (latestEvent) {
    const tone =
      latestEvent.status === "failed"
        ? "border-[#f85149]/40 bg-[#2d1117] text-[#ff7b72]"
        : latestEvent.status === "completed"
          ? "border-[#238636]/50 bg-[#0f2419] text-[#3fb950]"
          : "border-[#1f6feb]/40 bg-[#0c2d6b]/20 text-[#79c0ff]";

    return (
      <div className={`rounded-md border px-4 py-3 text-sm ${tone}`}>
        {latestEvent.message ??
          (latestEvent.status === "queued"
            ? "Repository update queued."
            : latestEvent.status === "processing"
              ? "Repository update in progress."
              : latestEvent.status === "retrying"
                ? "Repository update retrying."
                : latestEvent.status === "completed"
                  ? "Repository update completed."
                  : "Repository update failed.")}
      </div>
    );
  }

  return (
    <div className="rounded-md border border-[#9e6a03]/40 bg-[#2d2100] px-4 py-3 text-sm text-[#e3b341]">
      {connectionMessage}
    </div>
  );
}
