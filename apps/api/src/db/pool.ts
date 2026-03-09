import { Pool } from "pg";
import { loadDatabaseConfig } from "./config.js";

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

export async function closeDatabasePool(): Promise<void> {
  if (!databasePool) {
    return;
  }

  const pool = databasePool;
  databasePool = undefined;
  await pool.end();
}
