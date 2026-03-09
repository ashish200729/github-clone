import { readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { closeDatabasePool, getDatabasePool, loadDatabaseConfig } from "./index.js";

interface AppliedMigrationRow {
  id: number;
  name: string;
  run_on: Date;
}

const migrationsDirectory = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../migrations",
);

async function readLocalMigrationNames(): Promise<string[]> {
  const directoryEntries = await readdir(migrationsDirectory, { withFileTypes: true });

  return directoryEntries
    .filter((entry) => entry.isFile() && entry.name.endsWith(".js"))
    .map((entry) => entry.name.replace(/\.js$/, ""))
    .sort((left, right) => left.localeCompare(right));
}

async function readAppliedMigrations(): Promise<AppliedMigrationRow[]> {
  const pool = getDatabasePool();
  const tableLookup = await pool.query<{ table_name: string | null }>(
    "SELECT to_regclass('public.pgmigrations') AS table_name",
  );

  if (!tableLookup.rows[0]?.table_name) {
    return [];
  }

  const appliedMigrations = await pool.query<AppliedMigrationRow>(
    "SELECT id, name, run_on FROM public.pgmigrations ORDER BY run_on ASC, id ASC",
  );

  return appliedMigrations.rows;
}

async function main(): Promise<void> {
  loadDatabaseConfig();

  const [localMigrationNames, appliedMigrations] = await Promise.all([
    readLocalMigrationNames(),
    readAppliedMigrations(),
  ]);

  const appliedMigrationNames = new Set(appliedMigrations.map(({ name }) => name));
  const pendingMigrationNames = localMigrationNames.filter((name) => !appliedMigrationNames.has(name));

  console.log(`Migrations directory: ${migrationsDirectory}`);
  console.log(`Applied migrations: ${appliedMigrations.length}`);

  if (appliedMigrations.length > 0) {
    for (const migration of appliedMigrations) {
      console.log(`  [applied] ${migration.name} @ ${migration.run_on.toISOString()}`);
    }
  }

  console.log(`Pending migrations: ${pendingMigrationNames.length}`);

  if (pendingMigrationNames.length > 0) {
    for (const migrationName of pendingMigrationNames) {
      console.log(`  [pending] ${migrationName}`);
    }
  }
}

try {
  await main();
} catch (error) {
  console.error("Failed to read migration status.", error);
  process.exitCode = 1;
} finally {
  await closeDatabasePool();
}
