import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import {
  addHallAreaAction,
  addHallImageAction,
  deleteHallAreaAction,
  deleteHallImageAction,
  setCoverImageAction,
  updateHallAction,
} from "@/app/actions/admin";
import { HallAreas } from "@/components/admin/hall-areas";
import { HallForm } from "@/components/admin/hall-form";
import { HallImages } from "@/components/admin/hall-images";
import { getDb } from "@/db";
import { getHallForAdmin } from "@/db/queries/admin";
import { listAmenities, listEventTypes } from "@/db/queries/halls";
import { Link } from "@/i18n/navigation";
import { resolveLocale } from "@/i18n/locale";
import { requireUser } from "@/lib/session";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Edit hall", robots: { index: false } };

export default async function EditHallPage({ params }: { params: Promise<{ locale: string; id: string }> }) {
  const locale = await resolveLocale(params);
  const { id } = await params;
  await requireUser(locale, ["admin"]);
  const [t, db] = await Promise.all([getTranslations("admin.hallForm"), getDb()]);

  const result = await getHallForAdmin(db, id, locale);
  if (!result) notFound();
  const { hall, venueName, venueId, areas, images, selectedEventTypes, selectedAmenities } = result;

  const [eventTypes, amenities] = await Promise.all([listEventTypes(db, locale), listAmenities(db, locale)]);

  return (
    <section className="px-5 py-10 md:px-12">
      <Link href={`/admin/venues/${venueId}`} className="mb-4 inline-block text-sm underline underline-offset-4">
        {venueName}
      </Link>
      <h1 className="mb-6 text-3xl font-semibold md:text-4xl">{hall.name.en}</h1>

      <div className="flex max-w-2xl flex-col gap-8">
        <HallForm
          locale={locale}
          action={updateHallAction}
          hallId={hall.id}
          eventTypes={eventTypes}
          amenities={amenities}
          selectedEventTypes={selectedEventTypes}
          selectedAmenities={selectedAmenities}
          hall={{
            name: hall.name,
            description: hall.description,
            hallType: hall.hallType,
            priceFromTetri: hall.priceFromTetri,
            priceUnit: hall.priceUnit,
            capacityMin: hall.capacityMin,
            capacityMax: hall.capacityMax,
            indoor: hall.indoor,
            featured: hall.featured,
            status: hall.status,
            sortOrder: hall.sortOrder,
          }}
        />

        <HallAreas locale={locale} hallId={hall.id} areas={areas} addAction={addHallAreaAction} deleteAction={deleteHallAreaAction} />

        <HallImages
          locale={locale}
          hallId={hall.id}
          images={images}
          addAction={addHallImageAction}
          deleteAction={deleteHallImageAction}
          setCoverAction={setCoverImageAction}
        />
      </div>

      <p className="sr-only">{t("editTitle")}</p>
    </section>
  );
}
