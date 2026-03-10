interface RepositoryAccessDeniedProps {
  owner: string;
  repo: string;
  message: string;
}

export function RepositoryAccessDenied({ owner, repo, message }: RepositoryAccessDeniedProps) {
  return (
    <main className="min-h-screen bg-[#0d1117] px-4 py-12 text-[#c9d1d9]">
      <section className="mx-auto max-w-3xl rounded-md border border-[#f85149]/40 bg-[#161b22] p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[#ff7b72]">Access denied</p>
        <h1 className="mt-3 text-3xl font-semibold text-[#e6edf3]">
          {owner}/{repo}
        </h1>
        <p className="mt-3 text-sm leading-6 text-[#8b949e]">{message}</p>
      </section>
    </main>
  );
}
