import type { Pool } from "pg";

async function assertTableExists(pool: Pool, fullyQualifiedName: string, setupInstruction: string): Promise<void> {
  const result = await pool.query<{ relation_name: string | null }>("SELECT to_regclass($1) AS relation_name", [fullyQualifiedName]);

  if (!result.rows[0]?.relation_name) {
    throw new Error(`${fullyQualifiedName} is missing. ${setupInstruction}`);
  }
}

async function assertColumnExists(
  pool: Pool,
  schema: string,
  table: string,
  column: string,
  setupInstruction: string,
): Promise<void> {
  const result = await pool.query<{ exists: boolean }>(
    `
      SELECT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = $1
          AND table_name = $2
          AND column_name = $3
      ) AS exists
    `,
    [schema, table, column],
  );

  if (result.rows[0]?.exists !== true) {
    throw new Error(`${schema}.${table}.${column} is missing. ${setupInstruction}`);
  }
}

export async function verifyRepositorySchema(pool: Pool): Promise<void> {
  const setupInstruction = "Run `npm run db:migrate --workspace apps/api` before starting the stack.";

  await assertTableExists(pool, "public.repositories", setupInstruction);
  await assertColumnExists(pool, "auth", "users", "handle", setupInstruction);
}
