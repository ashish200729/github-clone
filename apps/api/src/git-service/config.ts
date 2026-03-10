import { ensureApiEnvLoaded } from "../env/load.js";

ensureApiEnvLoaded();

const HTTP_PROTOCOLS = new Set(["http:", "https:"]);

export interface GitServiceConfig {
  internalUrl: string;
  internalToken: string;
  cloneBaseUrl: string;
  httpBasePath: string;
  transportTokenSecret: string;
  transportTokenTtlSeconds: number;
}

let cachedConfig: GitServiceConfig | undefined;

function requireNonEmptyString(value: string | undefined, envName: string): string {
  const normalized = value?.trim();

  if (!normalized) {
    throw new Error(`${envName} is required.`);
  }

  return normalized;
}

function parseHttpUrl(value: string, envName: string): string {
  let url: URL;

  try {
    url = new URL(value);
  } catch {
    throw new Error(`${envName} must be a valid URL.`);
  }

  if (!HTTP_PROTOCOLS.has(url.protocol)) {
    throw new Error(`${envName} must use http:// or https://.`);
  }

  return value;
}

function normalizeHttpPath(value: string | undefined, fallback: string, envName: string): string {
  const normalizedInput = value?.trim() || fallback;

  if (!normalizedInput) {
    throw new Error(`${envName} must not be empty.`);
  }

  const withLeadingSlash = normalizedInput.startsWith("/") ? normalizedInput : `/${normalizedInput}`;
  const trimmed = withLeadingSlash.replace(/\/+$/, "");

  return trimmed || "/";
}

function joinUrlPath(prefix: string, suffix: string): string {
  const normalizedPrefix = prefix === "/" ? "" : prefix.replace(/\/+$/, "");
  const normalizedSuffix = suffix.replace(/^\/+/, "");

  return normalizedPrefix ? `${normalizedPrefix}/${normalizedSuffix}` : `/${normalizedSuffix}`;
}

function resolveGitHttpMountPath(basePathname: string, httpBasePath: string): string {
  const normalizedBasePathname = normalizeHttpPath(basePathname, "/", "GIT_HTTP_BASE_URL");

  if (httpBasePath === "/") {
    return normalizedBasePathname;
  }

  if (normalizedBasePathname === "/" || normalizedBasePathname === httpBasePath) {
    return httpBasePath;
  }

  if (normalizedBasePathname.endsWith(`${httpBasePath}`)) {
    return normalizedBasePathname;
  }

  return joinUrlPath(normalizedBasePathname, httpBasePath);
}

export function buildGitCloneUrl(
  ownerHandle: string,
  repositoryName: string,
  config: Pick<GitServiceConfig, "cloneBaseUrl" | "httpBasePath">,
): string {
  const cloneUrl = new URL(config.cloneBaseUrl);
  const repositoryPath = `${encodeURIComponent(ownerHandle)}/${encodeURIComponent(repositoryName)}.git`;

  cloneUrl.pathname = joinUrlPath(resolveGitHttpMountPath(cloneUrl.pathname, config.httpBasePath), repositoryPath);
  return cloneUrl.toString();
}

function parsePositiveInteger(value: string | undefined, fallback: number, envName: string): number {
  if (!value) {
    return fallback;
  }

  if (!/^\d+$/.test(value.trim())) {
    throw new Error(`${envName} must be a positive integer.`);
  }

  const parsedValue = Number.parseInt(value, 10);

  if (!Number.isInteger(parsedValue) || parsedValue <= 0) {
    throw new Error(`${envName} must be a positive integer.`);
  }

  return parsedValue;
}

export function loadGitServiceConfig(env: NodeJS.ProcessEnv = process.env): GitServiceConfig {
  if (env === process.env && cachedConfig) {
    return cachedConfig;
  }

  const internalUrl = parseHttpUrl(requireNonEmptyString(env.GIT_SERVICE_URL, "GIT_SERVICE_URL"), "GIT_SERVICE_URL");
  const cloneBaseUrl = parseHttpUrl(env.GIT_HTTP_BASE_URL?.trim() || internalUrl, "GIT_HTTP_BASE_URL");
  const httpBasePath = normalizeHttpPath(env.GIT_HTTP_BASE_PATH, "/git", "GIT_HTTP_BASE_PATH");

  const config = {
    internalUrl,
    cloneBaseUrl,
    httpBasePath,
    internalToken: requireNonEmptyString(env.GIT_SERVICE_INTERNAL_TOKEN, "GIT_SERVICE_INTERNAL_TOKEN"),
    transportTokenSecret: requireNonEmptyString(env.GIT_TRANSPORT_TOKEN_SECRET, "GIT_TRANSPORT_TOKEN_SECRET"),
    transportTokenTtlSeconds: parsePositiveInteger(
      env.GIT_TRANSPORT_TOKEN_TTL_SECONDS,
      12 * 60 * 60,
      "GIT_TRANSPORT_TOKEN_TTL_SECONDS",
    ),
  } satisfies GitServiceConfig;

  if (env === process.env) {
    cachedConfig = config;
  }

  return config;
}
