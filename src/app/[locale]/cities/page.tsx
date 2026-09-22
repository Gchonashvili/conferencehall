import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Tile } from "@/components/site/tile";
import { getDb } from "@/db";
import { getBrowseCounts, listCities } from "@/db/queries/halls";
import { resolveLocale } from "@/i18n/locale";
import { cityPhotoKey } from "@/lib/stock-photos";

export const dynamic = "force-dynamic";

const ART = ["theatre", "banquet", "stage"] as const;

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const locale = await resolveLocale(params);
  const t = await getTranslations({ locale, namespace: "citiesPage" });
  return { title: t("title"), alternates: { canonical: `/${locale}/cities` } };
}

export default async function CitiesPage({ params }: { params: Promise<{ locale: string }> }) {
  const locale = await resolveLocale(params);
  const [t, tCard, db] = await Promise.all([
    getTranslations("citiesPage"),
    getTranslations("hallCard"),
    getDb(),
  ]);
  const [cities, counts] = await Promise.all([listCities(db, locale), getBrowseCounts(db)]);

  return (
    <section className="px-5 py-10 md:px-12">
      <h1 className="text-3xl font-semibold md:text-4xl">{t("title")}</h1>
      <p className="mt-2 mb-8">{t("intro")}</p>
      <ul className="grid gap-6 md:grid-cols-3">
        {cities.map((c, i) => (
          <li key={c.slug}>
            <Tile
              title={c.name}
              count={tCard("hallsCount", { count: counts.cities[c.slug] ?? 0 })}
              href={`/cities/${c.slug}`}
              art={ART[i % ART.length]}
              photoKey={cityPhotoKey(c.slug)}
            />
          </li>
        ))}
      </ul>
    </section>
  );
}
