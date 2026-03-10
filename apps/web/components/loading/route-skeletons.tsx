function SkeletonBlock({ className }: { className: string }) {
  return <div aria-hidden className={`animate-pulse rounded-md bg-[#161b22] ${className}`} />;
}

function AppHeaderSkeleton() {
  return (
    <header className="border-b border-[#30363d] bg-[#010409]">
      <div className="mx-auto flex w-full max-w-[1280px] items-center justify-between gap-3 px-4 py-3">
        <div className="flex min-w-0 items-center gap-3">
          <SkeletonBlock className="h-8 w-8 rounded-md" />
          <SkeletonBlock className="h-4 w-36" />
        </div>
        <div className="flex items-center gap-2">
          <SkeletonBlock className="hidden h-9 w-64 sm:block" />
          <SkeletonBlock className="h-8 w-8 rounded-md" />
          <SkeletonBlock className="h-8 w-8 rounded-md" />
          <SkeletonBlock className="h-8 w-8 rounded-full" />
        </div>
      </div>
    </header>
  );
}

function RepoHeaderSkeleton() {
  return (
    <>
      <AppHeaderSkeleton />
      <div className="border-b border-[#30363d]">
        <div className="mx-auto flex w-full max-w-[1280px] items-center gap-3 px-4 py-3">
          <SkeletonBlock className="h-5 w-20" />
          <SkeletonBlock className="h-5 w-28" />
          <SkeletonBlock className="h-5 w-20" />
          <SkeletonBlock className="h-5 w-24" />
        </div>
      </div>
    </>
  );
}

function AuthHeaderSkeleton() {
  return (
    <div className="flex flex-col items-center text-center">
      <SkeletonBlock className="mb-6 h-12 w-12 rounded-full" />
      <SkeletonBlock className="h-7 w-48" />
    </div>
  );
}

export function HomeRouteSkeleton() {
  return (
    <div className="min-h-screen bg-[#040d21] text-white">
      <header className="border-b border-white/10 bg-[#040d21]/80 backdrop-blur-md">
        <div className="mx-auto flex w-full max-w-[1280px] items-center justify-between px-6 py-4">
          <div className="flex items-center gap-5">
            <SkeletonBlock className="h-8 w-8 rounded-md bg-white/10" />
            <div className="hidden gap-3 lg:flex">
              <SkeletonBlock className="h-4 w-16 bg-white/10" />
              <SkeletonBlock className="h-4 w-20 bg-white/10" />
              <SkeletonBlock className="h-4 w-16 bg-white/10" />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <SkeletonBlock className="hidden h-9 w-56 bg-white/10 md:block" />
            <SkeletonBlock className="h-9 w-24 rounded-md bg-white/10" />
            <SkeletonBlock className="h-9 w-28 rounded-md bg-white/10" />
          </div>
        </div>
      </header>

      <main className="mx-auto flex min-h-[calc(100vh-73px)] w-full max-w-[1280px] flex-col justify-center gap-10 px-6 py-16">
        <div className="space-y-5">
          <SkeletonBlock className="h-8 w-48 rounded-full bg-white/10" />
          <SkeletonBlock className="h-20 w-full max-w-4xl bg-white/10" />
          <SkeletonBlock className="h-8 w-full max-w-2xl bg-white/10" />
        </div>
        <div className="grid gap-6 lg:grid-cols-[1.4fr_0.9fr]">
          <SkeletonBlock className="h-72 rounded-[28px] bg-white/8" />
          <div className="grid gap-6">
            <SkeletonBlock className="h-32 rounded-[24px] bg-white/8" />
            <SkeletonBlock className="h-32 rounded-[24px] bg-white/8" />
          </div>
        </div>
      </main>
    </div>
  );
}

export function OwnerRouteSkeleton() {
  return (
    <div className="min-h-screen bg-[#0d1117] text-[#c9d1d9]">
      <AppHeaderSkeleton />
      <div className="border-b border-[#30363d]">
        <div className="mx-auto flex w-full max-w-[1280px] items-center gap-3 px-4 py-3">
          <SkeletonBlock className="h-5 w-24" />
          <SkeletonBlock className="h-5 w-32" />
          <SkeletonBlock className="h-5 w-24" />
          <SkeletonBlock className="h-5 w-20" />
        </div>
      </div>

      <main className="mx-auto w-full max-w-[1280px] px-4 py-6">
        <div className="grid gap-8 lg:grid-cols-[296px_minmax(0,1fr)]">
          <aside className="space-y-4">
            <SkeletonBlock className="mx-auto h-[260px] w-[260px] rounded-full lg:mx-0" />
            <SkeletonBlock className="h-8 w-48" />
            <SkeletonBlock className="h-6 w-36" />
            <SkeletonBlock className="h-9 w-full" />
            <SkeletonBlock className="h-4 w-44" />
          </aside>

          <section className="space-y-6">
            <SkeletonBlock className="h-9 w-64" />
            <div className="grid gap-3 md:grid-cols-2">
              <SkeletonBlock className="h-36" />
              <SkeletonBlock className="h-36" />
              <SkeletonBlock className="h-36" />
              <SkeletonBlock className="h-36" />
            </div>
            <SkeletonBlock className="h-72" />
          </section>
        </div>
      </main>
    </div>
  );
}

export function RepositoryRouteSkeleton() {
  return (
    <div className="min-h-screen bg-[#0d1117] text-[#c9d1d9]">
      <RepoHeaderSkeleton />
      <main className="mx-auto w-full max-w-[1280px] px-4 py-6">
        <section className="mb-5 flex flex-col gap-4 border-b border-[#30363d] pb-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <SkeletonBlock className="h-9 w-56" />
            <SkeletonBlock className="h-6 w-20 rounded-full" />
          </div>
          <div className="flex gap-2">
            <SkeletonBlock className="h-8 w-20" />
            <SkeletonBlock className="h-8 w-20" />
            <SkeletonBlock className="h-8 w-20" />
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="space-y-6">
            <div className="overflow-hidden rounded-md border border-[#30363d] bg-[#0d1117]">
              <div className="flex flex-wrap gap-2 border-b border-[#30363d] px-4 py-3">
                <SkeletonBlock className="h-8 w-36" />
                <SkeletonBlock className="h-8 w-24" />
                <SkeletonBlock className="ml-auto h-8 w-24" />
              </div>
              <div className="space-y-3 px-4 py-4">
                <SkeletonBlock className="h-10 w-full" />
                <SkeletonBlock className="h-12 w-full" />
                <SkeletonBlock className="h-12 w-full" />
                <SkeletonBlock className="h-12 w-full" />
                <SkeletonBlock className="h-12 w-full" />
              </div>
            </div>
            <SkeletonBlock className="h-64" />
          </div>

          <aside className="space-y-6">
            <SkeletonBlock className="h-48" />
            <SkeletonBlock className="h-56" />
          </aside>
        </section>
      </main>
    </div>
  );
}

export function NewRepositoryRouteSkeleton() {
  return (
    <div className="min-h-screen bg-[#0d1117] text-[#c9d1d9]">
      <AppHeaderSkeleton />
      <main className="mx-auto max-w-[768px] px-4 py-10 md:py-12">
        <div className="space-y-3">
          <SkeletonBlock className="h-8 w-64" />
          <SkeletonBlock className="h-4 w-full max-w-2xl" />
          <SkeletonBlock className="h-4 w-72" />
        </div>

        <div className="mt-8 space-y-4 border-t border-[#30363d] pt-6">
          <SkeletonBlock className="h-12 w-full" />
          <SkeletonBlock className="h-12 w-full" />
          <SkeletonBlock className="h-32 w-full" />
          <div className="grid gap-3 sm:grid-cols-2">
            <SkeletonBlock className="h-28 w-full" />
            <SkeletonBlock className="h-28 w-full" />
          </div>
          <SkeletonBlock className="h-11 w-40" />
        </div>
      </main>
    </div>
  );
}

export function SettingsRouteSkeleton() {
  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(15,23,42,0.08),_transparent_40%),linear-gradient(180deg,_#f8fafc,_#e2e8f0)] px-6 py-10">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
        <header className="flex flex-col gap-4 rounded-[2rem] border border-white/70 bg-white/90 p-6 shadow-[0_30px_80px_rgba(15,23,42,0.08)] md:flex-row md:items-center md:justify-between">
          <div className="space-y-3">
            <SkeletonBlock className="h-3 w-36 bg-slate-200" />
            <SkeletonBlock className="h-10 w-56 bg-slate-200" />
            <SkeletonBlock className="h-4 w-full max-w-2xl bg-slate-200" />
            <div className="flex gap-2">
              <SkeletonBlock className="h-10 w-28 rounded-full bg-slate-200" />
              <SkeletonBlock className="h-10 w-28 rounded-full bg-slate-200" />
              <SkeletonBlock className="h-10 w-28 rounded-full bg-slate-200" />
            </div>
          </div>
          <div className="w-full max-w-sm space-y-3 rounded-[1.5rem] border border-slate-200 bg-slate-50 px-5 py-4">
            <SkeletonBlock className="h-4 w-28 bg-slate-200" />
            <SkeletonBlock className="h-6 w-48 bg-slate-200" />
            <SkeletonBlock className="h-4 w-56 bg-slate-200" />
            <SkeletonBlock className="h-9 w-28 bg-slate-200" />
          </div>
        </header>
        <SkeletonBlock className="h-56 w-full rounded-[1.75rem] bg-slate-200" />
      </div>
    </main>
  );
}

export function AuthRouteSkeleton() {
  return (
    <main className="relative flex min-h-screen flex-col items-center bg-[#0d1117] py-10 text-white">
      <div className="w-full max-w-sm px-4">
        <AuthHeaderSkeleton />
        <div className="rounded-xl border border-[#30363d] bg-[#161b22] p-6 shadow-sm">
          <div className="space-y-4">
            <SkeletonBlock className="h-4 w-full max-w-[260px]" />
            <SkeletonBlock className="h-11 w-full bg-[#21262d]" />
            <SkeletonBlock className="h-11 w-full bg-[#21262d]" />
          </div>
        </div>
        <div className="mt-4 rounded-xl border border-[#30363d] p-4">
          <SkeletonBlock className="h-4 w-full" />
        </div>
      </div>
    </main>
  );
}

export function RedirectRouteSkeleton() {
  return (
    <div className="min-h-screen bg-[#0d1117] text-[#c9d1d9]">
      <AppHeaderSkeleton />
      <main className="mx-auto flex w-full max-w-[1280px] items-center justify-center px-4 py-20">
        <div className="w-full max-w-3xl rounded-md border border-[#30363d] bg-[#0d1117] p-8 shadow-[0_24px_60px_rgba(1,4,9,0.35)]">
          <SkeletonBlock className="h-5 w-48" />
          <SkeletonBlock className="mt-4 h-10 w-full" />
          <SkeletonBlock className="mt-3 h-10 w-full" />
          <SkeletonBlock className="mt-3 h-10 w-3/4" />
        </div>
      </main>
    </div>
  );
}
