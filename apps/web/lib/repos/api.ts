import type { AuthenticatedAppUser } from "@/lib/auth/protection";
import { fetchInternalApiJson } from "@/lib/auth/internal-api";
import type { RepoBlob, RepoBranch, RepoCommit, RepoOverview, RepoSummary, RepoTreeEntry } from "@/lib/repos/types";

export async function fetchRepository(
  owner: string,
  repo: string,
  user?: AuthenticatedAppUser | null,
): Promise<RepoSummary> {
  const payload = await fetchInternalApiJson<{ repo: RepoSummary }>(`/api/repos/${owner}/${repo}`, {
    user: user ?? undefined,
  });

  return payload.repo;
}

export async function fetchRepositoryOverview(
  owner: string,
  repo: string,
  branch: string | undefined,
  user?: AuthenticatedAppUser | null,
): Promise<RepoOverview> {
  return await fetchInternalApiJson(`/api/repos/${owner}/${repo}/overview`, {
    user: user ?? undefined,
    searchParams: {
      branch,
    },
  });
}

export async function fetchRepositoryList(user: AuthenticatedAppUser): Promise<RepoSummary[]> {
  const payload = await fetchInternalApiJson<{ repositories: RepoSummary[] }>("/api/repos", {
    user,
    searchParams: {
      owner: "me",
    },
  });

  return payload.repositories;
}

export async function fetchRepositoryBranches(
  owner: string,
  repo: string,
  user?: AuthenticatedAppUser | null,
): Promise<{ defaultBranch: string; branches: RepoBranch[]; isEmpty: boolean }> {
  return await fetchInternalApiJson(`/api/repos/${owner}/${repo}/branches`, {
    user: user ?? undefined,
  });
}

export async function fetchRepositoryCommits(
  owner: string,
  repo: string,
  branch: string | undefined,
  user?: AuthenticatedAppUser | null,
): Promise<{ branch: string; commits: RepoCommit[]; isEmpty: boolean }> {
  return await fetchInternalApiJson(`/api/repos/${owner}/${repo}/commits`, {
    user: user ?? undefined,
    searchParams: {
      branch,
    },
  });
}

export async function fetchRepositoryTree(
  owner: string,
  repo: string,
  branch: string | undefined,
  path: string,
  user?: AuthenticatedAppUser | null,
): Promise<{ branch: string; path: string; entries: RepoTreeEntry[]; isEmpty: boolean }> {
  return await fetchInternalApiJson(`/api/repos/${owner}/${repo}/tree`, {
    user: user ?? undefined,
    searchParams: {
      branch,
      path,
    },
  });
}

export async function fetchRepositoryBlob(
  owner: string,
  repo: string,
  branch: string | undefined,
  path: string,
  user?: AuthenticatedAppUser | null,
): Promise<{ branch: string; blob: RepoBlob }> {
  return await fetchInternalApiJson(`/api/repos/${owner}/${repo}/blob`, {
    user: user ?? undefined,
    searchParams: {
      branch,
      path,
    },
  });
}
