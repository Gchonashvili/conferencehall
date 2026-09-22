import { and, eq, ne } from "drizzle-orm";
import type { Database, Executor } from "@/db";
import {
  amenities,
  cities,
  eventTypes,
  hallAmenities,
  hallAreas,
  hallEventTypes,
  hallImages,
  halls,
  venues,
} from "@/db/schema";
import { slugify } from "@/lib/slugify";
import type { HallAreaInput, HallImageInput, HallInput, VenueInput } from "./admin-input";

export type AdminErrorCode = "slug_taken" | "invalid_city" | "not_found";

export class AdminError extends Error {
  constructor(public readonly code: AdminErrorCode) {
    super(code);
  }
}

/** Slugify `base`, and reject if another row of this table already has it. */
async function freshSlug(
  db: Database,
  existing: (slug: string) => Promise<boolean>,
  base: string,
): Promise<string> {
  const slug = slugify(base);
  if (!slug) throw new AdminError("slug_taken"); // name has no ASCII characters to build a slug from
  if (await existing(slug)) throw new AdminError("slug_taken");
  return slug;
}

// --------------------------------------------------------------- venues
export async function createVenue(db: Database, input: VenueInput): Promise<{ id: string; slug: string }> {
  const [city] = await db.select({ slug: cities.slug }).from(cities).where(eq(cities.slug, input.citySlug));
  if (!city) throw new AdminError("invalid_city");

  const slug = await freshSlug(
    db,
    async (s) => !!(await db.select({ x: venues.slug }).from(venues).where(eq(venues.slug, s))).length,
    input.name.en,
  );

  const [row] = await db
    .insert(venues)
    .values({
      slug,
      name: input.name,
      description: input.description ?? null,
      citySlug: input.citySlug,
      address: input.address ?? null,
      lat: input.lat ?? null,
      lng: input.lng ?? null,
      phone: input.phone ?? null,
      email: input.email ?? null,
      whatsapp: input.whatsapp ?? null,
      website: input.website ?? null,
      status: input.status,
      verified: input.verified,
      subscriptionStatus: input.subscriptionStatus,
      subscriptionUntil: input.subscriptionUntil ?? null,
      depositPercent: input.depositPercent ?? null,
    })
    .returning({ id: venues.id, slug: venues.slug });
  return row;
}

export async function updateVenue(db: Database, venueId: string, input: VenueInput): Promise<void> {
  const [city] = await db.select({ slug: cities.slug }).from(cities).where(eq(cities.slug, input.citySlug));
  if (!city) throw new AdminError("invalid_city");

  const [current] = await db.select({ id: venues.id }).from(venues).where(eq(venues.id, venueId));
  if (!current) throw new AdminError("not_found");

  await db
    .update(venues)
    .set({
      name: input.name,
      description: input.description ?? null,
      citySlug: input.citySlug,
      address: input.address ?? null,
      lat: input.lat ?? null,
      lng: input.lng ?? null,
      phone: input.phone ?? null,
      email: input.email ?? null,
      whatsapp: input.whatsapp ?? null,
      website: input.website ?? null,
      status: input.status,
      verified: input.verified,
      subscriptionStatus: input.subscriptionStatus,
      subscriptionUntil: input.subscriptionUntil ?? null,
      depositPercent: input.depositPercent ?? null,
    })
    .where(eq(venues.id, venueId));
}

// ---------------------------------------------------------------- halls
export async function createHall(
  db: Database,
  venueId: string,
  input: HallInput,
  priceFromTetri: number,
): Promise<{ id: string; slug: string }> {
  const [venue] = await db.select({ id: venues.id }).from(venues).where(eq(venues.id, venueId));
  if (!venue) throw new AdminError("not_found");

  const slug = await freshSlug(
    db,
    async (s) => !!(await db.select({ x: halls.slug }).from(halls).where(eq(halls.slug, s))).length,
    input.name.en,
  );

  return db.transaction(async (tx) => {
    const [row] = await tx
      .insert(halls)
      .values({
        venueId,
        slug,
        name: input.name,
        description: input.description ?? null,
        hallType: input.hallType,
        priceFromTetri,
        priceUnit: input.priceUnit,
        capacityMin: input.capacityMin,
        capacityMax: input.capacityMax,
        indoor: input.indoor,
        featured: input.featured,
        status: input.status,
        sortOrder: input.sortOrder,
      })
      .returning({ id: halls.id, slug: halls.slug });
    await syncHallAssociations(tx, row.id, input.eventTypes, input.amenities);
    return row;
  });
}

export async function updateHall(db: Database, hallId: string, input: HallInput, priceFromTetri: number): Promise<void> {
  const [current] = await db.select({ id: halls.id }).from(halls).where(eq(halls.id, hallId));
  if (!current) throw new AdminError("not_found");

  await db.transaction(async (tx) => {
    await tx
      .update(halls)
      .set({
        name: input.name,
        description: input.description ?? null,
        hallType: input.hallType,
        priceFromTetri,
        priceUnit: input.priceUnit,
        capacityMin: input.capacityMin,
        capacityMax: input.capacityMax,
        indoor: input.indoor,
        featured: input.featured,
        status: input.status,
        sortOrder: input.sortOrder,
      })
      .where(eq(halls.id, hallId));
    await syncHallAssociations(tx, hallId, input.eventTypes, input.amenities);
  });
}

/** Replaces a hall's event-type and amenity links with exactly the given sets. */
async function syncHallAssociations(tx: Executor, hallId: string, eventTypeSlugs: string[], amenitySlugs: string[]) {
  const [validTypes, validAmenities] = await Promise.all([
    tx.select({ slug: eventTypes.slug }).from(eventTypes),
    tx.select({ slug: amenities.slug }).from(amenities),
  ]);
  const typeSet = new Set(validTypes.map((t) => t.slug));
  const amenitySet = new Set(validAmenities.map((a) => a.slug));
  const types = eventTypeSlugs.filter((s) => typeSet.has(s));
  const amens = amenitySlugs.filter((s) => amenitySet.has(s));

  await tx.delete(hallEventTypes).where(eq(hallEventTypes.hallId, hallId));
  if (types.length) await tx.insert(hallEventTypes).values(types.map((eventTypeSlug) => ({ hallId, eventTypeSlug })));

  await tx.delete(hallAmenities).where(eq(hallAmenities.hallId, hallId));
  if (amens.length) await tx.insert(hallAmenities).values(amens.map((amenitySlug) => ({ hallId, amenitySlug })));
}

// ---------------------------------------------------------- hall areas
export async function addHallArea(db: Database, hallId: string, input: HallAreaInput): Promise<void> {
  const [hall] = await db.select({ id: halls.id }).from(halls).where(eq(halls.id, hallId));
  if (!hall) throw new AdminError("not_found");
  await db.insert(hallAreas).values({
    hallId,
    name: input.name,
    capacityTheatre: input.capacityTheatre ?? null,
    capacityClassroom: input.capacityClassroom ?? null,
    capacityBanquet: input.capacityBanquet ?? null,
    capacityReception: input.capacityReception ?? null,
  });
}

export async function deleteHallArea(db: Database, hallId: string, areaId: string): Promise<void> {
  await db.delete(hallAreas).where(and(eq(hallAreas.id, areaId), eq(hallAreas.hallId, hallId)));
}

// --------------------------------------------------------- hall images
export async function addHallImage(db: Database, hallId: string, input: HallImageInput): Promise<void> {
  const [hall] = await db.select({ id: halls.id }).from(halls).where(eq(halls.id, hallId));
  if (!hall) throw new AdminError("not_found");

  await db.transaction(async (tx) => {
    if (input.isCover) await tx.update(hallImages).set({ isCover: false }).where(eq(hallImages.hallId, hallId));
    await tx.insert(hallImages).values({
      hallId,
      url: input.url,
      alt: input.alt ?? null,
      isCover: input.isCover,
    });
  });
}

export async function deleteHallImage(db: Database, hallId: string, imageId: string): Promise<void> {
  await db.delete(hallImages).where(and(eq(hallImages.id, imageId), eq(hallImages.hallId, hallId)));
}

export async function setCoverImage(db: Database, hallId: string, imageId: string): Promise<void> {
  await db.transaction(async (tx) => {
    await tx.update(hallImages).set({ isCover: false }).where(and(eq(hallImages.hallId, hallId), ne(hallImages.id, imageId)));
    await tx.update(hallImages).set({ isCover: true }).where(and(eq(hallImages.id, imageId), eq(hallImages.hallId, hallId)));
  });
}
