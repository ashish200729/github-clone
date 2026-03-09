import { Pool, type PoolClient, type PoolConfig } from "pg";
import { loadWebAuthEnv } from "@/lib/auth/env";

const REQUIRED_AUTH_TABLES = [
  "auth.users",
  "auth.accounts",
  "auth.sessions",
  "auth.verification_token",
] as const;

let authDatabasePool: Pool | undefined;
let authSchemaVerificationPromise: Promise<void> | undefined;
const configuredAuthClients = new WeakSet<PoolClient>();

export function buildAuthDatabasePoolConfig(env: NodeJS.ProcessEnv = process.env): PoolConfig {
  const config = loadWebAuthEnv(env);

  return {
    connectionString: config.DATABASE_URL,
    ssl: config.DATABASE_SSL === "require" ? { rejectUnauthorized: true } : false,
    max: 10,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 10_000,
    application_name: "github-clone-web-auth",
  };
}

async function ensureAuthSearchPath(client: PoolClient): Promise<void> {
  if (configuredAuthClients.has(client)) {
    return;
  }

  await client.query("SET search_path TO auth, public");
  configuredAuthClients.add(client);
}

export function getAuthDatabasePool(): Pool {
  if (!authDatabasePool) {
    authDatabasePool = new Pool(buildAuthDatabasePoolConfig());

    authDatabasePool.query = (async (...args: Parameters<Pool["query"]>) => {
      const client = await authDatabasePool!.connect();

      try {
        await ensureAuthSearchPath(client);
        return await client.query(...(args as Parameters<PoolClient["query"]>));
      } finally {
        client.release();
      }
    }) as Pool["query"];

    authDatabasePool.on("error", (error) => {
      console.error("[auth] Unexpected PostgreSQL auth pool error.", { message: error.message });
    });
  }

  return authDatabasePool;
}

export async function verifyAuthSchema(): Promise<void> {
  if (!authSchemaVerificationPromise) {
    authSchemaVerificationPromise = (async () => {
      const pool = getAuthDatabasePool();
      const client = await pool.connect();

      try {
        await ensureAuthSearchPath(client);

        const result = await client.query<{ relation: string | null }>(
          `SELECT to_regclass($1) AS relation
           UNION ALL SELECT to_regclass($2)
           UNION ALL SELECT to_regclass($3)
           UNION ALL SELECT to_regclass($4)`,
          [...REQUIRED_AUTH_TABLES],
        );

        const missingTables = result.rows
          .map((row, index) => (row.relation === null ? REQUIRED_AUTH_TABLES[index] : null))
          .filter((value): value is (typeof REQUIRED_AUTH_TABLES)[number] => value !== null);

        if (missingTables.length > 0) {
          throw new Error(
            `Auth schema verification failed. Missing required tables: ${missingTables.join(", ")}. Ensure the auth adapter pool uses search_path=auth,public.`,
          );
        }
      } finally {
        client.release();
      }
    })();
  }

  return authSchemaVerificationPromise;
}
