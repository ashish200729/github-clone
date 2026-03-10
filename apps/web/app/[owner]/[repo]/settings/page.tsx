import { notFound, redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { type RepoSettingsMutationState, RepositorySettingsPanels } from "@/components/repos/repository-settings-panels";
import { RepositoryAccessDenied } from "@/components/repos/repository-access-denied";
import { RepositoryShell } from "@/components/repos/repository-shell";
import { fetchInternalApiJson, InternalApiError } from "@/lib/auth/internal-api";
import { getOptionalAuthenticatedUser, requireAuthenticatedUser } from "@/lib/auth/protection";
import { fetchRepository, fetchRepositoryBranches } from "@/lib/repos/api";
import { buildRepoHomePath, buildRepoSettingsPath } from "@/lib/repos/routes";
import type { RepoSummary } from "@/lib/repos/types";

export const dynamic = "force-dynamic";

type RepositorySettingsPageProps = {
  params: Promise<{
    owner: string;
    repo: string;
  }>;
};

function toErrorState(error: unknown, fallback: string): RepoSettingsMutationState {
  if (error instanceof InternalApiError) {
    return { error: error.message };
  }

  return { error: fallback };
}

export default async function RepositorySettingsPage({ params }: RepositorySettingsPageProps) {
  const { owner, repo } = await params;
  const viewer = await getOptionalAuthenticatedUser();
  const repositoryPromise = fetchRepository(owner, repo, viewer);
  const branchesPromise = fetchRepositoryBranches(owner, repo, viewer);
  let repository: RepoSummary | null = null;
  let branchesPayload: Awaited<ReturnType<typeof fetchRepositoryBranches>> | null = null;
  let accessDeniedMessage: string | null = null;

  try {
    [repository, branchesPayload] = await Promise.all([repositoryPromise, branchesPromise]);
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

  if (!repository || !branchesPayload) {
    throw new Error("Repository settings could not be loaded.");
  }

  if (!repository.permissions.canAdmin) {
    return <RepositoryAccessDenied owner={owner} repo={repo} message="Only repository owners can manage repository settings." />;
  }

  const settingsUrl = buildRepoSettingsPath(owner, repo);

  async function updateGeneralAction(_state: RepoSettingsMutationState, formData: FormData): Promise<RepoSettingsMutationState> {
    "use server";

    const user = await requireAuthenticatedUser(settingsUrl);
    const nextName = String(formData.get("name") ?? "");
    const nextDescription = String(formData.get("description") ?? "");

    try {
      const payload = await fetchInternalApiJson<{ repo: RepoSummary }>(`/api/repos/${owner}/${repo}`, {
        user,
        method: "PATCH",
        body: {
          name: nextName,
          description: nextDescription,
        },
      });

      const renamedRepository = payload.repo;
      await revalidatePath(buildRepoHomePath(owner, repo));
      await revalidatePath(buildRepoSettingsPath(owner, repo));
      await revalidatePath(buildRepoHomePath(owner, renamedRepository.name));
      await revalidatePath(buildRepoSettingsPath(owner, renamedRepository.name));

      if (renamedRepository.name !== repo) {
        redirect(buildRepoSettingsPath(owner, renamedRepository.name));
      }

      return { success: "Repository details updated." };
    } catch (error) {
      return toErrorState(error, "Repository details could not be updated.");
    }
  }

  async function updateVisibilityAction(_state: RepoSettingsMutationState, formData: FormData): Promise<RepoSettingsMutationState> {
    "use server";

    const user = await requireAuthenticatedUser(settingsUrl);
    const visibility = String(formData.get("visibility") ?? "");

    try {
      await fetchInternalApiJson<{ repo: RepoSummary }>(`/api/repos/${owner}/${repo}`, {
        user,
        method: "PATCH",
        body: {
          visibility,
        },
      });

      await revalidatePath(buildRepoHomePath(owner, repo));
      await revalidatePath(buildRepoSettingsPath(owner, repo));
      return { success: "Visibility updated." };
    } catch (error) {
      return toErrorState(error, "Visibility could not be updated.");
    }
  }

  async function updateDefaultBranchAction(_state: RepoSettingsMutationState, formData: FormData): Promise<RepoSettingsMutationState> {
    "use server";

    const user = await requireAuthenticatedUser(settingsUrl);
    const defaultBranch = String(formData.get("defaultBranch") ?? "");

    try {
      await fetchInternalApiJson<{ repo: RepoSummary }>(`/api/repos/${owner}/${repo}`, {
        user,
        method: "PATCH",
        body: {
          defaultBranch,
        },
      });

      await revalidatePath(buildRepoHomePath(owner, repo));
      await revalidatePath(buildRepoSettingsPath(owner, repo));
      return { success: "Default branch updated." };
    } catch (error) {
      return toErrorState(error, "Default branch could not be updated.");
    }
  }

  async function updateArchiveAction(_state: RepoSettingsMutationState, formData: FormData): Promise<RepoSettingsMutationState> {
    "use server";

    const user = await requireAuthenticatedUser(settingsUrl);
    const archived = String(formData.get("archived") ?? "").toLowerCase() === "true";

    try {
      await fetchInternalApiJson<{ repo: RepoSummary }>(`/api/repos/${owner}/${repo}`, {
        user,
        method: "PATCH",
        body: {
          archived,
        },
      });

      await revalidatePath(buildRepoHomePath(owner, repo));
      await revalidatePath(buildRepoSettingsPath(owner, repo));
      return { success: archived ? "Repository archived." : "Repository unarchived." };
    } catch (error) {
      return toErrorState(error, "Archive status could not be updated.");
    }
  }

  async function deleteRepositoryAction(_state: RepoSettingsMutationState, formData: FormData): Promise<RepoSettingsMutationState> {
    "use server";

    const user = await requireAuthenticatedUser(settingsUrl);
    const confirmationRaw = String(formData.get("confirmRepositoryName") ?? "").trim().toLowerCase();
    const confirmRepositoryName = confirmationRaw.includes("/") ? confirmationRaw.split("/").at(-1) ?? "" : confirmationRaw;

    try {
      await fetchInternalApiJson(`/api/repos/${owner}/${repo}`, {
        user,
        method: "DELETE",
        body: {
          confirmRepositoryName,
        },
      });
    } catch (error) {
      return toErrorState(error, "Repository could not be deleted.");
    }

    await revalidatePath(`/${owner}`);
    redirect(`/${owner}`);
  }

  return (
    <RepositoryShell repository={repository} branches={branchesPayload.branches} activeBranch={repository.defaultBranch} activeTab="settings">
      <section className="space-y-4">
        <div>
          <h1 className="text-3xl font-semibold text-[#e6edf3]">Repository settings</h1>
          <p className="mt-2 text-sm text-[#8b949e]">Manage configuration, visibility, defaults, and lifecycle controls for this repository.</p>
        </div>

        <RepositorySettingsPanels
          owner={owner}
          repository={{
            name: repository.name,
            description: repository.description,
            visibility: repository.visibility,
            defaultBranch: repository.defaultBranch,
            archived: repository.archived,
          }}
          branches={branchesPayload.branches}
          updateGeneralAction={updateGeneralAction}
          updateVisibilityAction={updateVisibilityAction}
          updateDefaultBranchAction={updateDefaultBranchAction}
          updateArchiveAction={updateArchiveAction}
          deleteRepositoryAction={deleteRepositoryAction}
        />
      </section>
    </RepositoryShell>
  );
}
