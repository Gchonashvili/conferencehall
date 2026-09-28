import { eq } from "drizzle-orm";
import { beforeAll, describe, expect, it } from "vitest";
import { createMemoryDb, type Database } from "@/db";
import { seedReference, seedSample } from "@/db/seed";
import { hallEventTypes, halls, notificationEvents, user, venues } from "@/db/schema";
import { createBookingRequest, respondToRequest } from "@/domain/booking-service";
import { leadUpdateSchema, paymentSchema } from "@/domain/crm-input";
import { logSubscriptionPayment, updateLead } from "@/domain/crm-service";
import { createInquiry } from "@/domain/inquiry-service";
import { acceptanceRate, getMoney, getPipeline, getQuality, getTodo } from "./dashboard";

const NOW = new Date("2026-09-28T10:00:00Z");
const ago = (hours: number) => new Date(NOW.getTime() - hours * 60 * 60 * 1000);

let db: Database;
let hallId: string;
let staleRequest: string;
let freshRequest: string;
let unassignedLead: string;
let overdueLead: string;
let lostLead: string;
let wonLead: string;

const lead = (email: string, at: Date) =>
  createInquiry(db, { kind: "contact", name: email.split("@")[0], email, message: "Need a hall" }, { locale: "en", now: at }).then((r) => r.id);
const setLead = (id: string, v: Record<string, unknown>, at: Date) =>
  updateLead(db, id, leadUpdateSchema.parse({ ownerUserId: "", followUpOn: "", lostReason: "", ...v }), { actorUserId: "nino", now: at });
const request = (email: string, at: Date) =>
  createBookingRequest(
    db,
    { name: "Ana", phone: `+99555${Math.floor(Math.random() * 1e7)}`, email, guests: 40, eventType: "conference", eventDate: "2026-11-05", timeOfDay: "full_day", hallId },
    { locale: "en", now: at },
  ).then((r) => r.id);

beforeAll(async () => {
  db = await createMemoryDb();
  await seedReference(db);
  await seedSample(db);
  await db.insert(user).values({ id: "nino", name: "Nino", email: "nino@example.ge", emailVerified: true, role: "admin" });
  hallId = (await db.select({ id: halls.id }).from(halls).where(eq(halls.slug, "grand-conference-hall-sample")))[0].id;

  unassignedLead = await lead("unassigned@example.ge", ago(48));
  overdueLead = await lead("overdue@example.ge", ago(48));
  await setLead(overdueLead, { status: "contacted", ownerUserId: "nino", followUpOn: "2026-09-27" }, ago(40));
  lostLead = await lead("lost@example.ge", ago(48));
  await setLead(lostLead, { status: "lost", lostReason: "Too pricey", followUpOn: "2026-09-20" }, ago(30));
  wonLead = await lead("won@example.ge", ago(48));
  await setLead(wonLead, { status: "won" }, ago(24));

  staleRequest = await request("stale@example.ge", ago(72));
  freshRequest = await request("fresh@example.ge", ago(1));
  const accepted = await request("accepted@example.ge", ago(72));
  await respondToRequest(db, { requestId: accepted, actor: { role: "admin" }, response: { type: "accept", totalTetri: 100000 } }, { now: ago(60) });
});

describe("getTodo", () => {
  it("lists unassigned new leads, open overdue follow-ups, and requests the venue hasn't answered in 24h", async () => {
    const todo = await getTodo(db, { userId: "nino", locale: "en", now: NOW });

    expect(todo.unassignedLeads.map((l) => l.id)).toContain(unassignedLead);
    expect(todo.unassignedLeads.map((l) => l.id)).not.toContain(overdueLead); // has an owner

    expect(todo.followUps.map((f) => f.id)).toEqual([overdueLead]); // the lost lead's old date doesn't count
    expect(todo.followUps[0]).toMatchObject({ mine: true, ownerName: "Nino", followUpOn: "2026-09-27" });

    const stale = todo.staleRequests.map((r) => r.id);
    expect(stale).toContain(staleRequest);
    expect(stale).not.toContain(freshRequest);
    expect(todo.staleRequests[0].venueName).not.toBe("");
  });

  it("lists subscriptions that are expiring or overdue, skipping draft venues", async () => {
    const [v1] = await db.select({ id: venues.id }).from(venues).where(eq(venues.status, "active")).limit(1);
    await db.update(venues).set({ subscriptionUntil: "2026-09-01" }).where(eq(venues.id, v1.id));
    const todo = await getTodo(db, { userId: "nino", locale: "en", now: NOW });
    expect(todo.subscriptions.find((s) => s.venueId === v1.id)?.health).toBe("overdue");
    expect(todo.subscriptions.every((s) => s.venueStatus !== "draft")).toBe(true);
  });
});

describe("getPipeline", () => {
  it("counts the last 7 days against the 7 before", async () => {
    const { current, previous } = await getPipeline(db, NOW);
    expect(current).toMatchObject({ requestsCreated: 3, accepted: 1, declined: 0, leadsNew: 4, leadsWon: 1, leadsLost: 1 });
    expect(previous).toMatchObject({ requestsCreated: 0, accepted: 0, leadsNew: 0 });
    expect(acceptanceRate(current)).toBe(100);
    expect(acceptanceRate(previous)).toBeNull();
  });
});

describe("getMoney", () => {
  it("sums active plans into a monthly figure and counts this month's payments", async () => {
    const active = await db.select({ id: venues.id }).from(venues).where(eq(venues.status, "active"));
    const [monthly, yearly] = active;
    await db.update(venues).set({ plan: "monthly", planPriceTetri: 10000 }).where(eq(venues.id, monthly.id));
    await db.update(venues).set({ plan: "yearly", planPriceTetri: 120000 }).where(eq(venues.id, yearly.id));
    const pay = (venueId: string, periodEnd: string, paidOn: string) =>
      logSubscriptionPayment(db, venueId, paymentSchema.parse({ amount: "100", paidOn, periodStart: "2026-09-01", periodEnd, invoiceNo: "", note: "" }), {
        actorUserId: "nino",
      });
    await pay(monthly.id, "2026-12-31", "2026-09-15");
    await pay(yearly.id, "2027-08-31", "2026-08-20"); // last month: not "collected this month"

    const money = await getMoney(db, { locale: "en", now: NOW });
    expect(money.monthlyRecurringTetri).toBe(20000); // 100 ₾ + 1200 ₾ / 12
    expect(money.collectedThisMonthTetri).toBe(10000);
    expect(money.activeSubscriptions).toBeGreaterThanOrEqual(2);
  });
});

describe("getQuality", () => {
  it("flags visible halls with no event types, and failing notifications", async () => {
    await db.delete(hallEventTypes).where(eq(hallEventTypes.hallId, hallId));
    await db.insert(notificationEvents).values({ kind: "test", channel: "email", recipient: "x@example.ge", payload: {}, dedupeKey: "dash-test", status: "dead" });

    const q = await getQuality(db, "en");
    expect(q.noEventTypes.map((h) => h.id)).toContain(hallId);
    expect(q.noEventTypes.find((h) => h.id === hallId)?.name).toMatch(/Grand/);
    expect(q.failedNotifications).toBeGreaterThanOrEqual(1);

    // A hall that has event types must not be flagged by the correlated subquery.
    const [other] = await db.select({ hallId: hallEventTypes.hallId }).from(hallEventTypes).limit(1);
    expect(q.noEventTypes.map((h) => h.id)).not.toContain(other.hallId);
  });
});
