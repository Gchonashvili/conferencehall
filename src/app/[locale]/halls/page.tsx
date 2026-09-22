import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { HallResults } from "@/components/site/hall-results";
import { resolveLocale } from "@/i18n/locale";
import { parseHallFilters } from "@/lib/hall-filters";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const locale = await resolveLocale(params);
  const t = await getTranslations({ locale, namespace: "halls" });
  return {
    title: t("title"),
    description: t("metaDescription"),
    alternates: { canonical: `/${locale}/halls`, languages: { ka: "/ka/halls", en: "/en/halls" } },
  };
}

export default async function HallsPage({ params, searchParams }: Props) {
  const locale = await resolveLocale(params);
  const [t, sp] = await Promise.all([getTranslations("halls"), searchParams]);

  return (
    <section className="px-5 py-10 md:px-12">
      <h1 className="mb-6 text-3xl font-semibold md:text-4xl">{t("title")}</h1>
      <HallResults filters={parseHallFilters(sp)} locale={locale} />
    </section>
  );
}
