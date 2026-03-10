import { auth } from "@/auth";
import { AuthPageFrame } from "@/components/auth/auth-page-frame";
import { SignInForm } from "@/components/auth/sign-in-form";
import { getAuthErrorMessage } from "@/lib/auth/error-messages";
import { buildAuthenticatedUserHomePath } from "@/lib/auth/owner-handle";
import { normalizeSafeRedirectPath } from "@/lib/auth/redirect";
import Link from "next/link";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

interface SignInPageProps {
  searchParams: Promise<{
    callbackUrl?: string;
    error?: string;
  }>;
}

export default async function SignInPage({ searchParams }: SignInPageProps) {
  const session = await auth();

  if (session?.user?.id) {
    redirect(
      await buildAuthenticatedUserHomePath({
        id: session.user.id,
        name: session.user.name,
        email: session.user.email,
        image: session.user.image,
        role: session.user.role,
      }),
    );
  }

  const params = await searchParams;
  const callbackUrl = normalizeSafeRedirectPath(params.callbackUrl, "/dashboard");
  const errorMessage = getAuthErrorMessage(params.error);

  return (
    <AuthPageFrame
      heading="Sign in to GitHub Clone"
      description=""
      supportingContent={
        <p>
          New to GitHub Clone?{" "}
          <Link href="/" className="text-blue-400 hover:underline">
            Return home
          </Link>
        </p>
      }
    >
      <div className="space-y-4">
        {params.error ? (
          <div className="rounded-md border border-[#ff7b72]/30 bg-[#ff7b72]/10 px-4 py-3 text-sm text-[#ffb3ba]">
            {errorMessage}
          </div>
        ) : null}
        
        <SignInForm callbackUrl={callbackUrl} />
      </div>
    </AuthPageFrame>
  );
}
