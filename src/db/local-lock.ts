import { existsSync, mkdirSync, readFileSync, unlinkSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

function alive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch (e) {
    return (e as NodeJS.ErrnoException).code === "EPERM"; // exists, just not ours
  }
}

/**
 * The local development database (PGlite) can only be opened by one process
 * at a time; a second writer corrupts it. This lock turns that silent
 * corruption into a clear error. A lock left by a dead process is ignored.
 * Returns a function that releases the lock.
 */
export function acquireLocalDbLock(lockPath: string): () => void {
  mkdirSync(dirname(lockPath), { recursive: true });
  if (existsSync(lockPath)) {
    const pid = Number(readFileSync(lockPath, "utf8"));
    if (pid && pid !== process.pid && alive(pid)) {
      throw new Error(
        `The local development database is in use by process ${pid}. Stop it first (usually the dev server), or set DATABASE_URL to use a real Postgres.`,
      );
    }
  }
  writeFileSync(lockPath, String(process.pid));

  const release = () => {
    try {
      if (readFileSync(lockPath, "utf8") === String(process.pid)) unlinkSync(lockPath);
    } catch {
      /* already gone */
    }
  };
  process.once("exit", release);
  return release;
}
