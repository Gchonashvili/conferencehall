import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { updateVenueAction } from "@/app/actions/admin";
import { VenueForm } from "@/components/admin/venue-form";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { getDb } from "@/db";
import { getVenueForAdmin } from "@/db/queries/admin";
import { listCities } from "@/db/queries/halls";
import { Link } from "@/i18n/navigation";
import { resolveLocale } from "@/i18n/locale";
import { requireUser } from "@/lib/session";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Edit venue", robots: { index: false } };

export default async function EditVenuePage({ params }: { params: Promise<{ locale: string; id: string }> }) {
  const locale = await resolveLocale(params);
  const { id } = await params;
  await requireUser(locale, ["admin"]);
  const [t, tHalls, db] = await Promise.all([
    getTranslations("admin.venueForm"),
    getTranslations("admin.halls"),
    getDb(),
  ]);

  const [result, cities] = await Promise.all([getVenueForAdmin(db, id, locale), listCities(db, locale)]);
  if (!result) notFound();
  const { venue, halls } = result;

  return (
    <section className="px-5 py-10 md:px-12">
      <Link href="/admin/venues" className="mb-4 inline-block text-sm underline underline-offset-4">
        {t("editTitle")}
      </Link>
      <h1 className="mb-6 text-3xl font-semibold md:text-4xl">{venue.name.en}</h1>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <div className="max-w-2xl">
          <VenueForm
            locale={locale}
            action={updateVenueAction}
            cities={cities}
            venueId={venue.id}
            venue={{
              name: venue.name,
              description: venue.description,
              citySlug: venue.citySlug,
              address: venue.address,
              lat: venue.lat,
              lng: venue.lng,
              phone: venue.phone,
              email: venue.email,
              whatsapp: venue.whatsapp,
              website: venue.website,
              status: venue.status,
              verified: venue.verified,
              subscriptionStatus: venue.subscriptionStatus,
              subscriptionUntil: venue.subscriptionUntil,
              depositPercent: venue.depositPercent,
            }}
          />
        </div>

        <div className="rounded-card bg-blush p-5 shadow-card md:p-6">
          <div className="mb-4 flex items-center justify-between gap-2">
            <h2 className="text-lg font-semibold">{t("halls")}</h2>
            <Button asChild size="sm">
              <Link href={`/admin/venues/${venue.id}/halls/new`}>{t("newHall")}</Link>
            </Button>
          </div>
          {halls.length === 0 ? <p className="text-sm">{t("noHalls")}</p> : null}
          <ul className="flex flex-col gap-2">
            {halls.map((h) => (
              <li key={h.id}>
                <Link href={`/admin/halls/${h.id}`} className="flex items-center justify-between gap-2 rounded-lg bg-panel px-4 py-2.5 text-sm hover:shadow">
                  <span>{h.name}</span>
                  <span className="flex gap-1.5">
                    <Chip>{tHalls(h.status)}</Chip>
                    {h.featured ? <Chip>{tHalls("featured")}</Chip> : null}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
