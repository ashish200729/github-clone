import Link from "next/link";
import type { ReactNode } from "react";

interface AuthPageFrameProps {
  heading: string;
  description: string;
  children: ReactNode;
  supportingContent?: ReactNode;
  supportingTitle?: string;
  showcase?: ReactNode;
}

export function AuthPageFrame({
  heading,
  description,
  children,
  supportingContent,
  supportingTitle,
  showcase,
}: AuthPageFrameProps) {
  return (
    <main className="relative min-h-screen bg-[#0d1117] text-white py-10 flex flex-col items-center">
      <div className="w-full max-w-sm px-4">
        <div className="flex flex-col items-center text-center">
          <Link href="/" className="mb-6 hover:text-white/80 transition-colors" aria-label="Back to home">
            <svg height="48" aria-hidden="true" viewBox="0 0 16 16" version="1.1" width="48" data-view-component="true" className="fill-white">
              <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"></path>
            </svg>
          </Link>
          <h1 className="text-2xl font-light tracking-tight text-white mb-4">{heading}</h1>
        </div>

        <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-4 sm:p-6 shadow-sm">
          {children}
        </div>

        {supportingContent ? (
          <div className="mt-4 rounded-xl border border-[#30363d] p-4 text-center">
            {supportingTitle ? <p className="text-sm font-semibold text-white">{supportingTitle}</p> : null}
            <div className={supportingTitle ? "mt-2 text-sm leading-6 text-[#8b949e]" : "text-sm leading-6 text-[#8b949e]"}>
              {supportingContent}
            </div>
          </div>
        ) : null}

        <footer className="mt-16 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs text-[#8b949e]">
          <Link href="/" className="hover:text-blue-400 hover:underline transition-colors">Terms</Link>
          <Link href="/" className="hover:text-blue-400 hover:underline transition-colors">Privacy</Link>
          <Link href="/" className="hover:text-blue-400 hover:underline transition-colors">Docs</Link>
          <Link href="/" className="hover:text-blue-400 hover:underline transition-colors">Contact GitHub Support</Link>
        </footer>
      </div>
    </main>
  );
}
