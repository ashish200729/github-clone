import Link from "next/link";
import { notFound } from "next/navigation";
import {
  Bell,
  CircleDot,
  Code,
  Eye,
  File as FileIcon,
  Folder,
  GitBranch,
  GitFork,
  GitPullRequest,
  Lock,
  Plus,
  Search,
  Settings,
  Star,
  Tag,
  Unlock,
} from "lucide-react";
import { BranchPicker } from "@/components/repos/branch-picker";
import { type RepoMutationState } from "@/components/repos/create-file-form";
import { GitTokenPanel } from "@/components/repos/git-token-panel";
import { RepositoryAddFileMenu } from "@/components/repos/repository-add-file-menu";
import { RepositoryCodeMenu } from "@/components/repos/repository-code-menu";
import { RepositoryAccessDenied } from "@/components/repos/repository-access-denied";
import { fetchInternalApiJson, InternalApiError } from "@/lib/auth/internal-api";
import { getOptionalAuthenticatedUser, requireAuthenticatedUser } from "@/lib/auth/protection";
import { fetchRepositoryOverview } from "@/lib/repos/api";
import { buildRepoBlobPath, buildRepoCommitsPath, buildRepoHomePath, buildRepoSettingsPath, buildRepoTreePath } from "@/lib/repos/routes";
import type { RepoOverview, RepoSummary } from "@/lib/repos/types";

export const dynamic = "force-dynamic";

type RepoPageProps = {
  params: Promise<{
    owner: string;
    repo: string;
  }>;
  searchParams: Promise<{
    branch?: string;
  }>;
};

function formatBranchCommands(cloneUrl: string, branch: string, repoName: string): string {
  return `git clone ${cloneUrl}
cd ${repoName}
git switch -c ${branch}
git push origin ${branch}`;
}

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

function formatCalendarDate(value: string | null): string {
  if (!value) {
    return "Unknown";
  }

  const timestamp = new Date(value);
  if (Number.isNaN(timestamp.getTime())) {
    return "Unknown";
  }

  return timestamp.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default async function RepositoryPage({ params, searchParams }: RepoPageProps) {
  const [{ owner, repo }, { branch: requestedBranch }] = await Promise.all([params, searchParams]);
  const viewer = await getOptionalAuthenticatedUser();

  let repository: RepoSummary | null = null;
  let overview: RepoOverview | null = null;
  let accessDeniedMessage: string | null = null;
  let serviceUnavailableMessage: string | null = null;

  try {
    overview = await fetchRepositoryOverview(owner, repo, requestedBranch, viewer);
    repository = overview.repo;
  } catch (error) {
    if (error instanceof InternalApiError) {
      if (error.status === 404) {
        notFound();
      }

      if (error.status === 403) {
        accessDeniedMessage = error.message;
      }

      if (error.status >= 500 || error.code === "INTERNAL_API_UNAVAILABLE") {
        serviceUnavailableMessage = error.message;
      }

      if (accessDeniedMessage || serviceUnavailableMessage) {
        // Handle the known access-denied state after data fetching so JSX stays outside try/catch.
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

  if (serviceUnavailableMessage) {
    return (
      <main className="min-h-screen bg-[#0d1117] px-4 py-10 text-[#c9d1d9]">
        <section className="mx-auto max-w-3xl rounded-md border border-[#f85149]/40 bg-[#0d1117] p-8 shadow-[0_24px_60px_rgba(1,4,9,0.35)]">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#ff7b72]">Service unavailable</p>
          <h1 className="mt-3 text-3xl font-semibold text-[#e6edf3]">The repository data service is not reachable</h1>
          <p className="mt-3 text-sm leading-6 text-[#8b949e]">{serviceUnavailableMessage}</p>
          <p className="mt-2 text-sm leading-6 text-[#8b949e]">Please make sure the API service is running, then refresh this page.</p>
        </section>
      </main>
    );
  }

  if (!overview || !repository) {
    throw new Error("Repository overview could not be loaded.");
  }

  const repositoryPageUrl = repository.urls.html;
  const activeBranch = overview.branch;
  const branchPayload = {
    defaultBranch: overview.branch,
    branches: overview.branches.length > 0 ? overview.branches : [{ name: repository.defaultBranch, commitSha: "", isDefault: true }],
    isEmpty: overview.isEmpty,
  };
  const isEmptyRepository = overview.isEmpty || repository.isEmpty;
  const latestCommit = overview.commits[0] ?? null;
  const latestCommitMessage = latestCommit?.message.split("\n")[0] ?? "No commits yet";
  const latestCommitAuthor = latestCommit?.authorName ?? repository.owner.handle;
  const latestCommitAge = latestCommit ? formatRelativeTime(latestCommit.authoredAt) : "No commits yet";
  const commitHistoryHref = buildRepoCommitsPath(owner, repo, activeBranch);
  const ownerInitial = (viewer?.name || viewer?.email || repository.owner.handle).charAt(0).toUpperCase();
  const normalizedLatestCommitAuthor = latestCommitAuthor.trim().toLowerCase();
  const latestCommitAvatarUrl =
    repository.owner.image &&
    [repository.owner.handle, repository.owner.name ?? ""].some(
      (candidate) => candidate.trim().toLowerCase() === normalizedLatestCommitAuthor,
    )
      ? repository.owner.image
      : null;

  async function createGitTokenAction(state: RepoMutationState, formData: FormData): Promise<RepoMutationState> {
    "use server";
    void state;
    void formData;

    const user = await requireAuthenticatedUser(repositoryPageUrl);

    try {
      const payload = await fetchInternalApiJson<{
        username: string;
        token: string;
        expiresAt: string;
        cloneUrl: string;
      }>(`/api/repos/${owner}/${repo}/git-token`, {
        user,
        method: "POST",
      });

      return payload;
    } catch (error) {
      return {
        error: error instanceof InternalApiError ? error.message : "A Git token could not be generated.",
      };
    }
  }

  const repositoryTabs = [
    { key: "code", label: "Code", href: buildRepoHomePath(owner, repo, activeBranch), active: true, icon: Code },
    {
      key: "pull-requests",
      label: "Pull requests",
      href: `${buildRepoHomePath(owner, repo, activeBranch)}#pull-requests`,
      active: false,
      icon: GitPullRequest,
    },
    { key: "issues", label: "Issues", href: `${buildRepoHomePath(owner, repo, activeBranch)}#issues`, active: false, icon: CircleDot },
    { key: "settings", label: "Settings", href: buildRepoSettingsPath(owner, repo), active: false, icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-[#0d1117] text-[#c9d1d9]">
      <header className="border-b border-[#30363d] bg-[#010409]">
        <div className="mx-auto flex w-full max-w-[1280px] items-center justify-between gap-3 px-4 py-3">
          <div className="flex min-w-0 items-center gap-3">
            <Link href="/" className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-[#30363d] text-[#e6edf3]">
              <Code size={16} />
            </Link>
            <p className="truncate text-[15px] font-semibold text-[#e6edf3]">
              {repository.owner.handle} / {repository.name}
            </p>
          </div>

          <div className="flex flex-1 items-center justify-end gap-2">
            <label className="relative hidden w-full max-w-[320px] md:block">
              <Search size={14} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-[#8b949e]" />
              <input
                type="text"
                readOnly
                value="Type / to search"
                aria-label="Search"
                className="w-full rounded-md border border-[#30363d] bg-[#0d1117] py-1.5 pl-8 pr-8 text-sm text-[#8b949e]"
              />
            </label>
            <button className="hidden rounded-md border border-[#30363d] p-1.5 text-[#c9d1d9] hover:bg-[#21262d] lg:inline-flex" aria-label="Create">
              <Plus size={14} />
            </button>
            <button className="rounded-md border border-[#30363d] p-1.5 text-[#c9d1d9] hover:bg-[#21262d]" aria-label="Notifications">
              <Bell size={14} />
            </button>
            <Link
              href={`/${encodeURIComponent(repository.owner.handle)}`}
              className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full border border-[#30363d] bg-[#1f6feb] text-sm font-semibold text-white"
            >
              {viewer?.image ? <img src={viewer.image} alt={viewer.name || repository.owner.handle} className="h-full w-full object-cover" /> : ownerInitial}
            </Link>
          </div>
        </div>
      </header>

      <nav className="border-b border-[#30363d]">
        <div className="mx-auto flex w-full max-w-[1280px] items-center gap-1 overflow-x-auto px-4">
          {repositoryTabs.map((tab) => {
            const Icon = tab.icon;

            return (
              <Link
                key={tab.key}
                href={tab.href}
                className={`inline-flex items-center gap-2 border-b-2 px-3 py-3 text-[14px] font-medium whitespace-nowrap ${
                  tab.active
                    ? "border-[#f78166] text-[#e6edf3]"
                    : "border-transparent text-[#8b949e] hover:border-[#6e7681] hover:text-[#c9d1d9]"
                }`}
              >
                <Icon size={15} />
                <span>{tab.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>

      <main className="mx-auto w-full max-w-[1280px] px-4 py-6">
        <section className="mb-5 flex flex-col gap-4 border-b border-[#30363d] pb-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-[32px] font-semibold leading-8 text-[#e6edf3]">{repository.name}</h1>
            <span className="rounded-full border border-[#30363d] px-2.5 py-0.5 text-xs text-[#8b949e]">{repository.visibility}</span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button className="inline-flex items-center gap-2 rounded-md border border-[#30363d] bg-[#21262d] px-3 py-1.5 text-xs font-medium text-[#c9d1d9]">
              <Eye size={14} />
              Watch
            </button>
            <button className="inline-flex items-center gap-2 rounded-md border border-[#30363d] bg-[#21262d] px-3 py-1.5 text-xs font-medium text-[#c9d1d9]">
              <GitFork size={14} />
              Fork
            </button>
            <button className="inline-flex items-center gap-2 rounded-md border border-[#30363d] bg-[#21262d] px-3 py-1.5 text-xs font-medium text-[#c9d1d9]">
              <Star size={14} />
              Star
            </button>
          </div>
        </section>

        {isEmptyRepository ? (
          <section
            className={`grid gap-6 ${
              repository.permissions.canWrite
                ? repository.visibility === "private"
                  ? "lg:grid-cols-[minmax(0,1fr)_320px]"
                  : ""
                : "lg:grid-cols-[minmax(0,1fr)_320px]"
            }`}
          >
            <article className="rounded-md border border-[#30363d] bg-[#0d1117]">
              <div className="border-b border-[#30363d] px-4 py-3">
                <div className="flex flex-wrap items-center gap-3">
                  <BranchPicker
                    branches={branchPayload.branches}
                    selectedBranch={repository.defaultBranch}
                    basePath={buildRepoHomePath(owner, repo)}
                    variant="github-dark"
                  />
                  <span className="inline-flex items-center gap-1 text-sm text-[#8b949e]">
                    <GitBranch size={14} />
                    1 branch
                  </span>
                  <span className="inline-flex items-center gap-1 text-sm text-[#8b949e]">
                    <Tag size={14} />
                    0 tags
                  </span>
                  {repository.permissions.canWrite ? (
                    <div className="ml-auto">
                      <RepositoryAddFileMenu owner={owner} repo={repo} branch={repository.defaultBranch} />
                    </div>
                  ) : null}
                </div>
              </div>

              <div className="space-y-5 px-4 py-5">
                <p className="text-sm text-[#8b949e]">Push an existing repository from the command line</p>
                <pre className="overflow-x-auto rounded-md border border-[#30363d] bg-[#010409] p-4 text-xs text-[#c9d1d9]">
                  {formatBranchCommands(repository.urls.clone, repository.defaultBranch, repository.name)}
                </pre>
                <p className="text-sm text-[#8b949e]">
                  Use the <span className="font-semibold text-[#c9d1d9]">Add file</span> menu to create a new file or upload files to this branch.
                </p>
              </div>
            </article>

            {repository.permissions.canWrite ? (
              repository.visibility === "private" ? (
                <aside className="space-y-4">
                  <GitTokenPanel action={createGitTokenAction} owner={owner} variant="github-dark" />
                </aside>
              ) : null
            ) : (
              <aside className="rounded-md border border-[#30363d] bg-[#0d1117] p-4 text-sm text-[#8b949e]">
                You have read-only access to this repository. Only the owner can create the first commit from the browser.
              </aside>
            )}
          </section>
        ) : (
          <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
            <div className="space-y-6">
              <article className="overflow-hidden rounded-md border border-[#30363d] bg-[#0d1117]">
                <div className="flex flex-wrap items-center gap-2 border-b border-[#30363d] px-4 py-3">
                  <BranchPicker
                    branches={branchPayload.branches}
                    selectedBranch={activeBranch}
                    basePath={buildRepoHomePath(owner, repo)}
                    variant="github-dark"
                  />
                  <span className="inline-flex items-center gap-1 text-sm text-[#8b949e]">
                    <GitBranch size={14} />
                    {branchPayload.branches.length} branch{branchPayload.branches.length === 1 ? "" : "es"}
                  </span>
                  <span className="inline-flex items-center gap-1 text-sm text-[#8b949e]">
                    <Tag size={14} />
                    0 tags
                  </span>

                  <div className="ml-auto flex flex-wrap items-center gap-2">
                    <button className="inline-flex items-center gap-1 rounded-md border border-[#30363d] bg-[#010409] px-3 py-1.5 text-xs text-[#c9d1d9]">
                      <Search size={13} />
                      Go to file
                    </button>
                    {repository.permissions.canWrite ? (
                      <RepositoryAddFileMenu owner={owner} repo={repo} branch={activeBranch} />
                    ) : null}
                    <RepositoryCodeMenu
                      cloneUrl={repository.urls.clone}
                      archiveUrl={`/api/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/archive?branch=${encodeURIComponent(activeBranch)}`}
                      archiveLabel={`${repository.name}-${activeBranch}.zip`}
                      isPrivate={repository.visibility === "private"}
                    />
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#30363d] bg-[#161b22] px-4 py-3 text-sm">
                  <div className="flex min-w-0 items-center gap-2">
                    <span className="inline-flex h-6 w-6 items-center justify-center overflow-hidden rounded-full bg-[#1f6feb] text-xs font-semibold text-white">
                      {latestCommitAvatarUrl ? (
                        <img
                          src={latestCommitAvatarUrl}
                          alt={repository.owner.name || repository.owner.handle}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        latestCommitAuthor.charAt(0).toUpperCase()
                      )}
                    </span>
                    <span className="font-medium text-[#e6edf3]">{latestCommitAuthor}</span>
                    <span className="truncate text-[#8b949e]">{latestCommitMessage}</span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-[#8b949e]">
                    {latestCommit ? <span>{latestCommit.shortSha}</span> : null}
                    <Link href={commitHistoryHref} className="hover:text-[#58a6ff] hover:underline">
                      {overview.commits.length} commit{overview.commits.length === 1 ? "" : "s"}
                    </Link>
                  </div>
                </div>

                {overview.tree.length === 0 ? (
                  <div className="px-4 py-6 text-sm text-[#8b949e]">No files at this level.</div>
                ) : (
                  <ul className="divide-y divide-[#21262d]">
                    {overview.tree.map((entry) => {
                      const href = entry.type === "tree" ? buildRepoTreePath(owner, repo, activeBranch, entry.path) : buildRepoBlobPath(owner, repo, activeBranch, entry.path);
                      const EntryIcon = entry.type === "tree" ? Folder : FileIcon;

                      return (
                        <li key={entry.path}>
                          <Link
                            href={href}
                            className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_120px] items-center gap-3 px-4 py-2.5 text-sm hover:bg-[#161b22]"
                          >
                            <span className="flex min-w-0 items-center gap-2 text-[#58a6ff]">
                              <EntryIcon size={15} className="shrink-0 text-[#8b949e]" />
                              <span className="truncate">{entry.name}</span>
                            </span>
                            <span className="hidden truncate text-[#8b949e] md:block">{latestCommitMessage}</span>
                            <span className="text-right text-xs text-[#8b949e]">{latestCommitAge}</span>
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </article>

              {overview.readme?.content ? (
                <article className="overflow-hidden rounded-md border border-[#30363d] bg-[#0d1117]">
                  <div className="border-b border-[#30363d] bg-[#161b22] px-4 py-3 text-sm font-semibold text-[#e6edf3]">README.md</div>
                  <pre className="overflow-x-auto px-4 py-5 text-sm leading-7 text-[#c9d1d9]">{overview.readme.content}</pre>
                </article>
              ) : null}
            </div>

            <aside className="space-y-6">
              <article className="border-y border-[#30363d] py-6">
                <h2 className="text-[15px] font-semibold tracking-[-0.01em] text-[#e6edf3]">About</h2>

                <p className="mt-4 text-[15px] leading-7 text-[#c9d1d9]">
                  {repository.description ?? "No description, website, or topics provided."}
                </p>

                <div className="mt-5 flex flex-wrap gap-2.5">
                  <span className="inline-flex items-center gap-2 rounded-full border border-[#30363d] bg-[#161b22] px-3 py-1.5 text-[13px] font-medium text-[#c9d1d9] shadow-[inset_0_1px_0_rgba(240,246,252,0.03)]">
                    {repository.visibility === "private" ? (
                      <Lock size={14} className="text-[#8b949e]" />
                    ) : (
                      <Unlock size={14} className="text-[#8b949e]" />
                    )}
                    <span>{repository.visibility === "private" ? "Private repository" : "Public repository"}</span>
                  </span>

                  <span className="inline-flex items-center gap-2 rounded-full border border-[#30363d] bg-[#161b22] px-3 py-1.5 text-[13px] font-medium text-[#c9d1d9] shadow-[inset_0_1px_0_rgba(240,246,252,0.03)]">
                    <GitBranch size={14} className="text-[#8b949e]" />
                    <span>{repository.defaultBranch}</span>
                  </span>
                </div>

                <div className="mt-6 space-y-3 text-sm text-[#8b949e]">
                  <p className="inline-flex items-center gap-3">
                    <Star size={16} className="text-[#8b949e]" />
                    <span>Created on {formatCalendarDate(repository.createdAt)}</span>
                  </p>
                </div>
              </article>

              {repository.permissions.canWrite && repository.visibility === "private" ? (
                <section className="space-y-4">
                  <GitTokenPanel action={createGitTokenAction} owner={owner} variant="github-dark" />
                </section>
              ) : null}
            </aside>
          </section>
        )}
      </main>
    </div>
  );
}
