import { loadEnvConfig } from "@next/env";
import path from "node:path";
import { fileURLToPath } from "node:url";

type DatabaseSslMode = "disable" | "require";

export interface WebAuthEnv {
  AUTH_SECRET: string;
  AUTH_GITHUB_ID: string;
  AUTH_GITHUB_SECRET: string;
  DATABASE_URL: string;
  DATABASE_SSL: DatabaseSslMode;
  API_INTERNAL_URL: string;
  INTERNAL_API_AUTH_SECRET: string;
  AUTH_URL?: string;
}

const DATABASE_PROTOCOLS = new Set(["postgres:", "postgresql:"]);
const HTTP_PROTOCOLS = new Set(["http:", "https:"]);
const webRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const repoRoot = path.resolve(webRoot, "../..");

let hasLoadedWorkspaceEnv = false;

function ensureWorkspaceEnvLoaded(): void {
  if (hasLoadedWorkspaceEnv) {
    return;
  }

  loadEnvConfig(repoRoot, process.env.NODE_ENV !== "production", console);
  loadEnvConfig(webRoot, process.env.NODE_ENV !== "production", console);
  hasLoadedWorkspaceEnv = true;
}

function requireNonEmptyString(value: string | undefined, envName: keyof WebAuthEnv): string {
  const normalizedValue = value?.trim();

  if (!normalizedValue) {
    throw new Error(`${envName} is required.`);
  }

  return normalizedValue;
}

function parseOptionalUrl(value: string | undefined, envName: keyof WebAuthEnv, allowedProtocols: Set<string>): string | undefined {
  if (value === undefined || value.trim() === "") {
    return undefined;
  }

  return parseUrl(value, envName, allowedProtocols);
}

function parseUrl(value: string, envName: keyof WebAuthEnv, allowedProtocols: Set<string>): string {
  let parsedUrl: URL;

  try {
    parsedUrl = new URL(value);
  } catch {
    throw new Error(`${envName} must be a valid URL.`);
  }

  if (!allowedProtocols.has(parsedUrl.protocol)) {
    const protocols = Array.from(allowedProtocols).join(" or ");
    throw new Error(`${envName} must use ${protocols}.`);
  }

  return value;
}

function parseDatabaseSslMode(value: string | undefined): DatabaseSslMode {
  if (value === undefined || value.trim() === "") {
    return "disable";
  }

  if (value === "disable" || value === "require") {
    return value;
  }

  throw new Error('DATABASE_SSL must be either "disable" or "require".');
}

export function loadWebAuthEnv(env: NodeJS.ProcessEnv = process.env): WebAuthEnv {
  if (env === process.env) {
    ensureWorkspaceEnvLoaded();
  }

  return {
    AUTH_SECRET: requireNonEmptyString(env.AUTH_SECRET, "AUTH_SECRET"),
    AUTH_GITHUB_ID: requireNonEmptyString(env.AUTH_GITHUB_ID, "AUTH_GITHUB_ID"),
    AUTH_GITHUB_SECRET: requireNonEmptyString(env.AUTH_GITHUB_SECRET, "AUTH_GITHUB_SECRET"),
    DATABASE_URL: parseUrl(requireNonEmptyString(env.DATABASE_URL, "DATABASE_URL"), "DATABASE_URL", DATABASE_PROTOCOLS),
    DATABASE_SSL: parseDatabaseSslMode(env.DATABASE_SSL),
    API_INTERNAL_URL: parseUrl(requireNonEmptyString(env.API_INTERNAL_URL, "API_INTERNAL_URL"), "API_INTERNAL_URL", HTTP_PROTOCOLS),
    INTERNAL_API_AUTH_SECRET: requireNonEmptyString(env.INTERNAL_API_AUTH_SECRET, "INTERNAL_API_AUTH_SECRET"),
    AUTH_URL: parseOptionalUrl(env.AUTH_URL, "AUTH_URL", HTTP_PROTOCOLS),
  };
}
