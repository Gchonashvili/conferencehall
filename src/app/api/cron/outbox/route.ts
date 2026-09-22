import { getDb } from "@/db";
import { expireStaleRequests } from "@/domain/booking-service";
import { env } from "@/env";
import { processOutbox } from "@/lib/outbox";
import { safeEqual } from "@/lib/safe-equal";

/**
 * Worker endpoint, called every minute by a Railway cron service:
 *   curl -X POST -H "Authorization: Bearer $CRON_SECRET" https://<site>/api/cron/outbox
 * Expires unanswered requests, then delivers any queued notifications.
 */
export async function POST(req: Request) {
  if (!env.CRON_SECRET) return new Response("Cron is not configured", { status: 503 });
  if (!safeEqual(req.headers.get("authorization") ?? "", `Bearer ${env.CRON_SECRET}`)) {
    return new Response("Unauthorized", { status: 401 });
  }

  const db = await getDb();
  const expired = await expireStaleRequests(db);
  const outbox = await processOutbox(db, { limit: 50 });
  return Response.json({ expired, outbox });
}
