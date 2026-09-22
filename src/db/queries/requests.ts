import { and, desc, eq, or, sql } from "drizzle-orm";
import { pickText } from "@/lib/i18n-text";
import type { Database } from "../index";
import { bookingRequests, eventTypes, hallAreas, halls, venues } from "../schema";

export type RequestRow = {
  id: string;
  reference: string;
  status: "pending" | "accepted" | "declined" | "expired" | "paid" | "completed" | "cancelled";
  eventDate: string;
  timeOfDay: "morning" | "afternoon" | "evening" | "full_day";
  guests: number;
  message: string | null;
  contactName: string;
  contactPhone: string;
  contactEmail: string;
  locale: string;
  quotedTotalTetri: number | null;
  depositTetri: number | null;
  declineReason: string | null;
  expiresAt: Date;
  createdAt: Date;
  respondedAt: Date | null;
  eventType: string;
  eventTypeName: string;
  hallName: string;
  hallSlug: string;
  venueId: string;
  venueName: string;
  /** Percentage of the total taken as deposit, if the venue overrides the default. */
  depositPercent: number | null;
  areaName: string | null;
};

const columns = {
  id: bookingRequests.id,
  reference: bookingRequests.reference,
  status: bookingRequests.status,
  eventDate: bookingRequests.eventDate,
  timeOfDay: bookingRequests.timeOfDay,
  guests: bookingRequests.guests,
  message: bookingRequests.message,
  contactName: bookingRequests.contactName,
  contactPhone: bookingRequests.contactPhone,
  contactEmail: bookingRequests.contactEmail,
  locale: bookingRequests.locale,
  quotedTotalTetri: bookingRequests.quotedTotalTetri,
  depositTetri: bookingRequests.depositTetri,
  declineReason: bookingRequests.declineReason,
  expiresAt: bookingRequests.expiresAt,
  createdAt: bookingRequests.createdAt,
  respondedAt: bookingRequests.respondedAt,
  eventType: bookingRequests.eventType,
  eventTypeName: eventTypes.name,
  hallName: halls.name,
  hallSlug: halls.slug,
  venueId: venues.id,
  venueName: venues.name,
  depositPercent: venues.depositPercent,
  areaName: hallAreas.name,
};

function base(db: Database) {
  return db
    .select(columns)
    .from(bookingRequests)
    .innerJoin(halls, eq(bookingRequests.hallId, halls.id))
    .innerJoin(venues, eq(halls.venueId, venues.id))
    .innerJoin(eventTypes, eq(bookingRequests.eventType, eventTypes.slug))
    .leftJoin(hallAreas, eq(bookingRequests.areaId, hallAreas.id));
}

type Raw = Awaited<ReturnType<typeof base>>[number];

function localize(r: Raw, locale: string): RequestRow {
  return {
    ...r,
    eventTypeName: pickText(r.eventTypeName, locale),
    hallName: pickText(r.hallName, locale),
    venueName: pickText(r.venueName, locale),
    areaName: r.areaName ? pickText(r.areaName, locale) : null,
  };
}

/** Requests waiting for an answer come first, then newest. */
const pendingFirst = sql`case when ${bookingRequests.status} = 'pending' then 0 else 1 end`;

/** Requests for halls of venues this user owns. Nothing else is ever returned. */
export async function listVenueRequests(db: Database, ownerUserId: string, locale: string): Promise<RequestRow[]> {
  const rows = await base(db)
    .where(eq(venues.ownerUserId, ownerUserId))
    .orderBy(pendingFirst, desc(bookingRequests.createdAt));
  return rows.map((r) => localize(r, locale));
}

/** One request, only if it belongs to one of this user's venues. */
export async function getVenueRequest(
  db: Database,
  ownerUserId: string,
  requestId: string,
  locale: string,
): Promise<RequestRow | null> {
  const [row] = await base(db).where(and(eq(bookingRequests.id, requestId), eq(venues.ownerUserId, ownerUserId)));
  return row ? localize(row, locale) : null;
}

/**
 * An organizer's own requests: ones made while logged in, plus anonymous ones
 * made with their email address. The email match only counts once the account's
 * email is verified, otherwise anyone could sign up with a victim's address and
 * read their bookings.
 */
export async function listOrganizerRequests(
  db: Database,
  user: { id: string; email: string; emailVerified: boolean },
  locale: string,
): Promise<RequestRow[]> {
  const mine = user.emailVerified
    ? or(eq(bookingRequests.organizerUserId, user.id), eq(bookingRequests.contactEmail, user.email.toLowerCase()))
    : eq(bookingRequests.organizerUserId, user.id);
  const rows = await base(db).where(mine).orderBy(desc(bookingRequests.createdAt));
  return rows.map((r) => localize(r, locale));
}

export async function countPendingForOwner(db: Database, ownerUserId: string): Promise<number> {
  const [{ n }] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(bookingRequests)
    .innerJoin(halls, eq(bookingRequests.hallId, halls.id))
    .innerJoin(venues, eq(halls.venueId, venues.id))
    .where(and(eq(venues.ownerUserId, ownerUserId), eq(bookingRequests.status, "pending")));
  return n;
}
