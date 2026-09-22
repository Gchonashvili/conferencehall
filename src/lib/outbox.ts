import { and, asc, eq, inArray, lte, sql } from "drizzle-orm";
import type { Database, Executor } from "@/db";
import { notificationEvents } from "@/db/schema";
import { deliver as defaultDeliver, type Deliver } from "./notifications/deliver";

export type NewNotification = {
  kind: string;
  channel: "email" | "whatsapp";
  recipient: string;
  locale: string;
  payload: Record<string, unknown>;
  /** Same key = same notification. Prevents duplicates on retries. */
  dedupeKey: string;
};

/**
 * Call inside the transaction that caused the notification. Rows are stamped
 * with the caller's clock (`now`), the same one the caller reasons with, so
 * time-dependent behaviour is consistent and testable.
 */
export async function enqueueNotifications(
  tx: Executor,
  events: NewNotification[],
  now: Date = new Date(),
): Promise<void> {
  if (events.length === 0) return;
  await tx
    .insert(notificationEvents)
    .values(events.map((e) => ({ ...e, createdAt: now, nextAttemptAt: now })))
    .onConflictDoNothing({ target: notificationEvents.dedupeKey });
}

export const MAX_ATTEMPTS = 8;
/** How long a worker owns a row it claimed before another may retry it. */
const LEASE_MS = 5 * 60 * 1000;

/** 30s, 1m, 2m, 4m ... capped at one hour. */
export function backoffMs(attempts: number): number {
  return Math.min(30_000 * 2 ** Math.max(0, attempts - 1), 60 * 60 * 1000);
}

export type OutboxResult = { claimed: number; sent: number; failed: number; dead: number };

/**
 * Delivers due notifications. At-least-once: rows are claimed with a short
 * lease (FOR UPDATE SKIP LOCKED, so concurrent workers never take the same
 * row), delivered outside the transaction, then marked sent or rescheduled.
 * A worker that crashes mid-way just lets the lease expire and the row is retried.
 */
export async function processOutbox(
  db: Database,
  opts: { now?: Date; limit?: number; deliver?: Deliver } = {},
): Promise<OutboxResult> {
  const now = opts.now ?? new Date();
  const limit = opts.limit ?? 20;
  const deliver = opts.deliver ?? defaultDeliver;

  const claimed = await db.transaction(async (tx) => {
    const due = await tx
      .select({ id: notificationEvents.id })
      .from(notificationEvents)
      .where(and(inArray(notificationEvents.status, ["pending", "failed"]), lte(notificationEvents.nextAttemptAt, now)))
      .orderBy(asc(notificationEvents.createdAt))
      .limit(limit)
      .for("update", { skipLocked: true });
    if (due.length === 0) return [];

    return tx
      .update(notificationEvents)
      .set({
        attempts: sql`${notificationEvents.attempts} + 1`,
        nextAttemptAt: new Date(now.getTime() + LEASE_MS),
      })
      .where(inArray(notificationEvents.id, due.map((d) => d.id)))
      .returning();
  });

  const result: OutboxResult = { claimed: claimed.length, sent: 0, failed: 0, dead: 0 };
  for (const row of claimed) {
    try {
      await deliver(row);
      await db
        .update(notificationEvents)
        .set({ status: "sent", sentAt: now, lastError: null })
        .where(eq(notificationEvents.id, row.id));
      result.sent++;
    } catch (err) {
      const dead = row.attempts >= MAX_ATTEMPTS;
      await db
        .update(notificationEvents)
        .set({
          status: dead ? "dead" : "failed",
          lastError: (err instanceof Error ? err.message : String(err)).slice(0, 500),
          nextAttemptAt: new Date(now.getTime() + backoffMs(row.attempts)),
        })
        .where(eq(notificationEvents.id, row.id));
      if (dead) result.dead++;
      else result.failed++;
    }
  }
  return result;
}
