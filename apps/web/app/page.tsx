export default function Home() {
  return (
    <main className="flex min-h-screen items-center justify-center px-6 py-16">
      <section className="w-full max-w-2xl rounded-3xl border border-black/10 bg-white p-10 text-center shadow-sm">
        <p className="text-sm font-medium uppercase tracking-[0.3em] text-slate-500">Initialization</p>
        <h1 className="mt-4 text-5xl font-semibold text-slate-950">Hello</h1>
        <p className="mt-4 text-lg leading-8 text-slate-600">
          This is the clean starter for your GitHub clone workspace. The frontend, API, and Go service are reduced to minimal hello endpoints so you can start fresh.
        </p>
      </section>
    </main>
  );
}
