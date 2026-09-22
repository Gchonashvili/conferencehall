import { join } from "node:path";
import { drizzle as drizzlePg, type NodePgDatabase } from "drizzle-orm/node-postgres";
import type { PgDatabase } from "drizzle-orm/pg-core";
import { Pool } from "pg";
import { env } from "@/env";
import { acquireLocalDbLock } from "./local-lock";
import * as schema from "./schema";

/**
 * One typed handle for the whole app.
 *
 * - Production / staging: Neon Postgres over its pooled URL via `pg`
 *   (a long-running Railway server, so a normal pool and real transactions).
 * - Development and tests, when DATABASE_URL is unset: PGlite, a real
 *   Postgres compiled to WASM, so the app runs with no external database.
 *   PGlite's drizzle instance has the same query API, so it is cast to the
 *   node-postgres type.
 */
export type Database = NodePgDatabase<typeof schema>;

/**
 * Anything you can run queries on: the database itself or a transaction
 * handle. Functions that must work inside a transaction take this.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Executor = PgDatabase<any, typeof schema>;

export const migrationsFolder = join(process.cwd(), "drizzle");

async function createPglite(dataDir?: string): Promise<Database> {
  const [{ PGlite }, { drizzle }, { migrate }] = await Promise.all([
    import("@electric-sql/pglite"),
    import("drizzle-orm/pglite"),
    import("drizzle-orm/pglite/migrator"),
  ]);
  let release: (() => void) | undefined;
  if (dataDir) release = acquireLocalDbLock(`${dataDir}.lock`);

  const client = new PGlite(dataDir);
  if (dataDir) {
    // Killing the process mid-write corrupts the folder, so close cleanly on shutdown.
    const shutdown = () => {
      void client.close().catch(() => {}).finally(() => {
        release?.();
        process.exit(0);
      });
    };
    process.once("SIGINT", shutdown);
    process.once("SIGTERM", shutdown);
  }

  const db = drizzle(client, { schema });
  await migrate(db, { migrationsFolder });
  return db as unknown as Database;
}

/** Fresh in-memory database with all migrations applied (tests). */
export function createMemoryDb(): Promise<Database> {
  return createPglite();
}

async function init(): Promise<Database> {
  if (env.DATABASE_URL) {
    const pool = new Pool({ connectionString: env.DATABASE_URL, max: 10 });
    return drizzlePg(pool, { schema });
  }
  if (env.NODE_ENV === "production" && env.LOCAL_DB !== "pglite") {
    throw new Error("DATABASE_URL is required in production");
  }
  return createPglite(env.NODE_ENV === "test" ? undefined : join(process.cwd(), ".data/pglite"));
}

const globalForDb = globalThis as unknown as { __conferencehallDb?: Promise<Database> };

export function getDb(): Promise<Database> {
  if (!globalForDb.__conferencehallDb) {
    globalForDb.__conferencehallDb = init().catch((err) => {
      globalForDb.__conferencehallDb = undefined; // allow a retry after a failed connect
      throw err;
    });
  }
  return globalForDb.__conferencehallDb;
}

export { schema };
