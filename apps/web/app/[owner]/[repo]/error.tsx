"use client";

export default function RepositoryError({
  error,
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  return (
    <main className="min-h-screen bg-[#0d1117] px-4 py-10 text-[#c9d1d9]">
      <section className="mx-auto max-w-3xl rounded-md border border-[#f85149]/40 bg-[#0d1117] p-8 shadow-[0_24px_60px_rgba(1,4,9,0.35)]">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#ff7b72]">Repository error</p>
        <h1 className="mt-3 text-3xl font-semibold text-[#e6edf3]">The repository page could not be rendered</h1>
        <p className="mt-3 text-sm leading-6 text-[#8b949e]">{error.message}</p>
        <button
          type="button"
          onClick={reset}
          className="mt-6 inline-flex items-center justify-center rounded-md border border-[#2ea043] bg-[#238636] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#2ea043]"
        >
          Try again
        </button>
      </section>
    </main>
  );
}
