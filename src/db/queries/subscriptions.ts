import { asc, desc, eq, sql } from "drizzle-orm";
import { pickText } from "@/lib/i18n-text";
import type { Database } from "../index";
import { subscriptionPayments, user, venues } from "../schema";

export type SubscriptionRow = {
  venueId: string;
  venueName: string;
  venueStatus: "draft" | "active" | "suspended";
  subscriptionStatus: "none" | "trial" | "active" | "expired";
  subscriptionUntil: string | null;
  plan: "monthly" | "yearly" | null;
  planPriceTetri: number | null;
  lastPaidOn: string | null;
  lastAmountTetri: number | null;
};

const venueRef = sql.raw(`"venues"."id"`);

/** Every venue with its plan, paid-until date and most recent payment, soonest-ending first. */
export async function listSubscriptions(db: Database, locale: string): Promise<SubscriptionRow[]> {
  const rows = await db
    .select({
      venueId: venues.id,
      name: venues.name,
      venueStatus: venues.status,
      subscriptionStatus: venues.subscriptionStatus,
      subscriptionUntil: venues.subscriptionUntil,
      plan: venues.plan,
      planPriceTetri: venues.planPriceTetri,
      // `venueRef` is spelled out with its table: Drizzle renders `${venues.id}` as a bare "id"
      // here, which inside the subquery would mean the payment's own id and never match.
      lastPaidOn: sql<string | null>`(select max(p.paid_on)::text from ${subscriptionPayments} p where p.venue_id = ${venueRef})`,
      lastAmountTetri: sql<number | null>`(select p.amount_tetri from ${subscriptionPayments} p where p.venue_id = ${venueRef} order by p.paid_on desc, p.created_at desc limit 1)`,
    })
    .from(venues)
    .orderBy(sql`${venues.subscriptionUntil} asc nulls last`, asc(venues.slug));

  return rows.map(({ name, ...r }) => ({ ...r, venueName: pickText(name, locale) }));
}

export type PaymentRow = {
  id: string;
  amountTetri: number;
  paidOn: string;
  periodStart: string;
  periodEnd: string;
  invoiceNo: string | null;
  note: string | null;
  recordedBy: string | null;
};

/** A venue's payment history, newest first. */
export async function listPayments(db: Database, venueId: string): Promise<PaymentRow[]> {
  return db
    .select({
      id: subscriptionPayments.id,
      amountTetri: subscriptionPayments.amountTetri,
      paidOn: subscriptionPayments.paidOn,
      periodStart: subscriptionPayments.periodStart,
      periodEnd: subscriptionPayments.periodEnd,
      invoiceNo: subscriptionPayments.invoiceNo,
      note: subscriptionPayments.note,
      recordedBy: user.name,
    })
    .from(subscriptionPayments)
    .leftJoin(user, eq(user.id, subscriptionPayments.recordedByUserId))
    .where(eq(subscriptionPayments.venueId, venueId))
    .orderBy(desc(subscriptionPayments.paidOn), desc(subscriptionPayments.createdAt));
}
