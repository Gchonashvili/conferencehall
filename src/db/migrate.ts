/**
 * Applies SQL migrations to the database in DATABASE_URL (Neon).
 * Run on deploy: `pnpm db:migrate` (Railway pre-deploy command).
 * In development PGlite migrates itself on startup, so this is not needed.
 */
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Pool } from "pg";
import { migrationsFolder } from "./index";

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.log("DATABASE_URL is not set; nothing to migrate (PGlite migrates itself in dev).");
    return;
  }
  const pool = new Pool({ connectionString: url, max: 1 });
  await migrate(drizzle(pool), { migrationsFolder });
  await pool.end();
  console.log("Migrations applied.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
