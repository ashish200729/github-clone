import { randomUUID } from "node:crypto";
import type { Pool, PoolClient } from "pg";
import { ApiError } from "../http/errors.js";
import type { RepositoryRecord } from "./types.js";
import type { RepositoryCreateInput } from "./validation.js";
import { DEFAULT_REPOSITORY_BRANCH } from "./validation.js";

const RESERVED_OWNER_HANDLES = new Set(["api", "auth", "dashboard", "new", "repos", "settings", "sign-in"]);

interface RepositoryRow {
  id: string;
  owner_id: string;
  owner_handle: string;
  owner_name: string | null;
  owner_email: string | null;
  owner_image: string | null;
  name: string;
  description: string | null;
  visibility: "public" | "private";
  default_branch: string;
  storage_key: string;
  is_empty: boolean;
  archived: boolean;
  initialized_at: Date | string | null;
  last_pushed_at: Date | string | null;
  created_at: Date | string;
  updated_at: Date | string;
}

interface AuthUserRow {
  id: string;
  name: string | null;
  email: string | null;
  image: string | null;
  handle: string | null;
}

function toIsoString(value: Date | string | null): string | null {
  if (value === null) {
    return null;
  }

  return new Date(value).toISOString();
}

function mapRepositoryRow(row: RepositoryRow): RepositoryRecord {
  return {
    id: row.id,
    ownerId: row.owner_id,
    ownerHandle: row.owner_handle,
    ownerName: row.owner_name,
    ownerEmail: row.owner_email,
    ownerImage: row.owner_image,
    name: row.name,
    description: row.description,
    visibility: row.visibility,
    defaultBranch: row.default_branch,
    storageKey: row.storage_key,
    isEmpty: row.is_empty,
    archived: row.archived,
    initializedAt: toIsoString(row.initialized_at),
    lastPushedAt: toIsoString(row.last_pushed_at),
    createdAt: new Date(row.created_at).toISOString(),
    updatedAt: new Date(row.updated_at).toISOString(),
  };
}

function slugifyHandle(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .toLowerCase()
    .replace(/[_\s]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function deriveHandleBase(user: AuthUserRow): string {
  const fromName = user.name ? slugifyHandle(user.name) : "";
  const fromEmail = user.email ? slugifyHandle(user.email.split("@")[0] ?? "") : "";
  const fallback = `user-${user.id.slice(0, 8)}`;
  const candidate = fromName || fromEmail || fallback;
  const trimmedCandidate = candidate.slice(0, 30).replace(/-+$/g, "");

  if (!trimmedCandidate || RESERVED_OWNER_HANDLES.has(trimmedCandidate)) {
    return fallback;
  }

  return trimmedCandidate;
}

async function handleExists(client: PoolClient, handle: string, userId: string): Promise<boolean> {
  const result = await client.query<{ exists: boolean }>(
    `
      SELECT EXISTS (
        SELECT 1
        FROM auth.users
        WHERE handle = $1
          AND id <> $2
      ) AS exists
    `,
    [handle, userId],
  );

  return result.rows[0]?.exists === true;
}

async function ensureUserHandle(client: PoolClient, userId: string): Promise<AuthUserRow> {
  const result = await client.query<AuthUserRow>(
    `
      SELECT id, name, email, image, handle
      FROM auth.users
      WHERE id = $1
      FOR UPDATE
    `,
    [userId],
  );

  const user = result.rows[0];

  if (!user) {
    throw new ApiError(404, "USER_NOT_FOUND", "The authenticated user could not be found.");
  }

  if (user.handle) {
    return user;
  }

  const baseHandle = deriveHandleBase(user);
  let attempt = 1;

  while (attempt <= 100) {
    const suffix = attempt === 1 ? "" : `-${attempt}`;
    const handle = `${baseHandle.slice(0, Math.max(1, 39 - suffix.length)).replace(/-+$/g, "")}${suffix}`;

    if (!(await handleExists(client, handle, userId))) {
      await client.query(`UPDATE auth.users SET handle = $1 WHERE id = $2`, [handle, userId]);
      return {
        ...user,
        handle,
      };
    }

    attempt += 1;
  }

  throw new ApiError(409, "OWNER_HANDLE_UNAVAILABLE", "A stable repository handle could not be reserved for this account.");
}

export async function createRepositoryRecord(
  pool: Pool,
  ownerId: string,
  input: RepositoryCreateInput,
): Promise<RepositoryRecord> {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");
    const owner = await ensureUserHandle(client, ownerId);
    const storageKey = randomUUID();

    const insertResult = await client.query<RepositoryRow>(
      `
        INSERT INTO public.repositories (
          owner_id,
          name,
          description,
          visibility,
          default_branch,
          storage_key
        )
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING
          id,
          owner_id,
          $7::text AS owner_handle,
          $8::text AS owner_name,
          $9::text AS owner_email,
          $10::text AS owner_image,
          name,
          description,
          visibility,
          default_branch,
          storage_key,
          is_empty,
          archived,
          initialized_at,
          last_pushed_at,
          created_at,
          updated_at
      `,
      [
        ownerId,
        input.name,
        input.description,
        input.visibility,
        DEFAULT_REPOSITORY_BRANCH,
        storageKey,
        owner.handle,
        owner.name,
        owner.email,
        owner.image,
      ],
    );

    await client.query("COMMIT");
    return mapRepositoryRow(insertResult.rows[0] as RepositoryRow);
  } catch (error) {
    await client.query("ROLLBACK");

    if (typeof error === "object" && error !== null && "code" in error) {
      const code = String(error.code);

      if (code === "23505") {
        throw new ApiError(409, "REPOSITORY_ALREADY_EXISTS", "You already have a repository with that name.", {
          fields: {
            name: "You already have a repository with that name.",
          },
        });
      }
    }

    throw error;
  } finally {
    client.release();
  }
}

export async function deleteRepositoryRecord(pool: Pool, repositoryId: string): Promise<void> {
  await pool.query(`DELETE FROM public.repositories WHERE id = $1`, [repositoryId]);
}

export async function markRepositoryInitialized(pool: Pool, repositoryId: string, branch: string): Promise<void> {
  await pool.query(
    `
      UPDATE public.repositories
      SET
        default_branch = $2,
        is_empty = false,
        initialized_at = COALESCE(initialized_at, NOW()),
        last_pushed_at = NOW(),
        updated_at = NOW()
      WHERE id = $1
    `,
    [repositoryId, branch],
  );
}

export async function updateRepositoryRecord(
  pool: Pool,
  repositoryId: string,
  input: {
    name: string;
    description: string | null;
    visibility: "public" | "private";
    defaultBranch: string;
    archived: boolean;
  },
): Promise<RepositoryRecord> {
  try {
    const result = await pool.query<RepositoryRow>(
      `
        WITH updated AS (
          UPDATE public.repositories
          SET
            name = $2,
            description = $3,
            visibility = $4,
            default_branch = $5,
            archived = $6
          WHERE id = $1
          RETURNING
            id,
            owner_id,
            name,
            description,
            visibility,
            default_branch,
            storage_key,
            is_empty,
            archived,
            initialized_at,
            last_pushed_at,
            created_at,
            updated_at
        )
        SELECT
          u2.id,
          u2.owner_id,
          u.handle AS owner_handle,
          u.name AS owner_name,
          u.email AS owner_email,
          u.image AS owner_image,
          u2.name,
          u2.description,
          u2.visibility,
          u2.default_branch,
          u2.storage_key,
          u2.is_empty,
          u2.archived,
          u2.initialized_at,
          u2.last_pushed_at,
          u2.created_at,
          u2.updated_at
        FROM updated AS u2
        INNER JOIN auth.users AS u
          ON u.id = u2.owner_id
      `,
      [repositoryId, input.name, input.description, input.visibility, input.defaultBranch, input.archived],
    );

    const repository = result.rows[0];

    if (!repository) {
      throw new ApiError(404, "REPOSITORY_NOT_FOUND", "The repository could not be found.");
    }

    return mapRepositoryRow(repository);
  } catch (error) {
    if (typeof error === "object" && error !== null && "code" in error) {
      const code = String(error.code);

      if (code === "23505") {
        throw new ApiError(409, "REPOSITORY_ALREADY_EXISTS", "You already have a repository with that name.", {
          fields: {
            name: "You already have a repository with that name.",
          },
        });
      }
    }

    throw error;
  }
}

export async function listRepositoriesForOwner(pool: Pool, ownerId: string): Promise<RepositoryRecord[]> {
  const result = await pool.query<RepositoryRow>(
    `
      SELECT
        r.id,
        r.owner_id,
        u.handle AS owner_handle,
        u.name AS owner_name,
        u.email AS owner_email,
        u.image AS owner_image,
        r.name,
        r.description,
        r.visibility,
        r.default_branch,
        r.storage_key,
        r.is_empty,
        r.archived,
        r.initialized_at,
        r.last_pushed_at,
        r.created_at,
        r.updated_at
      FROM public.repositories AS r
      INNER JOIN auth.users AS u
        ON u.id = r.owner_id
      WHERE r.owner_id = $1
      ORDER BY COALESCE(r.last_pushed_at, r.created_at) DESC, r.name ASC
    `,
    [ownerId],
  );

  return result.rows.map(mapRepositoryRow);
}

export async function listRepositoriesForOwnerHandle(
  pool: Pool,
  ownerHandle: string,
  viewerId?: string,
): Promise<RepositoryRecord[]> {
  const result = await pool.query<RepositoryRow>(
    `
      SELECT
        r.id,
        r.owner_id,
        u.handle AS owner_handle,
        u.name AS owner_name,
        u.email AS owner_email,
        u.image AS owner_image,
        r.name,
        r.description,
        r.visibility,
        r.default_branch,
        r.storage_key,
        r.is_empty,
        r.archived,
        r.initialized_at,
        r.last_pushed_at,
        r.created_at,
        r.updated_at
      FROM public.repositories AS r
      INNER JOIN auth.users AS u
        ON u.id = r.owner_id
      WHERE u.handle = $1
        AND ($2::uuid IS NOT NULL AND r.owner_id = $2 OR r.visibility = 'public')
      ORDER BY COALESCE(r.last_pushed_at, r.created_at) DESC, r.name ASC
    `,
    [ownerHandle, viewerId ?? null],
  );

  return result.rows.map(mapRepositoryRow);
}

export async function findRepositoryByOwnerAndName(
  pool: Pool,
  ownerHandle: string,
  repositoryName: string,
): Promise<RepositoryRecord> {
  const result = await pool.query<RepositoryRow>(
    `
      SELECT
        r.id,
        r.owner_id,
        u.handle AS owner_handle,
        u.name AS owner_name,
        u.email AS owner_email,
        u.image AS owner_image,
        r.name,
        r.description,
        r.visibility,
        r.default_branch,
        r.storage_key,
        r.is_empty,
        r.archived,
        r.initialized_at,
        r.last_pushed_at,
        r.created_at,
        r.updated_at
      FROM public.repositories AS r
      INNER JOIN auth.users AS u
        ON u.id = r.owner_id
      WHERE u.handle = $1
        AND r.name = $2
      LIMIT 1
    `,
    [ownerHandle, repositoryName],
  );

  const repository = result.rows[0];

  if (!repository) {
    throw new ApiError(404, "REPOSITORY_NOT_FOUND", "The repository could not be found.");
  }

  return mapRepositoryRow(repository);
}

export async function findRepositoryById(pool: Pool, repositoryId: string): Promise<RepositoryRecord> {
  const result = await pool.query<RepositoryRow>(
    `
      SELECT
        r.id,
        r.owner_id,
        u.handle AS owner_handle,
        u.name AS owner_name,
        u.email AS owner_email,
        u.image AS owner_image,
        r.name,
        r.description,
        r.visibility,
        r.default_branch,
        r.storage_key,
        r.is_empty,
        r.archived,
        r.initialized_at,
        r.last_pushed_at,
        r.created_at,
        r.updated_at
      FROM public.repositories AS r
      INNER JOIN auth.users AS u
        ON u.id = r.owner_id
      WHERE r.id = $1
      LIMIT 1
    `,
    [repositoryId],
  );

  const repository = result.rows[0];

  if (!repository) {
    throw new ApiError(404, "REPOSITORY_NOT_FOUND", "The repository could not be found.");
  }

  return mapRepositoryRow(repository);
}

export async function getAccessibleRepository(
  pool: Pool,
  ownerHandle: string,
  repositoryName: string,
  viewerId?: string,
): Promise<RepositoryRecord> {
  const repository = await findRepositoryByOwnerAndName(pool, ownerHandle, repositoryName);

  if (repository.visibility === "private" && repository.ownerId !== viewerId) {
    throw new ApiError(403, "REPOSITORY_FORBIDDEN", "You do not have access to this repository.");
  }

  return repository;
}
