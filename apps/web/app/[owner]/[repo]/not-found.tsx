export default function RepositoryNotFound() {
  return (
    <main className="min-h-screen bg-[#0d1117] px-4 py-10 text-[#c9d1d9]">
      <section className="mx-auto max-w-3xl rounded-md border border-[#30363d] bg-[#0d1117] p-8 shadow-[0_24px_60px_rgba(1,4,9,0.35)]">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#8b949e]">Repository not found</p>
        <h1 className="mt-3 text-3xl font-semibold text-[#e6edf3]">The requested repository could not be found</h1>
        <p className="mt-3 text-sm leading-6 text-[#8b949e]">Check the owner, repository name, branch, or path and try again.</p>
      </section>
    </main>
  );
}
