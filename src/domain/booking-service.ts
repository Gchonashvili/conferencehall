import { and, eq, gte, lt, or, sql } from "drizzle-orm";
import type { Database, Executor } from "@/db";
import {
  bookingRequests,
  eventTypes,
  hallAreas,
  hallEventTypes,
  halls,
  venues,
} from "@/db/schema";
import { env } from "@/env";
import { formatGel, depositTetri } from "@/lib/money";
import { pickText } from "@/lib/i18n-text";
import { enqueueNotifications, type NewNotification } from "@/lib/outbox";
import { normalizePhone } from "@/lib/phone";
import { assertTransition, generateReference, InvalidTransitionError, requestExpiry } from "./booking";
import type { BookingRequestInput } from "./booking-input";

export type BookingErrorCode =
  | "hall_unavailable"
  | "invalid_event_type"
  | "invalid_area"
  | "guests_exceed_capacity"
  | "rate_limited"
  | "not_found"
  | "forbidden"
  | "invalid_state"
  | "expired"
  | "invalid_price";

export class BookingError extends Error {
  constructor(public readonly code: BookingErrorCode) {
    super(code);
  }
}

type Locale = "ka" | "en";
/** Who is acting. Venue users may only touch requests for their own halls. */
export type Actor = { role: "admin" } | { role: "venue"; venueId: string };

const VENUE_LOCALE: Locale = "ka"; // venue-facing messages default to Georgian
const RATE_LIMIT_PER_HOUR = 5;
const MAX_PRICE_TETRI = 1_000_000_00; // 1,000,000 ₾: a sanity cap, not a business rule

const siteUrl = () => env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, "");

/** Fields shared by every notification about one booking, in one language. */
async function requestContext(x: Executor, requestId: string, locale: Locale) {
  const [row] = await x
    .select({ r: bookingRequests, hall: halls, venue: venues, eventType: eventTypes })
    .from(bookingRequests)
    .innerJoin(halls, eq(bookingRequests.hallId, halls.id))
    .innerJoin(venues, eq(halls.venueId, venues.id))
    .innerJoin(eventTypes, eq(bookingRequests.eventType, eventTypes.slug))
    .where(eq(bookingRequests.id, requestId));
  if (!row) throw new BookingError("not_found");
  const { r, hall, venue, eventType } = row;
  const payload = {
    reference: r.reference,
    hallName: pickText(hall.name, locale),
    venueName: pickText(venue.name, locale),
    eventType: r.eventType,
    eventTypeName: pickText(eventType.name, locale),
    eventDate: r.eventDate,
    timeOfDay: r.timeOfDay,
    guests: r.guests,
    contactName: r.contactName,
    contactPhone: r.contactPhone,
    contactEmail: r.contactEmail,
    message: r.message ?? "",
    dashboardUrl: `${siteUrl()}/${VENUE_LOCALE}/dashboard/requests/${r.id}`,
    accountUrl: `${siteUrl()}/${locale}/account/reservations`,
    searchUrl: `${siteUrl()}/${locale}/halls`,
  };
  return { request: r, hall, venue, payload };
}

// --------------------------------------------------------------- create
export async function createBookingRequest(
  db: Database,
  input: BookingRequestInput,
  opts: { locale: Locale; now?: Date },
): Promise<{ id: string; reference: string }> {
  const now = opts.now ?? new Date();

  const [row] = await db
    .select({ hall: halls, venue: venues })
    .from(halls)
    .innerJoin(venues, eq(halls.venueId, venues.id))
    .where(and(eq(halls.id, input.hallId), eq(halls.status, "published"), eq(venues.status, "active")));
  if (!row) throw new BookingError("hall_unavailable");
  const { hall, venue } = row;

  const [offered] = await db
    .select({ slug: hallEventTypes.eventTypeSlug })
    .from(hallEventTypes)
    .where(and(eq(hallEventTypes.hallId, hall.id), eq(hallEventTypes.eventTypeSlug, input.eventType)));
  if (!offered) throw new BookingError("invalid_event_type");

  if (input.areaId) {
    const [area] = await db
      .select({ id: hallAreas.id })
      .from(hallAreas)
      .where(and(eq(hallAreas.id, input.areaId), eq(hallAreas.hallId, hall.id)));
    if (!area) throw new BookingError("invalid_area");
  }

  if (input.guests > hall.capacityMax) throw new BookingError("guests_exceed_capacity");

  // Cheap abuse guard: the same person can't flood venues.
  const [{ recent }] = await db
    .select({ recent: sql<number>`count(*)::int` })
    .from(bookingRequests)
    .where(
      and(
        gte(bookingRequests.createdAt, new Date(now.getTime() - 60 * 60 * 1000)),
        or(eq(bookingRequests.contactEmail, input.email), eq(bookingRequests.contactPhone, input.phone)),
      ),
    );
  if (recent >= RATE_LIMIT_PER_HOUR) throw new BookingError("rate_limited");

  return db.transaction(async (tx) => {
    let created: { id: string; reference: string } | undefined;
    for (let attempt = 0; attempt < 5 && !created; attempt++) {
      // ON CONFLICT (reference) DO NOTHING: a collision returns no row, so we
      // just draw another code without aborting the transaction.
      [created] = await tx
        .insert(bookingRequests)
        .values({
          reference: generateReference(),
          hallId: hall.id,
          areaId: input.areaId ?? null,
          locale: opts.locale,
          createdAt: now,
          contactName: input.name,
          contactPhone: input.phone,
          contactEmail: input.email,
          eventType: input.eventType,
          eventDate: input.eventDate,
          timeOfDay: input.timeOfDay,
          guests: input.guests,
          message: input.message ?? null,
          expiresAt: requestExpiry(now, env.REQUEST_EXPIRY_HOURS),
        })
        .onConflictDoNothing({ target: bookingRequests.reference })
        .returning({ id: bookingRequests.id, reference: bookingRequests.reference });
    }
    if (!created) throw new Error("Could not allocate a unique booking reference");

    const forVenue = (await requestContext(tx, created.id, VENUE_LOCALE)).payload;
    const forOrganizer = (await requestContext(tx, created.id, opts.locale)).payload;
    const key = (kind: string, channel: string, to: string) => `${kind}:${created.id}:${channel}:${to}`;

    const events: NewNotification[] = [
      {
        kind: "request.created.organizer",
        channel: "email",
        recipient: input.email,
        locale: opts.locale,
        payload: forOrganizer,
        dedupeKey: key("request.created.organizer", "email", input.email),
      },
    ];
    // Venue numbers are typed by hand; WhatsApp needs clean E.164.
    const venueWhatsapp = venue.whatsapp ? normalizePhone(venue.whatsapp) : null;
    if (venue.whatsapp && !venueWhatsapp) {
      console.warn(`[booking] venue ${venue.slug} has an invalid WhatsApp number "${venue.whatsapp}"; alert skipped, email still sent`);
    }
    if (venueWhatsapp) {
      events.push({
        kind: "request.created.venue",
        channel: "whatsapp",
        recipient: venueWhatsapp,
        locale: VENUE_LOCALE,
        payload: forVenue,
        dedupeKey: key("request.created.venue", "whatsapp", venueWhatsapp),
      });
    }
    if (venue.email) {
      events.push({
        kind: "request.created.venue",
        channel: "email",
        recipient: venue.email,
        locale: VENUE_LOCALE,
        payload: forVenue,
        dedupeKey: key("request.created.venue", "email", venue.email),
      });
    }
    if (env.OPS_EMAIL) {
      events.push({
        kind: "request.created.ops",
        channel: "email",
        recipient: env.OPS_EMAIL,
        locale: "en",
        payload: (await requestContext(tx, created.id, "en")).payload,
        dedupeKey: key("request.created.ops", "email", env.OPS_EMAIL),
      });
    }
    await enqueueNotifications(tx, events, now);
    return created;
  });
}

// -------------------------------------------------------------- respond
export type Response =
  | { type: "accept"; totalTetri: number }
  | { type: "decline"; reason?: string };

/**
 * A venue (or the team) answers a pending request. The row is locked for the
 * duration, so a simultaneous accept and expiry can't both win.
 */
export async function respondToRequest(
  db: Database,
  params: { requestId: string; actor: Actor; response: Response },
  opts: { now?: Date } = {},
): Promise<{ status: "accepted" | "declined"; depositTetri: number | null }> {
  const now = opts.now ?? new Date();

  return db.transaction(async (tx) => {
    const [locked] = await tx
      .select({ id: bookingRequests.id, status: bookingRequests.status, expiresAt: bookingRequests.expiresAt, locale: bookingRequests.locale, venueId: halls.venueId, depositPercent: venues.depositPercent })
      .from(bookingRequests)
      .innerJoin(halls, eq(bookingRequests.hallId, halls.id))
      .innerJoin(venues, eq(halls.venueId, venues.id))
      .where(eq(bookingRequests.id, params.requestId))
      .for("update", { of: bookingRequests });
    if (!locked) throw new BookingError("not_found");

    if (params.actor.role === "venue" && params.actor.venueId !== locked.venueId) {
      throw new BookingError("forbidden");
    }

    const target = params.response.type === "accept" ? "accepted" : "declined";
    try {
      assertTransition(locked.status, target);
    } catch (e) {
      if (e instanceof InvalidTransitionError) throw new BookingError("invalid_state");
      throw e;
    }
    if (locked.expiresAt < now) throw new BookingError("expired");

    let total: number | null = null;
    let deposit: number | null = null;
    if (params.response.type === "accept") {
      total = params.response.totalTetri;
      if (!Number.isInteger(total) || total <= 0 || total > MAX_PRICE_TETRI) throw new BookingError("invalid_price");
      deposit = depositTetri(total, locked.depositPercent ?? env.DEFAULT_DEPOSIT_PERCENT);
      if (deposit < 1) throw new BookingError("invalid_price");
    }

    await tx
      .update(bookingRequests)
      .set({
        status: target,
        quotedTotalTetri: total,
        depositTetri: deposit,
        declineReason: params.response.type === "decline" ? (params.response.reason?.trim().slice(0, 500) || null) : null,
        respondedAt: now,
      })
      .where(eq(bookingRequests.id, locked.id));

    const locale = (locked.locale === "en" ? "en" : "ka") as Locale;
    const ctx = await requestContext(tx, locked.id, locale);
    const kind = target === "accepted" ? "request.accepted.organizer" : "request.declined.organizer";
    await enqueueNotifications(tx, [
      {
        kind,
        channel: "email",
        recipient: ctx.request.contactEmail,
        locale,
        payload: {
          ...ctx.payload,
          totalGel: total != null ? formatGel(total, locale) : "",
          depositGel: deposit != null ? formatGel(deposit, locale) : "",
          declineReason: params.response.type === "decline" ? (params.response.reason ?? "") : "",
        },
        dedupeKey: `${kind}:${locked.id}:email:${ctx.request.contactEmail}`,
      },
    ], now);

    return { status: target, depositTetri: deposit };
  });
}

// --------------------------------------------------------------- cancel
/** The team cancels a request (spam, duplicate, an unresponsive venue). Locked, same as `respondToRequest`. */
export async function cancelRequest(
  db: Database,
  requestId: string,
  opts: { reason?: string; now?: Date },
): Promise<void> {
  const now = opts.now ?? new Date();

  return db.transaction(async (tx) => {
    const [locked] = await tx
      .select({ id: bookingRequests.id, status: bookingRequests.status, locale: bookingRequests.locale })
      .from(bookingRequests)
      .where(eq(bookingRequests.id, requestId))
      .for("update", { of: bookingRequests });
    if (!locked) throw new BookingError("not_found");

    try {
      assertTransition(locked.status, "cancelled");
    } catch (e) {
      if (e instanceof InvalidTransitionError) throw new BookingError("invalid_state");
      throw e;
    }

    await tx
      .update(bookingRequests)
      .set({ status: "cancelled", declineReason: opts.reason?.trim().slice(0, 500) || null, respondedAt: now })
      .where(eq(bookingRequests.id, locked.id));

    const locale = (locked.locale === "en" ? "en" : "ka") as Locale;
    const ctx = await requestContext(tx, locked.id, locale);
    await enqueueNotifications(tx, [
      {
        kind: "request.cancelled.organizer",
        channel: "email",
        recipient: ctx.request.contactEmail,
        locale,
        payload: { ...ctx.payload, cancelReason: opts.reason ?? "" },
        dedupeKey: `request.cancelled.organizer:${locked.id}:email:${ctx.request.contactEmail}`,
      },
    ], now);
  });
}

// --------------------------------------------------------------- expire
/** Marks unanswered requests as expired and tells the organizer. Run from the cron endpoint. */
export async function expireStaleRequests(db: Database, opts: { now?: Date } = {}): Promise<number> {
  const now = opts.now ?? new Date();

  return db.transaction(async (tx) => {
    const stale = await tx
      .select({ id: bookingRequests.id, locale: bookingRequests.locale })
      .from(bookingRequests)
      .where(and(eq(bookingRequests.status, "pending"), lt(bookingRequests.expiresAt, now)))
      .for("update", { skipLocked: true });

    for (const s of stale) {
      await tx.update(bookingRequests).set({ status: "expired" }).where(eq(bookingRequests.id, s.id));
      const locale = (s.locale === "en" ? "en" : "ka") as Locale;
      const ctx = await requestContext(tx, s.id, locale);
      await enqueueNotifications(tx, [
        {
          kind: "request.expired.organizer",
          channel: "email",
          recipient: ctx.request.contactEmail,
          locale,
          payload: ctx.payload,
          dedupeKey: `request.expired.organizer:${s.id}:email:${ctx.request.contactEmail}`,
        },
      ], now);
    }
    return stale.length;
  });
}
