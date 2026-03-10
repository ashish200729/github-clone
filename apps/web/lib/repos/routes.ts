export function buildRepoHomePath(owner: string, repo: string, branch?: string): string {
  const pathname = `/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`;

  if (!branch) {
    return pathname;
  }

  return `${pathname}?branch=${encodeURIComponent(branch)}`;
}

export function buildRepoTreePath(owner: string, repo: string, branch: string, path = ""): string {
  const prefix = `/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/tree`;
  const normalizedPath = path
    .split("/")
    .filter(Boolean)
    .map((segment) => encodeURIComponent(segment))
    .join("/");

  const pathname = normalizedPath ? `${prefix}/${normalizedPath}` : prefix;
  return `${pathname}?branch=${encodeURIComponent(branch)}`;
}

export function buildRepoBlobPath(owner: string, repo: string, branch: string, path: string): string {
  const normalizedPath = path
    .split("/")
    .filter(Boolean)
    .map((segment) => encodeURIComponent(segment))
    .join("/");

  return `/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/blob/${normalizedPath}?branch=${encodeURIComponent(branch)}`;
}

export function buildRepoCommitsPath(owner: string, repo: string, branch?: string): string {
  const pathname = `/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/commits`;

  if (!branch) {
    return pathname;
  }

  return `${pathname}?branch=${encodeURIComponent(branch)}`;
}

export function buildRepoNewFilePath(owner: string, repo: string, branch: string): string {
  return `/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/new/${encodeURIComponent(branch)}`;
}

export function buildRepoUploadPath(owner: string, repo: string, branch: string): string {
  return `/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/upload/${encodeURIComponent(branch)}`;
}

export function buildRepoSettingsPath(owner: string, repo: string): string {
  return `/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/settings`;
}
