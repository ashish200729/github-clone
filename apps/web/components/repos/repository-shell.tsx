import Link from "next/link";
import type { ReactNode } from "react";
import { BranchPicker } from "@/components/repos/branch-picker";
import type { RepoBranch, RepoSummary } from "@/lib/repos/types";
import { buildRepoHomePath, buildRepoSettingsPath } from "@/lib/repos/routes";
import { Bell, CircleDot, Code, GitPullRequest, Plus, Search, Settings } from "lucide-react";
import { getOptionalAuthenticatedUser } from "@/lib/auth/protection";

interface RepositoryShellProps {
  repository: RepoSummary;
  branches: RepoBranch[];
  activeBranch: string;
  branchBasePath?: string;
  activeTab?: "code" | "settings";
  children: ReactNode;
}

export async function RepositoryShell({
  repository,
  branches,
  activeBranch,
  branchBasePath,
  activeTab = "code",
  children,
}: RepositoryShellProps) {
  const viewer = await getOptionalAuthenticatedUser();
  const ownerInitial = (viewer?.name || viewer?.email || repository.owner.handle).charAt(0).toUpperCase();

  const repositoryTabs = [
    { key: "code", label: "Code", href: buildRepoHomePath(repository.owner.handle, repository.name, activeBranch), active: activeTab === "code", icon: Code },
    {
      key: "pull-requests",
      label: "Pull requests",
      href: `${buildRepoHomePath(repository.owner.handle, repository.name, activeBranch)}#pull-requests`,
      active: false,
      icon: GitPullRequest,
    },
    { key: "issues", label: "Issues", href: `${buildRepoHomePath(repository.owner.handle, repository.name, activeBranch)}#issues`, active: false, icon: CircleDot },
    { key: "settings", label: "Settings", href: buildRepoSettingsPath(repository.owner.handle, repository.name), active: activeTab === "settings", icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-[#0d1117] text-[#c9d1d9] pb-8">
      <header className="border-b border-[#30363d] bg-[#010409]">
        <div className="mx-auto flex w-full max-w-[1280px] items-center justify-between gap-3 px-4 py-3">
          <div className="flex min-w-0 items-center gap-3">
            <Link href="/" className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-[#30363d] text-[#e6edf3]">
              <Code size={16} />
            </Link>
            <p className="truncate text-[15px] font-semibold text-[#e6edf3]">
              <Link href={`/${repository.owner.handle}`} className="hover:underline">{repository.owner.handle}</Link>
              <span className="mx-1 text-[#8b949e]">/</span>
              <Link href={buildRepoHomePath(repository.owner.handle, repository.name)} className="font-semibold hover:underline">{repository.name}</Link>
            </p>
            <span className="rounded-full border border-[#30363d] px-2 py-0.5 text-xs text-[#8b949e] ml-2 hidden sm:inline-block">{repository.visibility}</span>
          </div>

          <div className="flex flex-1 items-center justify-end gap-2">
            <label className="relative hidden w-full max-w-[320px] md:block">
              <Search size={14} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-[#8b949e]" />
              <input
                type="text"
                readOnly
                value="Type / to search"
                aria-label="Search"
                className="w-full rounded-md border border-[#30363d] bg-[#0d1117] py-1.5 pl-8 pr-8 text-sm text-[#8b949e]"
              />
            </label>
            <button className="hidden rounded-md border border-[#30363d] p-1.5 text-[#c9d1d9] hover:bg-[#21262d] lg:inline-flex" aria-label="Create">
              <Plus size={14} />
            </button>
            <button className="rounded-md border border-[#30363d] p-1.5 text-[#c9d1d9] hover:bg-[#21262d]" aria-label="Notifications">
              <Bell size={14} />
            </button>
            <Link
              href={`/${encodeURIComponent(repository.owner.handle)}`}
              className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full border border-[#30363d] bg-[#1f6feb] text-sm font-semibold text-white ml-2"
            >
              {viewer?.image ? <img src={viewer.image} alt={viewer.name || repository.owner.handle} className="h-full w-full object-cover" /> : ownerInitial}
            </Link>
          </div>
        </div>
      </header>

      <nav className="border-b border-[#30363d] bg-[#010409]">
        <div className="mx-auto flex w-full max-w-[1280px] items-center gap-1 overflow-x-auto px-4 mt-2">
          {repositoryTabs.map((tab) => {
            const Icon = tab.icon;

            return (
              <Link
                key={tab.key}
                href={tab.href}
                className={`inline-flex items-center gap-2 border-b-2 px-3 py-2 text-[14px] font-medium whitespace-nowrap ${
                  tab.active
                    ? "border-[#f78166] text-[#e6edf3]"
                    : "border-transparent text-[#8b949e] hover:border-[#6e7681] hover:text-[#c9d1d9]"
                }`}
              >
                <Icon size={15} />
                <span>{tab.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>

      <main className="mx-auto w-full max-w-[1280px] px-4 py-6">
        {Object.keys(repositoryTabs).length === 0 && (
            <div className="mb-4">
              <BranchPicker
                branches={branches}
                selectedBranch={activeBranch}
                basePath={branchBasePath ?? repository.urls.html}
                variant="github-dark"
              />
            </div>
        )}
        {children}
      </main>
    </div>
  );
}
