const SENSITIVE_KEYS = [
  "access_token",
  "refresh_token",
  "id_token",
  "oauth_token",
  "oauth_token_secret",
  "sessionToken",
  "session_token",
  "cookie",
  "cookies",
  "authorization",
  "secret",
  "AUTH_SECRET",
  "AUTH_GITHUB_SECRET",
  "INTERNAL_API_AUTH_SECRET",
];

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function sanitizeAuthLogMetadata(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => sanitizeAuthLogMetadata(item));
  }

  if (!isPlainObject(value)) {
    return value;
  }

  return Object.fromEntries(
    Object.entries(value).map(([key, nestedValue]) => {
      if (SENSITIVE_KEYS.includes(key)) {
        return [key, "[redacted]"];
      }

      return [key, sanitizeAuthLogMetadata(nestedValue)];
    }),
  );
}
