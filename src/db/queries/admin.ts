import { asc, desc, eq, sql } from "drizzle-orm";
import { pickText } from "@/lib/i18n-text";
import type { Database } from "../index";
import {
  hallAmenities,
  hallAreas,
  hallEventTypes,
  hallImages,
  halls,
  venues,
  type I18n,
} from "../schema";

/**
 * Reads for the admin panel. Unlike `queries/halls.ts`, these return raw
 * bilingual `{ka, en}` fields (not resolved to one locale via `pickText`)
 * because the admin edits both languages at once. They also ignore the
 * public `status`/`verified` visibility filter — an admin sees everything.
 */

export type AdminVenueListItem = {
  id: string;
  slug: string;
  name: I18n;
  citySlug: string;
  status: "draft" | "active" | "suspended";
  verified: boolean;
  hallCount: number;
};

export async function listAllVenues(db: Database): Promise<AdminVenueListItem[]> {
  return db
    .select({
      id: venues.id,
      slug: venues.slug,
      name: venues.name,
      citySlug: venues.citySlug,
      status: venues.status,
      verified: venues.verified,
      hallCount: sql<number>`count(${halls.id})::int`,
    })
    .from(venues)
    .leftJoin(halls, eq(halls.venueId, venues.id))
    .groupBy(venues.id)
    .orderBy(desc(venues.createdAt));
}

export async function getVenueForAdmin(db: Database, id: string, locale: string) {
  const [venue] = await db.select().from(venues).where(eq(venues.id, id));
  if (!venue) return null;

  const hallRows = await db
    .select({ id: halls.id, slug: halls.slug, name: halls.name, status: halls.status, featured: halls.featured })
    .from(halls)
    .where(eq(halls.venueId, id))
    .orderBy(asc(halls.sortOrder), asc(halls.id));

  return {
    venue,
    halls: hallRows.map((h) => ({ ...h, name: pickText(h.name, locale) })),
  };
}

export type AdminHallListItem = {
  id: string;
  slug: string;
  name: I18n;
  venueName: I18n;
  status: "draft" | "published";
  featured: boolean;
};

export async function listAllHalls(db: Database, filters: { status?: string } = {}): Promise<AdminHallListItem[]> {
  const where = filters.status === "draft" || filters.status === "published" ? eq(halls.status, filters.status) : undefined;
  return db
    .select({ id: halls.id, slug: halls.slug, name: halls.name, venueName: venues.name, status: halls.status, featured: halls.featured })
    .from(halls)
    .innerJoin(venues, eq(halls.venueId, venues.id))
    .where(where)
    .orderBy(desc(halls.createdAt));
}

export async function getHallForAdmin(db: Database, id: string, locale: string) {
  const [row] = await db
    .select({ hall: halls, venueId: venues.id, venueName: venues.name })
    .from(halls)
    .innerJoin(venues, eq(halls.venueId, venues.id))
    .where(eq(halls.id, id));
  if (!row) return null;

  const [areas, images, typeRows, amenityRows] = await Promise.all([
    db.select().from(hallAreas).where(eq(hallAreas.hallId, id)).orderBy(asc(hallAreas.sortOrder)),
    db.select().from(hallImages).where(eq(hallImages.hallId, id)).orderBy(desc(hallImages.isCover), asc(hallImages.sortOrder)),
    db.select({ slug: hallEventTypes.eventTypeSlug }).from(hallEventTypes).where(eq(hallEventTypes.hallId, id)),
    db.select({ slug: hallAmenities.amenitySlug }).from(hallAmenities).where(eq(hallAmenities.hallId, id)),
  ]);

  return {
    hall: row.hall,
    venueId: row.venueId,
    venueName: pickText(row.venueName, locale),
    areas,
    images,
    selectedEventTypes: typeRows.map((t) => t.slug),
    selectedAmenities: amenityRows.map((a) => a.slug),
  };
}

export async function getAdminCounts(db: Database) {
  const [[venueRow], [hallRow], [unverifiedRow]] = await Promise.all([
    db
      .select({ draft: sql<number>`count(*) filter (where ${venues.status} = 'draft')::int`, active: sql<number>`count(*) filter (where ${venues.status} = 'active')::int`, suspended: sql<number>`count(*) filter (where ${venues.status} = 'suspended')::int` })
      .from(venues),
    db
      .select({ draft: sql<number>`count(*) filter (where ${halls.status} = 'draft')::int`, published: sql<number>`count(*) filter (where ${halls.status} = 'published')::int` })
      .from(halls),
    db.select({ n: sql<number>`count(*)::int` }).from(venues).where(eq(venues.verified, false)),
  ]);
  return { venues: venueRow, halls: hallRow, unverifiedVenues: unverifiedRow.n };
}
