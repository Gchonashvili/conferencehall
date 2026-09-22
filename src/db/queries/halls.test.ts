import { beforeAll, describe, expect, it } from "vitest";
import { createMemoryDb, type Database } from "../index";
import { seedReference, seedSample } from "../seed";
import {
  getBrowseCounts,
  getFeaturedHalls,
  getHallBySlug,
  getSimilarHalls,
  PAGE_SIZE,
  searchHalls,
} from "./halls";
import { halls, venues } from "../schema";
import { eq } from "drizzle-orm";

let db: Database;
beforeAll(async () => {
  db = await createMemoryDb();
  await seedReference(db);
  await seedSample(db);
}, 60_000);

const names = (r: { items: { slug: string }[] }) => r.items.map((i) => i.slug);

describe("searchHalls", () => {
  it("returns every published hall with no filters", async () => {
    const r = await searchHalls(db, {}, "en");
    expect(r.total).toBe(9);
    expect(r.items.length).toBeLessThanOrEqual(PAGE_SIZE);
  });

  it("filters by city", async () => {
    const r = await searchHalls(db, { city: "kutaisi" }, "en");
    expect(names(r).sort()).toEqual(["meeting-room-lelo-sample", "old-town-forum-sample"]);
  });

  it("filters by event type", async () => {
    const r = await searchHalls(db, { eventType: "gala" }, "en");
    expect(r.items.every((i) => ["crystal-ballroom-sample", "grand-ballroom-batumi-sample", "old-town-forum-sample"].includes(i.slug))).toBe(true);
    expect(r.total).toBe(3);
  });

  it("matches guest ranges by capacity overlap", async () => {
    // 300+ guests: only halls whose max capacity reaches 300
    const big = await searchHalls(db, { guests: "300-" }, "en");
    expect(big.items.every((i) => i.capacityMax >= 300)).toBe(true);
    // up to 50: only halls that can run with 50 or fewer people
    const small = await searchHalls(db, { guests: "0-50" }, "en");
    expect(small.items.every((i) => i.capacityMin <= 50)).toBe(true);
    expect(names(small)).toContain("training-room-a-sample");
    expect(names(small)).not.toContain("expo-hall-1-sample");
  });

  it("filters by price in whole lari", async () => {
    const r = await searchHalls(db, { price: "-500" }, "en");
    expect(names(r).sort()).toEqual(["meeting-room-lelo-sample", "training-room-a-sample"]);
  });

  it("filters by layout availability", async () => {
    const r = await searchHalls(db, { layout: "banquet" }, "en");
    expect(names(r)).not.toContain("summit-auditorium-sample"); // theatre + classroom only
    expect(names(r)).toContain("crystal-ballroom-sample");
  });

  it("combines filters and ignores malformed ones", async () => {
    const both = await searchHalls(db, { city: "tbilisi", eventType: "conference" }, "en");
    // Grand Conference Hall, Crystal Ballroom and Summit Auditorium
    expect(both.total).toBe(3);
    const bad = await searchHalls(db, { guests: "abc", price: "9-1", layout: "nope" }, "en");
    expect(bad.total).toBe(9);
  });

  it("puts featured halls first", async () => {
    const r = await searchHalls(db, {}, "en");
    expect(r.items[0].featured).toBe(true);
  });

  it("localises names and falls back sensibly", async () => {
    const ka = await searchHalls(db, { city: "kutaisi" }, "ka");
    expect(ka.items[0].cityName).toBe("ქუთაისი");
  });

  it("clamps out-of-range pages", async () => {
    const r = await searchHalls(db, { page: 999 }, "en");
    expect(r.page).toBe(r.pages);
  });

  it("never returns draft halls or halls of suspended venues", async () => {
    const [h] = await db.select().from(halls).where(eq(halls.slug, "expo-hall-1-sample"));
    await db.update(halls).set({ status: "draft" }).where(eq(halls.id, h.id));
    expect(names(await searchHalls(db, {}, "en"))).not.toContain("expo-hall-1-sample");
    await db.update(halls).set({ status: "published" }).where(eq(halls.id, h.id));

    await db.update(venues).set({ status: "suspended" }).where(eq(venues.slug, "imereti-hotel-sample"));
    expect((await searchHalls(db, { city: "kutaisi" }, "en")).total).toBe(0);
    await db.update(venues).set({ status: "active" }).where(eq(venues.slug, "imereti-hotel-sample"));
  });
});

describe("hall detail and browse", () => {
  it("loads a hall with areas, event types and amenities", async () => {
    const h = await getHallBySlug(db, "grand-conference-hall-sample", "en");
    expect(h?.areas).toHaveLength(2);
    expect(h?.areas[0].capacity.theatre).toBe(400);
    expect(h?.eventTypes.map((e) => e.slug)).toContain("conference");
    expect(h?.amenities).toContain("Projector");
  });

  it("returns null for unknown or unpublished halls", async () => {
    expect(await getHallBySlug(db, "nope", "en")).toBeNull();
  });

  it("finds similar halls in the same city, excluding itself", async () => {
    const h = (await getHallBySlug(db, "grand-conference-hall-sample", "en"))!;
    const similar = await getSimilarHalls(db, h, "en");
    expect(similar.length).toBeGreaterThan(0);
    expect(similar.every((s) => s.citySlug === "tbilisi" && s.id !== h.id)).toBe(true);
  });

  it("counts halls per city and event type", async () => {
    const c = await getBrowseCounts(db);
    expect(c.total).toBe(9);
    expect(c.cities).toEqual({ tbilisi: 4, batumi: 3, kutaisi: 2 });
    expect(c.eventTypes.conference).toBeGreaterThan(0);
  });

  it("lists featured halls", async () => {
    const f = await getFeaturedHalls(db, "en", 3);
    expect(f.length).toBe(2);
  });
});
