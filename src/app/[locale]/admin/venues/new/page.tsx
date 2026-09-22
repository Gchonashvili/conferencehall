import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { createVenueAction } from "@/app/actions/admin";
import { VenueForm } from "@/components/admin/venue-form";
import { getDb } from "@/db";
import { listCities } from "@/db/queries/halls";
import { resolveLocale } from "@/i18n/locale";
import { requireUser } from "@/lib/session";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "New venue", robots: { index: false } };

export default async function NewVenuePage({ params }: { params: Promise<{ locale: string }> }) {
  const locale = await resolveLocale(params);
  await requireUser(locale, ["admin"]);
  const [t, db] = await Promise.all([getTranslations("admin.venueForm"), getDb()]);
  const cities = await listCities(db, locale);

  return (
    <section className="px-5 py-10 md:px-12">
      <h1 className="mb-6 text-3xl font-semibold md:text-4xl">{t("createTitle")}</h1>
      <div className="max-w-2xl">
        <VenueForm locale={locale} action={createVenueAction} cities={cities} />
      </div>
    </section>
  );
}
