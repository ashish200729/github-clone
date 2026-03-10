import type {
  RepositoryBlob,
  RepositoryBranch,
  RepositoryCommit,
  RepositoryRecord,
  RepositoryResponse,
  RepositoryTreeEntry,
} from "./types.js";
import { buildRedisKey, delKeys, delKeysByPattern, getJson, setJson } from "../redis/index.js";

const REPOSITORY_LIST_TTL_SECONDS = 15;
const REPOSITORY_RECORD_TTL_SECONDS = 30;
const REPOSITORY_BRANCHES_TTL_SECONDS = 15;
const REPOSITORY_COMMITS_TTL_SECONDS = 15;
const REPOSITORY_TREE_TTL_SECONDS = 15;
const REPOSITORY_BLOB_TTL_SECONDS = 30;
const REPOSITORY_OVERVIEW_TTL_SECONDS = 15;

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

async function safeGetJson<T>(key: string): Promise<T | null> {
  try {
    return await getJson<T>(key);
  } catch (error) {
    console.warn(`[repo-cache] Failed to read key "${key}" from Redis.`, { message: getErrorMessage(error) });
    return null;
  }
}

async function safeSetJson(key: string, value: unknown, ttlSeconds: number): Promise<void> {
  try {
    await setJson(key, value, ttlSeconds);
  } catch (error) {
    console.warn(`[repo-cache] Failed to write key "${key}" to Redis.`, { message: getErrorMessage(error) });
  }
}

export function buildRepositoryListCacheKey(ownerId: string): string {
  return buildRedisKey("repos", "list", "owner", ownerId);
}

export function buildRepositoryOwnerHandleListCacheKey(ownerHandle: string, viewerScope: string): string {
  return buildRedisKey("repos", "list", "handle", ownerHandle, viewerScope);
}

export function buildRepositoryRecordCacheKey(ownerHandle: string, repositoryName: string): string {
  return buildRedisKey("repos", "record", ownerHandle, repositoryName);
}

export function buildRepositoryBranchesCacheKey(storageKey: string): string {
  return buildRedisKey("repos", "branches", storageKey);
}

export function buildRepositoryCommitsCacheKey(storageKey: string, branch: string): string {
  return buildRedisKey("repos", "commits", storageKey, branch);
}

export function buildRepositoryTreeCacheKey(storageKey: string, branch: string, path: string): string {
  return buildRedisKey("repos", "tree", storageKey, branch, path || "_root");
}

export function buildRepositoryBlobCacheKey(storageKey: string, branch: string, path: string): string {
  return buildRedisKey("repos", "blob", storageKey, branch, path);
}

export function buildRepositoryOverviewCacheKey(storageKey: string, branch: string): string {
  return buildRedisKey("repos", "overview", storageKey, branch);
}

export async function getCachedRepositoryList(key: string): Promise<RepositoryResponse[] | null> {
  return await safeGetJson<RepositoryResponse[]>(key);
}

export async function setCachedRepositoryList(key: string, value: RepositoryResponse[]): Promise<void> {
  await safeSetJson(key, value, REPOSITORY_LIST_TTL_SECONDS);
}

export async function getCachedRepositoryRecord(key: string): Promise<RepositoryRecord | null> {
  return await safeGetJson<RepositoryRecord>(key);
}

export async function setCachedRepositoryRecord(key: string, value: RepositoryRecord): Promise<void> {
  await safeSetJson(key, value, REPOSITORY_RECORD_TTL_SECONDS);
}

export async function getCachedBranches(key: string): Promise<RepositoryBranch[] | null> {
  return await safeGetJson<RepositoryBranch[]>(key);
}

export async function setCachedBranches(key: string, value: RepositoryBranch[]): Promise<void> {
  await safeSetJson(key, value, REPOSITORY_BRANCHES_TTL_SECONDS);
}

export async function getCachedCommits(key: string): Promise<RepositoryCommit[] | null> {
  return await safeGetJson<RepositoryCommit[]>(key);
}

export async function setCachedCommits(key: string, value: RepositoryCommit[]): Promise<void> {
  await safeSetJson(key, value, REPOSITORY_COMMITS_TTL_SECONDS);
}

export async function getCachedTree(key: string): Promise<RepositoryTreeEntry[] | null> {
  return await safeGetJson<RepositoryTreeEntry[]>(key);
}

export async function setCachedTree(key: string, value: RepositoryTreeEntry[]): Promise<void> {
  await safeSetJson(key, value, REPOSITORY_TREE_TTL_SECONDS);
}

export async function getCachedBlob(key: string): Promise<RepositoryBlob | null> {
  return await safeGetJson<RepositoryBlob>(key);
}

export async function setCachedBlob(key: string, value: RepositoryBlob): Promise<void> {
  await safeSetJson(key, value, REPOSITORY_BLOB_TTL_SECONDS);
}

export async function getCachedOverview<T>(key: string): Promise<T | null> {
  return await safeGetJson<T>(key);
}

export async function setCachedOverview<T>(key: string, value: T): Promise<void> {
  await safeSetJson(key, value, REPOSITORY_OVERVIEW_TTL_SECONDS);
}

export async function invalidateRepositoryCaches(repository: Pick<RepositoryRecord, "ownerId" | "ownerHandle" | "name" | "storageKey">): Promise<void> {
  const exactKeys = [
    buildRepositoryListCacheKey(repository.ownerId),
    buildRepositoryOwnerHandleListCacheKey(repository.ownerHandle, "public"),
    buildRepositoryOwnerHandleListCacheKey(repository.ownerHandle, `viewer:${repository.ownerId}`),
    buildRepositoryRecordCacheKey(repository.ownerHandle, repository.name),
  ];

  try {
    await delKeys(exactKeys);
  } catch (error) {
    console.warn("[repo-cache] Failed to delete exact repository cache keys.", { message: getErrorMessage(error) });
  }

  const patterns = [
    `${buildRedisKey("repos", "branches", repository.storageKey)}*`,
    `${buildRedisKey("repos", "commits", repository.storageKey)}*`,
    `${buildRedisKey("repos", "tree", repository.storageKey)}*`,
    `${buildRedisKey("repos", "blob", repository.storageKey)}*`,
    `${buildRedisKey("repos", "overview", repository.storageKey)}*`,
  ];

  for (const pattern of patterns) {
    try {
      await delKeysByPattern(pattern);
    } catch (error) {
      console.warn(`[repo-cache] Failed to delete repository cache pattern "${pattern}".`, {
        message: getErrorMessage(error),
      });
    }
  }
}
