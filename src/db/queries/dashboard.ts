import { and, asc, desc, eq, gte, inArray, isNull, lt, lte, not, notExists, sql } from "drizzle-orm";
import { CLOSED_STAGES } from "@/domain/crm-input";
import { subscriptionHealth, type SubscriptionHealth } from "@/domain/subscriptions";
import { todayInTbilisi } from "@/lib/dates";
import { pickText } from "@/lib/i18n-text";
import type { Database } from "../index";
import {
  adminNotes,
  bookingRequests,
  hallAreas,
  hallEventTypes,
  hallImages,
  halls,
  inquiries,
  notificationEvents,
  subscriptionPayments,
  user,
  venues,
} from "../schema";
import { listSubscriptions, type SubscriptionRow } from "./subscriptions";

/**
 * Everything the admin home page shows, read in one place. Time windows come
 * from the injected `now`, so tests are deterministic.
 */

const DAY_MS = 24 * 60 * 60 * 1000;
/** A request the venue hasn't answered for this long needs a nudge. */
export const STALE_REQUEST_HOURS = 24;
const LIST_LIMIT = 8;

// ------------------------------------------------------------- to do today
export type TodoData = {
  unassignedLeads: { id: string; name: string; kind: "contact" | "brief" | "venue"; createdAt: Date }[];
  unassignedLeadsTotal: number;
  followUps: { id: string; name: string; followUpOn: string; ownerName: string | null; mine: boolean }[];
  staleRequests: {
    id: string;
    reference: string;
    hallName: string;
    venueName: string;
    venuePhone: string | null;
    venueWhatsapp: string | null;
    createdAt: Date;
    expiresAt: Date;
  }[];
  subscriptions: (SubscriptionRow & { health: SubscriptionHealth })[];
};

export async function getTodo(db: Database, opts: { userId: string; locale: string; now: Date }): Promise<TodoData> {
  const today = todayInTbilisi(opts.now);
  const openLead = not(inArray(inquiries.status, [...CLOSED_STAGES]));

  const unassignedWhere = and(eq(inquiries.status, "new"), isNull(inquiries.ownerUserId));
  const [unassignedLeads, [{ n: unassignedLeadsTotal }], followUps, stale, subs] = await Promise.all([
    db
      .select({ id: inquiries.id, name: inquiries.name, kind: inquiries.kind, createdAt: inquiries.createdAt })
      .from(inquiries)
      .where(unassignedWhere)
      .orderBy(asc(inquiries.createdAt))
      .limit(LIST_LIMIT),
    db.select({ n: sql<number>`count(*)::int` }).from(inquiries).where(unassignedWhere),
    db
      .select({
        id: inquiries.id,
        name: inquiries.name,
        followUpOn: inquiries.followUpOn,
        ownerName: user.name,
        mine: sql<boolean>`coalesce(${inquiries.ownerUserId} = ${opts.userId}, false)`,
      })
      .from(inquiries)
      .leftJoin(user, eq(user.id, inquiries.ownerUserId))
      .where(and(openLead, lte(inquiries.followUpOn, today)))
      // The signed-in person's own follow-ups first, then oldest due first.
      .orderBy(desc(sql`coalesce(${inquiries.ownerUserId} = ${opts.userId}, false)`), asc(inquiries.followUpOn))
      .limit(LIST_LIMIT),
    db
      .select({
        id: bookingRequests.id,
        reference: bookingRequests.reference,
        hallName: halls.name,
        venueName: venues.name,
        venuePhone: venues.phone,
        venueWhatsapp: venues.whatsapp,
        createdAt: bookingRequests.createdAt,
        expiresAt: bookingRequests.expiresAt,
      })
      .from(bookingRequests)
      .innerJoin(halls, eq(halls.id, bookingRequests.hallId))
      .innerJoin(venues, eq(venues.id, halls.venueId))
      .where(
        and(
          eq(bookingRequests.status, "pending"),
          lt(bookingRequests.createdAt, new Date(opts.now.getTime() - STALE_REQUEST_HOURS * 60 * 60 * 1000)),
        ),
      )
      .orderBy(asc(bookingRequests.expiresAt))
      .limit(LIST_LIMIT),
    listSubscriptions(db, opts.locale),
  ]);

  return {
    unassignedLeads,
    unassignedLeadsTotal,
    followUps: followUps.map((f) => ({ ...f, followUpOn: f.followUpOn! })),
    staleRequests: stale.map((r) => ({ ...r, hallName: pickText(r.hallName, opts.locale), venueName: pickText(r.venueName, opts.locale) })),
    subscriptions: subs
      .filter((s) => s.venueStatus !== "draft")
      .map((s) => ({ ...s, health: subscriptionHealth(s, today) }))
      .filter((s) => s.health === "expiring" || s.health === "overdue"),
  };
}

// ---------------------------------------------------------------- pipeline
export type PipelineWindow = {
  requestsCreated: number;
  accepted: number;
  declined: number;
  expired: number;
  leadsNew: number;
  leadsWon: number;
  leadsLost: number;
};

async function pipelineWindow(db: Database, from: Date, to: Date): Promise<PipelineWindow> {
  const count = sql<number>`count(*)::int`;
  // Raw-SQL timestamps go in as ISO text with an explicit cast, so PGlite and node-postgres agree.
  const f = sql`${from.toISOString()}::timestamptz`;
  const t = sql`${to.toISOString()}::timestamptz`;
  const [[req], [answered], [leads], [stages]] = await Promise.all([
    db
      .select({ created: count })
      .from(bookingRequests)
      .where(and(gte(bookingRequests.createdAt, from), lt(bookingRequests.createdAt, to))),
    db
      .select({
        accepted: sql<number>`count(*) filter (where ${bookingRequests.status} in ('accepted','paid','completed') and ${bookingRequests.respondedAt} >= ${f} and ${bookingRequests.respondedAt} < ${t})::int`,
        declined: sql<number>`count(*) filter (where ${bookingRequests.status} = 'declined' and ${bookingRequests.respondedAt} >= ${f} and ${bookingRequests.respondedAt} < ${t})::int`,
        // Expiry doesn't set respondedAt; the row's updatedAt is when the cron expired it.
        expired: sql<number>`count(*) filter (where ${bookingRequests.status} = 'expired' and ${bookingRequests.updatedAt} >= ${f} and ${bookingRequests.updatedAt} < ${t})::int`,
      })
      .from(bookingRequests),
    db
      .select({ created: count })
      .from(inquiries)
      .where(and(gte(inquiries.createdAt, from), lt(inquiries.createdAt, to))),
    // Won/lost are counted from the timeline, i.e. when the stage changed, not when the lead arrived.
    db
      .select({
        won: sql<number>`count(*) filter (where ${adminNotes.body} = 'won')::int`,
        lost: sql<number>`count(*) filter (where ${adminNotes.body} = 'lost')::int`,
      })
      .from(adminNotes)
      .where(
        and(
          eq(adminNotes.entityType, "inquiry"),
          eq(adminNotes.kind, "stage"),
          gte(adminNotes.createdAt, from),
          lt(adminNotes.createdAt, to),
        ),
      ),
  ]);
  return {
    requestsCreated: req.created,
    accepted: answered.accepted,
    declined: answered.declined,
    expired: answered.expired,
    leadsNew: leads.created,
    leadsWon: stages.won,
    leadsLost: stages.lost,
  };
}

/** The last 7 days next to the 7 days before them. */
export async function getPipeline(db: Database, now: Date): Promise<{ current: PipelineWindow; previous: PipelineWindow }> {
  const weekAgo = new Date(now.getTime() - 7 * DAY_MS);
  const twoWeeksAgo = new Date(now.getTime() - 14 * DAY_MS);
  const [current, previous] = await Promise.all([pipelineWindow(db, weekAgo, now), pipelineWindow(db, twoWeeksAgo, weekAgo)]);
  return { current, previous };
}

/** Share of answered-or-expired requests the venue accepted, or null when there were none. */
export function acceptanceRate(w: PipelineWindow): number | null {
  const decided = w.accepted + w.declined + w.expired;
  return decided === 0 ? null : Math.round((w.accepted / decided) * 100);
}

// ------------------------------------------------------------------- money
export type MoneyData = {
  activeSubscriptions: number;
  /** Yearly plans count as a twelfth of their price. */
  monthlyRecurringTetri: number;
  collectedThisMonthTetri: number;
  overdue: number;
};

export async function getMoney(db: Database, opts: { locale: string; now: Date }): Promise<MoneyData> {
  const today = todayInTbilisi(opts.now);
  const monthStart = `${today.slice(0, 7)}-01`;
  const [subs, [{ collected }]] = await Promise.all([
    listSubscriptions(db, opts.locale),
    db
      .select({ collected: sql<number>`coalesce(sum(${subscriptionPayments.amountTetri}), 0)::int` })
      .from(subscriptionPayments)
      .where(and(gte(subscriptionPayments.paidOn, monthStart), lte(subscriptionPayments.paidOn, today))),
  ]);

  let activeSubscriptions = 0;
  let monthlyRecurringTetri = 0;
  let overdue = 0;
  for (const s of subs) {
    if (s.venueStatus === "draft") continue;
    const health = subscriptionHealth(s, today);
    if (health === "overdue") overdue++;
    if (health === "active" || health === "expiring") {
      activeSubscriptions++;
      if (s.planPriceTetri != null) monthlyRecurringTetri += s.plan === "yearly" ? Math.round(s.planPriceTetri / 12) : s.planPriceTetri;
    }
  }
  return { activeSubscriptions, monthlyRecurringTetri, collectedThisMonthTetri: collected, overdue };
}

// --------------------------------------------------------- listing quality
export type QualityIssue = { id: string; name: string };
export type QualityData = {
  noPhoto: QualityIssue[];
  noAreas: QualityIssue[];
  noEventTypes: QualityIssue[];
  unverifiedVenues: QualityIssue[];
  failedNotifications: number;
};

/** Published halls (at active venues) that visitors can see but that look incomplete, plus other catalog gaps. */
export async function getQuality(db: Database, locale: string): Promise<QualityData> {
  const visible = and(eq(halls.status, "published"), eq(venues.status, "active"));
  const hallsWhere = (missing: ReturnType<typeof notExists>) =>
    db
      .select({ id: halls.id, name: halls.name })
      .from(halls)
      .innerJoin(venues, eq(venues.id, halls.venueId))
      .where(and(visible, missing))
      .orderBy(asc(halls.slug));

  // Spelled out with its table: inside a single-table subquery Drizzle renders `halls.id` as a
  // bare "id", which would mean the subquery's own id (see queries/subscriptions.ts).
  const hallRef = sql.raw(`"halls"."id"`);
  const [noPhoto, noAreas, noEventTypes, unverified, [{ failed }]] = await Promise.all([
    hallsWhere(notExists(db.select({ x: sql`1` }).from(hallImages).where(sql`${hallImages.hallId} = ${hallRef}`))),
    hallsWhere(notExists(db.select({ x: sql`1` }).from(hallAreas).where(sql`${hallAreas.hallId} = ${hallRef}`))),
    hallsWhere(notExists(db.select({ x: sql`1` }).from(hallEventTypes).where(sql`${hallEventTypes.hallId} = ${hallRef}`))),
    db
      .select({ id: venues.id, name: venues.name })
      .from(venues)
      .where(and(eq(venues.status, "active"), eq(venues.verified, false)))
      .orderBy(asc(venues.slug)),
    db
      .select({ failed: sql<number>`count(*)::int` })
      .from(notificationEvents)
      .where(inArray(notificationEvents.status, ["failed", "dead"])),
  ]);

  const named = (rows: { id: string; name: { ka: string; en: string } }[]) => rows.map((r) => ({ id: r.id, name: pickText(r.name, locale) }));
  return {
    noPhoto: named(noPhoto),
    noAreas: named(noAreas),
    noEventTypes: named(noEventTypes),
    unverifiedVenues: named(unverified),
    failedNotifications: failed,
  };
}
