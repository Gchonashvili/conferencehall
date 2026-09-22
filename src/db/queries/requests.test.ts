import { eq } from "drizzle-orm";
import { beforeAll, describe, expect, it } from "vitest";
import { createMemoryDb, type Database } from "@/db";
import { seedReference, seedSample } from "@/db/seed";
import { halls, user, venues } from "@/db/schema";
import { createBookingRequest } from "@/domain/booking-service";
import { getVenueRequest, listOrganizerRequests, listVenueRequests } from "./requests";

let db: Database;
let requestA: string; // for Rustaveli (venue A), by anna@example.ge
let requestB: string; // for Black Sea (venue B), by anna@example.ge
const NOW = new Date("2026-09-21T10:00:00Z");

async function makeUser(id: string, email: string, verified: boolean) {
  await db.insert(user).values({ id, name: id, email, emailVerified: verified });
}

beforeAll(async () => {
  db = await createMemoryDb();
  await seedReference(db);
  await seedSample(db);
  await makeUser("owner-a", "a@hotel.ge", true);
  await makeUser("owner-b", "b@hotel.ge", true);
  await makeUser("anna", "anna@example.ge", true);
  await makeUser("impostor", "anna@example.ge".replace("anna", "anna2"), false);

  await db.update(venues).set({ ownerUserId: "owner-a" }).where(eq(venues.slug, "rustaveli-grand-sample"));
  await db.update(venues).set({ ownerUserId: "owner-b" }).where(eq(venues.slug, "black-sea-resort-sample"));

  const hall = async (slug: string) => (await db.select().from(halls).where(eq(halls.slug, slug)))[0].id;
  const base = { name: "Anna", phone: "+995555111222", email: "anna@example.ge", guests: 50, eventType: "conference", eventDate: "2026-10-05", timeOfDay: "full_day" as const };
  requestA = (await createBookingRequest(db, { ...base, hallId: await hall("grand-conference-hall-sample") }, { locale: "en", now: NOW })).id;
  requestB = (await createBookingRequest(db, { ...base, hallId: await hall("sea-view-conference-hall-sample") }, { locale: "en", now: NOW })).id;
});

describe("venue access is scoped to owned venues", () => {
  it("a venue owner sees only requests for their own halls", async () => {
    const a = await listVenueRequests(db, "owner-a", "en");
    expect(a.map((r) => r.id)).toEqual([requestA]);
    const b = await listVenueRequests(db, "owner-b", "en");
    expect(b.map((r) => r.id)).toEqual([requestB]);
  });

  it("cannot open another venue's request by guessing its id", async () => {
    expect(await getVenueRequest(db, "owner-a", requestB, "en")).toBeNull();
    expect(await getVenueRequest(db, "owner-b", requestA, "en")).toBeNull();
    expect((await getVenueRequest(db, "owner-a", requestA, "en"))?.hallName).toBe("Grand Conference Hall (sample)");
  });

  it("a user who owns no venue sees nothing", async () => {
    expect(await listVenueRequests(db, "anna", "en")).toEqual([]);
  });

  it("localises hall, venue and event names", async () => {
    const [r] = await listVenueRequests(db, "owner-a", "ka");
    expect(r.hallName).toBe("დიდი საკონფერენციო დარბაზი (სანიმუშო)");
    expect(r.eventTypeName).toBe("კონფერენცია");
  });
});

describe("organizer access", () => {
  it("a verified account sees requests made with its email", async () => {
    const rows = await listOrganizerRequests(db, { id: "anna", email: "Anna@Example.ge", emailVerified: true }, "en");
    expect(rows.map((r) => r.id).sort()).toEqual([requestA, requestB].sort());
  });

  it("an UNVERIFIED account never sees anything by email match", async () => {
    // Someone could sign up with a victim's address; without verification they get nothing.
    const rows = await listOrganizerRequests(db, { id: "impostor", email: "anna@example.ge", emailVerified: false }, "en");
    expect(rows).toEqual([]);
  });

  it("another verified user sees none of them", async () => {
    expect(await listOrganizerRequests(db, { id: "owner-a", email: "a@hotel.ge", emailVerified: true }, "en")).toEqual([]);
  });
});
