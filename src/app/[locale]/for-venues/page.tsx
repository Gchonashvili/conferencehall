import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { submitInquiry } from "@/app/actions/inquiry";
import { ContactForm } from "@/components/site/contact-form";
import { resolveLocale } from "@/i18n/locale";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const locale = await resolveLocale(params);
  const t = await getTranslations({ locale, namespace: "forVenues" });
  return { title: t("title"), alternates: { canonical: `/${locale}/for-venues` } };
}

export default async function ForVenuesPage({ params }: { params: Promise<{ locale: string }> }) {
  const locale = await resolveLocale(params);
  const t = await getTranslations("forVenues");

  return (
    <div className="px-5 py-10 md:px-12 md:py-14">
      <h1 className="max-w-3xl text-3xl font-semibold md:text-5xl">{t("title")}</h1>
      <p className="mt-4 max-w-2xl text-lg">{t("intro")}</p>

      <ul className="mt-10 grid gap-6 md:grid-cols-3">
        {(["b1", "b2", "b3"] as const).map((k) => (
          <li key={k} className="rounded-card bg-blush p-5 shadow-card">
            <h2 className="text-lg font-semibold">{t(`${k}Title`)}</h2>
            <p className="mt-2 text-sm">{t(`${k}Body`)}</p>
          </li>
        ))}
      </ul>

      <div className="mx-auto mt-14 max-w-2xl">
        <h2 className="mb-4 text-2xl font-semibold">{t("formTitle")}</h2>
        <ContactForm kind="venue" locale={locale} cities={[]} eventTypes={[]} action={submitInquiry} />
      </div>
    </div>
  );
}
