import { signIn } from "@/auth";
import { normalizeSafeRedirectPath } from "@/lib/auth/redirect";

interface SignInFormProps {
  callbackUrl?: string | null;
}

export function SignInForm({ callbackUrl }: SignInFormProps) {
  const safeCallbackUrl = normalizeSafeRedirectPath(callbackUrl, "/dashboard");

  return (
    <form
      action={async () => {
        "use server";
        await signIn("github", { redirectTo: safeCallbackUrl });
      }}
    >
      <button
        type="submit"
        className="inline-flex items-center justify-center rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
      >
        Sign in with GitHub
      </button>
    </form>
  );
}
