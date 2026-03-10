import { Buffer } from "node:buffer";
import { Router, type Request } from "express";
import {
  authenticateInternalRequest,
  optionallyAuthenticateInternalRequest,
  type AuthenticatedInternalActor,
} from "../auth/index.js";
import { getDatabasePool } from "../db/index.js";
import { ApiError } from "../http/errors.js";
import { RATE_LIMIT_POLICIES } from "../rate-limit/config.js";
import { createRateLimitMiddleware } from "../rate-limit/middleware.js";
import {
  createRepository,
  createRepositoryFile,
  deleteRepository,
  createRepositoryGitToken,
  getRepositoryArchiveView,
  getRepository,
  getRepositoryBlobView,
  getRepositoryBranchesView,
  getRepositoryCommitsView,
  getRepositoryOverviewView,
  getRepositoryTreeView,
  listRepositories,
  updateRepositorySettings,
  uploadRepositoryFiles,
} from "./service.js";
import {
  normalizeRepositoryPath,
  parseCreateFileInput,
  parseRepositoryCreateInput,
  parseRepositoryDeleteInput,
  parseRepositoryUpdateInput,
  parseUploadInput,
  validateBranchName,
  validateRepositoryName,
} from "./validation.js";

function getViewer(request: Request): { userId?: string } | undefined {
  return request.authenticatedActor ? { userId: request.authenticatedActor.userId } : undefined;
}

function requireActor(request: Request): AuthenticatedInternalActor {
  const actor = request.authenticatedActor;

  if (!actor) {
    throw new ApiError(500, "INTERNAL_AUTH_MISSING", "Authenticated actor context was missing after verification.");
  }

  return actor;
}

function getOwnerParam(request: Request): string {
  return validateRepositoryName(request.params.owner);
}

function getRepositoryParam(request: Request): string {
  return validateRepositoryName(request.params.repo);
}

function getBranchQuery(request: Request): string | undefined {
  if (request.query.branch === undefined) {
    return undefined;
  }

  return validateBranchName(request.query.branch);
}

export function createRepositoryRouter(): Router {
  const router = Router();
  const pool = getDatabasePool();
  const repoCreateLimiter = createRateLimitMiddleware("repo-create", RATE_LIMIT_POLICIES.repoCreate);
  const repoReadLimiter = createRateLimitMiddleware("repo-read", RATE_LIMIT_POLICIES.expensiveRead);
  const repoWriteLimiter = createRateLimitMiddleware("repo-write", RATE_LIMIT_POLICIES.repoWrite);
  const repoTokenLimiter = createRateLimitMiddleware("repo-git-token", RATE_LIMIT_POLICIES.repoToken);

  router.get("/api/repos", optionallyAuthenticateInternalRequest, async (request, response) => {
    const ownerQuery =
      typeof request.query.owner === "string"
        ? request.query.owner === "me"
          ? "me"
          : validateRepositoryName(request.query.owner)
        : undefined;

    const payload = await listRepositories(pool, ownerQuery, getViewer(request));
    response.json(payload);
  });

  router.post("/api/repos", authenticateInternalRequest, repoCreateLimiter, async (request, response) => {
    const payload = await createRepository(
      pool,
      requireActor(request),
      parseRepositoryCreateInput(request.body),
      request.requestId ?? `${Date.now()}`,
    );
    response.status(201).json({
      repo: payload,
    });
  });

  router.get("/api/repos/:owner/:repo", optionallyAuthenticateInternalRequest, async (request, response) => {
    const payload = await getRepository(pool, getOwnerParam(request), getRepositoryParam(request), getViewer(request));
    response.json({
      repo: payload,
    });
  });

  router.patch("/api/repos/:owner/:repo", authenticateInternalRequest, repoWriteLimiter, async (request, response) => {
    const payload = await updateRepositorySettings(
      pool,
      requireActor(request),
      getOwnerParam(request),
      getRepositoryParam(request),
      parseRepositoryUpdateInput(request.body),
    );

    response.json({
      repo: payload,
    });
  });

  router.delete("/api/repos/:owner/:repo", authenticateInternalRequest, repoWriteLimiter, async (request, response) => {
    const repositoryName = getRepositoryParam(request);
    const input = parseRepositoryDeleteInput(request.body);

    if (input.confirmRepositoryName !== repositoryName) {
      throw new ApiError(400, "INVALID_DELETE_CONFIRMATION", "The confirmation name does not match this repository.", {
        fields: {
          confirmRepositoryName: "Type the exact repository name to confirm deletion.",
        },
      });
    }

    const payload = await deleteRepository(pool, requireActor(request), getOwnerParam(request), repositoryName);

    response.json(payload);
  });

  router.get("/api/repos/:owner/:repo/overview", optionallyAuthenticateInternalRequest, repoReadLimiter, async (request, response) => {
    const payload = await getRepositoryOverviewView(
      pool,
      getOwnerParam(request),
      getRepositoryParam(request),
      getBranchQuery(request),
      getViewer(request),
    );
    response.json(payload);
  });

  router.get("/api/repos/:owner/:repo/branches", optionallyAuthenticateInternalRequest, async (request, response) => {
    const payload = await getRepositoryBranchesView(
      pool,
      getOwnerParam(request),
      getRepositoryParam(request),
      getViewer(request),
    );
    response.json(payload);
  });

  router.get("/api/repos/:owner/:repo/commits", optionallyAuthenticateInternalRequest, repoReadLimiter, async (request, response) => {
    const payload = await getRepositoryCommitsView(
      pool,
      getOwnerParam(request),
      getRepositoryParam(request),
      getBranchQuery(request),
      getViewer(request),
    );
    response.json(payload);
  });

  router.get("/api/repos/:owner/:repo/tree", optionallyAuthenticateInternalRequest, repoReadLimiter, async (request, response) => {
    const payload = await getRepositoryTreeView(
      pool,
      getOwnerParam(request),
      getRepositoryParam(request),
      getBranchQuery(request),
      normalizeRepositoryPath(request.query.path),
      getViewer(request),
    );
    response.json(payload);
  });

  router.get("/api/repos/:owner/:repo/blob", optionallyAuthenticateInternalRequest, repoReadLimiter, async (request, response) => {
    const normalizedPath = normalizeRepositoryPath(request.query.path);

    if (!normalizedPath) {
      throw new ApiError(400, "INVALID_PATH", "A file path is required.");
    }

    const payload = await getRepositoryBlobView(
      pool,
      getOwnerParam(request),
      getRepositoryParam(request),
      getBranchQuery(request),
      normalizedPath,
      getViewer(request),
    );
    response.json(payload);
  });

  router.get("/api/repos/:owner/:repo/archive", optionallyAuthenticateInternalRequest, repoReadLimiter, async (request, response) => {
    const payload = await getRepositoryArchiveView(
      pool,
      getOwnerParam(request),
      getRepositoryParam(request),
      getBranchQuery(request),
      getViewer(request),
    );

    response.setHeader("Content-Type", "application/zip");
    response.setHeader("Content-Disposition", `attachment; filename="${payload.filename}"`);
    response.setHeader("Content-Length", String(payload.archive.byteLength));
    response.setHeader("Cache-Control", "no-store");
    response.status(200).send(payload.archive);
  });

  router.post(
    "/api/repos/:owner/:repo/files",
    authenticateInternalRequest,
    repoWriteLimiter,
    async (request, response) => {
      const input = parseCreateFileInput(request.body);

      await createRepositoryFile(
        pool,
        requireActor(request),
        getOwnerParam(request),
        getRepositoryParam(request),
        input.branch,
        input.filePath,
        Buffer.from(input.content, "utf8").toString("base64"),
        input.commitMessage,
        request.requestId ?? `${Date.now()}`,
      );

      response.status(201).json({
        ok: true,
      });
    },
  );

  router.post(
    "/api/repos/:owner/:repo/upload",
    authenticateInternalRequest,
    repoWriteLimiter,
    async (request, response) => {
      const input = parseUploadInput(request.body);

      await uploadRepositoryFiles(
        pool,
        requireActor(request),
        getOwnerParam(request),
        getRepositoryParam(request),
        input.branch,
        input.files,
        input.commitMessage,
        request.requestId ?? `${Date.now()}`,
      );

      response.status(201).json({
        ok: true,
      });
    },
  );

  router.post(
    "/api/repos/:owner/:repo/git-token",
    authenticateInternalRequest,
    repoTokenLimiter,
    async (request, response) => {
      const payload = await createRepositoryGitToken(
        pool,
        requireActor(request),
        getOwnerParam(request),
        getRepositoryParam(request),
      );

      response.status(201).json(payload);
    },
  );

  return router;
}
