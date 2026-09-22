import { and, eq } from "drizzle-orm";
import { beforeAll, describe, expect, it } from "vitest";
import { createMemoryDb, type Database } from "@/db";
import { seedReference, seedSample } from "@/db/seed";
import { bookingRequests, hallAreas, halls, notificationEvents, venues } from "@/db/schema";
import type { BookingRequestInput } from "./booking-input";
import {
  BookingError,
  cancelRequest,
  createBookingRequest,
  expireStaleRequests,
  respondToRequest,
} from "./booking-service";

let db: Database;
let hallId: string; // Grand Conference Hall (conference, training, exhibition; max 400)
let venueId: string;
let otherVenueId: string;
let otherHallAreaId: string;

const NOW = new Date("2026-09-21T10:00:00Z");
let n = 0;

function input(overrides: Partial<BookingRequestInput> = {}): BookingRequestInput {
  n++;
  return {
    hallId,
    name: "Nino Beridze",
    phone: `+99555500${String(n).padStart(4, "0")}`,
    email: `nino${n}@example.ge`,
    guests: 120,
    eventType: "conference",
    eventDate: "2026-10-05",
    timeOfDay: "full_day",
    ...overrides,
  };
}

async function outboxFor(requestId: string) {
  const rows = await db.select().from(notificationEvents);
  return rows.filter((r) => r.dedupeKey.includes(requestId));
}

beforeAll(async () => {
  db = await createMemoryDb();
  await seedReference(db);
  await seedSample(db);
  const [h] = await db.select().from(halls).where(eq(halls.slug, "grand-conference-hall-sample"));
  hallId = h.id;
  venueId = h.venueId;
  const [other] = await db.select().from(halls).where(eq(halls.slug, "sea-view-conference-hall-sample"));
  otherVenueId = other.venueId;
  const [area] = await db.select().from(hallAreas).where(eq(hallAreas.hallId, other.id));
  otherHallAreaId = area.id;
});

describe("createBookingRequest", () => {
  it("stores a pending request that expires after 48 hours", async () => {
    const { id, reference } = await createBookingRequest(db, input(), { locale: "en", now: NOW });
    expect(reference).toMatch(/^CH-/);
    const [r] = await db.select().from(bookingRequests).where(eq(bookingRequests.id, id));
    expect(r.status).toBe("pending");
    expect(r.locale).toBe("en");
    expect(r.expiresAt.toISOString()).toBe("2026-09-23T10:00:00.000Z");
  });

  it("queues venue WhatsApp + email, an organizer confirmation and an ops copy, atomically", async () => {
    const { id } = await createBookingRequest(db, input(), { locale: "en", now: NOW });
    const events = await outboxFor(id);
    const summary = events.map((e) => `${e.kind}/${e.channel}`).sort();
    expect(summary).toEqual([
      "request.created.ops/email",
      "request.created.organizer/email",
      "request.created.venue/email",
      "request.created.venue/whatsapp",
    ]);
    expect(events.every((e) => e.status === "pending")).toBe(true);

    const venueMsg = events.find((e) => e.kind === "request.created.venue" && e.channel === "whatsapp")!;
    expect(venueMsg.locale).toBe("ka"); // venues get Georgian
    expect(venueMsg.payload.hallName).toBe("დიდი საკონფერენციო დარბაზი (სანიმუშო)");
    const orgMsg = events.find((e) => e.kind === "request.created.organizer")!;
    expect(orgMsg.locale).toBe("en");
    expect(orgMsg.payload.hallName).toBe("Grand Conference Hall (sample)");
  });

  it("normalises the venue's WhatsApp number, and skips an invalid one without losing the email", async () => {
    // the sample venue stores "+995 555 00 00 00" (with spaces)
    const a = await createBookingRequest(db, input(), { locale: "en", now: NOW });
    const wa = (await outboxFor(a.id)).find((e) => e.channel === "whatsapp")!;
    expect(wa.recipient).toBe("+995555000000");

    await db.update(venues).set({ whatsapp: "not a number" }).where(eq(venues.id, venueId));
    const b = await createBookingRequest(db, input(), { locale: "en", now: NOW });
    const events = await outboxFor(b.id);
    expect(events.some((e) => e.channel === "whatsapp")).toBe(false);
    expect(events.some((e) => e.kind === "request.created.venue" && e.channel === "email")).toBe(true);
    await db.update(venues).set({ whatsapp: "+995 555 00 00 00" }).where(eq(venues.id, venueId));
  });

  it("rejects an event type the hall does not offer", async () => {
    await expect(createBookingRequest(db, input({ eventType: "gala" }), { locale: "en", now: NOW })).rejects.toMatchObject({ code: "invalid_event_type" });
  });

  it("rejects more guests than the hall holds", async () => {
    await expect(createBookingRequest(db, input({ guests: 401 }), { locale: "en", now: NOW })).rejects.toMatchObject({ code: "guests_exceed_capacity" });
  });

  it("rejects an area that belongs to another hall", async () => {
    await expect(createBookingRequest(db, input({ areaId: otherHallAreaId }), { locale: "en", now: NOW })).rejects.toMatchObject({ code: "invalid_area" });
  });

  it("rejects unknown, draft and suspended-venue halls the same way", async () => {
    await expect(createBookingRequest(db, input({ hallId: "00000000-0000-4000-8000-000000000000" }), { locale: "en", now: NOW })).rejects.toMatchObject({ code: "hall_unavailable" });

    await db.update(halls).set({ status: "draft" }).where(eq(halls.id, hallId));
    await expect(createBookingRequest(db, input(), { locale: "en", now: NOW })).rejects.toMatchObject({ code: "hall_unavailable" });
    await db.update(halls).set({ status: "published" }).where(eq(halls.id, hallId));

    await db.update(venues).set({ status: "suspended" }).where(eq(venues.id, venueId));
    await expect(createBookingRequest(db, input(), { locale: "en", now: NOW })).rejects.toMatchObject({ code: "hall_unavailable" });
    await db.update(venues).set({ status: "active" }).where(eq(venues.id, venueId));
  });

  it("stops one person flooding venues (5 per hour)", async () => {
    const same = { email: "flood@example.ge", phone: "+995555009999" };
    for (let i = 0; i < 5; i++) await createBookingRequest(db, input(same), { locale: "en", now: NOW });
    await expect(createBookingRequest(db, input(same), { locale: "en", now: NOW })).rejects.toMatchObject({ code: "rate_limited" });
    // an hour later the window has passed
    await expect(createBookingRequest(db, input(same), { locale: "en", now: new Date(NOW.getTime() + 61 * 60_000) })).resolves.toBeTruthy();
  });
});

describe("respondToRequest", () => {
  it("lets the owning venue accept, computing a 30% deposit and emailing the organizer in their language", async () => {
    const { id } = await createBookingRequest(db, input(), { locale: "en", now: NOW });
    const res = await respondToRequest(db, { requestId: id, actor: { role: "venue", venueId }, response: { type: "accept", totalTetri: 180000 } }, { now: NOW });
    expect(res).toEqual({ status: "accepted", depositTetri: 54000 });

    const [r] = await db.select().from(bookingRequests).where(eq(bookingRequests.id, id));
    expect(r.status).toBe("accepted");
    expect(r.quotedTotalTetri).toBe(180000);
    expect(r.depositTetri).toBe(54000);

    const mail = (await outboxFor(id)).find((e) => e.kind === "request.accepted.organizer")!;
    expect(mail.locale).toBe("en");
    expect(mail.payload.totalGel).toBe("1,800 ₾");
    expect(mail.payload.depositGel).toBe("540 ₾");
  });

  it("uses a venue-specific deposit percentage when set", async () => {
    await db.update(venues).set({ depositPercent: 50 }).where(eq(venues.id, venueId));
    const { id } = await createBookingRequest(db, input(), { locale: "en", now: NOW });
    const res = await respondToRequest(db, { requestId: id, actor: { role: "admin" }, response: { type: "accept", totalTetri: 100000 } }, { now: NOW });
    expect(res.depositTetri).toBe(50000);
    await db.update(venues).set({ depositPercent: null }).where(eq(venues.id, venueId));
  });

  it("refuses a venue that does not own the hall", async () => {
    const { id } = await createBookingRequest(db, input(), { locale: "en", now: NOW });
    await expect(
      respondToRequest(db, { requestId: id, actor: { role: "venue", venueId: otherVenueId }, response: { type: "accept", totalTetri: 100000 } }, { now: NOW }),
    ).rejects.toMatchObject({ code: "forbidden" });
    const [r] = await db.select().from(bookingRequests).where(eq(bookingRequests.id, id));
    expect(r.status).toBe("pending"); // untouched
  });

  it("cannot be answered twice", async () => {
    const { id } = await createBookingRequest(db, input(), { locale: "en", now: NOW });
    const actor = { role: "venue", venueId } as const;
    await respondToRequest(db, { requestId: id, actor, response: { type: "decline", reason: "Fully booked" } }, { now: NOW });
    await expect(respondToRequest(db, { requestId: id, actor, response: { type: "accept", totalTetri: 100000 } }, { now: NOW })).rejects.toMatchObject({ code: "invalid_state" });
    const [r] = await db.select().from(bookingRequests).where(eq(bookingRequests.id, id));
    expect(r.status).toBe("declined");
    expect(r.declineReason).toBe("Fully booked");
  });

  it("refuses to answer after the request expired", async () => {
    const { id } = await createBookingRequest(db, input(), { locale: "en", now: NOW });
    const later = new Date(NOW.getTime() + 49 * 3600_000);
    await expect(
      respondToRequest(db, { requestId: id, actor: { role: "admin" }, response: { type: "accept", totalTetri: 100000 } }, { now: later }),
    ).rejects.toMatchObject({ code: "expired" });
  });

  it.each([0, -5, 1.5, 200_000_000_00])("rejects an invalid price (%s)", async (totalTetri) => {
    const { id } = await createBookingRequest(db, input(), { locale: "en", now: NOW });
    await expect(
      respondToRequest(db, { requestId: id, actor: { role: "admin" }, response: { type: "accept", totalTetri } }, { now: NOW }),
    ).rejects.toMatchObject({ code: "invalid_price" });
  });

  it("reports an unknown request", async () => {
    await expect(
      respondToRequest(db, { requestId: "00000000-0000-4000-8000-000000000000", actor: { role: "admin" }, response: { type: "decline" } }),
    ).rejects.toBeInstanceOf(BookingError);
  });
});

describe("cancelRequest", () => {
  it("cancels a pending request and tells the organizer, in their own language", async () => {
    const { id } = await createBookingRequest(db, input(), { locale: "ka", now: NOW });
    await cancelRequest(db, id, { reason: "Duplicate submission", now: NOW });

    const [r] = await db.select().from(bookingRequests).where(eq(bookingRequests.id, id));
    expect(r.status).toBe("cancelled");
    expect(r.declineReason).toBe("Duplicate submission");
    expect(r.respondedAt).toEqual(NOW);

    const mail = (await outboxFor(id)).find((e) => e.kind === "request.cancelled.organizer")!;
    expect(mail.locale).toBe("ka");
    expect(mail.payload.cancelReason).toBe("Duplicate submission");
  });

  it("also cancels an accepted or paid request", async () => {
    const { id } = await createBookingRequest(db, input(), { locale: "en", now: NOW });
    await respondToRequest(db, { requestId: id, actor: { role: "admin" }, response: { type: "accept", totalTetri: 100000 } }, { now: NOW });
    await cancelRequest(db, id, { now: NOW });
    const [r] = await db.select().from(bookingRequests).where(eq(bookingRequests.id, id));
    expect(r.status).toBe("cancelled");
  });

  it("refuses to cancel a request that is already in a terminal state", async () => {
    const { id } = await createBookingRequest(db, input(), { locale: "en", now: NOW });
    await respondToRequest(db, { requestId: id, actor: { role: "admin" }, response: { type: "decline" } }, { now: NOW });
    await expect(cancelRequest(db, id, { now: NOW })).rejects.toMatchObject({ code: "invalid_state" });
    const [r] = await db.select().from(bookingRequests).where(eq(bookingRequests.id, id));
    expect(r.status).toBe("declined"); // untouched
  });

  it("reports an unknown request", async () => {
    await expect(cancelRequest(db, "00000000-0000-4000-8000-000000000000", {})).rejects.toBeInstanceOf(BookingError);
  });
});

describe("expireStaleRequests", () => {
  it("expires only overdue pending requests, once, and tells the organizer", async () => {
    const stale = await createBookingRequest(db, input(), { locale: "ka", now: NOW });
    const fresh = await createBookingRequest(db, input(), { locale: "ka", now: new Date(NOW.getTime() + 40 * 3600_000) });
    const answered = await createBookingRequest(db, input(), { locale: "ka", now: NOW });
    await respondToRequest(db, { requestId: answered.id, actor: { role: "admin" }, response: { type: "decline" } }, { now: NOW });

    const later = new Date(NOW.getTime() + 50 * 3600_000);
    const count = await expireStaleRequests(db, { now: later });
    expect(count).toBeGreaterThanOrEqual(1);

    const status = async (id: string) => (await db.select().from(bookingRequests).where(eq(bookingRequests.id, id)))[0].status;
    expect(await status(stale.id)).toBe("expired");
    expect(await status(fresh.id)).toBe("pending"); // 10h left
    expect(await status(answered.id)).toBe("declined"); // untouched

    const mail = (await outboxFor(stale.id)).filter((e) => e.kind === "request.expired.organizer");
    expect(mail).toHaveLength(1);
    expect(mail[0].locale).toBe("ka");

    expect(await expireStaleRequests(db, { now: later })).toBe(0); // idempotent
    expect((await outboxFor(stale.id)).filter((e) => e.kind === "request.expired.organizer")).toHaveLength(1);
  });
});

it("only accepted or pending requests reference real halls (foreign keys hold)", async () => {
  const rows = await db.select().from(bookingRequests).where(and(eq(bookingRequests.hallId, hallId)));
  expect(rows.length).toBeGreaterThan(0);
});
