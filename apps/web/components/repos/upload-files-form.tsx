"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import type { RepoMutationState } from "@/components/repos/create-file-form";

interface UploadFilesFormProps {
  action: (state: RepoMutationState, formData: FormData) => Promise<RepoMutationState>;
  defaultBranch: string;
  targetPath?: string;
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
          : "inline-flex items-center justify-center rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-950 ring-1 ring-slate-300 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:bg-slate-100"
      }
    >
      {pending ? "Uploading..." : "Upload files"}
    </button>
  );
}

export function UploadFilesForm({ action, defaultBranch, targetPath = "", variant = "default" }: UploadFilesFormProps) {
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
      <input type="hidden" name="branch" value={defaultBranch} />
      <input type="hidden" name="path" value={targetPath} />

      <div>
        <label htmlFor="upload-files" className={isDark ? "text-sm font-medium text-[#e6edf3]" : "text-sm font-medium text-slate-950"}>
          Files
        </label>
        <input
          id="upload-files"
          name="files"
          type="file"
          multiple
          className={
            isDark
              ? "mt-2 block w-full text-sm text-[#8b949e] file:mr-3 file:rounded-md file:border file:border-[#30363d] file:bg-[#21262d] file:px-3 file:py-1.5 file:font-semibold file:text-[#c9d1d9] file:hover:bg-[#30363d]"
              : "mt-2 block w-full text-sm text-slate-600 file:mr-4 file:rounded-full file:border-0 file:bg-slate-950 file:px-4 file:py-2 file:font-semibold file:text-white"
          }
          required
        />
        <p className={isDark ? "mt-2 text-sm text-[#8b949e]" : "mt-2 text-sm text-slate-500"}>
          Supports multiple files in the current directory. Folder uploads are intentionally postponed for this phase.
        </p>
      </div>

      <div>
        <label htmlFor="upload-message" className={isDark ? "text-sm font-medium text-[#e6edf3]" : "text-sm font-medium text-slate-950"}>
          Commit message
        </label>
        <input
          id="upload-message"
          name="commitMessage"
          className={
            isDark
              ? "mt-2 w-full rounded-md border border-[#30363d] bg-[#010409] px-3 py-2 text-sm text-[#c9d1d9] outline-none transition focus:border-[#1f6feb] focus:ring-1 focus:ring-[#1f6feb]"
              : "mt-2 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-slate-950"
          }
          placeholder="Upload files"
        />
      </div>

      {state.error ? <p className={isDark ? "text-sm text-[#ff7b72]" : "text-sm text-rose-700"}>{state.error}</p> : null}
      {state.success ? <p className={isDark ? "text-sm text-[#3fb950]" : "text-sm text-emerald-700"}>{state.success}</p> : null}

      <SubmitButton variant={variant} />
    </form>
  );
}
