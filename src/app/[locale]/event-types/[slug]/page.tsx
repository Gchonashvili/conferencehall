import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { HallResults } from "@/components/site/hall-results";
import { getDb } from "@/db";
import { listEventTypes } from "@/db/queries/halls";
import { resolveLocale } from "@/i18n/locale";
import { parseHallFilters } from "@/lib/hall-filters";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ locale: string; slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

async function findType(slug: string, locale: string) {
  const types = await listEventTypes(await getDb(), locale);
  return types.find((e) => e.slug === slug) ?? null;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const locale = await resolveLocale(params);
  const { slug } = await params;
  const [type, t] = await Promise.all([findType(slug, locale), getTranslations({ locale, namespace: "halls" })]);
  if (!type) return {};
  return {
    title: t("forEvent", { event: type.name }),
    description: t("metaDescription"),
    alternates: {
      canonical: `/${locale}/event-types/${slug}`,
      languages: { ka: `/ka/event-types/${slug}`, en: `/en/event-types/${slug}` },
    },
  };
}

export default async function EventTypePage({ params, searchParams }: Props) {
  const locale = await resolveLocale(params);
  const { slug } = await params;
  const [type, t, sp] = await Promise.all([findType(slug, locale), getTranslations("halls"), searchParams]);
  if (!type) notFound();

  return (
    <section className="px-5 py-10 md:px-12">
      <h1 className="mb-6 text-3xl font-semibold md:text-4xl">{t("forEvent", { event: type.name })}</h1>
      <HallResults filters={{ ...parseHallFilters(sp), eventType: slug }} locale={locale} omit={["eventType"]} />
    </section>
  );
}
