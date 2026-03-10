import Link from "next/link";
import { notFound } from "next/navigation";
import { signOut } from "@/auth";
import { InternalApiError } from "@/lib/auth/internal-api";
import { buildOwnerHomePath, resolveOwnerHandle } from "@/lib/auth/owner-handle";
import { requireAuthenticatedUser } from "@/lib/auth/protection";
import { fetchRepositoryList } from "@/lib/repos/api";
import type { RepoSummary } from "@/lib/repos/types";
import { FiBookOpen, FiBox, FiGrid, FiInbox, FiSearch, FiStar, FiUsers } from "react-icons/fi";
import { FaBars, FaGithub, FaPlus } from "react-icons/fa";
import { BiGitPullRequest } from "react-icons/bi";
import { LuCircleDot } from "react-icons/lu";

export const dynamic = "force-dynamic";

interface OwnerDashboardPageProps {
  params: Promise<{
    owner: string;
  }>;
  searchParams: Promise<{
    tab?: string;
    q?: string;
  }>;
}

const CONTRIBUTION_MONTHS = ["Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec", "Jan", "Feb", "Mar"] as const;

function contributionLevel(seed: number, index: number): 0 | 1 | 2 | 3 | 4 {
  const value = (seed + index * 17 + (index % 7) * 13) % 100;
  if (value < 55) return 0;
  if (value < 70) return 1;
  if (value < 82) return 2;
  if (value < 93) return 3;
  return 4;
}

function contributionColor(level: 0 | 1 | 2 | 3 | 4): string {
  if (level === 0) return "bg-[#161b22]";
  if (level === 1) return "bg-[#0e4429]";
  if (level === 2) return "bg-[#006d32]";
  if (level === 3) return "bg-[#26a641]";
  return "bg-[#39d353]";
}

function buildContributionSeed(owner: string): number {
  let seed = 0;
  for (let index = 0; index < owner.length; index += 1) {
    seed = (seed + owner.charCodeAt(index) * (index + 1)) % 997;
  }
  return seed;
}

function formatUpdatedAtLabel(value: string): string {
  const updatedAt = new Date(value);

  if (Number.isNaN(updatedAt.getTime())) {
    return "Updated recently";
  }

  const now = Date.now();
  const deltaMs = Math.max(0, now - updatedAt.getTime());
  const minutes = Math.floor(deltaMs / 60_000);

  if (minutes < 60) {
    return `Updated ${Math.max(1, minutes)} minute${minutes === 1 ? "" : "s"} ago`;
  }

  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return `Updated ${hours} hour${hours === 1 ? "" : "s"} ago`;
  }

  const days = Math.floor(hours / 24);
  if (days < 7) {
    return `Updated ${days} day${days === 1 ? "" : "s"} ago`;
  }

  const weeks = Math.floor(days / 7);
  if (weeks < 5) {
    return `Updated ${weeks} week${weeks === 1 ? "" : "s"} ago`;
  }

  const months = Math.floor(days / 30);
  if (months < 12) {
    return `Updated ${months} month${months === 1 ? "" : "s"} ago`;
  }

  const years = Math.floor(days / 365);
  return `Updated ${years} year${years === 1 ? "" : "s"} ago`;
}

function getRepositoryUpdatedLabel(repository: RepoSummary): string {
  const sourceTimestamp = repository.lastPushedAt ?? repository.updatedAt;
  return formatUpdatedAtLabel(sourceTimestamp);
}

function normalizeTab(tab: string | undefined): "overview" | "repositories" | "packages" | "stars" {
  if (tab === "repositories" || tab === "packages" || tab === "stars") {
    return tab;
  }

  return "overview";
}

export default async function OwnerDashboardPage({ params, searchParams }: OwnerDashboardPageProps) {
  const [{ owner }, { tab, q }] = await Promise.all([params, searchParams]);
  const user = await requireAuthenticatedUser(`/${owner}`);
  const ownerHandle = await resolveOwnerHandle(user);
  const ownerPath = buildOwnerHomePath(ownerHandle);
  const activeTab = normalizeTab(tab);
  const repositoryQuery = (q ?? "").trim().toLowerCase();

  if (owner !== ownerHandle) {
    notFound();
  }

  let repositories: RepoSummary[] = [];
  let dashboardError: string | null = null;

  try {
    repositories = await fetchRepositoryList(user);
  } catch (error) {
    dashboardError =
      error instanceof InternalApiError
        ? error.message
        : "The repository service is not ready yet. Check the API and Git service logs.";
  }

  const filteredRepositories =
    repositoryQuery.length === 0
      ? repositories
      : repositories.filter((repository) => {
          const text = `${repository.name} ${repository.description ?? ""}`.toLowerCase();
          return text.includes(repositoryQuery);
        });
  const featuredRepositories = repositories.slice(0, 6);
  const seed = buildContributionSeed(ownerHandle);
  const contributionCells = Array.from({ length: 7 * 52 }, (_, index) => contributionLevel(seed, index));

  async function signOutAction() {
    "use server";
    await signOut({ redirectTo: "/" });
  }

  return (
    <div className="min-h-screen bg-[#0d1117] text-[#c9d1d9]">
      <header className="border-b border-[#30363d] bg-[#010409]">
        <div className="mx-auto flex w-full max-w-[1280px] items-center justify-between gap-3 px-4 py-3">
          <div className="flex min-w-0 items-center gap-3">
            <button className="text-[#8b949e] transition hover:text-[#c9d1d9] sm:hidden" aria-label="Open navigation">
              <FaBars size={20} />
            </button>
            <Link
              href="/"
              className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-[#30363d] text-white transition hover:bg-[#21262d]"
              aria-label="Home"
            >
              <FaGithub size={20} />
            </Link>
            <Link href={ownerPath} className="truncate text-[15px] font-semibold text-[#e6edf3] hover:text-[#58a6ff]">
              {ownerHandle}
            </Link>
          </div>

          <div className="flex flex-1 items-center justify-end gap-2">
            <div className="relative hidden w-full max-w-[320px] sm:block lg:max-w-[400px]">
              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#8b949e]">
                <FiSearch size={14} />
              </span>
              <input
                type="text"
                placeholder="Type to search"
                className="w-full rounded-md border border-[#30363d] bg-[#0d1117] py-1.5 pl-8 pr-8 text-sm focus:border-[#58a6ff] focus:outline-none focus:ring-1 focus:ring-[#58a6ff]"
              />
              <span className="absolute right-2 top-1/2 -translate-y-1/2 rounded-[4px] border border-[#30363d] px-1.5 text-[10px] text-[#8b949e]">
                /
              </span>
            </div>
            <div className="ml-2 flex items-center gap-1 border-l border-[#30363d] pl-2 sm:gap-2 sm:pl-4">
              <Link
                href="/repos/new"
                className="flex items-center gap-1 rounded-md border border-[#30363d] px-2 py-1 text-xs font-medium text-[#c9d1d9] transition hover:border-[#8b949e]"
              >
                <FaPlus size={12} /> <span className="hidden sm:inline">▾</span>
              </Link>
              <button className="hidden rounded-md p-1.5 text-[#c9d1d9] hover:bg-[#30363d] md:block" aria-label="Issues">
                <LuCircleDot size={16} />
              </button>
              <button className="hidden rounded-md p-1.5 text-[#c9d1d9] hover:bg-[#30363d] md:block" aria-label="Pull requests">
                <BiGitPullRequest size={16} />
              </button>
              <button className="relative rounded-md p-1.5 text-[#c9d1d9] hover:bg-[#30363d]" aria-label="Inbox">
                <FiInbox size={16} />
                <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-[#1f6feb] ring-2 ring-[#010409]" />
              </button>
              <Link
                href={ownerPath}
                className="ml-1 flex h-8 w-8 items-center justify-center overflow-hidden rounded-full border border-[#30363d] bg-[#1f6feb] font-bold text-white transition hover:opacity-80"
                aria-label={`${ownerHandle} profile`}
              >
                {user.image ? (
                  <img src={user.image} alt={user.name || ownerHandle} className="h-full w-full object-cover" />
                ) : (
                  <span className="text-sm">{(user.name || ownerHandle).charAt(0).toUpperCase()}</span>
                )}
              </Link>
            </div>
          </div>
        </div>
      </header>

      <nav className="border-b border-[#30363d]">
        <div className="mx-auto flex w-full max-w-[1280px] items-center gap-1 overflow-x-auto px-4">
          {[
            { key: "Overview", icon: <FiBookOpen size={14} />, tab: "overview", href: ownerPath, count: null as number | null },
            { key: "Repositories", icon: <FiGrid size={14} />, tab: "repositories", href: `${ownerPath}?tab=repositories`, count: repositories.length },
            { key: "Packages", icon: <FiBox size={14} />, tab: "packages", href: `${ownerPath}?tab=packages`, count: null as number | null },
            { key: "Stars", icon: <FiStar size={14} />, tab: "stars", href: `${ownerPath}?tab=stars`, count: null as number | null },
          ].map((tab) => (
            <Link
              key={tab.key}
              href={tab.href}
              className={`inline-flex items-center gap-2 border-b-2 px-3 py-3 text-[14px] font-medium whitespace-nowrap ${
                tab.tab === activeTab
                  ? "border-[#f78166] text-[#e6edf3]"
                  : "border-transparent text-[#8b949e] hover:border-[#6e7681] hover:text-[#c9d1d9]"
              }`}
            >
              {tab.icon}
              <span>{tab.key}</span>
              {tab.count !== null ? (
                <span className="rounded-full bg-[#21262d] px-1.5 text-[12px] leading-5 text-[#c9d1d9]">{tab.count}</span>
              ) : null}
            </Link>
          ))}
        </div>
      </nav>

      <main className="mx-auto w-full max-w-[1280px] px-4 py-6">
        <div className="grid gap-8 lg:grid-cols-[296px_minmax(0,1fr)]">
          <aside className="space-y-4">
            <div className="mx-auto h-[260px] w-[260px] overflow-hidden rounded-full border border-[#30363d] bg-[#161b22] lg:mx-0">
              {user.image ? (
                <img src={user.image} alt={user.name ?? ownerHandle} className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-6xl font-semibold text-[#8b949e]">
                  {(user.name ?? ownerHandle).charAt(0).toUpperCase()}
                </div>
              )}
            </div>
            <div>
              <h1 className="text-[26px] font-semibold leading-8 text-[#e6edf3]">{user.name ?? ownerHandle}</h1>
              <p className="text-[20px] text-[#8b949e]">{ownerHandle}</p>
            </div>

            <Link
              href="/settings"
              className="inline-flex h-8 w-full items-center justify-center rounded-md border border-[#30363d] bg-[#21262d] px-3 text-[14px] font-medium text-[#c9d1d9] transition hover:border-[#8b949e] hover:bg-[#30363d]"
            >
              Edit profile
            </Link>

            {user.email ? <p className="text-[14px] text-[#8b949e]">{user.email}</p> : null}

            <div className="text-[14px] text-[#8b949e]">
              <span className="inline-flex items-center gap-1">
                <FiUsers size={14} />
                <span className="font-semibold text-[#c9d1d9]">{repositories.length}</span> repositories
              </span>
              <span className="mx-2">·</span>
              <span>
                <span className="font-semibold text-[#c9d1d9]">{repositories.filter((repository) => !repository.isEmpty).length}</span> active
              </span>
            </div>

            <form action={signOutAction}>
              <button
                type="submit"
                className="inline-flex h-8 w-full items-center justify-center rounded-md border border-[#30363d] bg-[#161b22] px-3 text-[14px] font-medium text-[#c9d1d9] transition hover:border-[#8b949e] hover:bg-[#21262d]"
              >
                Sign out
              </button>
            </form>
          </aside>

          <section className="space-y-6">
            {activeTab === "overview" ? (
              <>
                <div>
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <h2 className="text-[24px] font-semibold text-[#e6edf3]">Popular repositories</h2>
                    <Link href="/repos/new" className="text-[14px] text-[#58a6ff] hover:underline">
                      Customize your pins
                    </Link>
                  </div>

                  {dashboardError ? (
                    <article className="rounded-md border border-[#f85149]/40 bg-[#30191a] p-4 text-[14px] text-[#f0b6b2]">
                      {dashboardError}
                    </article>
                  ) : featuredRepositories.length === 0 ? (
                    <article className="rounded-md border border-dashed border-[#30363d] bg-[#0d1117] p-8 text-center text-[14px] text-[#8b949e]">
                      No repositories yet. Create your first repository to get started.
                    </article>
                  ) : (
                    <div className="grid gap-3 md:grid-cols-2">
                      {featuredRepositories.map((repository) => (
                        <article key={repository.id} className="rounded-md border border-[#30363d] bg-[#0d1117] px-3 py-3">
                          <div className="mb-2 flex items-start justify-between gap-2">
                            <Link
                              href={repository.urls.html}
                              className="truncate text-[18px] font-semibold leading-6 text-[#58a6ff] hover:underline"
                            >
                              {repository.name}
                            </Link>
                            <span className="rounded-full border border-[#30363d] px-2 py-0.5 text-[11px] text-[#8b949e]">
                              {repository.visibility}
                            </span>
                          </div>
                          <p className="mb-1 text-[13px] leading-5 text-[#8b949e]">
                            {repository.description ?? "No description provided."}
                          </p>
                          <div className="text-[12px] text-[#8b949e]">
                            <span>{getRepositoryUpdatedLabel(repository)}</span>
                          </div>
                        </article>
                      ))}
                    </div>
                  )}
                </div>

                <article className="rounded-md border border-[#30363d] bg-[#0d1117] p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <h3 className="text-[28px] font-semibold text-[#e6edf3]">Contribution activity</h3>
                    <span className="text-[14px] text-[#8b949e]">{new Date().getFullYear()}</span>
                  </div>
                  <div className="mb-3 text-[14px] text-[#8b949e]">
                    <span className="font-semibold text-[#e6edf3]">{repositories.length * 19}</span> contributions in the last year
                  </div>
                  <div className="overflow-x-auto rounded-md border border-[#30363d] bg-[#010409] p-4">
                    <div className="mb-2 grid grid-cols-[repeat(13,minmax(0,1fr))] gap-2 text-[12px] text-[#8b949e]">
                      {CONTRIBUTION_MONTHS.map((month, index) => (
                        <span key={`${month}-${index}`}>{month}</span>
                      ))}
                    </div>
                    <div className="grid grid-flow-col grid-rows-7 gap-1">
                      {contributionCells.map((level, index) => (
                        <span
                          key={index}
                          className={`h-[10px] w-[10px] rounded-[2px] ${contributionColor(level)}`}
                          aria-hidden
                        />
                      ))}
                    </div>
                  </div>
                </article>
              </>
            ) : null}

            {activeTab === "repositories" ? (
              <section className="space-y-4">
                <form method="GET" className="flex flex-col gap-3 rounded-md border border-[#30363d] bg-[#0d1117] p-3 md:flex-row md:items-center">
                  <input type="hidden" name="tab" value="repositories" />
                  <input
                    type="text"
                    name="q"
                    defaultValue={repositoryQuery}
                    placeholder="Find a repository..."
                    className="h-8 flex-1 rounded-md border border-[#30363d] bg-[#010409] px-3 text-[14px] text-[#c9d1d9] placeholder:text-[#8b949e] focus:border-[#58a6ff] focus:outline-none focus:ring-1 focus:ring-[#58a6ff]"
                  />
                  <div className="flex items-center gap-2">
                    <button
                      type="submit"
                      className="inline-flex h-8 items-center rounded-md border border-[#30363d] bg-[#21262d] px-3 text-[14px] text-[#c9d1d9] transition hover:border-[#8b949e]"
                    >
                      Search
                    </button>
                    <button type="button" className="inline-flex h-8 items-center rounded-md border border-[#30363d] bg-[#21262d] px-3 text-[14px] text-[#c9d1d9]">
                      Type
                    </button>
                    <button type="button" className="inline-flex h-8 items-center rounded-md border border-[#30363d] bg-[#21262d] px-3 text-[14px] text-[#c9d1d9]">
                      Language
                    </button>
                    <button type="button" className="inline-flex h-8 items-center rounded-md border border-[#30363d] bg-[#21262d] px-3 text-[14px] text-[#c9d1d9]">
                      Sort
                    </button>
                    <Link
                      href="/repos/new"
                      className="inline-flex h-8 items-center rounded-md border border-[#2ea043] bg-[#238636] px-3 text-[14px] font-semibold text-white transition hover:bg-[#2ea043]"
                    >
                      New
                    </Link>
                  </div>
                </form>

                {dashboardError ? (
                  <article className="rounded-md border border-[#f85149]/40 bg-[#30191a] p-4 text-[14px] text-[#f0b6b2]">{dashboardError}</article>
                ) : filteredRepositories.length === 0 ? (
                  <article className="rounded-md border border-dashed border-[#30363d] bg-[#0d1117] p-8 text-center text-[14px] text-[#8b949e]">
                    No repositories matched your filter.
                  </article>
                ) : (
                  <div className="rounded-md border border-[#30363d] bg-[#0d1117]">
                    {filteredRepositories.map((repository) => (
                      <article key={repository.id} className="border-b border-[#30363d] px-4 py-4 last:border-b-0">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <Link href={repository.urls.html} className="truncate text-[18px] font-semibold leading-6 text-[#58a6ff] hover:underline">
                                {repository.name}
                              </Link>
                              <span className="rounded-full border border-[#30363d] px-2 py-0.5 text-[11px] text-[#8b949e]">
                                {repository.visibility}
                              </span>
                            </div>
                            {repository.description ? (
                              <p className="mt-1 text-[13px] text-[#8b949e]">{repository.description}</p>
                            ) : null}
                            <div className="mt-1 text-[12px] text-[#8b949e]">
                              <span>{getRepositoryUpdatedLabel(repository)}</span>
                            </div>
                          </div>
                          <button
                            type="button"
                            className="inline-flex h-7 items-center rounded-md border border-[#30363d] bg-[#21262d] px-2.5 text-[13px] font-medium text-[#c9d1d9] transition hover:border-[#8b949e]"
                          >
                            Star
                          </button>
                        </div>
                      </article>
                    ))}
                  </div>
                )}
              </section>
            ) : null}

            {activeTab === "packages" || activeTab === "stars" ? (
              <article className="rounded-md border border-dashed border-[#30363d] bg-[#0d1117] p-8 text-center text-[14px] text-[#8b949e]">
                {activeTab === "packages" ? "Packages view is not configured yet." : "Stars view is not configured yet."}
              </article>
            ) : null}
          </section>
        </div>
      </main>
    </div>
  );
}
