import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";
import { createMemoryDb, type Database } from "@/db";
import { seedReference } from "@/db/seed";
import { hallAreas, hallEventTypes, hallImages, halls, venues } from "@/db/schema";
import {
  addHallArea,
  addHallImage,
  AdminError,
  createHall,
  createVenue,
  deleteHallArea,
  setCoverImage,
  updateHall,
  updateVenue,
} from "./admin-service";
import type { HallInput, VenueInput } from "./admin-input";

let db: Database;

function venueInput(overrides: Partial<VenueInput> = {}): VenueInput {
  return {
    name: { ka: "ტესტ სასტუმრო", en: "Test Hotel" },
    description: undefined,
    citySlug: "tbilisi",
    address: undefined,
    lat: undefined,
    lng: undefined,
    phone: undefined,
    email: undefined,
    whatsapp: undefined,
    website: undefined,
    status: "active",
    verified: false,
    subscriptionStatus: "none",
    subscriptionUntil: undefined,
    depositPercent: undefined,
    ...overrides,
  };
}

function hallInput(overrides: Partial<HallInput> = {}): HallInput {
  return {
    name: { ka: "ტესტ დარბაზი", en: "Test Hall" },
    description: undefined,
    hallType: "conference_hall",
    price: "1500",
    priceUnit: "day",
    capacityMin: 10,
    capacityMax: 200,
    indoor: true,
    featured: false,
    status: "draft",
    sortOrder: 0,
    eventTypes: ["conference"],
    amenities: ["wifi"],
    ...overrides,
  };
}

beforeEach(async () => {
  db = await createMemoryDb();
  await seedReference(db);
});

describe("createVenue", () => {
  it("creates a venue with a slug derived from the English name", async () => {
    const { id, slug } = await createVenue(db, venueInput());
    expect(slug).toBe("test-hotel");
    const [row] = await db.select().from(venues).where(eq(venues.id, id));
    expect(row.name).toEqual({ ka: "ტესტ სასტუმრო", en: "Test Hotel" });
    expect(row.citySlug).toBe("tbilisi");
  });

  it("rejects an unknown city", async () => {
    await expect(createVenue(db, venueInput({ citySlug: "not-a-city" }))).rejects.toThrow(AdminError);
  });

  it("rejects a name that produces a slug already in use", async () => {
    await createVenue(db, venueInput());
    await expect(createVenue(db, venueInput())).rejects.toMatchObject({ code: "slug_taken" });
  });
});

describe("updateVenue", () => {
  it("updates an existing venue's fields", async () => {
    const { id } = await createVenue(db, venueInput());
    await updateVenue(db, id, venueInput({ status: "suspended", verified: true }));
    const [row] = await db.select().from(venues).where(eq(venues.id, id));
    expect(row.status).toBe("suspended");
    expect(row.verified).toBe(true);
  });

  it("throws not_found for a missing venue", async () => {
    await expect(updateVenue(db, "00000000-0000-0000-0000-000000000000", venueInput())).rejects.toMatchObject({ code: "not_found" });
  });
});

describe("createHall / updateHall", () => {
  let venueId: string;
  beforeEach(async () => {
    ({ id: venueId } = await createVenue(db, venueInput()));
  });

  it("creates a hall with associations and a price in tetri", async () => {
    const { id, slug } = await createHall(db, venueId, hallInput(), 150000);
    expect(slug).toBe("test-hall");

    const [row] = await db.select().from(halls).where(eq(halls.id, id));
    expect(row.priceFromTetri).toBe(150000);
    expect(row.venueId).toBe(venueId);

    const types = await db.select().from(hallEventTypes).where(eq(hallEventTypes.hallId, id));
    expect(types.map((t) => t.eventTypeSlug)).toEqual(["conference"]);
  });

  it("rejects creating a hall under a venue that does not exist", async () => {
    await expect(createHall(db, "00000000-0000-0000-0000-000000000000", hallInput(), 100)).rejects.toMatchObject({ code: "not_found" });
  });

  it("ignores event types / amenities that don't exist in the reference lists", async () => {
    const { id } = await createHall(db, venueId, hallInput({ eventTypes: ["conference", "not-a-type"] }), 100);
    const types = await db.select().from(hallEventTypes).where(eq(hallEventTypes.hallId, id));
    expect(types.map((t) => t.eventTypeSlug)).toEqual(["conference"]);
  });

  it("replaces associations on update rather than accumulating them", async () => {
    const { id } = await createHall(db, venueId, hallInput({ eventTypes: ["conference"] }), 100);
    await updateHall(db, id, hallInput({ eventTypes: ["gala", "meeting"] }), 100);
    const types = await db.select().from(hallEventTypes).where(eq(hallEventTypes.hallId, id));
    expect(new Set(types.map((t) => t.eventTypeSlug))).toEqual(new Set(["gala", "meeting"]));
  });
});

describe("hall areas", () => {
  it("adds and deletes an area, scoped to its hall", async () => {
    const { id: venueId } = await createVenue(db, venueInput());
    const { id: hallId } = await createHall(db, venueId, hallInput(), 100);

    await addHallArea(db, hallId, { name: { ka: "დარბაზი A", en: "Hall A" }, capacityTheatre: 100, capacityClassroom: undefined, capacityBanquet: undefined, capacityReception: undefined });
    const rows = await db.select().from(hallAreas).where(eq(hallAreas.hallId, hallId));
    expect(rows).toHaveLength(1);

    // Deleting with the wrong hallId must not remove it (row-scoped delete).
    await deleteHallArea(db, "00000000-0000-0000-0000-000000000000", rows[0].id);
    expect(await db.select().from(hallAreas).where(eq(hallAreas.hallId, hallId))).toHaveLength(1);

    await deleteHallArea(db, hallId, rows[0].id);
    expect(await db.select().from(hallAreas).where(eq(hallAreas.hallId, hallId))).toHaveLength(0);
  });
});

describe("hall images", () => {
  it("keeps exactly one cover image", async () => {
    const { id: venueId } = await createVenue(db, venueInput());
    const { id: hallId } = await createHall(db, venueId, hallInput(), 100);

    await addHallImage(db, hallId, { url: "https://example.com/a.jpg", alt: undefined, isCover: true });
    await addHallImage(db, hallId, { url: "https://example.com/b.jpg", alt: undefined, isCover: true });

    const rows = await db.select().from(hallImages).where(eq(hallImages.hallId, hallId));
    expect(rows.filter((r) => r.isCover)).toHaveLength(1);
    expect(rows.find((r) => r.isCover)?.url).toBe("https://example.com/b.jpg");

    const first = rows.find((r) => r.url === "https://example.com/a.jpg")!;
    await setCoverImage(db, hallId, first.id);
    const after = await db.select().from(hallImages).where(eq(hallImages.hallId, hallId));
    expect(after.filter((r) => r.isCover)).toHaveLength(1);
    expect(after.find((r) => r.isCover)?.id).toBe(first.id);
  });
});
