import { eq } from "drizzle-orm";
import { beforeAll, describe, expect, it } from "vitest";
import { createMemoryDb, type Database } from "@/db";
import { listPayments, listSubscriptions } from "@/db/queries/subscriptions";
import { seedReference, seedSample } from "@/db/seed";
import { user, venues } from "@/db/schema";
import { paymentSchema } from "./crm-input";
import { logSubscriptionPayment } from "./crm-service";
import { addDays, addMonths, nextPeriod, subscriptionHealth } from "./subscriptions";

const TODAY = "2026-09-28";
const sub = (subscriptionUntil: string | null, subscriptionStatus: "none" | "trial" | "active" | "expired" = "active") => ({
  subscriptionStatus,
  subscriptionUntil,
});

describe("date helpers", () => {
  it("adds days across month and year ends", () => {
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(addDays("2026-03-01", -1)).toBe("2026-02-28");
  });

  it("adds months, clamping to the last day of shorter months", () => {
    expect(addMonths("2026-01-31", 1)).toBe("2026-02-28");
    expect(addMonths("2028-01-31", 1)).toBe("2028-02-29");
    expect(addMonths("2026-11-15", 2)).toBe("2027-01-15");
  });
});

describe("subscriptionHealth", () => {
  it("uses the paid-until date: overdue, expiring within 14 days, else active", () => {
    expect(subscriptionHealth(sub("2026-09-27"), TODAY)).toBe("overdue");
    expect(subscriptionHealth(sub(TODAY), TODAY)).toBe("expiring");
    expect(subscriptionHealth(sub("2026-10-12"), TODAY)).toBe("expiring"); // exactly 14 days
    expect(subscriptionHealth(sub("2026-10-13"), TODAY)).toBe("active");
  });

  it("falls back to the status field when there is no date", () => {
    expect(subscriptionHealth(sub(null, "none"), TODAY)).toBe("none");
    expect(subscriptionHealth(sub(null, "expired"), TODAY)).toBe("none");
    expect(subscriptionHealth(sub(null, "trial"), TODAY)).toBe("active");
  });
});

describe("nextPeriod", () => {
  it("continues the day after the current paid-until date", () => {
    expect(nextPeriod({ ...sub("2026-10-31"), plan: "monthly" }, TODAY)).toEqual({ start: "2026-11-01", end: "2026-11-30" });
    expect(nextPeriod({ ...sub("2026-10-31"), plan: "yearly" }, TODAY)).toEqual({ start: "2026-11-01", end: "2027-10-31" });
  });

  it("starts today when the subscription has lapsed or never existed", () => {
    expect(nextPeriod({ ...sub("2026-01-01"), plan: "monthly" }, TODAY)).toEqual({ start: TODAY, end: "2026-10-27" });
    expect(nextPeriod({ ...sub(null, "none"), plan: null }, TODAY).start).toBe(TODAY);
  });
});

describe("paymentSchema", () => {
  const base = { amount: "150", paidOn: TODAY, periodStart: "2026-10-01", periodEnd: "2026-10-31", invoiceNo: "", note: "" };

  it("turns lari into tetri and blanks into null", () => {
    expect(paymentSchema.parse({ ...base, amount: "1 500,50" })).toMatchObject({ amount: 150050, invoiceNo: null, note: null });
  });

  it("rejects a bad amount and a period that ends before it starts", () => {
    expect(paymentSchema.safeParse({ ...base, amount: "abc" }).error?.issues[0]).toMatchObject({ path: ["amount"], message: "invalid_price" });
    expect(paymentSchema.safeParse({ ...base, periodEnd: "2026-09-30" }).error?.issues[0]).toMatchObject({
      path: ["periodEnd"],
      message: "invalid_period",
    });
  });
});

describe("logSubscriptionPayment", () => {
  let db: Database;
  let venueId: string;

  beforeAll(async () => {
    db = await createMemoryDb();
    await seedReference(db);
    await seedSample(db);
    await db.insert(user).values({ id: "nino", name: "Nino", email: "nino@example.ge", emailVerified: true, role: "admin" });
    venueId = (await db.select({ id: venues.id }).from(venues).limit(1))[0].id;
  });

  const pay = (periodStart: string, periodEnd: string, amount = "150") =>
    logSubscriptionPayment(db, venueId, paymentSchema.parse({ amount, paidOn: TODAY, periodStart, periodEnd, invoiceNo: "INV-1", note: "" }), {
      actorUserId: "nino",
    });

  it("records the payment and extends paid-until, marking the subscription active", async () => {
    await pay("2026-10-01", "2026-10-31");
    const [v] = await db.select().from(venues).where(eq(venues.id, venueId));
    expect(v).toMatchObject({ subscriptionUntil: "2026-10-31", subscriptionStatus: "active" });

    const payments = await listPayments(db, venueId);
    expect(payments[0]).toMatchObject({ amountTetri: 15000, invoiceNo: "INV-1", recordedBy: "Nino" });
  });

  it("never shortens paid-until when an older period is logged late", async () => {
    await pay("2026-12-01", "2026-12-31");
    await pay("2026-11-01", "2026-11-30");
    const [v] = await db.select().from(venues).where(eq(venues.id, venueId));
    expect(v.subscriptionUntil).toBe("2026-12-31");
  });

  it("shows up in the subscriptions list with the latest payment", async () => {
    const row = (await listSubscriptions(db, "en")).find((r) => r.venueId === venueId);
    expect(row).toMatchObject({ subscriptionUntil: "2026-12-31", lastPaidOn: TODAY, lastAmountTetri: 15000 });
  });

  it("reports a missing venue", async () => {
    await expect(
      logSubscriptionPayment(
        db,
        "00000000-0000-4000-8000-000000000000",
        paymentSchema.parse({ amount: "1", paidOn: TODAY, periodStart: TODAY, periodEnd: TODAY, invoiceNo: "", note: "" }),
        { actorUserId: "nino" },
      ),
    ).rejects.toMatchObject({ code: "not_found" });
  });
});
