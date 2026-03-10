"use client";

import { useRouter } from "next/navigation";
import { startTransition } from "react";

interface BranchPickerProps {
  branches: Array<{ name: string }>;
  selectedBranch: string;
  basePath: string;
  path?: string;
  variant?: "default" | "github-dark";
}

export function BranchPicker({ branches, selectedBranch, basePath, path = "", variant = "default" }: BranchPickerProps) {
  const router = useRouter();
  const isDark = variant === "github-dark";

  return (
    <label
      className={
        isDark
          ? "inline-flex items-center gap-3 rounded-md border border-[#30363d] bg-[#21262d] px-3 py-1.5 text-sm text-[#c9d1d9]"
          : "inline-flex items-center gap-3 rounded-full border border-slate-300 bg-white px-4 py-2 text-sm text-slate-700"
      }
    >
      <span className={isDark ? "font-semibold text-[#e6edf3]" : "font-semibold text-slate-950"}>Branch</span>
      <select
        className={isDark ? "bg-transparent text-[#c9d1d9] outline-none" : "bg-transparent outline-none"}
        defaultValue={selectedBranch}
        onChange={(event) => {
          const nextUrl = new URL(basePath, window.location.origin);
          nextUrl.searchParams.set("branch", event.target.value);

          if (path) {
            nextUrl.searchParams.set("path", path);
          }

          startTransition(() => {
            router.push(`${nextUrl.pathname}${nextUrl.search}`);
          });
        }}
      >
        {branches.map((branch) => (
          <option key={branch.name} value={branch.name} className={isDark ? "bg-[#0d1117] text-[#c9d1d9]" : undefined}>
            {branch.name}
          </option>
        ))}
      </select>
    </label>
  );
}
