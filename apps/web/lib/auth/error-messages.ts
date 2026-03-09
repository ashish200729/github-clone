const AUTH_ERROR_MESSAGES: Record<string, string> = {
  AccessDenied: "GitHub sign-in was denied. Please try again or use an account that has access.",
  CallbackRouteError: "The sign-in callback failed. Check the GitHub OAuth callback URL and try again.",
  Configuration: "Authentication is not configured correctly. Verify the required auth environment variables.",
  OAuthAccountNotLinked: "That GitHub account is already linked differently. Sign in with the originally linked provider.",
  SessionUnavailable: "Your session could not be verified. Please sign in again.",
  InternalApiUnavailable: "Your session is valid, but the internal API trust boundary could not be established.",
};

export function getAuthErrorMessage(errorCode: string | null | undefined): string {
  if (!errorCode) {
    return "Authentication failed. Please try again.";
  }

  return AUTH_ERROR_MESSAGES[errorCode] ?? "Authentication failed. Please try again.";
}
