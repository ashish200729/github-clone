"use client";

import Link from "next/link";
import { FileUp } from "lucide-react";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import type { RepoMutationState } from "@/components/repos/create-file-form";

interface UploadFilesPageFormProps {
  action: (state: RepoMutationState, formData: FormData) => Promise<RepoMutationState>;
  repositoryName: string;
  branch: string;
  cancelHref: string;
}

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex items-center rounded-md border border-[#2ea043] bg-[#238636] px-5 py-2 text-sm font-semibold text-white transition hover:bg-[#2ea043] disabled:cursor-not-allowed disabled:border-[#6e7681] disabled:bg-[#6e7681]"
    >
      {pending ? "Committing..." : "Commit changes"}
    </button>
  );
}

export function UploadFilesPageForm({ action, repositoryName, branch, cancelHref }: UploadFilesPageFormProps) {
  const [state, formAction] = useActionState(action, {});

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="branch" value={branch} />
      <input type="hidden" name="path" value="" />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-3xl font-semibold leading-8 text-[#58a6ff] sm:text-4xl">
          {repositoryName}
          <span className="ml-2 text-[#58a6ff]">/</span>
        </p>
        <Link
          href={cancelHref}
          className="inline-flex items-center rounded-md border border-[#30363d] bg-[#21262d] px-4 py-2 text-sm font-semibold text-[#c9d1d9] transition hover:bg-[#30363d]"
        >
          Cancel
        </Link>
      </div>

      <div className="rounded-md border border-[#30363d] bg-[#0d1117] px-4 py-8 sm:px-6 sm:py-14">
        <label
          htmlFor="upload-files-page-input"
          className="flex cursor-pointer flex-col items-center justify-center rounded-md border border-dashed border-[#30363d] bg-[#010409] px-4 py-10 text-center transition hover:border-[#58a6ff] hover:bg-[#0d1117] sm:py-14"
        >
          <span className="inline-flex h-14 w-14 items-center justify-center rounded-full border border-[#30363d] bg-[#0d1117] text-[#8b949e]">
            <FileUp size={28} />
          </span>
          <p className="mt-6 text-2xl font-semibold leading-tight text-[#e6edf3] sm:text-4xl">Drag files here to add them to your repository</p>
          <p className="mt-2 text-lg text-[#8b949e] sm:text-2xl">
            Or <span className="text-[#58a6ff] underline underline-offset-2">choose your files</span>
          </p>
          <input id="upload-files-page-input" name="files" type="file" multiple required className="sr-only" />
        </label>
      </div>

      <div className="rounded-md border border-[#30363d] bg-[#0d1117] p-4">
        <h2 className="text-2xl font-semibold text-[#e6edf3] sm:text-4xl">Commit changes</h2>

        <div className="mt-4 grid gap-3">
          <input
            name="commitMessage"
            placeholder="Add files via upload"
            className="w-full rounded-md border border-[#30363d] bg-[#010409] px-3 py-2 text-sm text-[#c9d1d9] outline-none transition focus:border-[#1f6feb] focus:ring-1 focus:ring-[#1f6feb]"
          />
          <textarea
            name="commitDescription"
            rows={4}
            placeholder="Add an optional extended description..."
            className="w-full resize-y rounded-md border border-[#30363d] bg-[#010409] px-3 py-2 text-sm text-[#c9d1d9] outline-none transition focus:border-[#1f6feb] focus:ring-1 focus:ring-[#1f6feb]"
          />
        </div>

        <div className="mt-4 space-y-2 text-sm text-[#c9d1d9]">
          <p className="inline-flex items-center gap-2">
            <span className="inline-flex h-4 w-4 rounded-full border border-[#8b949e] bg-[#1f6feb]" />
            Commit directly to the <span className="rounded-md bg-[#161b22] px-2 py-0.5 text-xs font-semibold">{branch}</span> branch.
          </p>
          <p className="inline-flex items-center gap-2 text-[#8b949e]">
            <span className="inline-flex h-4 w-4 rounded-full border border-[#8b949e]" />
            Create a new branch for this commit and start a pull request.
          </p>
        </div>

        <div className="mt-5 flex items-center gap-2">
          <SubmitButton />
          <Link
            href={cancelHref}
            className="inline-flex items-center rounded-md border border-[#30363d] bg-[#21262d] px-4 py-2 text-sm font-semibold text-[#f85149] transition hover:bg-[#30363d]"
          >
            Cancel
          </Link>
        </div>

        {state.error ? <p className="mt-4 text-sm text-[#ff7b72]">{state.error}</p> : null}
      </div>
    </form>
  );
}
