import type { RepositoryVisibility } from "./validation.js";

export interface RepositoryRecord {
  id: string;
  ownerId: string;
  ownerHandle: string;
  ownerName: string | null;
  ownerEmail: string | null;
  ownerImage: string | null;
  name: string;
  description: string | null;
  visibility: RepositoryVisibility;
  defaultBranch: string;
  storageKey: string;
  isEmpty: boolean;
  archived: boolean;
  initializedAt: string | null;
  lastPushedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface RepositoryResponse {
  id: string;
  name: string;
  description: string | null;
  visibility: RepositoryVisibility;
  defaultBranch: string;
  isEmpty: boolean;
  archived: boolean;
  initializedAt: string | null;
  lastPushedAt: string | null;
  createdAt: string;
  updatedAt: string;
  owner: {
    id: string;
    handle: string;
    name: string | null;
    image: string | null;
  };
  permissions: {
    canWrite: boolean;
    canAdmin: boolean;
  };
  urls: {
    html: string;
    clone: string;
  };
}

export interface RepositoryBranch {
  name: string;
  commitSha: string;
  isDefault: boolean;
}

export interface RepositoryCommit {
  sha: string;
  shortSha: string;
  message: string;
  authorName: string;
  authorEmail: string;
  authoredAt: string;
}

export interface RepositoryTreeEntry {
  name: string;
  path: string;
  type: "blob" | "tree";
  size: number | null;
}

export interface RepositoryBlob {
  path: string;
  size: number;
  encoding: "utf-8" | null;
  isBinary: boolean;
  isTruncated: boolean;
  content: string | null;
}

export interface RepositoryOverview {
  repo: RepositoryResponse;
  branch: string;
  branches: RepositoryBranch[];
  commits: RepositoryCommit[];
  tree: RepositoryTreeEntry[];
  readme: RepositoryBlob | null;
  isEmpty: boolean;
}
