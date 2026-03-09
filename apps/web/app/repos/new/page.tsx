import { redirect } from "next/navigation";
import { AuthShell } from "@/components/auth/auth-shell";
import { fetchInternalApiJson } from "@/lib/auth/internal-api";
import { requireAuthenticatedUser } from "@/lib/auth/protection";

export const dynamic = "force-dynamic";

async function createRepositoryAction(formData: FormData) {
  "use server";

  const user = await requireAuthenticatedUser("/repos/new");
  const rawName = String(formData.get("name") ?? "");
  const name = rawName.trim().toLowerCase();

  if (!/^[a-z0-9](?:[a-z0-9-]{0,37}[a-z0-9])?$/.test(name)) {
    redirect("/auth/error?error=InternalApiUnavailable");
  }

  await fetchInternalApiJson("/api/internal/repos", {
    user,
    method: "POST",
    body: {
      name,
    },
  });

  redirect(`/dashboard?created=${encodeURIComponent(name)}`);
}

export default async function NewRepositoryPage() {
  const user = await requireAuthenticatedUser("/repos/new");

  return (
    <AuthShell
      heading="Create Repository"
      description="This form submits through a server action. The server action re-verifies the session before forwarding a signed actor envelope to Express."
      user={user}
    >
      <section className="rounded-[1.75rem] border border-white/70 bg-white/90 p-6 shadow-[0_25px_70px_rgba(15,23,42,0.06)]">
        <form action={createRepositoryAction} className="grid gap-5">
          <div>
            <label htmlFor="name" className="text-sm font-medium text-slate-950">
              Repository name
            </label>
            <input
              id="name"
              name="name"
              type="text"
              maxLength={39}
              pattern="^[a-z0-9](?:[a-z0-9-]{0,37}[a-z0-9])?$"
              required
              className="mt-2 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-slate-950"
              placeholder="project-alpha"
            />
            <p className="mt-2 text-sm text-slate-500">Lowercase letters, numbers, and hyphens only. This is a protected mutation path.</p>
          </div>
          <div className="flex gap-3">
            <button
              type="submit"
              className="inline-flex items-center justify-center rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              Create draft repo
            </button>
          </div>
        </form>
      </section>
    </AuthShell>
  );
}
