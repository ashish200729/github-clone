import { Pool } from "pg";
import { loadDatabaseConfig } from "./config.js";

export interface DatabaseHealthResult {
  status: "ok" | "error";
  required: true;
  message: string;
  latencyMs?: number;
}

let databasePool: Pool | undefined;

export function getDatabasePool(): Pool {
  if (!databasePool) {
    databasePool = new Pool(loadDatabaseConfig());

    databasePool.on("error", (error) => {
      console.error("Unexpected PostgreSQL pool error.", error);
    });
  }

  return databasePool;
}

export async function verifyDatabaseConnection(): Promise<void> {
  const pool = getDatabasePool();
  const client = await pool.connect();

  try {
    await client.query("SELECT 1");
  } finally {
    client.release();
  }
}

export async function getDatabaseHealth(): Promise<DatabaseHealthResult> {
  const startedAt = performance.now();

  try {
    await verifyDatabaseConnection();

    return {
      status: "ok",
      required: true,
      latencyMs: Math.round(performance.now() - startedAt),
      message: "PostgreSQL responded to SELECT 1.",
    };
  } catch (error) {
    return {
      status: "error",
      required: true,
      message: error instanceof Error ? error.message : String(error),
    };
  }
}

export async function closeDatabasePool(): Promise<void> {
  if (!databasePool) {
    return;
  }

  const pool = databasePool;
  databasePool = undefined;
  await pool.end();
}
