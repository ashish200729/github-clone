import { signIn } from "@/auth";
import { normalizeSafeRedirectPath } from "@/lib/auth/redirect";

interface SignInFormProps {
  callbackUrl?: string | null;
}

export function SignInForm({ callbackUrl }: SignInFormProps) {
  const safeCallbackUrl = normalizeSafeRedirectPath(callbackUrl, "/dashboard");

  return (
    <form
      className="space-y-4"
      action={async () => {
        "use server";
        await signIn("github", { redirectTo: safeCallbackUrl });
      }}
    >
      <button
        type="submit"
        className="w-full rounded-md border border-transparent bg-[#238636] px-4 py-1.5 text-sm font-semibold leading-5 text-white shadow-sm transition-colors hover:bg-[#2ea043] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#58a6ff] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0d1117] disabled:cursor-not-allowed disabled:opacity-50"
      >
        Sign in with GitHub
      </button>
    </form>
  );
}
