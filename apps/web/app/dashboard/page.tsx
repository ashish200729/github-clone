import { AuthShell } from "@/components/auth/auth-shell";
import { fetchInternalApiJson, InternalApiError } from "@/lib/auth/internal-api";
import { requireAuthenticatedUser } from "@/lib/auth/protection";

export const dynamic = "force-dynamic";

interface ViewerResponse {
  actor: {
    userId: string;
    email: string | null;
    role: string | null;
  };
  message: string;
}

export default async function DashboardPage() {
  const user = await requireAuthenticatedUser("/dashboard");

  let viewer: ViewerResponse | null = null;
  let internalApiError: string | null = null;

  try {
    viewer = await fetchInternalApiJson<ViewerResponse>("/api/internal/viewer", {
      user,
    });
  } catch (error) {
    internalApiError =
      error instanceof InternalApiError
        ? error.message
        : "The internal API trust boundary could not verify the forwarded identity.";
  }

  return (
    <AuthShell
      heading="Dashboard"
      description="This route is protected by Auth.js in the Next.js server. The viewer panel below is fetched from Express using a short-lived signed internal actor token."
      user={user}
    >
      <section className="grid gap-4 md:grid-cols-2">
        <article className="rounded-[1.75rem] border border-white/70 bg-white/90 p-6 shadow-[0_25px_70px_rgba(15,23,42,0.06)]">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">Client-visible Session</p>
          <dl className="mt-4 space-y-3 text-sm text-slate-700">
            <div>
              <dt className="font-medium text-slate-950">User ID</dt>
              <dd>{user.id}</dd>
            </div>
            <div>
              <dt className="font-medium text-slate-950">Name</dt>
              <dd>{user.name ?? "Unavailable"}</dd>
            </div>
            <div>
              <dt className="font-medium text-slate-950">Email</dt>
              <dd>{user.email ?? "GitHub did not return a public email."}</dd>
            </div>
          </dl>
        </article>
        <article className="rounded-[1.75rem] border border-white/70 bg-white/90 p-6 shadow-[0_25px_70px_rgba(15,23,42,0.06)]">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">Express Verification</p>
          {viewer ? (
            <div className="mt-4 space-y-3 text-sm text-slate-700">
              <p>{viewer.message}</p>
              <p>
                <span className="font-medium text-slate-950">Verified user ID:</span> {viewer.actor.userId}
              </p>
              <p>
                <span className="font-medium text-slate-950">Verified email:</span> {viewer.actor.email ?? "Unavailable"}
              </p>
            </div>
          ) : (
            <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              {internalApiError}
            </div>
          )}
        </article>
      </section>
    </AuthShell>
  );
}
