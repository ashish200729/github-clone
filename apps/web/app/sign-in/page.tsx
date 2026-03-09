import { auth } from "@/auth";
import { SignInForm } from "@/components/auth/sign-in-form";
import { getAuthErrorMessage } from "@/lib/auth/error-messages";
import { normalizeSafeRedirectPath } from "@/lib/auth/redirect";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

interface SignInPageProps {
  searchParams: Promise<{
    callbackUrl?: string;
    error?: string;
  }>;
}

export default async function SignInPage({ searchParams }: SignInPageProps) {
  const session = await auth();

  if (session?.user?.id) {
    redirect("/dashboard");
  }

  const params = await searchParams;
  const callbackUrl = normalizeSafeRedirectPath(params.callbackUrl, "/dashboard");
  const errorMessage = getAuthErrorMessage(params.error);

  return (
    <main className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top,_rgba(15,23,42,0.08),_transparent_35%),linear-gradient(180deg,_#f8fafc,_#e2e8f0)] px-6 py-16">
      <section className="w-full max-w-xl rounded-[2rem] border border-white/70 bg-white/95 p-10 shadow-[0_35px_90px_rgba(15,23,42,0.08)] backdrop-blur">
        <p className="text-sm font-semibold uppercase tracking-[0.35em] text-slate-500">Sign In</p>
        <h1 className="mt-4 text-4xl font-semibold tracking-tight text-slate-950">Authenticate with GitHub</h1>
        <p className="mt-4 text-base leading-7 text-slate-600">
          Sign-in is handled by Auth.js in the Next.js app. Sessions are stored in PostgreSQL, and only the minimum safe user
          fields are exposed back to the client.
        </p>
        {params.error ? (
          <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            {errorMessage}
          </div>
        ) : null}
        <div className="mt-8">
          <SignInForm callbackUrl={callbackUrl} />
        </div>
        <p className="mt-6 text-sm text-slate-500">
          Expected GitHub OAuth callback for local development: <code>http://localhost:3000/api/auth/callback/github</code>
        </p>
      </section>
    </main>
  );
}
