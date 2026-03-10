import Link from "next/link";
import type { RepoTreeEntry } from "@/lib/repos/types";

interface FileTreeProps {
  entries: RepoTreeEntry[];
  buildTreeHref: (path: string) => string;
  buildBlobHref: (path: string) => string;
}

export function FileTree({ entries, buildTreeHref, buildBlobHref }: FileTreeProps) {
  if (entries.length === 0) {
    return (
      <div className="rounded-md border border-dashed border-[#30363d] bg-[#010409] px-4 py-6 text-sm text-[#8b949e]">
        This directory is empty.
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-md border border-[#30363d] bg-[#0d1117]">
      <ul className="divide-y divide-[#21262d]">
        {entries.map((entry) => (
          <li key={entry.path} className="flex items-center justify-between gap-4 px-4 py-3 text-sm">
            <div className="min-w-0">
              <span className="mr-3 rounded-full border border-[#30363d] px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-[#8b949e]">
                {entry.type}
              </span>
              <Link
                href={entry.type === "tree" ? buildTreeHref(entry.path) : buildBlobHref(entry.path)}
                className="font-medium text-[#58a6ff] hover:text-[#79c0ff]"
              >
                {entry.name}
              </Link>
            </div>
            <span className="text-xs text-[#8b949e]">{entry.size !== null ? `${entry.size} bytes` : ""}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
