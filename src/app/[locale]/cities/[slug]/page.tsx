import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { HallResults } from "@/components/site/hall-results";
import { getDb } from "@/db";
import { listCities } from "@/db/queries/halls";
import { resolveLocale } from "@/i18n/locale";
import { parseHallFilters } from "@/lib/hall-filters";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ locale: string; slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

async function findCity(slug: string, locale: string) {
  const cities = await listCities(await getDb(), locale);
  return cities.find((c) => c.slug === slug) ?? null;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const locale = await resolveLocale(params);
  const { slug } = await params;
  const [city, t] = await Promise.all([findCity(slug, locale), getTranslations({ locale, namespace: "halls" })]);
  if (!city) return {};
  return {
    title: t("inCity", { city: city.name }),
    description: t("metaDescription"),
    alternates: {
      canonical: `/${locale}/cities/${slug}`,
      languages: { ka: `/ka/cities/${slug}`, en: `/en/cities/${slug}` },
    },
  };
}

export default async function CityPage({ params, searchParams }: Props) {
  const locale = await resolveLocale(params);
  const { slug } = await params;
  const [city, t, sp] = await Promise.all([findCity(slug, locale), getTranslations("halls"), searchParams]);
  if (!city) notFound();

  return (
    <section className="px-5 py-10 md:px-12">
      <h1 className="mb-6 text-3xl font-semibold md:text-4xl">{t("inCity", { city: city.name })}</h1>
      <HallResults filters={{ ...parseHallFilters(sp), city: slug }} locale={locale} omit={["city"]} />
    </section>
  );
}
