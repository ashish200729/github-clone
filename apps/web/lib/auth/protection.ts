import { redirect } from "next/navigation";
import { cache } from "react";
import { auth } from "@/auth";
import { normalizeSafeRedirectPath } from "@/lib/auth/redirect";

export interface AuthenticatedAppUser {
  id: string;
  name?: string | null;
  email?: string | null;
  image?: string | null;
  role?: "user" | "admin";
}

const getCachedSession = cache(async () => await auth());

export async function requireAuthenticatedUser(callbackUrl: string): Promise<AuthenticatedAppUser> {
  let session;

  try {
    session = await getCachedSession();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[auth] Session verification failed.", { message });
    redirect("/auth/error?error=SessionUnavailable");
  }

  if (!session?.user?.id) {
    redirect(`/sign-in?callbackUrl=${encodeURIComponent(normalizeSafeRedirectPath(callbackUrl, "/dashboard"))}`);
  }

  return {
    id: session.user.id,
    name: session.user.name,
    email: session.user.email,
    image: session.user.image,
    role: session.user.role,
  };
}

export async function getOptionalAuthenticatedUser(): Promise<AuthenticatedAppUser | null> {
  let session;

  try {
    session = await getCachedSession();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[auth] Optional session verification failed.", { message });
    return null;
  }

  if (!session?.user?.id) {
    return null;
  }

  return {
    id: session.user.id,
    name: session.user.name,
    email: session.user.email,
    image: session.user.image,
    role: session.user.role,
  };
}
