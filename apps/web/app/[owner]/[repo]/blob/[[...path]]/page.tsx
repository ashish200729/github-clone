import { notFound } from "next/navigation";
import { BlobFileViewer } from "@/components/repos/blob-file-viewer";
import { PathBreadcrumbs } from "@/components/repos/path-breadcrumbs";
import { RepositoryAccessDenied } from "@/components/repos/repository-access-denied";
import { RepositoryLiveStatusBanner } from "@/components/repos/repository-live-status-banner";
import { RepositoryShell } from "@/components/repos/repository-shell";
import { fetchRepository, fetchRepositoryBlob, fetchRepositoryBranches } from "@/lib/repos/api";
import { getOptionalAuthenticatedUser } from "@/lib/auth/protection";
import { InternalApiError } from "@/lib/auth/internal-api";
import { buildRepoTreePath } from "@/lib/repos/routes";

export const dynamic = "force-dynamic";

type BlobPageProps = {
  params: Promise<{
    owner: string;
    repo: string;
    path?: string[];
  }>;
  searchParams: Promise<{
    branch?: string;
  }>;
};

export default async function RepositoryBlobPage({ params, searchParams }: BlobPageProps) {
  const [{ owner, repo, path }, { branch: requestedBranch }] = await Promise.all([params, searchParams]);
  const blobPath = (path ?? []).join("/");
  const viewer = await getOptionalAuthenticatedUser();
  const repositoryPromise = fetchRepository(owner, repo, viewer);
  const branchesPromise = fetchRepositoryBranches(owner, repo, viewer);
  let repository: Awaited<ReturnType<typeof fetchRepository>> | null = null;
  let branches: Awaited<ReturnType<typeof fetchRepositoryBranches>> | null = null;
  let blobPayload: Awaited<ReturnType<typeof fetchRepositoryBlob>> | null = null;
  let activeBranch = "";
  let accessDeniedMessage: string | null = null;
  let previewUnavailableMessage: string | null = null;
  const branchBasePath = `/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/blob/${blobPath
    .split("/")
    .filter(Boolean)
    .map((segment) => encodeURIComponent(segment))
    .join("/")}`;

  try {
    [repository, branches] = await Promise.all([repositoryPromise, branchesPromise]);
    activeBranch = requestedBranch || branches.defaultBranch || repository.defaultBranch;
    blobPayload = await fetchRepositoryBlob(owner, repo, activeBranch, blobPath, viewer);
  } catch (error) {
    if (error instanceof InternalApiError) {
      if (error.status === 403) {
        accessDeniedMessage = error.message;
      } else if (error.status === 404) {
        notFound();
      } else if (error.code === "BLOB_NOT_TEXT" || error.code === "BLOB_TOO_LARGE") {
        [repository, branches] = await Promise.all([repositoryPromise, branchesPromise]);
        activeBranch = requestedBranch || branches.defaultBranch || repository.defaultBranch;
        previewUnavailableMessage = error.message;
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

  if (!repository || !branches || !activeBranch) {
    throw new Error("Repository blob view could not be loaded.");
  }

  return (
    <RepositoryShell repository={repository} branches={branches.branches} activeBranch={activeBranch} branchBasePath={branchBasePath}>
      <section className="grid gap-4">
        <RepositoryLiveStatusBanner owner={owner} repo={repo} />
      </section>
      <section className="space-y-4">
        {previewUnavailableMessage ? (
          <article className="rounded-md border border-[#30363d] bg-[#0d1117] p-6 shadow-[0_24px_60px_rgba(1,4,9,0.35)]">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#8b949e]">Blob View</p>
            <h2 className="mt-3 text-2xl font-semibold text-[#e6edf3]">Preview unavailable</h2>
            <p className="mt-3 text-sm leading-6 text-[#8b949e]">{previewUnavailableMessage}</p>
          </article>
        ) : (
          <>
            <div className="rounded-md border border-[#30363d] bg-[#0d1117] px-4 py-3">
              <PathBreadcrumbs
                rootHref={buildRepoTreePath(owner, repo, activeBranch)}
                path={blobPath}
                buildHref={(value) => buildRepoTreePath(owner, repo, activeBranch, value)}
              />
            </div>

            <BlobFileViewer
              path={blobPayload?.blob.path ?? blobPath}
              content={blobPayload?.blob.content ?? ""}
              sizeBytes={blobPayload?.blob.size ?? 0}
              canWrite={repository.permissions.canWrite}
            />
          </>
        )}
      </section>
    </RepositoryShell>
  );
}
