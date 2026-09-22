import type { MetadataRoute } from "next";
import { getDb } from "@/db";
import { listCities, listEventTypes, listPublishedSlugs } from "@/db/queries/halls";
import { env } from "@/env";
import { routing } from "@/i18n/routing";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, "");
  const db = await getDb();
  const [cities, types, halls] = await Promise.all([
    listCities(db, "en"),
    listEventTypes(db, "en"),
    listPublishedSlugs(db),
  ]);

  const entries: { path: string; lastModified?: Date }[] = [
    { path: "" },
    { path: "/halls" },
    { path: "/cities" },
    ...cities.map((c) => ({ path: `/cities/${c.slug}` })),
    ...types.map((e) => ({ path: `/event-types/${e.slug}` })),
    ...halls.map((h) => ({ path: `/halls/${h.slug}`, lastModified: h.updatedAt })),
  ];

  return entries.flatMap(({ path, lastModified }) =>
    routing.locales.map((locale) => ({
      url: `${base}/${locale}${path}`,
      lastModified,
      alternates: {
        languages: Object.fromEntries(routing.locales.map((l) => [l, `${base}/${l}${path}`])),
      },
    })),
  );
}
