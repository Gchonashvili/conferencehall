import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";
import { createMemoryDb, type Database } from "@/db";
import { notificationEvents } from "@/db/schema";
import { backoffMs, enqueueNotifications, MAX_ATTEMPTS, processOutbox, type NewNotification } from "./outbox";
import type { Deliver } from "./notifications/deliver";
import { escapeHtml, KNOWN_KINDS, renderNotification } from "./notifications/templates";
import { signPayload, verifySignature } from "./notifications/whatsapp";

let db: Database;
const NOW = new Date("2026-09-21T10:00:00Z");

const event = (key: string, overrides: Partial<NewNotification> = {}): NewNotification => ({
  kind: "inquiry.received.sender",
  channel: "email",
  recipient: "a@example.ge",
  locale: "en",
  payload: { name: "A" },
  dedupeKey: key,
  ...overrides,
});
const rows = () => db.select().from(notificationEvents);

beforeEach(async () => {
  db = await createMemoryDb();
});

describe("processOutbox", () => {
  it("delivers due notifications and marks them sent", async () => {
    await enqueueNotifications(db, [event("k1"), event("k2")], NOW);
    const sent: string[] = [];
    const deliver: Deliver = async (r) => void sent.push(r.dedupeKey);

    const res = await processOutbox(db, { now: NOW, deliver });
    expect(res).toEqual({ claimed: 2, sent: 2, failed: 0, dead: 0 });
    expect(sent.sort()).toEqual(["k1", "k2"]);
    expect((await rows()).every((r) => r.status === "sent" && r.sentAt)).toBe(true);
  });

  it("never sends the same notification twice", async () => {
    await enqueueNotifications(db, [event("dup"), event("dup")], NOW);
    expect(await rows()).toHaveLength(1);

    let calls = 0;
    const deliver: Deliver = async () => void calls++;
    await processOutbox(db, { now: NOW, deliver });
    await processOutbox(db, { now: NOW, deliver });
    expect(calls).toBe(1);
  });

  it("reschedules a failure with backoff and keeps the error", async () => {
    await enqueueNotifications(db, [event("f1")], NOW);
    const deliver: Deliver = async () => {
      throw new Error("Mailgun 503");
    };
    const res = await processOutbox(db, { now: NOW, deliver });
    expect(res).toMatchObject({ claimed: 1, failed: 1, sent: 0 });

    const [r] = await rows();
    expect(r.status).toBe("failed");
    expect(r.attempts).toBe(1);
    expect(r.lastError).toBe("Mailgun 503");
    expect(r.nextAttemptAt.getTime()).toBe(NOW.getTime() + 30_000);

    // not due yet: nothing is claimed
    expect((await processOutbox(db, { now: new Date(NOW.getTime() + 10_000), deliver })).claimed).toBe(0);
    // due later: retried, and this time succeeds
    const ok: Deliver = async () => {};
    const retry = await processOutbox(db, { now: new Date(NOW.getTime() + 31_000), deliver: ok });
    expect(retry.sent).toBe(1);
  });

  it(`gives up after ${MAX_ATTEMPTS} attempts and marks the row dead`, async () => {
    await enqueueNotifications(db, [event("d1")], NOW);
    const deliver: Deliver = async () => {
      throw new Error("still down");
    };
    let t = NOW.getTime();
    let last = { dead: 0 };
    for (let i = 0; i < MAX_ATTEMPTS; i++) {
      last = await processOutbox(db, { now: new Date(t), deliver });
      t += 2 * 60 * 60 * 1000; // always past the backoff
    }
    expect(last.dead).toBe(1);
    const [r] = await rows();
    expect(r.status).toBe("dead");
    expect(r.attempts).toBe(MAX_ATTEMPTS);
    // dead rows are left alone
    expect((await processOutbox(db, { now: new Date(t), deliver })).claimed).toBe(0);
  });

  it("holds a lease so a crashed worker's rows are not grabbed twice at once", async () => {
    await enqueueNotifications(db, [event("l1")], NOW);
    // Simulate a worker that claimed the row then died: the claim moved nextAttemptAt out.
    let calls = 0;
    const hang: Deliver = async () => void calls++;
    await processOutbox(db, { now: NOW, deliver: hang });
    // Pretend it never finished: reset to pending but leased into the future.
    await db.update(notificationEvents).set({ status: "pending", nextAttemptAt: new Date(NOW.getTime() + 5 * 60_000) }).where(eq(notificationEvents.dedupeKey, "l1"));
    expect((await processOutbox(db, { now: new Date(NOW.getTime() + 60_000), deliver: hang })).claimed).toBe(0);
    expect((await processOutbox(db, { now: new Date(NOW.getTime() + 6 * 60_000), deliver: hang })).claimed).toBe(1);
    expect(calls).toBe(2);
  });

  it("isolates failures: one bad notification does not block the others", async () => {
    await enqueueNotifications(db, [event("bad", { recipient: "bad@example.ge" }), event("good", { recipient: "good@example.ge" })], NOW);
    const deliver: Deliver = async (r) => {
      if (r.recipient.startsWith("bad")) throw new Error("boom");
    };
    const res = await processOutbox(db, { now: NOW, deliver });
    expect(res).toMatchObject({ sent: 1, failed: 1 });
  });
});

describe("backoffMs", () => {
  it("doubles from 30s and caps at one hour", () => {
    expect([1, 2, 3, 4].map(backoffMs)).toEqual([30_000, 60_000, 120_000, 240_000]);
    expect(backoffMs(20)).toBe(3_600_000);
  });
});

describe("templates", () => {
  const payload = {
    reference: "CH-ABCDE",
    hallName: "Grand Hall",
    venueName: "Grand Hotel",
    eventType: "conference",
    eventTypeName: "Conference",
    eventDate: "2026-10-05",
    timeOfDay: "full_day",
    guests: 120,
    contactName: "Nino",
    contactPhone: "+995555123456",
    contactEmail: "nino@example.ge",
    message: "",
    dashboardUrl: "https://example.ge/ka/dashboard/requests/1",
    accountUrl: "https://example.ge/en/account/reservations",
    searchUrl: "https://example.ge/en/halls",
    totalGel: "1,800 ₾",
    depositGel: "540 ₾",
    kind: "brief",
    name: "Nino",
    phone: "+995555123456",
    email: "nino@example.ge",
    details: "",
  };

  it.each(KNOWN_KINDS.flatMap((k) => (["ka", "en"] as const).map((l) => [k, l] as const)))("%s renders in %s", (kind, locale) => {
    const r = renderNotification(kind, locale, payload);
    expect(r.subject.length).toBeGreaterThan(3);
    expect(r.text).not.toMatch(/undefined|\[object/);
    expect(r.html).toContain("<html");
  });

  it("escapes user-supplied text so it cannot inject HTML into emails", () => {
    const r = renderNotification("request.created.venue", "en", { ...payload, contactName: '<script>alert(1)</script>', message: '<img src=x onerror=alert(1)>' });
    expect(r.html).not.toContain("<script>");
    expect(r.html).not.toContain("<img");
    expect(r.html).toContain("&lt;script&gt;");
  });

  it("gives WhatsApp-capable kinds an approved-template name with ordered params", () => {
    const r = renderNotification("request.created.venue", "ka", payload);
    expect(r.whatsapp).toEqual({ template: "new_booking_request", params: ["Grand Hotel", "Grand Hall", "2026-10-05", "120", "CH-ABCDE"] });
  });

  it("throws for an unknown kind instead of sending nothing", () => {
    expect(() => renderNotification("nope", "en", {})).toThrow(/No template/);
  });

  it("escapeHtml handles all five characters", () => {
    expect(escapeHtml(`&<>"'`)).toBe("&amp;&lt;&gt;&quot;&#39;");
  });
});

describe("webhook signing", () => {
  it("verifies an untouched payload and rejects tampering or the wrong secret", () => {
    const body = JSON.stringify({ to: "+995555123456" });
    const sig = signPayload("s3cret-s3cret-s3cret", "1700000000", body);
    expect(verifySignature("s3cret-s3cret-s3cret", "1700000000", body, `sha256=${sig}`)).toBe(true);
    expect(verifySignature("s3cret-s3cret-s3cret", "1700000000", body + " ", `sha256=${sig}`)).toBe(false);
    expect(verifySignature("s3cret-s3cret-s3cret", "1700000001", body, `sha256=${sig}`)).toBe(false);
    expect(verifySignature("other-secret-value", "1700000000", body, `sha256=${sig}`)).toBe(false);
  });
});
