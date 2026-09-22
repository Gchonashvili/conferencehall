import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { createHallAction } from "@/app/actions/admin";
import { HallForm } from "@/components/admin/hall-form";
import { getDb } from "@/db";
import { getVenueForAdmin } from "@/db/queries/admin";
import { listAmenities, listEventTypes } from "@/db/queries/halls";
import { resolveLocale } from "@/i18n/locale";
import { requireUser } from "@/lib/session";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "New hall", robots: { index: false } };

export default async function NewHallPage({ params }: { params: Promise<{ locale: string; id: string }> }) {
  const locale = await resolveLocale(params);
  const { id } = await params;
  await requireUser(locale, ["admin"]);
  const [t, db] = await Promise.all([getTranslations("admin.hallForm"), getDb()]);

  const venueResult = await getVenueForAdmin(db, id, locale);
  if (!venueResult) notFound();

  const [eventTypes, amenities] = await Promise.all([listEventTypes(db, locale), listAmenities(db, locale)]);

  return (
    <section className="px-5 py-10 md:px-12">
      <h1 className="mb-1 text-3xl font-semibold md:text-4xl">{t("createTitle")}</h1>
      <p className="mb-6 text-sm opacity-80">{venueResult.venue.name.en}</p>
      <div className="max-w-2xl">
        <HallForm locale={locale} action={createHallAction} venueId={id} eventTypes={eventTypes} amenities={amenities} />
      </div>
    </section>
  );
}
