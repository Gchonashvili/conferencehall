import { getDb } from "@/db";
import { processOutbox } from "./outbox";

/**
 * Best-effort immediate delivery, run after the response is sent so the user
 * never waits on WhatsApp or email. If it fails, the outbox row simply stays
 * queued and the cron worker delivers it, which is the point of the outbox.
 */
export async function drainOutboxSoon(): Promise<void> {
  try {
    await processOutbox(await getDb());
  } catch (err) {
    console.error("[outbox] immediate drain failed; cron will retry", err);
  }
}
