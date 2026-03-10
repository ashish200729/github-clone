import { AuthPageFrame } from "@/components/auth/auth-page-frame";
import { getAuthErrorMessage } from "@/lib/auth/error-messages";
import Link from "next/link";

interface AuthErrorPageProps {
  searchParams: Promise<{
    error?: string;
  }>;
}

export default async function AuthErrorPage({ searchParams }: AuthErrorPageProps) {
  const params = await searchParams;

  return (
    <AuthPageFrame
      heading="Authentication could not complete"
      description="The sign-in flow stopped before a valid session could be created. Review the message below and try again."
      supportingTitle={params.error ? "Error code" : undefined}
      supportingContent={
        params.error ? (
          <code className="rounded-md border border-[#30363d] bg-[#161b22] px-2 py-1 text-xs text-[#f0f6fc]">{params.error}</code>
        ) : null
      }
    >
      <div className="space-y-6">
        <div className="rounded-xl border border-[#ff7b72]/30 bg-[#ff7b72]/10 px-4 py-4 text-sm leading-6 text-[#ffb3ba]">
          {getAuthErrorMessage(params.error)}
        </div>
        <div className="flex flex-col gap-3 sm:flex-row">
          <Link
            href="/sign-in"
            className="inline-flex items-center justify-center rounded-xl border border-[#2f81f7]/35 bg-[#238636] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#2ea043] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#58a6ff] focus-visible:ring-offset-2 focus-visible:ring-offset-[#161b22]"
          >
            Return to sign in
          </Link>
          <Link
            href="/"
            className="inline-flex items-center justify-center rounded-xl border border-[#30363d] bg-[#0d1117] px-5 py-3 text-sm font-semibold text-[#c9d1d9] transition hover:border-[#8b949e] hover:bg-[#161b22] hover:text-[#f0f6fc]"
          >
            Back home
          </Link>
        </div>
      </div>
    </AuthPageFrame>
  );
}
