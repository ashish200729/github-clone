import Link from "next/link";
import { auth } from "@/auth";
import { SignInForm } from "@/components/auth/sign-in-form";
import { SignOutForm } from "@/components/auth/sign-out-form";

export const dynamic = "force-dynamic";

export default async function Home() {
  const session = await auth();

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(15,23,42,0.1),_transparent_35%),linear-gradient(180deg,_#f8fafc,_#e2e8f0)] px-6 py-16">
      <section className="mx-auto flex w-full max-w-5xl flex-col gap-6 rounded-[2rem] border border-white/70 bg-white/90 p-8 shadow-[0_35px_90px_rgba(15,23,42,0.08)] backdrop-blur md:p-12">
        <div className="grid gap-8 md:grid-cols-[1.4fr_0.8fr]">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.35em] text-slate-500">Production Auth Foundation</p>
            <h1 className="mt-4 max-w-3xl text-5xl font-semibold tracking-tight text-slate-950">
              Auth.js now owns the sign-in flow, PostgreSQL sessions, and the trusted app boundary.
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-600">
              The Next.js app handles GitHub OAuth, session cookies, and protected UI. Express only accepts a short-lived signed
              identity envelope minted by the authenticated Next.js server.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              {session?.user?.id ? (
                <>
                  <Link
                    href="/dashboard"
                    className="inline-flex items-center justify-center rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
                  >
                    Open dashboard
                  </Link>
                  <SignOutForm />
                </>
              ) : (
                <SignInForm callbackUrl="/dashboard" />
              )}
            </div>
          </div>
          <aside className="grid gap-4 rounded-[1.5rem] border border-slate-200 bg-slate-50 p-5">
            <div className="rounded-[1.25rem] border border-slate-200 bg-white p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">Session Strategy</p>
              <p className="mt-3 text-sm leading-6 text-slate-700">
                Database sessions are stored in PostgreSQL under the existing <code>auth.*</code> schema for revocation and
                future account-management safety.
              </p>
            </div>
            <div className="rounded-[1.25rem] border border-slate-200 bg-white p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">API Boundary</p>
              <p className="mt-3 text-sm leading-6 text-slate-700">
                Browser clients never choose a user id for Express. The Next.js server verifies the session first, then signs the
                forwarded actor claims with a separate HMAC secret.
              </p>
            </div>
            <div className="rounded-[1.25rem] border border-slate-200 bg-white p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">Current Session</p>
              <p className="mt-3 text-sm leading-6 text-slate-700">
                {session?.user?.id
                  ? `Signed in as ${session.user.name ?? "Unnamed user"} (${session.user.email ?? "no public email"}).`
                  : "No active session. Sign in with GitHub to access the protected routes."}
              </p>
            </div>
          </aside>
        </div>
      </section>
    </main>
  );
}
