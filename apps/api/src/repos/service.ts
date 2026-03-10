import type { Pool } from "pg";
import type { AuthenticatedInternalActor } from "../auth/index.js";
import {
  getRepositoryArchive,
  commitRepositoryFiles,
  createBareRepository,
  deleteBareRepository,
  getRepositoryBlob,
  getRepositoryBranches,
  getRepositoryCommits,
  getRepositoryTree,
  initializeRepositoryWithReadme,
} from "../git-service/client.js";
import { buildGitCloneUrl, loadGitServiceConfig } from "../git-service/config.js";
import { ApiError } from "../http/errors.js";
import { publishRepositoryLiveEvent } from "../live/events.js";
import { enqueueRepositorySyncJob } from "../queue/repository-queue.js";
import {
  buildRepositoryBlobCacheKey,
  buildRepositoryBranchesCacheKey,
  buildRepositoryCommitsCacheKey,
  buildRepositoryListCacheKey,
  buildRepositoryOverviewCacheKey,
  buildRepositoryOwnerHandleListCacheKey,
  buildRepositoryRecordCacheKey,
  buildRepositoryTreeCacheKey,
  getCachedBlob,
  getCachedBranches,
  getCachedCommits,
  getCachedOverview,
  getCachedRepositoryList,
  getCachedRepositoryRecord,
  getCachedTree,
  invalidateRepositoryCaches,
  setCachedBlob,
  setCachedBranches,
  setCachedCommits,
  setCachedOverview,
  setCachedRepositoryList,
  setCachedRepositoryRecord,
  setCachedTree,
} from "./cache.js";
import {
  createRepositoryRecord,
  deleteRepositoryRecord,
  findRepositoryById,
  findRepositoryByOwnerAndName,
  listRepositoriesForOwner,
  listRepositoriesForOwnerHandle,
  markRepositoryInitialized,
  updateRepositoryRecord,
} from "./store.js";
import { buildGitTransportToken } from "./transport-token.js";
import type {
  RepositoryBlob,
  RepositoryBranch,
  RepositoryCommit,
  RepositoryOverview,
  RepositoryRecord,
  RepositoryResponse,
  RepositoryTreeEntry,
} from "./types.js";
import {
  buildInitialReadme,
  DEFAULT_REPOSITORY_BRANCH,
  type CommitFileInput,
  type RepositoryCreateInput,
  type RepositoryUpdateInput,
} from "./validation.js";

export interface RepositoryViewer {
  userId?: string;
}

function buildCloneUrl(repository: RepositoryRecord): string {
  const config = loadGitServiceConfig();
  return buildGitCloneUrl(repository.ownerHandle, repository.name, config);
}

function toRepositoryResponse(repository: RepositoryRecord, viewer?: RepositoryViewer): RepositoryResponse {
  const isOwner = viewer?.userId === repository.ownerId;

  return {
    id: repository.id,
    name: repository.name,
    description: repository.description,
    visibility: repository.visibility,
    defaultBranch: repository.defaultBranch,
    isEmpty: repository.isEmpty,
    archived: repository.archived,
    initializedAt: repository.initializedAt,
    lastPushedAt: repository.lastPushedAt,
    createdAt: repository.createdAt,
    updatedAt: repository.updatedAt,
    owner: {
      id: repository.ownerId,
      handle: repository.ownerHandle,
      name: repository.ownerName,
      image: repository.ownerImage,
    },
    permissions: {
      canWrite: isOwner,
      canAdmin: isOwner,
    },
    urls: {
      html: `/${repository.ownerHandle}/${repository.name}`,
      clone: buildCloneUrl(repository),
    },
  };
}

async function getRepositoryRecord(pool: Pool, ownerHandle: string, repositoryName: string): Promise<RepositoryRecord> {
  const cacheKey = buildRepositoryRecordCacheKey(ownerHandle, repositoryName);
  const cachedRepository = await getCachedRepositoryRecord(cacheKey);

  if (cachedRepository) {
    return cachedRepository;
  }

  const repository = await findRepositoryByOwnerAndName(pool, ownerHandle, repositoryName);
  await setCachedRepositoryRecord(cacheKey, repository);
  return repository;
}

async function getAccessibleRepositoryCached(
  pool: Pool,
  ownerHandle: string,
  repositoryName: string,
  viewer?: RepositoryViewer,
): Promise<RepositoryRecord> {
  const repository = await getRepositoryRecord(pool, ownerHandle, repositoryName);

  if (repository.visibility === "private" && repository.ownerId !== viewer?.userId) {
    throw new ApiError(403, "REPOSITORY_FORBIDDEN", "You do not have access to this repository.");
  }

  return repository;
}

async function getCachedBranchesForRepository(repository: RepositoryRecord): Promise<RepositoryBranch[]> {
  const cacheKey = buildRepositoryBranchesCacheKey(repository.storageKey);
  const cachedBranches = await getCachedBranches(cacheKey);

  if (cachedBranches) {
    return cachedBranches;
  }

  const branchPayload = await getRepositoryBranches(repository.storageKey);
  const branches = branchPayload.branches.map((branch) => ({
    name: branch.name,
    commitSha: branch.commitSha,
    isDefault: branch.name === repository.defaultBranch,
  }));

  await setCachedBranches(cacheKey, branches);
  return branches;
}

async function getCachedCommitsForRepository(repository: RepositoryRecord, branch: string): Promise<RepositoryCommit[]> {
  const cacheKey = buildRepositoryCommitsCacheKey(repository.storageKey, branch);
  const cachedCommits = await getCachedCommits(cacheKey);

  if (cachedCommits) {
    return cachedCommits;
  }

  const commitPayload = await getRepositoryCommits(repository.storageKey, branch);
  const commits = commitPayload.commits.map((commit) => ({
    sha: commit.sha,
    shortSha: commit.shortSha,
    message: commit.body ? `${commit.subject}\n\n${commit.body}` : commit.subject,
    authorName: commit.authorName,
    authorEmail: commit.authorEmail,
    authoredAt: commit.occurredAt,
  }));

  await setCachedCommits(cacheKey, commits);
  return commits;
}

async function getCachedTreeForRepository(
  repository: RepositoryRecord,
  branch: string,
  path: string,
): Promise<RepositoryTreeEntry[]> {
  const cacheKey = buildRepositoryTreeCacheKey(repository.storageKey, branch, path);
  const cachedTree = await getCachedTree(cacheKey);

  if (cachedTree) {
    return cachedTree;
  }

  const treePayload = await getRepositoryTree(repository.storageKey, branch, path);
  const tree = treePayload.tree.map((entry) => ({
    name: entry.name,
    path: entry.path,
    type: entry.type,
    size: entry.size ?? null,
  }));

  await setCachedTree(cacheKey, tree);
  return tree;
}

async function getCachedBlobForRepository(
  repository: RepositoryRecord,
  branch: string,
  path: string,
): Promise<RepositoryBlob> {
  const cacheKey = buildRepositoryBlobCacheKey(repository.storageKey, branch, path);
  const cachedBlob = await getCachedBlob(cacheKey);

  if (cachedBlob) {
    return cachedBlob;
  }

  const blobPayload = await getRepositoryBlob(repository.storageKey, branch, path);
  const blob = {
    path: blobPayload.blob.path,
    size: blobPayload.blob.size,
    encoding: "utf-8" as const,
    isBinary: false,
    isTruncated: false,
    content: blobPayload.blob.content,
  };

  await setCachedBlob(cacheKey, blob);
  return blob;
}

function requireOwner(repository: RepositoryRecord, actor: AuthenticatedInternalActor | undefined): void {
  if (!actor) {
    throw new ApiError(401, "UNAUTHORIZED", "Authentication is required for this repository action.");
  }

  if (repository.ownerId !== actor.userId) {
    throw new ApiError(403, "FORBIDDEN", "Only the repository owner may perform this action.");
  }
}

function getCommitAuthor(repository: RepositoryRecord, actor: AuthenticatedInternalActor): { name: string; email: string } {
  return {
    name: repository.ownerName ?? repository.ownerHandle,
    email: actor.email ?? repository.ownerEmail ?? `${repository.ownerHandle}@users.noreply.github-clone.local`,
  };
}

async function enqueueRepositorySync(
  repository: RepositoryRecord,
  correlationId: string,
  trigger: "repo-created" | "repo-created-with-readme" | "file-created" | "upload-created",
): Promise<void> {
  try {
    const jobId = await enqueueRepositorySyncJob({
      repoId: repository.id,
      ownerId: repository.ownerId,
      ownerHandle: repository.ownerHandle,
      repoName: repository.name,
      storageKey: repository.storageKey,
      correlationId,
      trigger,
    });

    await publishRepositoryLiveEvent({
      version: 1,
      eventType: "repository.sync.queued",
      entityType: "repository",
      entityId: repository.id,
      owner: repository.ownerHandle,
      repo: repository.name,
      userId: repository.ownerId,
      jobId,
      correlationId,
      status: "queued",
      timestamp: new Date().toISOString(),
      message: "Repository synchronization has been queued.",
    });
  } catch (error) {
    console.warn("[queue] Failed to enqueue repository sync job.", {
      repoId: repository.id,
      correlationId,
      message: error instanceof Error ? error.message : String(error),
    });
  }
}

async function resolveBranch(repository: RepositoryRecord, requestedBranch?: string): Promise<{
  branch: string;
  branches: RepositoryBranch[];
  isEmpty: boolean;
}> {
  const branches = await getCachedBranchesForRepository(repository);

  if (branches.length === 0) {
    throw new ApiError(409, "EMPTY_REPOSITORY", "This repository does not have any branches yet.");
  }

  if (requestedBranch) {
    const matchedBranch = branches.find((branch) => branch.name === requestedBranch);

    if (!matchedBranch) {
      throw new ApiError(404, "BRANCH_NOT_FOUND", "The requested branch does not exist.");
    }

    return {
      branch: matchedBranch.name,
      branches,
      isEmpty: false,
    };
  }

  const preferredBranch =
    branches.find((branch) => branch.name === repository.defaultBranch) ??
    branches.find((branch) => branch.isDefault) ??
    branches[0];

  if (!preferredBranch) {
    throw new ApiError(409, "EMPTY_REPOSITORY", "This repository does not have any branches yet.");
  }

  return {
    branch: preferredBranch.name,
    branches,
    isEmpty: false,
  };
}

export async function createRepository(
  pool: Pool,
  actor: AuthenticatedInternalActor,
  input: RepositoryCreateInput,
  correlationId: string,
): Promise<RepositoryResponse> {
  const repository = await createRepositoryRecord(pool, actor.userId, input);

  try {
    await createBareRepository(repository.storageKey, DEFAULT_REPOSITORY_BRANCH);

    if (input.initializeWithReadme) {
      await initializeRepositoryWithReadme(
        repository.storageKey,
        DEFAULT_REPOSITORY_BRANCH,
        buildInitialReadme(repository.name, repository.description),
        getCommitAuthor(repository, actor),
        "Initial commit",
      );
      await markRepositoryInitialized(pool, repository.id, DEFAULT_REPOSITORY_BRANCH);
      await invalidateRepositoryCaches(repository);
      await enqueueRepositorySync(repository, correlationId, "repo-created-with-readme");

      return toRepositoryResponse(
        {
          ...repository,
          isEmpty: false,
          initializedAt: new Date().toISOString(),
          lastPushedAt: new Date().toISOString(),
        },
        { userId: actor.userId },
      );
    }

    await invalidateRepositoryCaches(repository);
    await enqueueRepositorySync(repository, correlationId, "repo-created");
    return toRepositoryResponse(repository, { userId: actor.userId });
  } catch (error) {
    try {
      await deleteBareRepository(repository.storageKey);
    } catch (cleanupError) {
      console.error("Failed to clean up bare repository after repository creation error.", cleanupError);
    }

    await deleteRepositoryRecord(pool, repository.id);
    throw error;
  }
}

export async function listRepositories(
  pool: Pool,
  ownerQuery: string | undefined,
  viewer?: RepositoryViewer,
): Promise<{ repositories: RepositoryResponse[] }> {
  const listCacheKey =
    !ownerQuery || ownerQuery === "me"
      ? viewer?.userId
        ? buildRepositoryListCacheKey(viewer.userId)
        : null
      : buildRepositoryOwnerHandleListCacheKey(ownerQuery, viewer?.userId ? `viewer:${viewer.userId}` : "public");

  if (listCacheKey) {
    const cachedRepositories = await getCachedRepositoryList(listCacheKey);

    if (cachedRepositories) {
      return {
        repositories: cachedRepositories,
      };
    }
  }

  let repositories: RepositoryRecord[];

  if (!ownerQuery || ownerQuery === "me") {
    if (!viewer?.userId) {
      throw new ApiError(401, "UNAUTHORIZED", "Authentication is required to list your repositories.");
    }

    repositories = await listRepositoriesForOwner(pool, viewer.userId);
  } else {
    repositories = await listRepositoriesForOwnerHandle(pool, ownerQuery, viewer?.userId);
  }

  const mappedRepositories = repositories.map((repository) => toRepositoryResponse(repository, viewer));

  if (listCacheKey) {
    await setCachedRepositoryList(listCacheKey, mappedRepositories);
  }

  return {
    repositories: mappedRepositories,
  };
}

export async function getRepository(
  pool: Pool,
  ownerHandle: string,
  repositoryName: string,
  viewer?: RepositoryViewer,
): Promise<RepositoryResponse> {
  const repository = await getAccessibleRepositoryCached(pool, ownerHandle, repositoryName, viewer);
  return toRepositoryResponse(repository, viewer);
}

export async function getRepositoryBranchesView(
  pool: Pool,
  ownerHandle: string,
  repositoryName: string,
  viewer?: RepositoryViewer,
): Promise<{ defaultBranch: string; branches: RepositoryBranch[]; isEmpty: boolean }> {
  const repository = await getAccessibleRepositoryCached(pool, ownerHandle, repositoryName, viewer);
  const branches = await getCachedBranchesForRepository(repository);

  return {
    defaultBranch: repository.defaultBranch,
    branches,
    isEmpty: branches.length === 0,
  };
}

export async function getRepositoryCommitsView(
  pool: Pool,
  ownerHandle: string,
  repositoryName: string,
  branch: string | undefined,
  viewer?: RepositoryViewer,
): Promise<{ branch: string; commits: RepositoryCommit[]; isEmpty: boolean }> {
  const repository = await getAccessibleRepositoryCached(pool, ownerHandle, repositoryName, viewer);

  if (repository.isEmpty) {
    return {
      branch: repository.defaultBranch,
      commits: [],
      isEmpty: true,
    };
  }

  if (branch) {
    const commits = await getCachedCommitsForRepository(repository, branch);

    return {
      branch,
      commits,
      isEmpty: false,
    };
  }

  const resolved = await resolveBranch(repository, branch);
  const commits = await getCachedCommitsForRepository(repository, resolved.branch);

  return {
    branch: resolved.branch,
    commits,
    isEmpty: false,
  };
}

export async function getRepositoryTreeView(
  pool: Pool,
  ownerHandle: string,
  repositoryName: string,
  branch: string | undefined,
  path: string,
  viewer?: RepositoryViewer,
): Promise<{ branch: string; path: string; entries: RepositoryTreeEntry[]; isEmpty: boolean }> {
  const repository = await getAccessibleRepositoryCached(pool, ownerHandle, repositoryName, viewer);

  if (repository.isEmpty) {
    return {
      branch: repository.defaultBranch,
      path,
      entries: [],
      isEmpty: true,
    };
  }

  if (branch) {
    const entries = await getCachedTreeForRepository(repository, branch, path);

    return {
      branch,
      path,
      entries,
      isEmpty: false,
    };
  }

  const resolved = await resolveBranch(repository, branch);
  const entries = await getCachedTreeForRepository(repository, resolved.branch, path);

  return {
    branch: resolved.branch,
    path,
    entries,
    isEmpty: false,
  };
}

export async function getRepositoryBlobView(
  pool: Pool,
  ownerHandle: string,
  repositoryName: string,
  branch: string | undefined,
  path: string,
  viewer?: RepositoryViewer,
): Promise<{ branch: string; blob: RepositoryBlob }> {
  const repository = await getAccessibleRepositoryCached(pool, ownerHandle, repositoryName, viewer);

  if (repository.isEmpty) {
    throw new ApiError(409, "EMPTY_REPOSITORY", "This repository does not have any files yet.");
  }

  if (branch) {
    return {
      branch,
      blob: await getCachedBlobForRepository(repository, branch, path),
    };
  }

  const resolved = await resolveBranch(repository, branch);

  return {
    branch: resolved.branch,
    blob: await getCachedBlobForRepository(repository, resolved.branch, path),
  };
}

export async function getRepositoryArchiveView(
  pool: Pool,
  ownerHandle: string,
  repositoryName: string,
  branch: string | undefined,
  viewer?: RepositoryViewer,
): Promise<{ branch: string; filename: string; archive: Buffer }> {
  const repository = await getAccessibleRepositoryCached(pool, ownerHandle, repositoryName, viewer);
  const resolved = await resolveBranch(repository, branch);

  return {
    branch: resolved.branch,
    filename: `${repository.name}-${resolved.branch}.zip`,
    archive: await getRepositoryArchive(repository.storageKey, resolved.branch),
  };
}

export async function createRepositoryFile(
  pool: Pool,
  actor: AuthenticatedInternalActor,
  ownerHandle: string,
  repositoryName: string,
  branch: string,
  filePath: string,
  contentBase64: string,
  commitMessage: string,
  correlationId: string,
): Promise<{ ok: true }> {
  const repository = await getAccessibleRepositoryCached(pool, ownerHandle, repositoryName, { userId: actor.userId });
  requireOwner(repository, actor);

  if (repository.archived) {
    throw new ApiError(409, "REPOSITORY_ARCHIVED", "This repository is archived and does not accept new commits.");
  }

  await commitRepositoryFiles(repository.storageKey, branch, getCommitAuthor(repository, actor), commitMessage, [
    {
      path: filePath,
      contentBase64,
    },
  ]);
  await markRepositoryInitialized(pool, repository.id, branch);
  await invalidateRepositoryCaches(repository);
  await enqueueRepositorySync(repository, correlationId, "file-created");

  return { ok: true };
}

export async function uploadRepositoryFiles(
  pool: Pool,
  actor: AuthenticatedInternalActor,
  ownerHandle: string,
  repositoryName: string,
  branch: string,
  files: CommitFileInput[],
  commitMessage: string,
  correlationId: string,
): Promise<{ ok: true }> {
  const repository = await getAccessibleRepositoryCached(pool, ownerHandle, repositoryName, { userId: actor.userId });
  requireOwner(repository, actor);

  if (repository.archived) {
    throw new ApiError(409, "REPOSITORY_ARCHIVED", "This repository is archived and does not accept new commits.");
  }

  await commitRepositoryFiles(repository.storageKey, branch, getCommitAuthor(repository, actor), commitMessage, files);
  await markRepositoryInitialized(pool, repository.id, branch);
  await invalidateRepositoryCaches(repository);
  await enqueueRepositorySync(repository, correlationId, "upload-created");

  return { ok: true };
}

export async function createRepositoryGitToken(
  pool: Pool,
  actor: AuthenticatedInternalActor,
  ownerHandle: string,
  repositoryName: string,
): Promise<{ username: string; token: string; expiresAt: string; cloneUrl: string }> {
  const repository = await getAccessibleRepositoryCached(pool, ownerHandle, repositoryName, { userId: actor.userId });
  requireOwner(repository, actor);
  const access = buildGitTransportToken({
    sub: actor.userId,
    owner: repository.ownerHandle,
    repo: repository.name,
    scope: ["read", "write"],
  });

  return {
    username: repository.ownerHandle,
    token: access.token,
    expiresAt: access.expiresAt,
    cloneUrl: buildCloneUrl(repository),
  };
}

export async function getRepositoryOverviewView(
  pool: Pool,
  ownerHandle: string,
  repositoryName: string,
  branch: string | undefined,
  viewer?: RepositoryViewer,
): Promise<RepositoryOverview> {
  const repository = await getAccessibleRepositoryCached(pool, ownerHandle, repositoryName, viewer);

  if (repository.isEmpty) {
    return {
      repo: toRepositoryResponse(repository, viewer),
      branch: repository.defaultBranch,
      branches: [],
      commits: [],
      tree: [],
      readme: null,
      isEmpty: true,
    };
  }

  const overviewBranch = branch ?? repository.defaultBranch;
  const overviewCacheKey = buildRepositoryOverviewCacheKey(repository.storageKey, overviewBranch);
  const cachedOverview = await getCachedOverview<RepositoryOverview>(overviewCacheKey);

  if (cachedOverview) {
    return {
      ...cachedOverview,
      repo: toRepositoryResponse(repository, viewer),
    };
  }

  const branches = await getCachedBranchesForRepository(repository);

  if (branches.length === 0) {
    return {
      repo: toRepositoryResponse(repository, viewer),
      branch: repository.defaultBranch,
      branches,
      commits: [],
      tree: [],
      readme: null,
      isEmpty: true,
    };
  }

  const activeBranch =
    branch ??
    branches.find((candidate) => candidate.name === repository.defaultBranch)?.name ??
    branches[0]?.name ??
    repository.defaultBranch;

  const [commits, tree] = await Promise.all([
    getCachedCommitsForRepository(repository, activeBranch),
    getCachedTreeForRepository(repository, activeBranch, ""),
  ]);

  const readmeEntry = tree.find((entry) => entry.type === "blob" && /^readme(?:\.[a-z0-9]+)?$/i.test(entry.name));
  const readme = readmeEntry ? await getCachedBlobForRepository(repository, activeBranch, readmeEntry.path).catch(() => null) : null;

  const overview = {
    repo: toRepositoryResponse(repository, viewer),
    branch: activeBranch,
    branches,
    commits,
    tree,
    readme,
    isEmpty: false,
  } satisfies RepositoryOverview;

  await setCachedOverview(overviewCacheKey, overview);
  return overview;
}

export async function updateRepositorySettings(
  pool: Pool,
  actor: AuthenticatedInternalActor,
  ownerHandle: string,
  repositoryName: string,
  input: RepositoryUpdateInput,
): Promise<RepositoryResponse> {
  const repository = await getAccessibleRepositoryCached(pool, ownerHandle, repositoryName, { userId: actor.userId });
  requireOwner(repository, actor);

  const nextName = input.name !== undefined ? input.name : repository.name;
  const nextDescription = input.description !== undefined ? input.description : repository.description;
  const nextVisibility = input.visibility !== undefined ? input.visibility : repository.visibility;
  const nextArchived = input.archived !== undefined ? input.archived : repository.archived;
  let nextDefaultBranch = input.defaultBranch ?? repository.defaultBranch;

  if (input.defaultBranch && !repository.isEmpty) {
    const branchPayload = await getRepositoryBranches(repository.storageKey);
    const branchExists = branchPayload.branches.some((branch) => branch.name === input.defaultBranch);

    if (!branchExists) {
      throw new ApiError(400, "INVALID_DEFAULT_BRANCH", "The selected default branch does not exist in this repository.", {
        fields: {
          defaultBranch: "Select a branch that already exists.",
        },
      });
    }
  }

  if (repository.isEmpty && input.defaultBranch) {
    nextDefaultBranch = input.defaultBranch;
  }

  const updatedRepository = await updateRepositoryRecord(pool, repository.id, {
    name: nextName,
    description: nextDescription,
    visibility: nextVisibility,
    defaultBranch: nextDefaultBranch,
    archived: nextArchived,
  });

  await invalidateRepositoryCaches(repository);
  await invalidateRepositoryCaches(updatedRepository);

  return toRepositoryResponse(updatedRepository, { userId: actor.userId });
}

export async function deleteRepository(
  pool: Pool,
  actor: AuthenticatedInternalActor,
  ownerHandle: string,
  repositoryName: string,
): Promise<{ ok: true }> {
  const repository = await getAccessibleRepositoryCached(pool, ownerHandle, repositoryName, { userId: actor.userId });
  requireOwner(repository, actor);

  try {
    await deleteBareRepository(repository.storageKey);
  } catch {
    throw new ApiError(502, "REPOSITORY_DELETE_FAILED", "The repository storage could not be removed. Please try again.");
  }

  await deleteRepositoryRecord(pool, repository.id);
  await invalidateRepositoryCaches(repository);

  return { ok: true };
}

export async function warmRepositoryReadModels(pool: Pool, repositoryId: string): Promise<RepositoryRecord> {
  const repository = await findRepositoryById(pool, repositoryId);
  await setCachedRepositoryRecord(buildRepositoryRecordCacheKey(repository.ownerHandle, repository.name), repository);

  if (repository.isEmpty) {
    return repository;
  }

  const branches = await getCachedBranchesForRepository(repository);

  if (branches.length === 0) {
    return repository;
  }

  const activeBranch =
    branches.find((branch) => branch.name === repository.defaultBranch)?.name ??
    branches[0]?.name ??
    repository.defaultBranch;

  const [tree, commits] = await Promise.all([
    getCachedTreeForRepository(repository, activeBranch, ""),
    getCachedCommitsForRepository(repository, activeBranch),
  ]);

  const readmeEntry = tree.find((entry) => entry.type === "blob" && /^readme(?:\.[a-z0-9]+)?$/i.test(entry.name));
  const readme = readmeEntry ? await getCachedBlobForRepository(repository, activeBranch, readmeEntry.path).catch(() => null) : null;

  await setCachedOverview(buildRepositoryOverviewCacheKey(repository.storageKey, activeBranch), {
    repo: toRepositoryResponse(repository, { userId: repository.ownerId }),
    branch: activeBranch,
    branches,
    commits,
    tree,
    readme,
    isEmpty: false,
  });

  return repository;
}
