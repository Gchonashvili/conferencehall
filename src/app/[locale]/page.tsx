import { getTranslations } from "next-intl/server";
import { FilterBar } from "@/components/site/filter-bar";
import { HallCardItem } from "@/components/site/hall-card-item";
import { Hero } from "@/components/site/hero";
import { PhotoBanner } from "@/components/site/photo-banner";
import { getSearchFilters } from "@/components/site/search-filters";
import { SectionHeader } from "@/components/site/section-header";
import { Tile } from "@/components/site/tile";
import { TrustStrip } from "@/components/site/trust-strip";
import { Button } from "@/components/ui/button";
import { getDb } from "@/db";
import { getBrowseCounts, getFeaturedHalls, listCities, listEventTypes } from "@/db/queries/halls";
import { Link } from "@/i18n/navigation";
import { cityPhotoKey, eventPhotoKey } from "@/lib/stock-photos";
import { resolveLocale } from "@/i18n/locale";

export const dynamic = "force-dynamic";

const ART = ["theatre", "banquet", "stage"] as const;

/** Homepage, in the section order defined in the PRD. */
export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const locale = await resolveLocale(params);
  const db = await getDb();
  const [t, tHome, tSearch, tSections, tCard, tTrust, filters, counts, featured, cities, eventTypes] =
    await Promise.all([
      getTranslations("hero"),
      getTranslations("home"),
      getTranslations("search"),
      getTranslations("sections"),
      getTranslations("hallCard"),
      getTranslations("trust"),
      getSearchFilters(),
      getBrowseCounts(db),
      getFeaturedHalls(db, locale, 3),
      listCities(db, locale),
      listEventTypes(db, locale),
    ]);

  const citiesWithHalls = cities.filter((c) => (counts.cities[c.slug] ?? 0) > 0);
  const section = "px-5 py-10 md:px-12";

  return (
    <>
      {/* 1. Hero + search: a plain GET form, so it works without JavaScript */}
      <Hero title={t("title")} subtitle={t("subtitle")} imageAlt="">
        <form action={`/${locale}/halls`} method="get">
          <FilterBar
            boxed
            filters={filters}
            action={
              <Button size="lg" type="submit" className="md:ml-1">
                {tSearch("cta")}
              </Button>
            }
          />
        </form>
      </Hero>

      {/* 2. Trust strip: real numbers only */}
      <section className="px-5 pt-8 md:px-12">
        <TrustStrip
          stats={[
            { value: counts.total, label: tTrust("verifiedHalls") },
            { value: citiesWithHalls.length, label: tTrust("citiesCovered") },
            { value: "1", label: tTrust("oneRequest") },
            { value: "₾", label: tTrust("upfrontPrices") },
          ]}
        />
      </section>

      {/* 3. Browse by event type */}
      <section className={section}>
        <SectionHeader title={tSections("browseByEventType")} />
        <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {eventTypes.map((e, i) => (
            <li key={e.slug}>
              <Tile
                title={e.name}
                count={tCard("hallsCount", { count: counts.eventTypes[e.slug] ?? 0 })}
                href={`/event-types/${e.slug}`}
                art={ART[i % ART.length]}
                photoKey={eventPhotoKey(e.slug)}
              />
            </li>
          ))}
        </ul>
      </section>

      {/* 4. Browse by city */}
      <section className={section}>
        <SectionHeader title={tSections("browseByCity")} href="/cities" viewAllLabel={tSections("viewAll")} />
        <ul className="grid gap-6 md:grid-cols-3">
          {cities.map((c, i) => (
            <li key={c.slug}>
              <Tile
                title={c.name}
                count={tCard("hallsCount", { count: counts.cities[c.slug] ?? 0 })}
                href={`/cities/${c.slug}`}
                art={ART[(i + 1) % ART.length]}
                photoKey={cityPhotoKey(c.slug)}
              />
            </li>
          ))}
        </ul>
      </section>

      {/* 5. Featured halls */}
      {featured.length > 0 ? (
        <section className={section}>
          <SectionHeader title={tSections("featuredHalls")} href="/halls" viewAllLabel={tSections("viewAll")} />
          <ul className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {featured.map((h) => (
              <li key={h.id}>
                <HallCardItem hall={h} />
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {/* 6. Why us */}
      <section className={section}>
        <SectionHeader title={tHome("whyTitle")} />
        <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {(["Verified", "OneRequest", "Upfront", "Help"] as const).map((k) => (
            <li key={k} className="rounded-card bg-blush p-5 shadow-card">
              <h3 className="text-lg font-semibold">{tHome(`why${k}Title`)}</h3>
              <p className="mt-2 text-sm">{tHome(`why${k}Body`)}</p>
            </li>
          ))}
        </ul>
      </section>

      {/* 7. Brief form (concierge fallback) */}
      <section className="px-5 pb-10 md:px-12">
        <div className="flex flex-col gap-4 rounded-card bg-peach p-6 md:flex-row md:items-center md:justify-between md:p-8">
          <div>
            <h2 className="text-2xl font-semibold">{tHome("briefTitle")}</h2>
            <p className="mt-1 max-w-2xl">{tHome("briefBody")}</p>
          </div>
          <Button asChild size="lg">
            <Link href="/contact?kind=brief">{tHome("briefCta")}</Link>
          </Button>
        </div>
      </section>

      {/* 8. List your hall */}
      <PhotoBanner title={tHome("venueTitle")} cta={tHome("venueCta")} href="/for-venues" />
    </>
  );
}
