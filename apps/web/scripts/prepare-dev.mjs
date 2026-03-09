import { accessSync, constants, rmSync, statSync } from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const workspaceRoot = path.dirname(fileURLToPath(import.meta.url));
const webRoot = path.resolve(workspaceRoot, "..");
const devLockPath = path.join(webRoot, ".next", "dev", "lock");

try {
  accessSync(devLockPath, constants.F_OK);
} catch {
  process.exit(0);
}

const hasActiveNextDev = (() => {
  const result = spawnSync("pgrep", ["-f", "next-server"], {
    stdio: "pipe",
    encoding: "utf8",
  });

  if (result.status !== 0) {
    return false;
  }

  const pids = result.stdout
    .split(/\s+/)
    .map((value) => value.trim())
    .filter(Boolean);

  return pids.some((pid) => {
    const cwdResult = spawnSync("lsof", ["-a", "-p", pid, "-d", "cwd", "-Fn"], {
      stdio: "pipe",
      encoding: "utf8",
    });

    return cwdResult.status === 0 && cwdResult.stdout.includes(`n${webRoot}`);
  });
})();

if (hasActiveNextDev) {
  process.exit(0);
}

const lockStats = statSync(devLockPath);

if (!lockStats.isFile()) {
  process.exit(0);
}

rmSync(devLockPath, { force: true });
console.log("Removed stale Next dev lock for apps/web.");
