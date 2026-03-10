"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { BiBook, BiLockAlt } from "react-icons/bi";

export interface CreateRepositoryFormState {
  error?: string;
  fieldErrors?: Record<string, string>;
}

interface CreateRepositoryFormProps {
  action: (state: CreateRepositoryFormState, formData: FormData) => Promise<CreateRepositoryFormState>;
  user: {
    handle: string;
    name?: string | null;
    image?: string | null;
  };
}

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <div className="border-t border-[#30363d] pt-6 flex justify-end">
      <button
        type="submit"
        disabled={pending}
        className="bg-[#238636] hover:bg-[#2ea043] text-white px-5 py-[6px] rounded-md font-medium text-[14px] transition-colors disabled:cursor-not-allowed disabled:opacity-50 inline-flex items-center shadow-sm"
      >
        {pending ? "Creating repository..." : "Create repository"}
      </button>
    </div>
  );
}

export function CreateRepositoryForm({ action, user }: CreateRepositoryFormProps) {
  const [state, formAction] = useActionState(action, {});
  const [visibility, setVisibility] = useState("public");
  const [isReadmeEnabled, setIsReadmeEnabled] = useState(false);

  return (
    <form action={formAction} className="mt-6 flex flex-col gap-10 text-[#c9d1d9] pb-10">
      {/* 1 General */}
      <div className="flex gap-4 md:gap-5">
        <div className="flex-shrink-0 w-6 h-6 rounded-full bg-[#161b22] border border-[#30363d] flex items-center justify-center text-xs font-semibold mt-1 relative z-10">1</div>
        <div className="flex-1 w-full flex flex-col gap-5">
          <h2 className="text-[20px] font-semibold text-white">General</h2>
          
          <div className="flex flex-col md:flex-row md:items-end gap-3 flex-wrap">
            <div className="flex-1 min-w-[200px]">
              <label htmlFor="owner" className="block text-[14px] font-semibold mb-2">Owner <span className="text-[#f85149]">*</span></label>
              <div
                className="flex items-center bg-[#21262d] border border-[#30363d] rounded-md px-3 py-1.5 h-[34px] w-full max-w-[300px]"
                aria-label={`Owner ${user.handle}`}
                title={user.handle}
              >
                <div className="flex items-center gap-2 overflow-hidden">
                  {user.image ? (
                    <img src={user.image} className="w-[18px] h-[18px] rounded-full flex-shrink-0" alt={user.handle} />
                  ) : (
                    <div className="w-[18px] h-[18px] rounded-full bg-[#1f6feb] flex items-center justify-center text-[9px] text-white font-bold flex-shrink-0">
                      {(user.name || user.handle || "U").charAt(0).toUpperCase()}
                    </div>
                  )}
                  <span className="text-[14px] font-medium text-[#c9d1d9] truncate">{user.handle}</span>
                </div>
              </div>
            </div>

            <div className="hidden md:block text-[20px] text-[#8b949e] px-1 translate-y-[2px] border-b-0 pb-1">/</div>

            <div className="flex-[2] min-w-[250px]">
              <label htmlFor="name" className="block text-[14px] font-semibold mb-2">Repository name <span className="text-[#f85149]">*</span></label>
              <input
                id="name"
                name="name"
                type="text"
                maxLength={39}
                pattern="^[a-z0-9](?:[a-z0-9-]{0,37}[a-z0-9])?$"
                required
                className="w-full bg-[#0d1117] border border-[#30363d] rounded-md px-3 h-[34px] text-[14px] outline-none focus:border-[#58a6ff] focus:ring-1 focus:ring-[#58a6ff] placeholder:text-[#8b949e] shadow-sm"
              />
            </div>
          </div>
          <p className="text-[#8b949e] text-[13px] -mt-2">
            Great repository names are short and memorable. How about <strong className="text-[#58a6ff] font-medium cursor-pointer hover:underline">fluffy-octo-potato</strong>?
          </p>
          {state.fieldErrors?.name && <p className="text-[13px] text-[#f85149] mt-1">{state.fieldErrors.name}</p>}

          <div>
            <label htmlFor="description" className="block text-[14px] font-semibold mb-2">
              Description <span className="text-[#8b949e] font-normal text-[13px]">(optional)</span>
            </label>
            <input
              id="description"
              name="description"
              maxLength={280}
              className="w-full bg-[#0d1117] border border-[#30363d] rounded-md px-3 py-1.5 h-[34px] text-[14px] outline-none focus:border-[#58a6ff] focus:ring-1 focus:ring-[#58a6ff] placeholder:text-[#8b949e] shadow-sm"
            />
            <div className="text-[#8b949e] text-[12px] mt-1.5">0 / 350 characters</div>
            {state.fieldErrors?.description && <p className="text-[13px] text-[#f85149] mt-1">{state.fieldErrors.description}</p>}
          </div>
        </div>
      </div>

      <div className="h-[1px] bg-[#30363d] w-full" />

      {/* 2 Configuration */}
      <div className="flex gap-4 md:gap-5">
        <div className="flex-shrink-0 w-6 h-6 rounded-full bg-[#161b22] border border-[#30363d] flex items-center justify-center text-xs font-semibold mt-1">2</div>
        <div className="flex-1 w-full space-y-6">
          <h2 className="text-[20px] font-semibold text-white">Configuration</h2>

          <div className="border border-[#30363d] rounded-md bg-[#0d1117] overflow-hidden">
            <div className="p-4 border-b border-[#30363d] flex items-center justify-between">
              <div>
                 <h3 className="font-semibold text-[14px] text-white">Choose visibility <span className="text-[#f85149]">*</span></h3>
                 <p className="text-[#8b949e] text-[13px] mt-0.5">Choose who can see and commit to this repository</p>
              </div>
            </div>

            <div className="p-0">
               <label className={`flex items-start gap-3 p-4 cursor-pointer hover:bg-[#161b22] transition-colors ${visibility === 'public' ? 'bg-[#161b22]' : ''}`}>
                 <input type="radio" name="visibility" value="public" className="mt-1 accent-[#58a6ff] cursor-pointer" checked={visibility === 'public'} onChange={() => setVisibility('public')} />
                 <div className={`mt-0.5 ${visibility === 'public' ? 'text-white' : 'text-[#8b949e]'}`}>
                   <BiBook size={20} />
                 </div>
                 <div>
                   <div className={`font-semibold text-[14px] ${visibility === 'public' ? 'text-white' : ''}`}>Public</div>
                   <div className="text-[#8b949e] text-[13px] mt-0.5">Anyone on the internet can see this repository. You choose who can commit.</div>
                 </div>
               </label>
               <div className="h-[1px] bg-[#30363d] ml-11" />
               <label className={`flex items-start gap-3 p-4 cursor-pointer hover:bg-[#161b22] transition-colors ${visibility === 'private' ? 'bg-[#161b22]' : ''}`}>
                 <input type="radio" name="visibility" value="private" className="mt-1 accent-[#58a6ff] cursor-pointer" checked={visibility === 'private'} onChange={() => setVisibility('private')} />
                 <div className={`mt-0.5 ${visibility === 'private' ? 'text-white' : 'text-[#8b949e]'}`}>
                   <BiLockAlt size={20} />
                 </div>
                 <div>
                   <div className={`font-semibold text-[14px] ${visibility === 'private' ? 'text-white' : ''}`}>Private</div>
                   <div className="text-[#8b949e] text-[13px] mt-0.5">You choose who can see and commit to this repository.</div>
                 </div>
               </label>
            </div>
          </div>
          {state.fieldErrors?.visibility && <p className="text-[13px] text-[#f85149] mt-1">{state.fieldErrors.visibility}</p>}

          <div className="border border-[#30363d] rounded-md bg-[#0d1117] overflow-hidden">
            <div className="p-4 flex items-center justify-between hover:bg-[#161b22] transition-colors cursor-pointer" onClick={() => setIsReadmeEnabled(!isReadmeEnabled)}>
              <div>
                <h3 className="font-semibold text-[14px] text-white">Add README</h3>
                <p className="text-[#8b949e] text-[13px] mt-0.5">READMEs can be used as longer descriptions. <a href="#" className="text-[#58a6ff] hover:underline" onClick={e => e.stopPropagation()}>About READMEs</a></p>
              </div>
              <input type="hidden" name="initializeWithReadme" value={isReadmeEnabled ? "true" : "false"} />
              <div
                className="flex items-center gap-2 text-[13px] font-semibold"
              >
                <span className={isReadmeEnabled ? "text-[#58a6ff]" : "text-[#8b949e]"}>{isReadmeEnabled ? "On" : "Off"}</span>
                <div className={`w-[36px] h-[20px] rounded-full relative transition-colors border border-[#30363d] ${isReadmeEnabled ? 'bg-[#238636] border-[#238636]' : 'bg-[#21262d]'}`}>
                   <div className={`absolute top-[1px] w-[16px] h-[16px] rounded-full transition-all duration-200 ${isReadmeEnabled ? 'bg-white left-[17px]' : 'bg-[#8b949e] left-[1px]'}`} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {state.error ? (
        <div className="rounded-md border border-[#f85149] bg-[#f85149]/10 px-4 py-3 text-[13px] text-[#ff7b72]">{state.error}</div>
      ) : null}

      <SubmitButton />
    </form>
  );
}
