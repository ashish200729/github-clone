import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";

const apiRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const repoRoot = path.resolve(apiRoot, "../..");

let hasLoadedApiEnv = false;

export function ensureApiEnvLoaded(): void {
  if (hasLoadedApiEnv) {
    return;
  }

  dotenv.config({ path: path.resolve(repoRoot, ".env"), quiet: true });
  dotenv.config({ path: path.resolve(apiRoot, ".env"), quiet: true, override: true });
  hasLoadedApiEnv = true;
}
