import { eq } from "drizzle-orm";
import { beforeAll, describe, expect, it } from "vitest";
import { createMemoryDb, type Database } from "@/db";
import { inquiries, notificationEvents } from "@/db/schema";
import { createInquiry, InquiryError, inquirySchema } from "./inquiry-service";

let db: Database;
const NOW = new Date("2026-09-21T10:00:00Z");
const TODAY = "2026-09-21";

beforeAll(async () => {
  db = await createMemoryDb();
});

describe("inquirySchema", () => {
  it("contact: phone optional, message required", () => {
    const s = inquirySchema("contact", TODAY);
    expect(s.safeParse({ name: "Nino", email: "n@example.ge", phone: "", message: "Hello there" }).success).toBe(true);
    expect(s.safeParse({ name: "Nino", email: "n@example.ge", message: "" }).success).toBe(false);
  });

  it("venue and brief: phone required and normalised", () => {
    const venue = inquirySchema("venue", TODAY).safeParse({ name: "Nino", email: "n@example.ge", phone: "555 12 34 56", message: "My hotel" });
    expect(venue.success && venue.data.phone).toBe("+995555123456");
    expect(inquirySchema("brief", TODAY).safeParse({ name: "Nino", email: "n@example.ge", phone: "", citySlug: "tbilisi" }).success).toBe(false);
  });

  it("brief: optional extras validate when present", () => {
    const s = inquirySchema("brief", TODAY);
    const ok = s.safeParse({ name: "Nino", email: "n@example.ge", phone: "555123456", citySlug: "batumi", guests: "80", eventDate: "2026-11-01", message: "" });
    expect(ok.success).toBe(true);
    expect(s.safeParse({ name: "Nino", email: "n@example.ge", phone: "555123456", citySlug: "batumi", eventDate: "2026-01-01" }).success).toBe(false);
    expect(s.safeParse({ name: "Nino", email: "n@example.ge", phone: "555123456", citySlug: "batumi", guests: "0" }).success).toBe(false);
  });
});

describe("createInquiry", () => {
  it("stores the inquiry and queues an ops alert and a sender confirmation", async () => {
    const { id } = await createInquiry(
      db,
      { kind: "brief", name: "Nino", email: "nino@example.ge", phone: "+995555123456", citySlug: "batumi", guests: 80, eventDate: "2026-11-01" },
      { locale: "en", now: NOW },
    );
    const [row] = await db.select().from(inquiries).where(eq(inquiries.id, id));
    expect(row.kind).toBe("brief");
    expect(row.status).toBe("new");

    const events = (await db.select().from(notificationEvents)).filter((e) => e.dedupeKey.includes(id));
    expect(events.map((e) => `${e.kind}/${e.channel}/${e.recipient}`).sort()).toEqual([
      "inquiry.received.ops/email/ops@example.ge",
      "inquiry.received.sender/email/nino@example.ge",
    ]);
    const ops = events.find((e) => e.kind === "inquiry.received.ops")!;
    expect(ops.payload.details).toBe("City: batumi, Guests: 80, Date: 2026-11-01");
  });

  it("limits repeat submissions from one address (5 per hour)", async () => {
    const base = { kind: "contact" as const, name: "Spam", email: "spam@example.ge", message: "hello there" };
    for (let i = 0; i < 5; i++) await createInquiry(db, base, { locale: "en", now: NOW });
    await expect(createInquiry(db, base, { locale: "en", now: NOW })).rejects.toBeInstanceOf(InquiryError);
    await expect(createInquiry(db, base, { locale: "en", now: new Date(NOW.getTime() + 61 * 60_000) })).resolves.toBeTruthy();
  });
});
