import Link from "next/link";
import type { ReactNode } from "react";
import type { AuthenticatedAppUser } from "@/lib/auth/protection";
import { SignOutForm } from "@/components/auth/sign-out-form";

interface AuthShellProps {
  heading: string;
  description: string;
  user: AuthenticatedAppUser;
  dashboardHref: string;
  children: ReactNode;
}

export function AuthShell({ heading, description, user, dashboardHref, children }: AuthShellProps) {
  const navigationItems = [
    { href: dashboardHref, label: "Dashboard" },
    { href: "/repos/new", label: "Create Repo" },
    { href: "/settings", label: "Settings" },
  ] as const;

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(15,23,42,0.08),_transparent_40%),linear-gradient(180deg,_#f8fafc,_#e2e8f0)] px-6 py-10">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
        <header className="flex flex-col gap-4 rounded-[2rem] border border-white/70 bg-white/90 p-6 shadow-[0_30px_80px_rgba(15,23,42,0.08)] backdrop-blur md:flex-row md:items-center md:justify-between">
          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-[0.35em] text-slate-500">Authenticated Workspace</p>
            <div>
              <h1 className="text-3xl font-semibold text-slate-950">{heading}</h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">{description}</p>
            </div>
            <nav className="flex flex-wrap gap-2">
              {navigationItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-950 hover:text-slate-950"
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>
          <div className="flex min-w-0 flex-col items-start gap-3 rounded-[1.5rem] border border-slate-200 bg-slate-50 px-5 py-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">Active Session</p>
              <p className="mt-2 truncate text-lg font-semibold text-slate-950">{user.name ?? "Unnamed user"}</p>
              <p className="truncate text-sm text-slate-600">{user.email ?? "GitHub did not provide a public email."}</p>
              <p className="mt-1 text-xs text-slate-500">User ID: {user.id}</p>
            </div>
            <SignOutForm />
          </div>
        </header>
        {children}
      </div>
    </main>
  );
}
