import { Buffer } from "node:buffer";
import { ApiError } from "../http/errors.js";

export const DEFAULT_REPOSITORY_BRANCH = "main";
export const MAX_REPOSITORY_NAME_LENGTH = 39;
export const MAX_DESCRIPTION_LENGTH = 280;
export const MAX_COMMIT_MESSAGE_LENGTH = 200;
export const MAX_CREATE_FILE_BYTES = 256 * 1024;
export const MAX_UPLOAD_FILE_BYTES = 2 * 1024 * 1024;
export const MAX_UPLOAD_TOTAL_BYTES = 8 * 1024 * 1024;
export const MAX_UPLOAD_FILES = 25;

const REPOSITORY_NAME_PATTERN = /^[a-z0-9](?:[a-z0-9-]{0,37}[a-z0-9])?$/;
const BRANCH_INVALID_SEQUENCE_PATTERNS = [/\/\//, /\.\./, /@\{/, /\\/, /[\x00-\x20\x7f]/];
const RESERVED_PATH_SEGMENTS = new Set([".", ".."]);
const BASE64_CONTENT_PATTERN = /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/;

export type RepositoryVisibility = "public" | "private";

export interface RepositoryCreateInput {
  name: string;
  description: string | null;
  visibility: RepositoryVisibility;
  initializeWithReadme: boolean;
}

export interface RepositoryUpdateInput {
  name?: string;
  description?: string | null;
  visibility?: RepositoryVisibility;
  defaultBranch?: string;
  archived?: boolean;
}

export interface CommitFileInput {
  path: string;
  contentBase64: string;
  sizeBytes: number;
}

function normalizeWhitespace(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasOwn(record: Record<string, unknown>, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(record, key);
}

export function validateRepositoryName(value: unknown): string {
  const name = typeof value === "string" ? value.trim().toLowerCase() : "";

  if (!name) {
    throw new ApiError(400, "INVALID_REPOSITORY_NAME", "Repository name is required.", {
      fields: {
        name: "Repository name is required.",
      },
    });
  }

  if (name.length > MAX_REPOSITORY_NAME_LENGTH || !REPOSITORY_NAME_PATTERN.test(name)) {
    throw new ApiError(400, "INVALID_REPOSITORY_NAME", "Repository names must use lowercase letters, numbers, and hyphens.", {
      fields: {
        name: "Use lowercase letters, numbers, and hyphens only.",
      },
    });
  }

  return name;
}

export function validateRepositoryDescription(value: unknown): string | null {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  if (typeof value !== "string") {
    throw new ApiError(400, "INVALID_REPOSITORY_DESCRIPTION", "Repository description must be a string.", {
      fields: {
        description: "Repository description must be text.",
      },
    });
  }

  const description = normalizeWhitespace(value);

  if (description.length > MAX_DESCRIPTION_LENGTH) {
    throw new ApiError(400, "INVALID_REPOSITORY_DESCRIPTION", `Repository description must be ${MAX_DESCRIPTION_LENGTH} characters or fewer.`, {
      fields: {
        description: `Use ${MAX_DESCRIPTION_LENGTH} characters or fewer.`,
      },
    });
  }

  return description || null;
}

export function validateRepositoryVisibility(value: unknown): RepositoryVisibility {
  if (value === "public" || value === "private") {
    return value;
  }

  throw new ApiError(400, "INVALID_REPOSITORY_VISIBILITY", "Repository visibility must be public or private.", {
    fields: {
      visibility: "Choose public or private.",
    },
  });
}

export function validateInitializeWithReadme(value: unknown): boolean {
  return value === true;
}

export function parseRepositoryCreateInput(body: unknown): RepositoryCreateInput {
  const record = isRecord(body) ? body : {};

  return {
    name: validateRepositoryName(record.name),
    description: validateRepositoryDescription(record.description),
    visibility: validateRepositoryVisibility(record.visibility),
    initializeWithReadme: validateInitializeWithReadme(record.initializeWithReadme),
  };
}

export function parseRepositoryUpdateInput(body: unknown): RepositoryUpdateInput {
  const record = isRecord(body) ? body : {};
  const updateInput: RepositoryUpdateInput = {};

  if (hasOwn(record, "name")) {
    updateInput.name = validateRepositoryName(record.name);
  }

  if (hasOwn(record, "description")) {
    updateInput.description = validateRepositoryDescription(record.description);
  }

  if (hasOwn(record, "visibility")) {
    updateInput.visibility = validateRepositoryVisibility(record.visibility);
  }

  if (hasOwn(record, "defaultBranch")) {
    updateInput.defaultBranch = validateBranchName(record.defaultBranch);
  }

  if (hasOwn(record, "archived")) {
    if (typeof record.archived !== "boolean") {
      throw new ApiError(400, "INVALID_REPOSITORY_ARCHIVED", "Repository archived state must be a boolean.", {
        fields: {
          archived: "Archived state must be true or false.",
        },
      });
    }

    updateInput.archived = record.archived;
  }

  if (Object.keys(updateInput).length === 0) {
    throw new ApiError(400, "INVALID_REPOSITORY_UPDATE", "Provide at least one repository setting to update.");
  }

  return updateInput;
}

export function parseRepositoryDeleteInput(body: unknown): { confirmRepositoryName: string } {
  const record = isRecord(body) ? body : {};
  const confirmRepositoryName = typeof record.confirmRepositoryName === "string" ? record.confirmRepositoryName.trim().toLowerCase() : "";

  if (!confirmRepositoryName) {
    throw new ApiError(400, "INVALID_DELETE_CONFIRMATION", "Repository confirmation name is required.", {
      fields: {
        confirmRepositoryName: "Type the repository name to confirm deletion.",
      },
    });
  }

  return { confirmRepositoryName };
}

export function validateBranchName(value: unknown): string {
  const branchName = typeof value === "string" ? value.trim() : "";

  if (!branchName) {
    throw new ApiError(400, "INVALID_BRANCH", "A branch name is required.", {
      fields: {
        branch: "Branch name is required.",
      },
    });
  }

  if (
    branchName.length > 255 ||
    branchName.startsWith("/") ||
    branchName.endsWith("/") ||
    branchName.endsWith(".") ||
    branchName.endsWith(".lock")
  ) {
    throw new ApiError(400, "INVALID_BRANCH", "The branch name is not valid.");
  }

  for (const pattern of BRANCH_INVALID_SEQUENCE_PATTERNS) {
    if (pattern.test(branchName)) {
      throw new ApiError(400, "INVALID_BRANCH", "The branch name is not valid.");
    }
  }

  return branchName;
}

export function normalizeRepositoryPath(value: unknown, field = "path"): string {
  if (value === undefined || value === null || value === "") {
    return "";
  }

  if (typeof value !== "string") {
    throw new ApiError(400, "INVALID_PATH", "Repository paths must be strings.", {
      fields: {
        [field]: "Path must be text.",
      },
    });
  }

  const normalizedValue = value.trim().replaceAll("\\", "/");

  if (!normalizedValue) {
    return "";
  }

  if (normalizedValue.startsWith("/") || normalizedValue.includes("\u0000") || normalizedValue.includes("//")) {
    throw new ApiError(400, "INVALID_PATH", "Repository paths must stay inside the repository root.", {
      fields: {
        [field]: "Path must stay inside the repository.",
      },
    });
  }

  const segments = normalizedValue.split("/");

  for (const segment of segments) {
    if (!segment || RESERVED_PATH_SEGMENTS.has(segment)) {
      throw new ApiError(400, "INVALID_PATH", "Repository paths must stay inside the repository root.", {
        fields: {
          [field]: "Path must stay inside the repository.",
        },
      });
    }
  }

  return segments.join("/");
}

export function validateCommitMessage(value: unknown, fallback: string): string {
  const normalized = typeof value === "string" ? normalizeWhitespace(value) : "";
  const commitMessage = normalized || fallback;

  if (!commitMessage) {
    throw new ApiError(400, "INVALID_COMMIT_MESSAGE", "A commit message is required.", {
      fields: {
        commitMessage: "Commit message is required.",
      },
    });
  }

  if (commitMessage.length > MAX_COMMIT_MESSAGE_LENGTH) {
    throw new ApiError(400, "INVALID_COMMIT_MESSAGE", `Commit messages must be ${MAX_COMMIT_MESSAGE_LENGTH} characters or fewer.`, {
      fields: {
        commitMessage: `Use ${MAX_COMMIT_MESSAGE_LENGTH} characters or fewer.`,
      },
    });
  }

  return commitMessage;
}

export function parseFileContent(value: unknown): string {
  if (typeof value !== "string") {
    throw new ApiError(400, "INVALID_FILE_CONTENT", "File content must be a string.", {
      fields: {
        content: "File content must be text.",
      },
    });
  }

  return value;
}

export function parseCreateFileInput(body: unknown): {
  branch: string;
  filePath: string;
  content: string;
  commitMessage: string;
} {
  const record = isRecord(body) ? body : {};
  const filePath = normalizeRepositoryPath(record.filePath, "filePath");

  if (!filePath) {
    throw new ApiError(400, "INVALID_PATH", "A file path is required.", {
      fields: {
        filePath: "File path is required.",
      },
    });
  }

  return {
    branch: validateBranchName(record.branch),
    filePath,
    content: parseFileContent(record.content),
    commitMessage: validateCommitMessage(record.commitMessage, `Create ${filePath}`),
  };
}

function parseBase64Content(value: unknown, path: string): { contentBase64: string; decodedSizeBytes: number } {
  if (typeof value !== "string" || value.length === 0) {
    throw new ApiError(400, "INVALID_UPLOAD_CONTENT", `Uploaded file "${path}" is missing content.`);
  }

  if (!BASE64_CONTENT_PATTERN.test(value)) {
    throw new ApiError(400, "INVALID_UPLOAD_CONTENT", `Uploaded file "${path}" must use valid base64 content.`);
  }

  return {
    contentBase64: value,
    decodedSizeBytes: Buffer.from(value, "base64").byteLength,
  };
}

function parseUploadFiles(value: unknown): CommitFileInput[] {
  if (!Array.isArray(value) || value.length === 0) {
    throw new ApiError(400, "INVALID_UPLOAD", "Upload requests must include at least one file.", {
      fields: {
        files: "Select at least one file to upload.",
      },
    });
  }

  if (value.length > MAX_UPLOAD_FILES) {
    throw new ApiError(400, "INVALID_UPLOAD", `Upload requests may include at most ${MAX_UPLOAD_FILES} files.`, {
      fields: {
        files: `Use ${MAX_UPLOAD_FILES} files or fewer per upload.`,
      },
    });
  }

  const seenPaths = new Set<string>();
  let totalBytes = 0;

  return value.map((entry, index) => {
    if (!isRecord(entry)) {
      throw new ApiError(400, "INVALID_UPLOAD", `Upload item ${index + 1} is not valid.`);
    }

    const path = normalizeRepositoryPath(entry.path, `files.${index}.path`);

    if (!path) {
      throw new ApiError(400, "INVALID_UPLOAD", "Uploaded files must include a path.");
    }

    if (seenPaths.has(path)) {
      throw new ApiError(400, "INVALID_UPLOAD", `Upload contains duplicate path "${path}".`, {
        fields: {
          files: `Remove the duplicate file path "${path}".`,
        },
      });
    }

    const declaredSizeBytes = typeof entry.sizeBytes === "number" && Number.isInteger(entry.sizeBytes) ? entry.sizeBytes : -1;
    const { contentBase64, decodedSizeBytes } = parseBase64Content(entry.contentBase64, path);

    if (declaredSizeBytes < 0) {
      throw new ApiError(400, "INVALID_UPLOAD", `Uploaded file "${path}" must include a valid byte size.`, {
        fields: {
          files: "Each upload must include a valid file size.",
        },
      });
    }

    if (declaredSizeBytes !== decodedSizeBytes) {
      throw new ApiError(400, "INVALID_UPLOAD", `Uploaded file "${path}" size does not match its content.`, {
        fields: {
          files: "Each uploaded file size must match the attached content.",
        },
      });
    }

    if (decodedSizeBytes > MAX_UPLOAD_FILE_BYTES) {
      throw new ApiError(400, "INVALID_UPLOAD", `Uploaded file "${path}" exceeds the ${MAX_UPLOAD_FILE_BYTES} byte limit.`, {
        fields: {
          files: `Each file must be ${MAX_UPLOAD_FILE_BYTES} bytes or smaller.`,
        },
      });
    }

    totalBytes += decodedSizeBytes;

    if (totalBytes > MAX_UPLOAD_TOTAL_BYTES) {
      throw new ApiError(400, "INVALID_UPLOAD", `Uploads must stay under ${MAX_UPLOAD_TOTAL_BYTES} bytes in total.`, {
        fields: {
          files: `Total upload size must stay under ${MAX_UPLOAD_TOTAL_BYTES} bytes.`,
        },
      });
    }

    seenPaths.add(path);

    return {
      path,
      sizeBytes: decodedSizeBytes,
      contentBase64,
    };
  });
}

export function parseUploadInput(body: unknown): {
  branch: string;
  path: string;
  files: CommitFileInput[];
  commitMessage: string;
} {
  const record = isRecord(body) ? body : {};
  const parentPath = normalizeRepositoryPath(record.path, "path");
  const files = parseUploadFiles(record.files).map((file) => ({
    ...file,
    path: parentPath ? `${parentPath}/${file.path}` : file.path,
  }));

  return {
    branch: validateBranchName(record.branch),
    path: parentPath,
    files,
    commitMessage: validateCommitMessage(record.commitMessage, `Upload ${files.length} file${files.length === 1 ? "" : "s"}`),
  };
}

export function buildInitialReadme(name: string, description: string | null): string {
  const lines = [`# ${name}`];

  if (description) {
    lines.push("", description);
  }

  return `${lines.join("\n")}\n`;
}
