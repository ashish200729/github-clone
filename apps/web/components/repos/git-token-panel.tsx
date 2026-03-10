"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import type { RepoMutationState } from "@/components/repos/create-file-form";

interface GitTokenPanelProps {
  action: (state: RepoMutationState, formData: FormData) => Promise<RepoMutationState>;
  owner: string;
  variant?: "default" | "github-dark";
}

function SubmitButton({ variant }: { variant: "default" | "github-dark" }) {
  const { pending } = useFormStatus();
  const isDark = variant === "github-dark";

  return (
    <button
      type="submit"
      disabled={pending}
      className={
        isDark
          ? "inline-flex items-center justify-center rounded-md border border-[#2ea043] bg-[#238636] px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-[#2ea043] disabled:cursor-not-allowed disabled:border-[#6e7681] disabled:bg-[#6e7681]"
          : "inline-flex items-center justify-center rounded-full bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
      }
    >
      {pending ? "Generating..." : "Generate Git token"}
    </button>
  );
}

export function GitTokenPanel({ action, owner, variant = "default" }: GitTokenPanelProps) {
  const [state, formAction] = useActionState(action, {});
  const isDark = variant === "github-dark";

  return (
    <form
      action={formAction}
      className={
        isDark
          ? "grid gap-3 rounded-md border border-[#30363d] bg-[#0d1117] p-4"
          : "grid gap-3 rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4"
      }
    >
      <p className={isDark ? "text-sm text-[#8b949e]" : "text-sm text-slate-600"}>
        Private clone and any push over HTTPS require a temporary repo-scoped token.
      </p>
      <SubmitButton variant={variant} />

      {state.error ? <p className={isDark ? "text-sm text-[#ff7b72]" : "text-sm text-rose-700"}>{state.error}</p> : null}
      {state.token ? (
        <div
          className={
            isDark
              ? "grid gap-3 rounded-md border border-[#30363d] bg-[#010409] p-4 text-sm text-[#c9d1d9]"
              : "grid gap-3 rounded-[1.25rem] border border-emerald-200 bg-emerald-50 p-4 text-sm text-slate-700"
          }
        >
          <p className={isDark ? "font-semibold text-[#e6edf3]" : "font-semibold text-slate-950"}>Temporary Git credentials</p>
          <p>
            <span className={isDark ? "font-medium text-[#e6edf3]" : "font-medium text-slate-950"}>Username:</span> {state.username ?? owner}
          </p>
          <p>
            <span className={isDark ? "font-medium text-[#e6edf3]" : "font-medium text-slate-950"}>Expires:</span> {state.expiresAt}
          </p>
          <pre className={isDark ? "overflow-x-auto rounded-md border border-[#30363d] bg-[#0d1117] p-3 text-xs text-[#e6edf3]" : "overflow-x-auto rounded-2xl bg-slate-950 p-4 text-xs text-slate-100"}>
            {state.token}
          </pre>
          {state.cloneUrl ? (
            <pre
              className={
                isDark
                  ? "overflow-x-auto rounded-md border border-[#30363d] bg-[#0d1117] p-3 text-xs text-[#c9d1d9]"
                  : "overflow-x-auto rounded-2xl bg-white p-4 text-xs text-slate-700"
              }
            >
{`git clone ${state.cloneUrl}
cd ${state.cloneUrl.split("/").pop()?.replace(/\.git$/, "") ?? "repo"}
git config credential.username ${state.username ?? owner}`}
            </pre>
          ) : null}
        </div>
      ) : null}
    </form>
  );
}
