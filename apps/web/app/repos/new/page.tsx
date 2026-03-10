import { redirect } from "next/navigation";
import Link from "next/link";
import { FaGithub, FaPlus, FaBars } from "react-icons/fa";
import { FiSearch, FiInbox } from "react-icons/fi";
import { BiGitPullRequest } from "react-icons/bi";
import { LuCircleDot } from "react-icons/lu";
import { CreateRepositoryForm, type CreateRepositoryFormState } from "@/components/repos/create-repository-form";
import { fetchInternalApiJson, InternalApiError } from "@/lib/auth/internal-api";
import { resolveOwnerHandle } from "@/lib/auth/owner-handle";
import { requireAuthenticatedUser } from "@/lib/auth/protection";
import type { RepoSummary } from "@/lib/repos/types";

export const dynamic = "force-dynamic";

async function createRepositoryAction(
  _state: CreateRepositoryFormState,
  formData: FormData,
): Promise<CreateRepositoryFormState> {
  "use server";

  const user = await requireAuthenticatedUser("/repos/new");
  const name = String(formData.get("name") ?? "").trim().toLowerCase();
  const description = String(formData.get("description") ?? "").trim();
  const visibility = String(formData.get("visibility") ?? "private");
  const initializeWithReadme = formData.get("initializeWithReadme") === "true";
  let repositoryUrl: string | null = null;

  try {
    const payload = await fetchInternalApiJson<{ repo: RepoSummary }>("/api/repos", {
      user,
      method: "POST",
      body: {
        name,
        description: description || null,
        visibility,
        initializeWithReadme,
      },
    });
    repositoryUrl = payload.repo.urls.html;
  } catch (error) {
    if (error instanceof InternalApiError) {
      return {
        error: error.message,
        fieldErrors:
          error.details && typeof error.details.fields === "object" && error.details.fields !== null
            ? (error.details.fields as Record<string, string>)
            : undefined,
      };
    }

    return {
      error: "The repository could not be created right now.",
    };
  }

  if (!repositoryUrl) {
    return {
      error: "The repository was created, but the redirect target was missing.",
    };
  }

  redirect(repositoryUrl);
}

export default async function NewRepositoryPage() {
  const user = await requireAuthenticatedUser("/repos/new");
  const ownerHandle = await resolveOwnerHandle(user);

  return (
    <div className="min-h-screen bg-[#0d1117] text-[#c9d1d9] font-sans">
        <header className="flex items-center justify-between px-4 md:px-6 lg:px-8 py-3 bg-[#010409] border-b border-[#30363d]">
          <div className="flex items-center gap-4">
            <button className="text-[#8b949e] hover:text-[#c9d1d9] sm:hidden">
              <FaBars size={20} />
            </button>
            <Link href="/" className="text-white hover:text-white/80">
              <FaGithub size={32} />
            </Link>
            <span className="font-semibold px-2">New repository</span>
          </div>
          <div className="flex items-center gap-2 flex-1 justify-end">
            <div className="relative w-full max-w-[320px] lg:max-w-[400px] hidden sm:block">
              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#8b949e]">
                <FiSearch />
              </span>
              <input
                type="text"
                placeholder="Type to search"
                className="w-full bg-[#0d1117] border border-[#30363d] rounded-md py-1.5 pl-8 pr-8 text-sm focus:outline-none focus:border-[#58a6ff] focus:ring-1 focus:ring-[#58a6ff]"
              />
              <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[#8b949e] border border-[#30363d] rounded-[4px] px-1.5 text-[10px]">
                /
              </span>
            </div>
            <div className="flex items-center gap-1 sm:gap-2 border-l border-[#30363d] pl-2 sm:pl-4 ml-2">
              <button className="border border-[#30363d] rounded-md px-2 py-1 text-xs font-medium hover:border-[#8b949e] flex items-center gap-1">
                <FaPlus /> <span className="hidden sm:inline">▾</span>
              </button>
              <button className="p-1.5 rounded-md hover:bg-[#30363d] text-[#c9d1d9] hidden md:block">
                <LuCircleDot size={16} />
              </button>
              <button className="p-1.5 rounded-md hover:bg-[#30363d] text-[#c9d1d9] hidden md:block">
                <BiGitPullRequest size={16} />
              </button>
              <button className="p-1.5 rounded-md hover:bg-[#30363d] text-[#c9d1d9] relative">
                <FiInbox size={16} />
                <div className="absolute top-1.5 right-1.5 w-2 h-2 bg-[#1f6feb] rounded-full ring-2 ring-[#010409]"></div>
              </button>
              <div className="w-8 h-8 rounded-full bg-[#1f6feb] overflow-hidden ml-1 flex items-center justify-center text-white font-bold cursor-pointer hover:opacity-80 border border-[#30363d]">
                {user.image ? (
                  <img src={user.image} alt={user.name || "User"} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-sm">{(user.name || "U").charAt(0).toUpperCase()}</span>
                )}
              </div>
            </div>
          </div>
        </header>

        <main className="max-w-[768px] mx-auto px-4 py-10 md:py-12">
          <div className="mb-6">
            <h1 className="text-[24px] text-white font-semibold mb-2">Create a new repository</h1>
            <p className="text-[#8b949e] text-[14px]">
              A repository contains all project files, including the revision history. Set up the basics below to create a new repository in your workspace.
            </p>
            <p className="text-[#8b949e] text-[13px] italic mt-2">Required fields are marked with an asterisk (*).</p>
          </div>

          <div className="border-t border-[#30363d] pt-6">
            <CreateRepositoryForm action={createRepositoryAction} user={{ ...user, handle: ownerHandle }} />
          </div>
        </main>
      </div>
  );
}
