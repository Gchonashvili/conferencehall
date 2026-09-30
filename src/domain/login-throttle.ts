import { and, eq, gte, lt, sql } from "drizzle-orm";
import type { Database } from "@/db";
import { loginAttempts } from "@/db/schema";

export const LOGIN_WINDOW_MS = 15 * 60 * 1000;
/** Wrong passwords tolerated per account, and per network address, in one window. */
export const MAX_FAILED_PER_EMAIL = 8;
export const MAX_FAILED_PER_IP = 30;

export type LoginWho = { email: string; ip?: string | null };

const since = (now: Date) => new Date(now.getTime() - LOGIN_WINDOW_MS);

/** True once this account (or this address) has failed too often recently. Check before trying the password. */
export async function isLoginBlocked(db: Database, who: LoginWho, now: Date): Promise<boolean> {
  const count = async (col: typeof loginAttempts.email | typeof loginAttempts.ip, value: string) => {
    const [{ n }] = await db
      .select({ n: sql<number>`count(*)::int` })
      .from(loginAttempts)
      .where(and(eq(col, value), gte(loginAttempts.createdAt, since(now))));
    return n;
  };
  if ((await count(loginAttempts.email, who.email)) >= MAX_FAILED_PER_EMAIL) return true;
  return who.ip ? (await count(loginAttempts.ip, who.ip)) >= MAX_FAILED_PER_IP : false;
}

export async function recordFailedLogin(db: Database, who: LoginWho, now: Date): Promise<void> {
  await db.insert(loginAttempts).values({ email: who.email, ip: who.ip ?? null, createdAt: now });
  // Old rows are useless after the window; trim them so the table stays tiny.
  await db.delete(loginAttempts).where(lt(loginAttempts.createdAt, since(now)));
}

/** A successful sign-in wipes the account's failures so the owner is never locked out by old typos. */
export async function clearFailedLogins(db: Database, email: string): Promise<void> {
  await db.delete(loginAttempts).where(eq(loginAttempts.email, email));
}
