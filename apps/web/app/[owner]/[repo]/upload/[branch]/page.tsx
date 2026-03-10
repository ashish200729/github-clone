import { Buffer } from "node:buffer";
import { notFound, redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { type RepoMutationState } from "@/components/repos/create-file-form";
import { RepositoryAccessDenied } from "@/components/repos/repository-access-denied";
import { RepositoryShell } from "@/components/repos/repository-shell";
import { UploadFilesPageForm } from "@/components/repos/upload-files-page-form";
import { fetchInternalApiJson, InternalApiError } from "@/lib/auth/internal-api";
import { getOptionalAuthenticatedUser, requireAuthenticatedUser } from "@/lib/auth/protection";
import { fetchRepository, fetchRepositoryBranches } from "@/lib/repos/api";
import { buildRepoCommitsPath, buildRepoHomePath, buildRepoUploadPath } from "@/lib/repos/routes";

export const dynamic = "force-dynamic";

type UploadFilesPageProps = {
  params: Promise<{
    owner: string;
    repo: string;
    branch: string;
  }>;
};

export default async function RepositoryUploadFilesPage({ params }: UploadFilesPageProps) {
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
    throw new Error("Repository upload files view could not be loaded.");
  }

  if (!repository.permissions.canWrite) {
    return <RepositoryAccessDenied owner={owner} repo={repo} message="You do not have permission to upload files in this repository." />;
  }

  async function uploadFilesAction(_state: RepoMutationState, formData: FormData): Promise<RepoMutationState> {
    "use server";

    const user = await requireAuthenticatedUser(buildRepoUploadPath(owner, repo, requestedBranch));
    const files = formData.getAll("files").filter((entry): entry is File => entry instanceof File && entry.size > 0);

    if (files.length === 0) {
      return { error: "Select at least one file to upload." };
    }

    const commitMessage = String(formData.get("commitMessage") ?? "").trim() || "Add files via upload";

    try {
      const encodedFiles = await Promise.all(
        files.map(async (file) => ({
          path: file.name,
          sizeBytes: file.size,
          contentBase64: Buffer.from(await file.arrayBuffer()).toString("base64"),
        })),
      );

      await fetchInternalApiJson(`/api/repos/${owner}/${repo}/upload`, {
        user,
        method: "POST",
        body: {
          branch: requestedBranch,
          commitMessage,
          path: "",
          files: encodedFiles,
        },
      });
    } catch (error) {
      return {
        error: error instanceof InternalApiError ? error.message : "The upload could not be committed.",
      };
    }

    revalidatePath(buildRepoHomePath(owner, repo, requestedBranch));
    revalidatePath(buildRepoCommitsPath(owner, repo, requestedBranch));
    redirect(buildRepoHomePath(owner, repo, requestedBranch));
  }

  return (
    <RepositoryShell repository={repository} branches={branches.branches} activeBranch={requestedBranch}>
      <section className="mt-2">
        <UploadFilesPageForm
          action={uploadFilesAction}
          repositoryName={repository.name}
          branch={requestedBranch}
          cancelHref={buildRepoHomePath(owner, repo, requestedBranch)}
        />
      </section>
    </RepositoryShell>
  );
}
