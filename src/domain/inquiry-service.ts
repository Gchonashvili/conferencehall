import { and, eq, gte, sql } from "drizzle-orm";
import { z } from "zod";
import type { Database } from "@/db";
import { inquiries } from "@/db/schema";
import { env } from "@/env";
import { isValidIsoDate } from "@/lib/dates";
import { enqueueNotifications, type NewNotification } from "@/lib/outbox";
import { normalizePhone } from "@/lib/phone";

const blank = (v: unknown) => (typeof v === "string" && v.trim() === "" ? undefined : v);
const SLUG = /^[a-z0-9_-]{1,40}$/;

const phone = z.string().transform((v, ctx) => {
  const p = normalizePhone(v);
  if (!p) ctx.addIssue({ code: "custom", message: "invalid_phone" });
  return p ?? "";
});
const optionalPhone = z.preprocess(blank, phone.optional());
const email = z.string().trim().max(254, { error: "invalid_email" }).pipe(z.email({ error: "invalid_email" })).transform((v) => v.toLowerCase());
const name = z.string().trim().min(2, { error: "name_required" }).max(120, { error: "name_required" });

/** One schema per form variant, sharing the same error codes as bookings. */
export function inquirySchema(kind: "contact" | "brief" | "venue", today: string) {
  const message = (min: number) =>
    z.string().trim().min(min, { error: "required" }).max(2000, { error: "message_too_long" });

  if (kind === "contact") {
    return z.object({ name, email, phone: optionalPhone, message: message(5) });
  }
  if (kind === "venue") {
    return z.object({ name, email, phone, message: message(5) });
  }
  return z.object({
    name,
    email,
    phone,
    citySlug: z.string({ error: "invalid_city" }).regex(SLUG, { error: "invalid_city" }),
    eventType: z.preprocess(blank, z.string().regex(SLUG, { error: "invalid_event_type" }).optional()),
    guests: z.preprocess(blank, z.coerce.number({ error: "invalid_guests" }).int({ error: "invalid_guests" }).min(1, { error: "invalid_guests" }).max(10000, { error: "invalid_guests" }).optional()),
    eventDate: z.preprocess(
      blank,
      z.string().refine(isValidIsoDate, { error: "invalid_date" }).refine((d) => d >= today, { error: "date_in_past" }).optional(),
    ),
    message: z.preprocess(blank, message(0).optional()),
  });
}

export type InquiryInput = {
  kind: "contact" | "brief" | "venue";
  name: string;
  email: string;
  phone?: string;
  message?: string;
  citySlug?: string;
  eventType?: string;
  guests?: number;
  eventDate?: string;
};

export class InquiryError extends Error {
  constructor(public readonly code: "rate_limited") {
    super(code);
  }
}

const RATE_LIMIT_PER_HOUR = 5;

/** Saves the inquiry and queues a team alert (email + WhatsApp) and a confirmation to the sender. */
export async function createInquiry(
  db: Database,
  input: InquiryInput,
  opts: { locale: "ka" | "en"; now?: Date },
): Promise<{ id: string }> {
  const now = opts.now ?? new Date();

  const [{ recent }] = await db
    .select({ recent: sql<number>`count(*)::int` })
    .from(inquiries)
    .where(and(eq(inquiries.email, input.email), gte(inquiries.createdAt, new Date(now.getTime() - 3600_000))));
  if (recent >= RATE_LIMIT_PER_HOUR) throw new InquiryError("rate_limited");

  return db.transaction(async (tx) => {
    const [row] = await tx
      .insert(inquiries)
      .values({
        kind: input.kind,
        name: input.name,
        phone: input.phone ?? null,
        email: input.email,
        message: input.message ?? null,
        citySlug: input.citySlug ?? null,
        eventType: input.eventType ?? null,
        guests: input.guests ?? null,
        eventDate: input.eventDate ?? null,
        createdAt: now,
      })
      .returning({ id: inquiries.id });

    const details = [
      input.citySlug && `City: ${input.citySlug}`,
      input.eventType && `Event: ${input.eventType}`,
      input.guests && `Guests: ${input.guests}`,
      input.eventDate && `Date: ${input.eventDate}`,
    ]
      .filter(Boolean)
      .join(", ");
    const payload = {
      kind: input.kind,
      name: input.name,
      phone: input.phone ?? "",
      email: input.email,
      message: input.message ?? "",
      details,
    };

    const events: NewNotification[] = [
      {
        kind: "inquiry.received.sender",
        channel: "email",
        recipient: input.email,
        locale: opts.locale,
        payload,
        dedupeKey: `inquiry.received.sender:${row.id}:email`,
      },
    ];
    if (env.OPS_EMAIL) {
      events.push({
        kind: "inquiry.received.ops",
        channel: "email",
        recipient: env.OPS_EMAIL,
        locale: "en",
        payload,
        dedupeKey: `inquiry.received.ops:${row.id}:email`,
      });
    }
    if (env.OPS_WHATSAPP) {
      events.push({
        kind: "inquiry.received.ops",
        channel: "whatsapp",
        recipient: env.OPS_WHATSAPP,
        locale: "en",
        payload,
        dedupeKey: `inquiry.received.ops:${row.id}:whatsapp`,
      });
    }
    await enqueueNotifications(tx, events, now);
    return row;
  });
}
