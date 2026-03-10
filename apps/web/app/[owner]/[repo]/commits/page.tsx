import { CalendarDays, GitBranch, GitCommitHorizontal, History, Users } from "lucide-react";
import { notFound } from "next/navigation";
import { BranchPicker } from "@/components/repos/branch-picker";
import { RepositoryAccessDenied } from "@/components/repos/repository-access-denied";
import { RepositoryLiveStatusBanner } from "@/components/repos/repository-live-status-banner";
import { RepositoryShell } from "@/components/repos/repository-shell";
import { fetchRepository, fetchRepositoryBranches, fetchRepositoryCommits } from "@/lib/repos/api";
import { getOptionalAuthenticatedUser } from "@/lib/auth/protection";
import { InternalApiError } from "@/lib/auth/internal-api";
import type { RepoCommit, RepoSummary } from "@/lib/repos/types";

export const dynamic = "force-dynamic";

type CommitsPageProps = {
  params: Promise<{
    owner: string;
    repo: string;
  }>;
  searchParams: Promise<{
    branch?: string;
  }>;
};

function formatRelativeTime(value: string): string {
  const timestamp = new Date(value);

  if (Number.isNaN(timestamp.getTime())) {
    return "just now";
  }

  const elapsedMs = Math.max(0, Date.now() - timestamp.getTime());
  const minutes = Math.floor(elapsedMs / 60_000);

  if (minutes < 60) {
    return `${Math.max(1, minutes)} minute${minutes === 1 ? "" : "s"} ago`;
  }

  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  }

  const days = Math.floor(hours / 24);
  if (days < 30) {
    return `${days} day${days === 1 ? "" : "s"} ago`;
  }

  const months = Math.floor(days / 30);
  if (months < 12) {
    return `${months} month${months === 1 ? "" : "s"} ago`;
  }

  const years = Math.floor(days / 365);
  return `${years} year${years === 1 ? "" : "s"} ago`;
}

function formatCommitDay(value: string): string {
  const timestamp = new Date(value);

  if (Number.isNaN(timestamp.getTime())) {
    return "Unknown date";
  }

  return timestamp.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatCommitTimestamp(value: string): string {
  const timestamp = new Date(value);

  if (Number.isNaN(timestamp.getTime())) {
    return "Unknown time";
  }

  return timestamp.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function groupCommitsByDay(commits: RepoCommit[]): Array<{ day: string; commits: RepoCommit[] }> {
  const grouped = new Map<string, RepoCommit[]>();

  commits.forEach((commit) => {
    const day = formatCommitDay(commit.authoredAt);
    const existing = grouped.get(day);

    if (existing) {
      existing.push(commit);
      return;
    }

    grouped.set(day, [commit]);
  });

  return Array.from(grouped.entries()).map(([day, dailyCommits]) => ({
    day,
    commits: dailyCommits,
  }));
}

function getCommitAvatar(commit: RepoCommit, repository: RepoSummary): { image: string | null; initial: string } {
  const normalizedAuthor = commit.authorName.trim().toLowerCase();
  const matchesOwner =
    repository.owner.image &&
    [repository.owner.handle, repository.owner.name ?? ""].some(
      (candidate) => candidate.trim().toLowerCase() === normalizedAuthor,
    );

  return {
    image: matchesOwner ? repository.owner.image : null,
    initial: commit.authorName.trim().charAt(0).toUpperCase() || "?",
  };
}

export default async function RepositoryCommitsPage({ params, searchParams }: CommitsPageProps) {
  const [{ owner, repo }, { branch: requestedBranch }] = await Promise.all([params, searchParams]);
  const viewer = await getOptionalAuthenticatedUser();
  const repositoryPromise = fetchRepository(owner, repo, viewer);
  const branchesPromise = fetchRepositoryBranches(owner, repo, viewer);
  let repository: Awaited<ReturnType<typeof fetchRepository>> | null = null;
  let branches: Awaited<ReturnType<typeof fetchRepositoryBranches>> | null = null;
  let commits: Awaited<ReturnType<typeof fetchRepositoryCommits>> | null = null;
  let activeBranch = "";
  let accessDeniedMessage: string | null = null;

  try {
    [repository, branches] = await Promise.all([repositoryPromise, branchesPromise]);
    activeBranch = requestedBranch || branches.defaultBranch || repository.defaultBranch;
    commits = await fetchRepositoryCommits(owner, repo, activeBranch, viewer);
  } catch (error) {
    if (error instanceof InternalApiError) {
      if (error.status === 404) {
        notFound();
      }

      if (error.status === 403) {
        accessDeniedMessage = error.message;
      } else {
        throw error;
      }
    } else {
      throw error;
    }
  }

  if (accessDeniedMessage) {
    return <RepositoryAccessDenied owner={owner} repo={repo} message={accessDeniedMessage} />;
  }

  if (!repository || !branches || !commits || !activeBranch) {
    throw new Error("Repository commits view could not be loaded.");
  }

  const groupedCommits = groupCommitsByDay(commits.commits);
  const contributorCount = new Set(
    commits.commits.map((commit) => `${commit.authorName.trim().toLowerCase()}::${commit.authorEmail.trim().toLowerCase()}`),
  ).size;
  const latestCommit = commits.commits[0] ?? null;

  return (
    <RepositoryShell
      repository={repository}
      branches={branches.branches}
      activeBranch={activeBranch}
      branchBasePath={`/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/commits`}
    >
      <section className="grid gap-4">
        <RepositoryLiveStatusBanner owner={owner} repo={repo} />
      </section>

      <section className="mt-4">
        <div className="mb-4 text-2xl font-semibold text-[#e6edf3]">Commits</div>
        
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between py-2 border-b border-[#21262d] pb-4 mb-4">
          <div className="flex items-center">
            <BranchPicker
              branches={branches.branches}
              selectedBranch={activeBranch}
              basePath={`/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/commits`}
              variant="github-dark"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2 text-sm text-[#c9d1d9] font-medium">
            <div className="inline-flex items-center gap-2 rounded-md border border-[#30363d] bg-[#21262d] px-3 py-1.5 hover:bg-[#30363d] transition-colors cursor-pointer">
              <Users size={16} className="text-[#8b949e]" />
              <span>All users</span>
              <svg aria-hidden="true" height="16" viewBox="0 0 16 16" version="1.1" width="16" className="fill-[#8b949e] ml-1"><path d="m4.427 7.427 3.396 3.396a.25.25 0 0 0 .354 0l3.396-3.396A.25.25 0 0 0 11.396 7H4.604a.25.25 0 0 0-.177.427Z"></path></svg>
            </div>
            <div className="inline-flex items-center gap-2 rounded-md border border-[#30363d] bg-[#21262d] px-3 py-1.5 hover:bg-[#30363d] transition-colors cursor-pointer">
              <CalendarDays size={16} className="text-[#8b949e]" />
              <span>All time</span>
              <svg aria-hidden="true" height="16" viewBox="0 0 16 16" version="1.1" width="16" className="fill-[#8b949e] ml-1"><path d="m4.427 7.427 3.396 3.396a.25.25 0 0 0 .354 0l3.396-3.396A.25.25 0 0 0 11.396 7H4.604a.25.25 0 0 0-.177.427Z"></path></svg>
            </div>
          </div>
        </div>

        <div>
          {commits.commits.length === 0 ? (
            <div className="rounded-xl border border-dashed border-[#30363d] bg-[#010409] px-5 py-8 text-sm text-[#8b949e] text-center">
              This branch does not have any commits yet.
            </div>
          ) : (
            <div className="relative">
              {groupedCommits.map((group, groupIndex) => (
                <div key={group.day} className="relative pb-6">
                  {/* Timeline connecting line */}
                  {groupIndex < groupedCommits.length - 1 && (
                    <div className="absolute top-4 left-[15px] bottom-[-16px] w-[1px] bg-[#30363d] z-0" />
                  )}

                  <div className="flex items-center gap-2 relative z-10 bg-[#0d1117] py-1 pl-[9px]">
                    <svg aria-hidden="true" height="16" viewBox="0 0 16 16" version="1.1" width="16" className="fill-[#6e7681]"><path d="M10.5 7.75a2.5 2.5 0 1 1-5 0 2.5 2.5 0 0 1 5 0Z"></path></svg>
                    <span className="text-sm text-[#8b949e] ml-1">Commits on {group.day}</span>
                  </div>

                  <div className="ml-8 border border-[#30363d] rounded-md overflow-hidden bg-[#0d1117] mt-1">
                    {group.commits.map((commit, commitIndex) => {
                      const [subject, ...rest] = commit.message.split("\n");
                      const details = rest.join(" ").trim();
                      const avatar = getCommitAvatar(commit, repository);

                      return (
                        <article
                          key={commit.sha}
                          className={`px-4 py-3 flex flex-col md:flex-row md:items-start md:justify-between hover:bg-[#161b22] ${commitIndex > 0 ? "border-t border-[#30363d]" : ""}`}
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex items-start gap-2">
                              <div className="min-w-0 flex-1">
                                <h3 className="text-[15px] font-semibold text-[#e6edf3]">
                                  <a href="#" className="hover:text-[#2f81f7] hover:underline" title={subject}>
                                    {subject}
                                  </a>
                                </h3>
                                {details && <p className="mt-1 text-xs text-[#8b949e] truncate" title={details}>{details}</p>}
                                <div className="mt-1 flex items-center gap-2 text-xs text-[#8b949e]">
                                  <span className="inline-flex h-[20px] w-[20px] shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#1f6feb] text-[10px] font-semibold text-white">
                                    {avatar.image ? (
                                      <img src={avatar.image} alt={commit.authorName} className="h-full w-full object-cover" />
                                    ) : (
                                      avatar.initial
                                    )}
                                  </span>
                                  <span className="font-semibold text-[#e6edf3]">{commit.authorName}</span>
                                  <span>authored {formatRelativeTime(commit.authoredAt)}</span>
                                </div>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-3 pt-3 md:pt-0 shrink-0">
                            <span className="inline-flex items-center rounded-full border border-[#2ea043] font-medium text-[#2ea043] px-2 py-[2px] text-[11px] select-none hover:bg-transparent">
                              Verified
                            </span>
                            <div className="flex text-xs font-mono text-[#e6edf3] bg-[#0d1117] border border-[#30363d] rounded-md items-center shadow-sm h-7">
                              <span className="px-3 hover:text-[#58a6ff] cursor-pointer inline-flex items-center border-r border-[#30363d] h-full" title="Copy full SHA">
                                {commit.shortSha} <svg aria-hidden="true" height="14" viewBox="0 0 16 16" version="1.1" width="14" className="fill-current ml-1"><path d="M0 6.75C0 5.784.784 5 1.75 5h1.5a.75.75 0 0 1 0 1.5h-1.5a.25.25 0 0 0-.25.25v7.5c0 .138.112.25.25.25h7.5a.25.25 0 0 0 .25-.25v-1.5a.75.75 0 0 1 1.5 0v1.5A1.75 1.75 0 0 1 9.25 16h-7.5A1.75 1.75 0 0 1 0 14.25Z"></path><path d="M5 1.75C5 .784 5.784 0 6.75 0h7.5C15.216 0 16 .784 16 1.75v7.5A1.75 1.75 0 0 1 14.25 11h-7.5A1.75 1.75 0 0 1 5 9.25Zm1.75-.25a.25.25 0 0 0-.25.25v7.5c0 .138.112.25.25.25h7.5a.25.25 0 0 0 .25-.25v-7.5a.25.25 0 0 0-.25-.25Z"></path></svg>
                              </span>
                              <span className="px-2 cursor-pointer hover:bg-[#30363d] hover:text-[#58a6ff] h-full flex items-center h-[26px]" title="Browse the repository at this point in the history">
                                {"< >"}
                              </span>
                            </div>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </RepositoryShell>
  );
}
