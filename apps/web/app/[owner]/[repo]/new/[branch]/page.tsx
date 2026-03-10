import { notFound, redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { CreateFileEditorForm } from "@/components/repos/create-file-editor-form";
import { type RepoMutationState } from "@/components/repos/create-file-form";
import { RepositoryAccessDenied } from "@/components/repos/repository-access-denied";
import { RepositoryShell } from "@/components/repos/repository-shell";
import { fetchInternalApiJson, InternalApiError } from "@/lib/auth/internal-api";
import { getOptionalAuthenticatedUser, requireAuthenticatedUser } from "@/lib/auth/protection";
import { fetchRepository, fetchRepositoryBranches } from "@/lib/repos/api";
import { buildRepoBlobPath, buildRepoCommitsPath, buildRepoHomePath, buildRepoNewFilePath } from "@/lib/repos/routes";

export const dynamic = "force-dynamic";

type NewFilePageProps = {
  params: Promise<{
    owner: string;
    repo: string;
    branch: string;
  }>;
};

export default async function RepositoryNewFilePage({ params }: NewFilePageProps) {
  const { owner, repo, branch } = await params;
  const requestedBranch = branch;
  const viewer = await getOptionalAuthenticatedUser();
  const repositoryPromise = fetchRepository(owner, repo, viewer);
  const branchesPromise = fetchRepositoryBranches(owner, repo, viewer);
  let repository: Awaited<ReturnType<typeof fetchRepository>> | null = null;
  let branches: Awaited<ReturnType<typeof fetchRepositoryBranches>> | null = null;
  let accessDeniedMessage: string | null = null;

  try {
    [repository, branches] = await Promise.all([repositoryPromise, branchesPromise]);
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

  if (!repository || !branches) {
    throw new Error("Repository new file view could not be loaded.");
  }

  if (!repository.permissions.canWrite) {
    return <RepositoryAccessDenied owner={owner} repo={repo} message="You do not have permission to create files in this repository." />;
  }

  async function createFileAction(_state: RepoMutationState, formData: FormData): Promise<RepoMutationState> {
    "use server";

    const filePath = String(formData.get("filePath") ?? "").trim();
    const content = String(formData.get("content") ?? "");

    if (!filePath) {
      return { error: "File path is required." };
    }

    if (!content.trim()) {
      return { error: "File contents are required." };
    }

    const user = await requireAuthenticatedUser(buildRepoNewFilePath(owner, repo, requestedBranch));
    const commitMessage = String(formData.get("commitMessage") ?? "").trim() || `Create ${filePath}`;

    try {
      await fetchInternalApiJson(`/api/repos/${owner}/${repo}/files`, {
        user,
        method: "POST",
        body: {
          branch: requestedBranch,
          filePath,
          content,
          commitMessage,
        },
      });
    } catch (error) {
      return {
        error: error instanceof InternalApiError ? error.message : "The file could not be committed.",
      };
    }

    revalidatePath(buildRepoHomePath(owner, repo, requestedBranch));
    revalidatePath(buildRepoCommitsPath(owner, repo, requestedBranch));
    redirect(buildRepoBlobPath(owner, repo, requestedBranch, filePath));
  }

  return (
    <RepositoryShell repository={repository} branches={branches.branches} activeBranch={requestedBranch}>
      <section className="mt-2">
        <CreateFileEditorForm
          action={createFileAction}
          repositoryName={repository.name}
          branch={requestedBranch}
          cancelHref={buildRepoHomePath(owner, repo, requestedBranch)}
        />
      </section>
    </RepositoryShell>
  );
}
