"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

export interface RepoSettingsMutationState {
  error?: string;
  success?: string;
}

interface RepositorySettingsPanelsProps {
  owner: string;
  repository: {
    name: string;
    description: string | null;
    visibility: "public" | "private";
    defaultBranch: string;
    archived: boolean;
  };
  branches: Array<{ name: string }>;
  updateGeneralAction: (state: RepoSettingsMutationState, formData: FormData) => Promise<RepoSettingsMutationState>;
  updateVisibilityAction: (state: RepoSettingsMutationState, formData: FormData) => Promise<RepoSettingsMutationState>;
  updateDefaultBranchAction: (state: RepoSettingsMutationState, formData: FormData) => Promise<RepoSettingsMutationState>;
  updateArchiveAction: (state: RepoSettingsMutationState, formData: FormData) => Promise<RepoSettingsMutationState>;
  deleteRepositoryAction: (state: RepoSettingsMutationState, formData: FormData) => Promise<RepoSettingsMutationState>;
}

function SubmitButton({ label, pendingLabel, tone = "default" }: { label: string; pendingLabel: string; tone?: "default" | "danger" }) {
  const { pending } = useFormStatus();
  const className =
    tone === "danger"
      ? "inline-flex items-center justify-center rounded-md border border-[#f85149] bg-[#da3633] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#f85149] disabled:cursor-not-allowed disabled:opacity-60"
      : "inline-flex items-center justify-center rounded-md border border-[#2ea043] bg-[#238636] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#2ea043] disabled:cursor-not-allowed disabled:opacity-60";

  return (
    <button type="submit" disabled={pending} className={className}>
      {pending ? pendingLabel : label}
    </button>
  );
}

function Feedback({ state }: { state: RepoSettingsMutationState }) {
  if (state.error) {
    return <p className="text-sm text-[#ff7b72]">{state.error}</p>;
  }

  if (state.success) {
    return <p className="text-sm text-[#3fb950]">{state.success}</p>;
  }

  return null;
}

export function RepositorySettingsPanels({
  owner,
  repository,
  branches,
  updateGeneralAction,
  updateVisibilityAction,
  updateDefaultBranchAction,
  updateArchiveAction,
  deleteRepositoryAction,
}: RepositorySettingsPanelsProps) {
  const [generalState, generalFormAction] = useActionState(updateGeneralAction, {});
  const [visibilityState, visibilityFormAction] = useActionState(updateVisibilityAction, {});
  const [defaultBranchState, defaultBranchFormAction] = useActionState(updateDefaultBranchAction, {});
  const [archiveState, archiveFormAction] = useActionState(updateArchiveAction, {});
  const [deleteState, deleteFormAction] = useActionState(deleteRepositoryAction, {});

  return (
    <div className="space-y-8 max-w-4xl pb-10">
      <section>
        <div className="border-b border-[#21262d] pb-2 mb-4">
          <h2 className="text-2xl font-normal text-[#e6edf3]">General</h2>
        </div>
        
        <form action={generalFormAction} className="grid gap-5">
          <div className="grid gap-2 max-w-md">
            <label htmlFor="repo-name" className="text-sm font-semibold text-[#e6edf3]">
              Repository name
            </label>
            <input
              id="repo-name"
              name="name"
              defaultValue={repository.name}
              required
              className="w-full rounded-md border border-[#30363d] bg-[#0d1117] px-3 py-1.5 text-sm text-[#c9d1d9] outline-none transition focus:border-[#1f6feb] focus:ring-1 focus:ring-[#1f6feb]"
            />
          </div>

          <div className="grid gap-2 max-w-2xl">
            <label htmlFor="repo-description" className="text-sm font-semibold text-[#e6edf3]">
              Description
            </label>
            <textarea
              id="repo-description"
              name="description"
              rows={3}
              defaultValue={repository.description ?? ""}
              placeholder="Tell people what this repository is about"
              className="w-full rounded-md border border-[#30363d] bg-[#0d1117] px-3 py-1.5 text-sm text-[#c9d1d9] outline-none transition focus:border-[#1f6feb] focus:ring-1 focus:ring-[#1f6feb]"
            />
          </div>

          <Feedback state={generalState} />
          <div>
            <SubmitButton label="Save general settings" pendingLabel="Saving..." />
          </div>
        </form>
      </section>

      <section>
        <div className="border-b border-[#21262d] pb-2 mb-4">
          <h2 className="text-2xl font-normal text-[#e6edf3]">Visibility</h2>
        </div>
        <p className="mb-4 text-sm text-[#8b949e]">Control who can discover this repository.</p>

        <form action={visibilityFormAction} className="grid gap-3 max-w-2xl">
          <label className="flex items-start gap-3 rounded-md border border-[#30363d] bg-[#0d1117] p-4 cursor-pointer hover:bg-[#161b22] transition-colors">
            <input type="radio" name="visibility" value="public" defaultChecked={repository.visibility === "public"} className="mt-1" />
            <span className="grid gap-1">
              <span className="text-sm font-semibold text-[#e6edf3]">Public</span>
              <span className="text-sm text-[#8b949e]">Anyone can view this repository.</span>
            </span>
          </label>
          <label className="flex items-start gap-3 rounded-md border border-[#30363d] bg-[#0d1117] p-4 cursor-pointer hover:bg-[#161b22] transition-colors">
            <input type="radio" name="visibility" value="private" defaultChecked={repository.visibility === "private"} className="mt-1" />
            <span className="grid gap-1">
              <span className="text-sm font-semibold text-[#e6edf3]">Private</span>
              <span className="text-sm text-[#8b949e]">Only collaborators with access can view this repository.</span>
            </span>
          </label>

          <Feedback state={visibilityState} />
          <div className="mt-2">
            <SubmitButton label="Update visibility" pendingLabel="Updating..." />
          </div>
        </form>
      </section>

      <section>
        <div className="border-b border-[#21262d] pb-2 mb-4">
          <h2 className="text-2xl font-normal text-[#e6edf3]">Branch Defaults</h2>
        </div>
        <p className="mb-4 text-sm text-[#8b949e]">Choose the default branch used for new visits and compare screens.</p>

        <form action={defaultBranchFormAction} className="grid gap-4 max-w-md">
          <div className="grid gap-2">
            <label htmlFor="default-branch" className="text-sm font-semibold text-[#e6edf3]">
              Default branch
            </label>
            <select
              id="default-branch"
              name="defaultBranch"
              defaultValue={repository.defaultBranch}
              disabled={branches.length === 0}
              className="w-full rounded-md border border-[#30363d] bg-[#0d1117] px-3 py-1.5 text-sm text-[#c9d1d9] outline-none transition focus:border-[#1f6feb] focus:ring-1 focus:ring-[#1f6feb] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {branches.map((branch) => (
                <option key={branch.name} value={branch.name}>
                  {branch.name}
                </option>
              ))}
            </select>
            {branches.length === 0 ? <p className="text-xs text-[#8b949e]">Default branch can be changed after the first commit.</p> : null}
          </div>

          <Feedback state={defaultBranchState} />
          <div>
            <SubmitButton label="Save default branch" pendingLabel="Saving..." />
          </div>
        </form>
      </section>

      <section>
        <div className="border-b border-[#21262d] pb-2 mb-4">
          <h2 className="text-2xl font-normal text-[#e6edf3]">Archive Status</h2>
        </div>
        <p className="mb-4 text-sm text-[#8b949e]">
          {repository.archived
            ? "This repository is archived. Unarchive it to resume normal activity."
            : "Archiving marks this repository as read-only for historical reference."}
        </p>

        <form action={archiveFormAction} className="grid gap-4 pt-2">
          <input type="hidden" name="archived" value={repository.archived ? "false" : "true"} />
          <Feedback state={archiveState} />
          <div>
            <SubmitButton
              label={repository.archived ? "Unarchive repository" : "Archive repository"}
              pendingLabel={repository.archived ? "Unarchiving..." : "Archiving..."}
            />
          </div>
        </form>
      </section>

      <section>
        <div className="border-b border-[#21262d] pb-2 mb-4">
          <h2 className="text-2xl font-normal text-[#ff7b72]">Danger Zone</h2>
        </div>
        
        <div className="rounded-md border border-[#da3633] bg-[#0d1117] overflow-hidden">
          <div className="p-4 border-b border-[#da3633]">
            <h3 className="font-semibold text-[#e6edf3]">Delete this repository</h3>
            <p className="mt-1 text-sm text-[#8b949e]">
              Deleting a repository is permanent. This removes source history, settings, and collaboration context.
            </p>
          </div>
          <div className="p-4 bg-[#da3633]/10">
            <form action={deleteFormAction} className="grid gap-4 max-w-md">
              <div className="grid gap-2">
                <label htmlFor="confirm-repo-name" className="text-sm font-semibold text-[#e6edf3]">
                  To confirm, type <span className="font-bold text-[#ff7b72]">"{owner}/{repository.name}"</span>
                </label>
                <input
                  id="confirm-repo-name"
                  name="confirmRepositoryName"
                  placeholder={`${owner}/${repository.name}`}
                  required
                  className="w-full rounded-md border border-[#da3633]/60 bg-[#010409] px-3 py-1.5 text-sm text-[#c9d1d9] outline-none transition focus:border-[#da3633] focus:ring-1 focus:ring-[#da3633]"
                />
              </div>

              <Feedback state={deleteState} />
              <div>
                <SubmitButton label="Delete repository" pendingLabel="Deleting..." tone="danger" />
              </div>
            </form>
          </div>
        </div>
      </section>
    </div>
  );
}
