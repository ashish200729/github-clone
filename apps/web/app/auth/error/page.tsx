import Link from "next/link";
import { getAuthErrorMessage } from "@/lib/auth/error-messages";

interface AuthErrorPageProps {
  searchParams: Promise<{
    error?: string;
  }>;
}

export default async function AuthErrorPage({ searchParams }: AuthErrorPageProps) {
  const params = await searchParams;

  return (
    <main className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top,_rgba(15,23,42,0.08),_transparent_35%),linear-gradient(180deg,_#f8fafc,_#e2e8f0)] px-6 py-16">
      <section className="w-full max-w-xl rounded-[2rem] border border-white/70 bg-white/95 p-10 shadow-[0_35px_90px_rgba(15,23,42,0.08)] backdrop-blur">
        <p className="text-sm font-semibold uppercase tracking-[0.35em] text-slate-500">Auth Error</p>
        <h1 className="mt-4 text-4xl font-semibold tracking-tight text-slate-950">Authentication could not complete</h1>
        <p className="mt-4 text-base leading-7 text-slate-600">{getAuthErrorMessage(params.error)}</p>
        {params.error ? (
          <p className="mt-4 text-sm text-slate-500">
            Error code: <code>{params.error}</code>
          </p>
        ) : null}
        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/sign-in"
            className="inline-flex items-center justify-center rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
          >
            Return to sign-in
          </Link>
          <Link
            href="/"
            className="inline-flex items-center justify-center rounded-full border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:text-slate-950"
          >
            Back home
          </Link>
        </div>
      </section>
    </main>
  );
}
