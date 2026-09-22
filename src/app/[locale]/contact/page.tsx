import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { submitInquiry } from "@/app/actions/inquiry";
import { ContactForm, type InquiryKind } from "@/components/site/contact-form";
import { getDb } from "@/db";
import { listCities, listEventTypes } from "@/db/queries/halls";
import { resolveLocale } from "@/i18n/locale";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

const KINDS: InquiryKind[] = ["contact", "brief", "venue"];
const kindOf = (v: string | string[] | undefined): InquiryKind => {
  const s = Array.isArray(v) ? v[0] : v;
  return KINDS.find((k) => k === s) ?? "contact";
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const locale = await resolveLocale(params);
  const t = await getTranslations({ locale, namespace: "contact" });
  return { title: t("title"), alternates: { canonical: `/${locale}/contact` } };
}

export default async function ContactPage({ params, searchParams }: Props) {
  const locale = await resolveLocale(params);
  const [t, sp, db] = await Promise.all([getTranslations("contact"), searchParams, getDb()]);
  const kind = kindOf(sp.kind);
  const [cities, eventTypes] = await Promise.all([listCities(db, locale), listEventTypes(db, locale)]);

  const title = { contact: t("title"), brief: t("briefTitle"), venue: t("venueTitle") }[kind];
  const intro = { contact: t("intro"), brief: t("briefIntro"), venue: t("venueIntro") }[kind];

  return (
    <section className="mx-auto max-w-2xl px-5 py-10 md:py-14">
      <h1 className="text-3xl font-semibold md:text-4xl">{title}</h1>
      <p className="mt-2 mb-8">{intro}</p>
      <ContactForm
        kind={kind}
        locale={locale}
        cities={cities.map((c) => ({ value: c.slug, label: c.name }))}
        eventTypes={eventTypes.map((e) => ({ value: e.slug, label: e.name }))}
        action={submitInquiry}
      />
    </section>
  );
}
