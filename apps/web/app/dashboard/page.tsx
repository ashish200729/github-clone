import { redirect } from "next/navigation";
import { buildAuthenticatedUserHomePath } from "@/lib/auth/owner-handle";
import { requireAuthenticatedUser } from "@/lib/auth/protection";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const user = await requireAuthenticatedUser("/dashboard");
  redirect(await buildAuthenticatedUserHomePath(user));
}
