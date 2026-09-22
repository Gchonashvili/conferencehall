import { and, asc, desc, eq, exists, gte, inArray, lte, ne, sql, type SQL } from "drizzle-orm";
import { pickText } from "@/lib/i18n-text";
import { parseRange } from "@/lib/ranges";
import type { Database } from "../index";
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
} from "../schema";

export const PAGE_SIZE = 9;
export const LAYOUTS = ["theatre", "classroom", "banquet", "reception"] as const;
export type Layout = (typeof LAYOUTS)[number];

const LAYOUT_COLUMN = {
  theatre: hallAreas.capacityTheatre,
  classroom: hallAreas.capacityClassroom,
  banquet: hallAreas.capacityBanquet,
  reception: hallAreas.capacityReception,
} as const;

export type HallFilters = {
  city?: string;
  eventType?: string;
  /** "min-max" guest range; a hall matches if its capacity overlaps it. */
  guests?: string;
  /** "min-max" in whole lari. Compared with the hall's starting price as
   *  stored, so hourly and daily prices are not normalised against each other. */
  price?: string;
  layout?: string;
  page?: number;
};

export type HallListItem = {
  id: string;
  slug: string;
  name: string;
  venueName: string;
  citySlug: string;
  cityName: string;
  hallType: string;
  priceFromTetri: number;
  priceUnit: "hour" | "half_day" | "day";
  capacityMin: number;
  capacityMax: number;
  verified: boolean;
  featured: boolean;
  coverUrl: string | null;
  amenities: string[];
};

export type HallSearchResult = {
  items: HallListItem[];
  total: number;
  page: number;
  pages: number;
};

/** Only published halls of active venues are ever public. */
function visibility(): SQL[] {
  return [eq(halls.status, "published"), eq(venues.status, "active")];
}

function buildConditions(db: Database, f: HallFilters): SQL[] {
  const where = visibility();

  if (f.city) where.push(eq(venues.citySlug, f.city));

  if (f.eventType) {
    where.push(
      exists(
        db
          .select({ x: sql`1` })
          .from(hallEventTypes)
          .where(and(eq(hallEventTypes.hallId, halls.id), eq(hallEventTypes.eventTypeSlug, f.eventType))),
      ),
    );
  }

  const guests = parseRange(f.guests);
  if (guests) {
    if (guests.min !== undefined) where.push(gte(halls.capacityMax, guests.min));
    if (guests.max !== undefined) where.push(lte(halls.capacityMin, guests.max));
  }

  const price = parseRange(f.price);
  if (price) {
    if (price.min !== undefined) where.push(gte(halls.priceFromTetri, price.min * 100));
    if (price.max !== undefined) where.push(lte(halls.priceFromTetri, price.max * 100));
  }

  if (f.layout && (LAYOUTS as readonly string[]).includes(f.layout)) {
    const col = LAYOUT_COLUMN[f.layout as Layout];
    where.push(
      exists(
        db
          .select({ x: sql`1` })
          .from(hallAreas)
          .where(and(eq(hallAreas.hallId, halls.id), sql`${col} is not null`)),
      ),
    );
  }

  return where;
}

async function hydrate(
  db: Database,
  rows: {
    id: string;
    slug: string;
    name: { ka: string; en: string };
    venueName: { ka: string; en: string };
    citySlug: string;
    cityName: { ka: string; en: string };
    hallType: string;
    priceFromTetri: number;
    priceUnit: "hour" | "half_day" | "day";
    capacityMin: number;
    capacityMax: number;
    verified: boolean;
    featured: boolean;
  }[],
  locale: string,
): Promise<HallListItem[]> {
  if (rows.length === 0) return [];
  const ids = rows.map((r) => r.id);

  const [amenityRows, imageRows] = await Promise.all([
    db
      .select({ hallId: hallAmenities.hallId, name: amenities.name })
      .from(hallAmenities)
      .innerJoin(amenities, eq(hallAmenities.amenitySlug, amenities.slug))
      .where(inArray(hallAmenities.hallId, ids))
      .orderBy(asc(amenities.sortOrder)),
    db
      .select({ hallId: hallImages.hallId, url: hallImages.url })
      .from(hallImages)
      .where(inArray(hallImages.hallId, ids))
      .orderBy(desc(hallImages.isCover), asc(hallImages.sortOrder)),
  ]);

  const amenitiesByHall = new Map<string, string[]>();
  for (const a of amenityRows) {
    const list = amenitiesByHall.get(a.hallId) ?? [];
    list.push(pickText(a.name, locale));
    amenitiesByHall.set(a.hallId, list);
  }
  const coverByHall = new Map<string, string>();
  for (const img of imageRows) if (!coverByHall.has(img.hallId)) coverByHall.set(img.hallId, img.url);

  return rows.map((r) => ({
    id: r.id,
    slug: r.slug,
    name: pickText(r.name, locale),
    venueName: pickText(r.venueName, locale),
    citySlug: r.citySlug,
    cityName: pickText(r.cityName, locale),
    hallType: r.hallType,
    priceFromTetri: r.priceFromTetri,
    priceUnit: r.priceUnit,
    capacityMin: r.capacityMin,
    capacityMax: r.capacityMax,
    verified: r.verified,
    featured: r.featured,
    coverUrl: coverByHall.get(r.id) ?? null,
    amenities: amenitiesByHall.get(r.id) ?? [],
  }));
}

const listColumns = {
  id: halls.id,
  slug: halls.slug,
  name: halls.name,
  venueName: venues.name,
  citySlug: venues.citySlug,
  cityName: cities.name,
  hallType: halls.hallType,
  priceFromTetri: halls.priceFromTetri,
  priceUnit: halls.priceUnit,
  capacityMin: halls.capacityMin,
  capacityMax: halls.capacityMax,
  verified: venues.verified,
  featured: halls.featured,
};

export async function searchHalls(db: Database, filters: HallFilters, locale: string): Promise<HallSearchResult> {
  const where = and(...buildConditions(db, filters));

  const [{ total }] = await db
    .select({ total: sql<number>`count(*)::int` })
    .from(halls)
    .innerJoin(venues, eq(halls.venueId, venues.id))
    .where(where);

  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const page = Math.min(Math.max(1, Math.floor(filters.page ?? 1)), pages);

  const rows = await db
    .select(listColumns)
    .from(halls)
    .innerJoin(venues, eq(halls.venueId, venues.id))
    .innerJoin(cities, eq(venues.citySlug, cities.slug))
    .where(where)
    .orderBy(desc(halls.featured), asc(halls.sortOrder), asc(halls.priceFromTetri), asc(halls.id))
    .limit(PAGE_SIZE)
    .offset((page - 1) * PAGE_SIZE);

  return { items: await hydrate(db, rows, locale), total, page, pages };
}

export async function getFeaturedHalls(db: Database, locale: string, limit = 3): Promise<HallListItem[]> {
  const rows = await db
    .select(listColumns)
    .from(halls)
    .innerJoin(venues, eq(halls.venueId, venues.id))
    .innerJoin(cities, eq(venues.citySlug, cities.slug))
    .where(and(...visibility(), eq(halls.featured, true)))
    .orderBy(asc(halls.sortOrder), asc(halls.id))
    .limit(limit);
  return hydrate(db, rows, locale);
}

export type HallDetail = HallListItem & {
  description: string;
  venueId: string;
  address: string;
  lat: number | null;
  lng: number | null;
  indoor: boolean;
  images: { url: string; alt: string }[];
  eventTypes: { slug: string; name: string }[];
  areas: {
    id: string;
    name: string;
    capacity: Partial<Record<Layout, number>>;
  }[];
};

export async function getHallBySlug(db: Database, slug: string, locale: string): Promise<HallDetail | null> {
  const [row] = await db
    .select({
      ...listColumns,
      description: halls.description,
      venueId: venues.id,
      address: venues.address,
      lat: venues.lat,
      lng: venues.lng,
      indoor: halls.indoor,
    })
    .from(halls)
    .innerJoin(venues, eq(halls.venueId, venues.id))
    .innerJoin(cities, eq(venues.citySlug, cities.slug))
    .where(and(...visibility(), eq(halls.slug, slug)));
  if (!row) return null;

  const [[item], areaRows, imageRows, typeRows] = await Promise.all([
    hydrate(db, [row], locale),
    db.select().from(hallAreas).where(eq(hallAreas.hallId, row.id)).orderBy(asc(hallAreas.sortOrder)),
    db
      .select()
      .from(hallImages)
      .where(eq(hallImages.hallId, row.id))
      .orderBy(desc(hallImages.isCover), asc(hallImages.sortOrder)),
    db
      .select({ slug: eventTypes.slug, name: eventTypes.name })
      .from(hallEventTypes)
      .innerJoin(eventTypes, eq(hallEventTypes.eventTypeSlug, eventTypes.slug))
      .where(eq(hallEventTypes.hallId, row.id))
      .orderBy(asc(eventTypes.sortOrder)),
  ]);

  return {
    ...item,
    description: pickText(row.description, locale),
    venueId: row.venueId,
    address: pickText(row.address, locale),
    lat: row.lat,
    lng: row.lng,
    indoor: row.indoor,
    images: imageRows.map((i) => ({ url: i.url, alt: pickText(i.alt, locale) })),
    eventTypes: typeRows.map((t) => ({ slug: t.slug, name: pickText(t.name, locale) })),
    areas: areaRows.map((a) => ({
      id: a.id,
      name: pickText(a.name, locale),
      capacity: {
        ...(a.capacityTheatre != null && { theatre: a.capacityTheatre }),
        ...(a.capacityClassroom != null && { classroom: a.capacityClassroom }),
        ...(a.capacityBanquet != null && { banquet: a.capacityBanquet }),
        ...(a.capacityReception != null && { reception: a.capacityReception }),
      },
    })),
  };
}

/** Other halls in the same city, featured first. */
export async function getSimilarHalls(db: Database, hall: HallListItem, locale: string, limit = 3) {
  const rows = await db
    .select(listColumns)
    .from(halls)
    .innerJoin(venues, eq(halls.venueId, venues.id))
    .innerJoin(cities, eq(venues.citySlug, cities.slug))
    .where(and(...visibility(), eq(venues.citySlug, hall.citySlug), ne(halls.id, hall.id)))
    .orderBy(desc(halls.featured), asc(halls.priceFromTetri), asc(halls.id))
    .limit(limit);
  return hydrate(db, rows, locale);
}

export type Counts = Record<string, number>;

/** Published hall counts per city and per event type, for browse tiles. */
export async function getBrowseCounts(db: Database): Promise<{ cities: Counts; eventTypes: Counts; total: number }> {
  const [cityRows, typeRows, [{ total }]] = await Promise.all([
    db
      .select({ slug: venues.citySlug, n: sql<number>`count(*)::int` })
      .from(halls)
      .innerJoin(venues, eq(halls.venueId, venues.id))
      .where(and(...visibility()))
      .groupBy(venues.citySlug),
    db
      .select({ slug: hallEventTypes.eventTypeSlug, n: sql<number>`count(distinct ${halls.id})::int` })
      .from(hallEventTypes)
      .innerJoin(halls, eq(hallEventTypes.hallId, halls.id))
      .innerJoin(venues, eq(halls.venueId, venues.id))
      .where(and(...visibility()))
      .groupBy(hallEventTypes.eventTypeSlug),
    db
      .select({ total: sql<number>`count(*)::int` })
      .from(halls)
      .innerJoin(venues, eq(halls.venueId, venues.id))
      .where(and(...visibility())),
  ]);
  return {
    cities: Object.fromEntries(cityRows.map((r) => [r.slug, r.n])),
    eventTypes: Object.fromEntries(typeRows.map((r) => [r.slug, r.n])),
    total,
  };
}

export async function listCities(db: Database, locale: string) {
  const rows = await db.select().from(cities).orderBy(asc(cities.sortOrder));
  return rows.map((c) => ({ slug: c.slug, name: pickText(c.name, locale) }));
}

export async function listEventTypes(db: Database, locale: string) {
  const rows = await db.select().from(eventTypes).orderBy(asc(eventTypes.sortOrder));
  return rows.map((e) => ({ slug: e.slug, name: pickText(e.name, locale) }));
}

export async function listAmenities(db: Database, locale: string) {
  const rows = await db.select().from(amenities).orderBy(asc(amenities.sortOrder));
  return rows.map((a) => ({ slug: a.slug, name: pickText(a.name, locale) }));
}

/** For the sitemap. */
export async function listPublishedSlugs(db: Database): Promise<{ slug: string; updatedAt: Date }[]> {
  return db
    .select({ slug: halls.slug, updatedAt: halls.updatedAt })
    .from(halls)
    .innerJoin(venues, eq(halls.venueId, venues.id))
    .where(and(...visibility()));
}
