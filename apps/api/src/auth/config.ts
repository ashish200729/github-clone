import { ensureApiEnvLoaded } from "../env/load.js";

ensureApiEnvLoaded();

export interface InternalAuthConfig {
  secret: string;
}

export function loadInternalAuthConfig(env: NodeJS.ProcessEnv = process.env): InternalAuthConfig {
  const secret = env.INTERNAL_API_AUTH_SECRET?.trim();

  if (!secret) {
    throw new Error("INTERNAL_API_AUTH_SECRET is required.");
  }

  return { secret };
}
