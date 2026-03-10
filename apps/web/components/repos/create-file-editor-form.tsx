"use client";

import Link from "next/link";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import type { RepoMutationState } from "@/components/repos/create-file-form";

interface CreateFileEditorFormProps {
  action: (state: RepoMutationState, formData: FormData) => Promise<RepoMutationState>;
  repositoryName: string;
  branch: string;
  cancelHref: string;
}

function CommitButton({ className }: { className: string }) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className={className}
    >
      {pending ? "Committing..." : "Commit changes..."}
    </button>
  );
}

export function CreateFileEditorForm({ action, repositoryName, branch, cancelHref }: CreateFileEditorFormProps) {
  const [state, formAction] = useActionState(action, {});

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="branch" value={branch} />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <span className="truncate text-[30px] font-semibold leading-8 text-[#58a6ff]">{repositoryName}</span>
          <span className="text-[30px] font-semibold leading-8 text-[#58a6ff]">/</span>
          <input
            name="filePath"
            placeholder="Name your file..."
            required
            className="h-11 w-full min-w-[220px] rounded-md border border-[#1f6feb] bg-[#0d1117] px-3 text-lg text-[#e6edf3] outline-none transition focus:ring-2 focus:ring-[#1f6feb]"
          />
          <span className="rounded-md border border-[#30363d] bg-[#161b22] px-2 py-1 text-xs font-semibold text-[#8b949e]">{branch}</span>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href={cancelHref}
            className="inline-flex items-center rounded-md border border-[#30363d] bg-[#21262d] px-4 py-2 text-sm font-semibold text-[#c9d1d9] transition hover:bg-[#30363d]"
          >
            Cancel changes
          </Link>
          <CommitButton className="inline-flex items-center rounded-md border border-[#2ea043] bg-[#238636] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#2ea043] disabled:cursor-not-allowed disabled:border-[#6e7681] disabled:bg-[#6e7681]" />
        </div>
      </div>

      <div className="overflow-hidden rounded-md border border-[#30363d] bg-[#0d1117]">
        <div className="border-b border-[#30363d] px-4 py-2">
          <div className="inline-flex overflow-hidden rounded-md border border-[#30363d] bg-[#161b22]">
            <span className="border-r border-[#30363d] bg-[#0d1117] px-4 py-1.5 text-sm font-semibold text-[#e6edf3]">Edit</span>
            <span className="px-4 py-1.5 text-sm text-[#8b949e]">Preview</span>
          </div>
        </div>

        <textarea
          name="content"
          placeholder="Enter file contents here"
          required
          className="min-h-[560px] w-full resize-y bg-[#0d1117] px-4 py-4 font-mono text-sm leading-6 text-[#c9d1d9] outline-none"
        />
      </div>

      <div className="grid gap-2">
        <label htmlFor="create-file-commit-message" className="text-sm font-medium text-[#e6edf3]">
          Commit message
        </label>
        <input
          id="create-file-commit-message"
          name="commitMessage"
          placeholder="Create new file"
          className="w-full rounded-md border border-[#30363d] bg-[#010409] px-3 py-2 text-sm text-[#c9d1d9] outline-none transition focus:border-[#1f6feb] focus:ring-1 focus:ring-[#1f6feb]"
        />
      </div>

      {state.error ? <p className="text-sm text-[#ff7b72]">{state.error}</p> : null}
    </form>
  );
}
