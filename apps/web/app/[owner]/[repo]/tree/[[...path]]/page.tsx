import Link from "next/link";
import { notFound } from "next/navigation";
import { FileTree } from "@/components/repos/file-tree";
import { PathBreadcrumbs } from "@/components/repos/path-breadcrumbs";
import { RepositoryAddFileMenu } from "@/components/repos/repository-add-file-menu";
import { RepositoryAccessDenied } from "@/components/repos/repository-access-denied";
import { RepositoryLiveStatusBanner } from "@/components/repos/repository-live-status-banner";
import { RepositoryShell } from "@/components/repos/repository-shell";
import { InternalApiError } from "@/lib/auth/internal-api";
import { getOptionalAuthenticatedUser } from "@/lib/auth/protection";
import { fetchRepository, fetchRepositoryBranches, fetchRepositoryTree } from "@/lib/repos/api";
import { buildRepoBlobPath, buildRepoHomePath, buildRepoTreePath } from "@/lib/repos/routes";

export const dynamic = "force-dynamic";

type TreePageProps = {
  params: Promise<{
    owner: string;
    repo: string;
    path?: string[];
  }>;
  searchParams: Promise<{
    branch?: string;
  }>;
};

export default async function RepositoryTreePage({ params, searchParams }: TreePageProps) {
  const [{ owner, repo, path }, { branch: requestedBranch }] = await Promise.all([params, searchParams]);
  const currentPath = (path ?? []).join("/");
  const viewer = await getOptionalAuthenticatedUser();
  const repositoryPromise = fetchRepository(owner, repo, viewer);
  const branchesPromise = fetchRepositoryBranches(owner, repo, viewer);
  let repository: Awaited<ReturnType<typeof fetchRepository>> | null = null;
  let branches: Awaited<ReturnType<typeof fetchRepositoryBranches>> | null = null;
  let treePayload: Awaited<ReturnType<typeof fetchRepositoryTree>> | null = null;
  let activeBranch = "";
  let accessDeniedMessage: string | null = null;

  try {
    [repository, branches] = await Promise.all([repositoryPromise, branchesPromise]);
    activeBranch = requestedBranch || branches.defaultBranch || repository.defaultBranch;
    treePayload = await fetchRepositoryTree(owner, repo, activeBranch, currentPath, viewer);
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

  if (!repository || !branches || !treePayload || !activeBranch) {
    throw new Error("Repository tree could not be loaded.");
  }

  return (
    <RepositoryShell
      repository={repository}
      branches={branches.branches}
      activeBranch={activeBranch}
      branchBasePath={buildRepoTreePath(owner, repo, activeBranch, currentPath).split("?")[0]}
    >
      <section className="grid gap-4">
        <RepositoryLiveStatusBanner owner={owner} repo={repo} />
      </section>
      <section className="grid gap-6">
        <article className="rounded-md border border-[#30363d] bg-[#0d1117] p-6 shadow-[0_24px_60px_rgba(1,4,9,0.35)]">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#8b949e]">Tree View</p>
              <h2 className="mt-2 text-xl font-semibold text-[#e6edf3]">{currentPath || "Repository root"}</h2>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {repository.permissions.canWrite ? <RepositoryAddFileMenu owner={owner} repo={repo} branch={activeBranch} /> : null}
              <Link href={buildRepoHomePath(owner, repo, activeBranch)} className="text-sm font-medium text-[#58a6ff] hover:text-[#79c0ff]">
                Back to overview
              </Link>
            </div>
          </div>

          <div className="mt-4">
            <PathBreadcrumbs
              rootHref={buildRepoTreePath(owner, repo, activeBranch)}
              path={currentPath}
              buildHref={(value) => buildRepoTreePath(owner, repo, activeBranch, value)}
            />
          </div>

          <div className="mt-6">
            <FileTree
              entries={treePayload.entries}
              buildTreeHref={(value) => buildRepoTreePath(owner, repo, activeBranch, value)}
              buildBlobHref={(value) => buildRepoBlobPath(owner, repo, activeBranch, value)}
            />
          </div>
        </article>
      </section>
    </RepositoryShell>
  );
}
