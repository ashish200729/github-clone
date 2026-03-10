import { ApiError } from "../http/errors.js";
import type { RepositoryBlob, RepositoryBranch, RepositoryCommit, RepositoryTreeEntry } from "../repos/types.js";
import { loadGitServiceConfig } from "./config.js";

const INTERNAL_TOKEN_HEADER = "x-github-clone-git-service-token";

interface GitServiceErrorPayload {
  error?: {
    code?: string;
    message?: string;
    details?: Record<string, unknown>;
  };
}

export interface GitCommitAuthor {
  name: string;
  email: string;
}

export interface GitServiceBranchesResponse {
  branches: Array<{
    name: string;
    commitSha: string;
    committedAt: string;
    authorName: string;
    authorEmail: string;
    commitSubject: string;
  }>;
}

export interface GitServiceCommitsResponse {
  branch: string;
  commits: Array<{
    sha: string;
    shortSha: string;
    subject: string;
    body: string;
    authorName: string;
    authorEmail: string;
    occurredAt: string;
  }>;
}

export interface GitServiceTreeResponse {
  branch: string;
  path: string;
  tree: Array<{
    name: string;
    path: string;
    type: "blob" | "tree";
    sha: string;
    size?: number;
  }>;
}

export interface GitServiceBlobResponse {
  branch: string;
  blob: {
    path: string;
    sha: string;
    size: number;
    content: string;
  };
}

async function requestGitService<T>(path: string, init?: RequestInit): Promise<T> {
  const config = loadGitServiceConfig();
  const url = new URL(path, config.internalUrl);
  const response = await fetch(url, {
    ...init,
    headers: {
      Accept: "application/json",
      [INTERNAL_TOKEN_HEADER]: config.internalToken,
      ...(init?.headers ?? {}),
    },
  });

  if (!response.ok) {
    let payload: GitServiceErrorPayload | null = null;

    try {
      payload = (await response.json()) as GitServiceErrorPayload;
    } catch {
      payload = null;
    }

    throw new ApiError(
      response.status >= 500 ? 502 : response.status,
      payload?.error?.code ?? "GIT_SERVICE_ERROR",
      payload?.error?.message ?? `Git service request failed with status ${response.status}.`,
      payload?.error?.details,
    );
  }

  return (await response.json()) as T;
}

async function requestGitServiceBytes(path: string, init?: RequestInit): Promise<Buffer> {
  const config = loadGitServiceConfig();
  const url = new URL(path, config.internalUrl);
  const response = await fetch(url, {
    ...init,
    headers: {
      Accept: "application/zip, application/octet-stream, application/json",
      [INTERNAL_TOKEN_HEADER]: config.internalToken,
      ...(init?.headers ?? {}),
    },
  });

  if (!response.ok) {
    let payload: GitServiceErrorPayload | null = null;

    try {
      payload = (await response.json()) as GitServiceErrorPayload;
    } catch {
      payload = null;
    }

    throw new ApiError(
      response.status >= 500 ? 502 : response.status,
      payload?.error?.code ?? "GIT_SERVICE_ERROR",
      payload?.error?.message ?? `Git service request failed with status ${response.status}.`,
      payload?.error?.details,
    );
  }

  return Buffer.from(await response.arrayBuffer());
}

export async function createBareRepository(storageKey: string, defaultBranch: string): Promise<void> {
  await requestGitService<void>("/internal/repos", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      storageKey,
      defaultBranch,
    }),
  });
}

export async function deleteBareRepository(storageKey: string): Promise<void> {
  await requestGitService<void>(`/internal/repos/${encodeURIComponent(storageKey)}`, {
    method: "DELETE",
  });
}

export async function initializeRepositoryWithReadme(
  storageKey: string,
  defaultBranch: string,
  readmeContent: string,
  author: GitCommitAuthor,
  commitMessage: string,
): Promise<void> {
  await requestGitService<void>(`/internal/repos/${encodeURIComponent(storageKey)}/initialize-readme`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      defaultBranch,
      readmeContent,
      authorName: author.name,
      authorEmail: author.email,
      commitMessage,
    }),
  });
}

export async function getRepositoryBranches(storageKey: string): Promise<GitServiceBranchesResponse> {
  return await requestGitService<GitServiceBranchesResponse>(`/internal/repos/${encodeURIComponent(storageKey)}/branches`);
}

export async function getRepositoryCommits(storageKey: string, branch: string, limit = 25): Promise<GitServiceCommitsResponse> {
  const query = new URLSearchParams({
    branch,
    limit: String(limit),
  });

  return await requestGitService<GitServiceCommitsResponse>(
    `/internal/repos/${encodeURIComponent(storageKey)}/commits?${query.toString()}`,
  );
}

export async function getRepositoryTree(storageKey: string, branch: string, path: string): Promise<GitServiceTreeResponse> {
  const query = new URLSearchParams({
    branch,
    path,
  });

  return await requestGitService<GitServiceTreeResponse>(`/internal/repos/${encodeURIComponent(storageKey)}/tree?${query.toString()}`);
}

export async function getRepositoryBlob(storageKey: string, branch: string, path: string): Promise<GitServiceBlobResponse> {
  const query = new URLSearchParams({
    branch,
    path,
  });

  return await requestGitService<GitServiceBlobResponse>(`/internal/repos/${encodeURIComponent(storageKey)}/blob?${query.toString()}`);
}

export async function getRepositoryArchive(storageKey: string, branch: string): Promise<Buffer> {
  const query = new URLSearchParams({
    branch,
  });

  return await requestGitServiceBytes(`/internal/repos/${encodeURIComponent(storageKey)}/archive?${query.toString()}`);
}

export async function commitRepositoryFiles(
  storageKey: string,
  branch: string,
  author: GitCommitAuthor,
  commitMessage: string,
  files: Array<{ path: string; contentBase64: string }>,
): Promise<void> {
  await requestGitService<void>(`/internal/repos/${encodeURIComponent(storageKey)}/commit-files`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      branch,
      authorName: author.name,
      authorEmail: author.email,
      commitMessage,
      files,
    }),
  });
}
