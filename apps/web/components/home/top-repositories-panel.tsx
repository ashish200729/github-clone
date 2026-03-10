"use client";

import { useDeferredValue, useState } from "react";
import { BiGitRepoForked } from "react-icons/bi";
import { InstantLink as Link } from "@/components/navigation/instant-link";
import type { AuthenticatedAppUser } from "@/lib/auth/protection";
import type { RepoSummary } from "@/lib/repos/types";

interface TopRepositoriesPanelProps {
  user: AuthenticatedAppUser;
  repositories: RepoSummary[];
  dashboardError?: string | null;
  ownerPageHref: string;
}

function normalizeSearchValue(value: string): string {
  return value.trim().toLowerCase();
}

export function TopRepositoriesPanel({ user, repositories, dashboardError, ownerPageHref }: TopRepositoriesPanelProps) {
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);
  const normalizedQuery = normalizeSearchValue(deferredQuery);

  const filteredRepositories =
    normalizedQuery.length === 0
      ? repositories.slice(0, 7)
      : repositories.filter((repository) => {
          const haystack = `${repository.owner.handle}/${repository.name} ${repository.description ?? ""}`.toLowerCase();
          return haystack.includes(normalizedQuery);
        });

  return (
    <>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold">Top repositories</h2>
        <Link
          href="/repos/new"
          className="text-xs bg-[#238636] hover:bg-[#2ea043] text-white px-2 py-1.5 rounded-md font-medium flex items-center gap-1 leading-none shadow-sm"
        >
          <BiGitRepoForked /> New
        </Link>
      </div>

      <div className="mb-4">
        <input
          type="text"
          placeholder="Find a repository..."
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          className="w-full bg-[#0d1117] border border-[#30363d] rounded-md py-[5px] px-3 text-[14px] text-[#c9d1d9] placeholder:text-[#8b949e] focus:outline-none focus:border-[#58a6ff] focus:ring-1 focus:ring-[#58a6ff] shadow-sm"
          autoComplete="off"
          spellCheck={false}
        />
      </div>

      {dashboardError ? (
        <div className="rounded-md border border-[#f0883e]/40 bg-[#3d2c0f] px-3 py-3 text-[13px] text-[#f2cc60]">
          {dashboardError}
        </div>
      ) : repositories.length === 0 ? (
        <div className="rounded-md border border-dashed border-[#30363d] px-3 py-4 text-[13px] text-[#8b949e]">
          No repositories yet.
        </div>
      ) : filteredRepositories.length === 0 ? (
        <div className="rounded-md border border-dashed border-[#30363d] px-3 py-4 text-[13px] text-[#8b949e]">
          No repositories match &quot;{query.trim()}&quot;.
        </div>
      ) : (
        <ul className="space-y-3 md:space-y-[10px]">
          {filteredRepositories.map((repository) => (
            <li key={repository.id} className="flex items-center gap-3 text-[14px]">
              <div className="w-4 h-4 rounded-full flex-shrink-0 overflow-hidden bg-[#1f6feb] flex items-center justify-center border border-[#30363d] text-white">
                {user.image ? (
                  <img src={user.image} alt={repository.name} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-[8px] font-bold">{repository.name.charAt(0).toUpperCase()}</span>
                )}
              </div>
              <Link href={repository.urls.html} className="font-semibold text-[#c9d1d9] hover:underline truncate">
                {repository.owner.handle}/{repository.name}
              </Link>
            </li>
          ))}
        </ul>
      )}

      {normalizedQuery.length === 0 && repositories.length > 7 ? (
        <Link href={ownerPageHref} className="mt-5 block text-[13px] text-[#8b949e] hover:text-[#58a6ff]">
          Show more
        </Link>
      ) : null}
    </>
  );
}
