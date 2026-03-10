import { InternalApiError } from "@/lib/auth/internal-api";
import { buildAuthenticatedUserHomePath } from "@/lib/auth/owner-handle";
import { getOptionalAuthenticatedUser } from "@/lib/auth/protection";
import { fetchRepositoryList } from "@/lib/repos/api";
import type { RepoSummary } from "@/lib/repos/types";
import { LandingPage } from "@/components/home/landing-page";
import { Dashboard } from "@/components/home/dashboard";

export const dynamic = "force-dynamic";

export default async function Home() {
  const user = await getOptionalAuthenticatedUser();

  if (user) {
    let repositories: RepoSummary[] = [];
    let dashboardError: string | null = null;
    const dashboardPath = await buildAuthenticatedUserHomePath(user);

    try {
      repositories = await fetchRepositoryList(user);
    } catch (error) {
      dashboardError =
        error instanceof InternalApiError
          ? error.message
          : "The repository service is not ready yet. Check the API and Git service logs.";
    }

    return <Dashboard user={user} repositories={repositories} dashboardError={dashboardError} dashboardPath={dashboardPath} />;
  }

  return <LandingPage isAuthenticated={false} />;
}
