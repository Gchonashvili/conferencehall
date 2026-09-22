import { eq, sql } from "drizzle-orm";
import type { Database } from "./index";
import { AMENITIES, CITIES, EVENT_TYPES } from "./reference-data";
import { SAMPLE_VENUES } from "./seed-data";
import {
  amenities,
  cities,
  eventTypes,
  hallAmenities,
  hallAreas,
  hallEventTypes,
  halls,
  venues,
} from "./schema";

/** Cities, event types and amenities. Safe to run repeatedly, and in production. */
export async function seedReference(db: Database) {
  const upsert = async (
    table: typeof cities | typeof eventTypes | typeof amenities,
    rows: { slug: string; name: { ka: string; en: string } }[],
  ) => {
    await db
      .insert(table)
      .values(rows.map((r, i) => ({ ...r, sortOrder: i })))
      .onConflictDoUpdate({
        target: table.slug,
        set: { name: sql`excluded.name`, sortOrder: sql`excluded.sort_order` },
      });
  };
  await upsert(cities, CITIES);
  await upsert(eventTypes, EVENT_TYPES);
  await upsert(amenities, AMENITIES);
}

/** Fictional venues for development. Skips venues that already exist. */
export async function seedSample(db: Database) {
  if (process.env.NODE_ENV === "production") {
    throw new Error("Refusing to seed sample data in production");
  }
  for (const v of SAMPLE_VENUES) {
    const [existing] = await db.select({ id: venues.id }).from(venues).where(eq(venues.slug, v.slug));
    if (existing) continue;

    const [venue] = await db
      .insert(venues)
      .values({
        slug: v.slug,
        name: v.name,
        citySlug: v.city,
        address: v.address,
        lat: v.lat,
        lng: v.lng,
        phone: "+995 32 000 00 00",
        email: "sample@example.ge",
        whatsapp: "+995 555 00 00 00",
        status: "active",
        verified: true,
        subscriptionStatus: "trial",
      })
      .returning({ id: venues.id });

    for (const [i, h] of v.halls.entries()) {
      const [hall] = await db
        .insert(halls)
        .values({
          venueId: venue.id,
          slug: h.slug,
          name: h.name,
          hallType: h.hallType,
          priceFromTetri: h.priceGel * 100,
          priceUnit: h.priceUnit,
          capacityMin: h.min,
          capacityMax: h.max,
          featured: h.featured ?? false,
          status: "published",
          sortOrder: i,
        })
        .returning({ id: halls.id });

      await db.insert(hallEventTypes).values(h.eventTypes.map((e) => ({ hallId: hall.id, eventTypeSlug: e })));
      await db.insert(hallAmenities).values(h.amenities.map((a) => ({ hallId: hall.id, amenitySlug: a })));
      await db.insert(hallAreas).values(
        h.areas.map((a, j) => ({
          hallId: hall.id,
          name: a.name,
          capacityTheatre: a.theatre ?? null,
          capacityClassroom: a.classroom ?? null,
          capacityBanquet: a.banquet ?? null,
          capacityReception: a.reception ?? null,
          sortOrder: j,
        })),
      );
    }
  }
}
