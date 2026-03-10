export interface RepositorySyncJobPayload {
  repoId: string;
  ownerId: string;
  ownerHandle: string;
  repoName: string;
  storageKey: string;
  correlationId: string;
  trigger: "repo-created" | "repo-created-with-readme" | "file-created" | "upload-created";
}
