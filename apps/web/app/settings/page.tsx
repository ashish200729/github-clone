import { AuthShell } from "@/components/auth/auth-shell";
import { buildAuthenticatedUserHomePath } from "@/lib/auth/owner-handle";
import { requireAuthenticatedUser } from "@/lib/auth/protection";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const user = await requireAuthenticatedUser("/settings");
  const dashboardHref = await buildAuthenticatedUserHomePath(user);

  return (
    <AuthShell
      heading="Settings"
      description="Settings pages are protected with the same server-side session check. Future authorization for repo ownership remains separate from basic sign-in."
      user={user}
      dashboardHref={dashboardHref}
    >
      <section className="rounded-[1.75rem] border border-white/70 bg-white/90 p-6 shadow-[0_25px_70px_rgba(15,23,42,0.06)]">
        <p className="text-sm leading-7 text-slate-700">
          Authenticated session details are available on the server, but OAuth tokens and internal account linkage data are never exposed
          to the client. This page is ready for future account settings work.
        </p>
      </section>
    </AuthShell>
  );
}
