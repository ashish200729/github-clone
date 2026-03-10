import { getAuthDatabasePool } from "@/lib/auth/postgres";
import type { AuthenticatedAppUser } from "@/lib/auth/protection";

export const RESERVED_OWNER_HANDLES = new Set(["api", "auth", "dashboard", "new", "repos", "settings", "sign-in"]);

function slugifyHandle(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .toLowerCase()
    .replace(/[_\s]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export function deriveOwnerHandle(user: { id: string; name?: string | null; email?: string | null }): string {
  const fromName = user.name ? slugifyHandle(user.name) : "";
  const fromEmail = user.email ? slugifyHandle(user.email.split("@")[0] ?? "") : "";
  const fallback = `user-${user.id.slice(0, 8)}`;
  const candidate = (fromName || fromEmail || fallback).slice(0, 30).replace(/-+$/g, "");

  if (!candidate || RESERVED_OWNER_HANDLES.has(candidate)) {
    return fallback;
  }

  return candidate;
}

export async function resolveOwnerHandle(user: { id: string; name?: string | null; email?: string | null }): Promise<string> {
  try {
    const result = await getAuthDatabasePool().query<{ handle: string | null }>(
      `
        SELECT handle
        FROM auth.users
        WHERE id = $1
      `,
      [user.id],
    );

    const handle = result.rows[0]?.handle?.trim();
    return handle || deriveOwnerHandle(user);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.warn("[auth] Falling back to derived owner handle.", { message, userId: user.id });
    return deriveOwnerHandle(user);
  }
}

export function buildOwnerHomePath(ownerHandle: string): string {
  return `/${encodeURIComponent(ownerHandle)}`;
}

export async function buildAuthenticatedUserHomePath(user: AuthenticatedAppUser): Promise<string> {
  return buildOwnerHomePath(await resolveOwnerHandle(user));
}
