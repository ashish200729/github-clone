export interface RepoSummary {
  id: string;
  name: string;
  description: string | null;
  visibility: "public" | "private";
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

export interface RepoBranch {
  name: string;
  commitSha: string;
  isDefault: boolean;
}

export interface RepoCommit {
  sha: string;
  shortSha: string;
  message: string;
  authorName: string;
  authorEmail: string;
  authoredAt: string;
}

export interface RepoTreeEntry {
  name: string;
  path: string;
  type: "blob" | "tree";
  size: number | null;
}

export interface RepoBlob {
  path: string;
  size: number;
  encoding: "utf-8" | null;
  isBinary: boolean;
  isTruncated: boolean;
  content: string | null;
}

export interface RepoOverview {
  repo: RepoSummary;
  branch: string;
  branches: RepoBranch[];
  commits: RepoCommit[];
  tree: RepoTreeEntry[];
  readme: RepoBlob | null;
  isEmpty: boolean;
}
