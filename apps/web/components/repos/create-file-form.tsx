"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

export interface RepoMutationState {
  error?: string;
  success?: string;
  token?: string;
  expiresAt?: string;
  username?: string;
  cloneUrl?: string;
}

interface CreateFileFormProps {
  action: (state: RepoMutationState, formData: FormData) => Promise<RepoMutationState>;
  defaultPath?: string;
  defaultBranch: string;
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
      {pending ? "Committing..." : "Create file"}
    </button>
  );
}

export function CreateFileForm({ action, defaultPath = "", defaultBranch, variant = "default" }: CreateFileFormProps) {
  const [state, formAction] = useActionState(action, {});
  const isDark = variant === "github-dark";

  return (
    <form
      action={formAction}
      className={
        isDark
          ? "grid gap-3 rounded-md border border-[#30363d] bg-[#0d1117] p-4"
          : "grid gap-3 rounded-[1.5rem] border border-slate-200 bg-white p-4"
      }
    >
      <div>
        <label htmlFor="create-file-path" className={isDark ? "text-sm font-medium text-[#e6edf3]" : "text-sm font-medium text-slate-950"}>
          File path
        </label>
        <input
          id="create-file-path"
          name="filePath"
          defaultValue={defaultPath}
          className={
            isDark
              ? "mt-2 w-full rounded-md border border-[#30363d] bg-[#010409] px-3 py-2 text-sm text-[#c9d1d9] outline-none transition focus:border-[#1f6feb] focus:ring-1 focus:ring-[#1f6feb]"
              : "mt-2 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-slate-950"
          }
          placeholder="docs/intro.md"
          required
        />
      </div>

      <input type="hidden" name="branch" value={defaultBranch} />

      <div>
        <label
          htmlFor="create-file-message"
          className={isDark ? "text-sm font-medium text-[#e6edf3]" : "text-sm font-medium text-slate-950"}
        >
          Commit message
        </label>
        <input
          id="create-file-message"
          name="commitMessage"
          className={
            isDark
              ? "mt-2 w-full rounded-md border border-[#30363d] bg-[#010409] px-3 py-2 text-sm text-[#c9d1d9] outline-none transition focus:border-[#1f6feb] focus:ring-1 focus:ring-[#1f6feb]"
              : "mt-2 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-slate-950"
          }
          placeholder="Create docs/intro.md"
        />
      </div>

      <div>
        <label
          htmlFor="create-file-content"
          className={isDark ? "text-sm font-medium text-[#e6edf3]" : "text-sm font-medium text-slate-950"}
        >
          File contents
        </label>
        <textarea
          id="create-file-content"
          name="content"
          rows={10}
          className={
            isDark
              ? "mt-2 w-full rounded-md border border-[#30363d] bg-[#010409] px-3 py-2 font-mono text-sm text-[#c9d1d9] outline-none transition focus:border-[#1f6feb] focus:ring-1 focus:ring-[#1f6feb]"
              : "mt-2 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 font-mono text-sm text-slate-950 outline-none transition focus:border-slate-950"
          }
          placeholder="# Hello"
          required
        />
      </div>

      {state.error ? <p className={isDark ? "text-sm text-[#ff7b72]" : "text-sm text-rose-700"}>{state.error}</p> : null}
      {state.success ? <p className={isDark ? "text-sm text-[#3fb950]" : "text-sm text-emerald-700"}>{state.success}</p> : null}

      <SubmitButton variant={variant} />
    </form>
  );
}
