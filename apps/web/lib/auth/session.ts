import type { DefaultSession, Session } from "next-auth";

interface SessionUserLike {
  id?: string;
  name?: string | null;
  email?: string | null;
  image?: string | null;
  role?: "user" | "admin";
}

export function buildClientSession(session: Session, user: SessionUserLike): Session {
  if (!user.id) {
    throw new Error("Authenticated session is missing user.id.");
  }

  return {
    ...session,
    user: {
      ...((session.user ?? {}) as DefaultSession["user"]),
      id: user.id,
      name: user.name ?? session.user?.name ?? null,
      email: user.email ?? session.user?.email ?? null,
      image: user.image ?? session.user?.image ?? null,
      ...(user.role ? { role: user.role } : {}),
    },
  };
}
