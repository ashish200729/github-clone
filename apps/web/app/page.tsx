import { auth } from "@/auth";
import { Dashboard } from "@/components/home/dashboard";
import { LandingPage } from "@/components/home/landing-page";

export const dynamic = "force-dynamic";

export default async function Home() {
  const session = await auth();

  if (!session) {
    return <LandingPage />;
  }

  return <Dashboard session={session} />;
}
