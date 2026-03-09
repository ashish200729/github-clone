const DEFAULT_REDIRECT_PATH = "/dashboard";

export function normalizeSafeRedirectPath(candidate: string | null | undefined, fallback = DEFAULT_REDIRECT_PATH): string {
  if (!candidate) {
    return fallback;
  }

  if (!candidate.startsWith("/") || candidate.startsWith("//")) {
    return fallback;
  }

  if (candidate.includes("\r") || candidate.includes("\n")) {
    return fallback;
  }

  return candidate;
}

export function resolveAuthRedirect(url: string, baseUrl: string): string {
  if (url.startsWith("/")) {
    return `${baseUrl}${normalizeSafeRedirectPath(url, "/")}`;
  }

  try {
    const parsedUrl = new URL(url);
    const parsedBaseUrl = new URL(baseUrl);

    if (parsedUrl.origin !== parsedBaseUrl.origin) {
      return baseUrl;
    }

    return `${baseUrl}${normalizeSafeRedirectPath(`${parsedUrl.pathname}${parsedUrl.search}${parsedUrl.hash}`, "/")}`;
  } catch {
    return baseUrl;
  }
}
