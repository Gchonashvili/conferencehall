import { ShieldCheck } from "lucide-react";
import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { getTranslations } from "next-intl/server";
import { AreasTable } from "@/components/site/areas-table";
import { BookingSidebar } from "@/components/site/booking-sidebar";
import { GalleryGrid } from "@/components/site/gallery-grid";
import { HallCardItem } from "@/components/site/hall-card-item";
import { SectionHeader } from "@/components/site/section-header";
import { Chip } from "@/components/ui/chip";
import { PlaceholderArt } from "@/components/ui/placeholder-art";
import { getDb } from "@/db";
import { submitBookingRequest } from "@/app/actions/booking";
import { getHallBySlug, getSimilarHalls, type HallDetail } from "@/db/queries/halls";
import { Link } from "@/i18n/navigation";
import { resolveLocale } from "@/i18n/locale";
import { env } from "@/env";
import { formatGel } from "@/lib/money";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ locale: string; slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const locale = await resolveLocale(params);
  const { slug } = await params;
  const hall = await getHallBySlug(await getDb(), slug, locale);
  if (!hall) return {};
  return {
    title: `${hall.name}, ${hall.cityName}`,
    description: hall.description.slice(0, 160) || undefined,
    alternates: {
      canonical: `/${locale}/halls/${slug}`,
      languages: { ka: `/ka/halls/${slug}`, en: `/en/halls/${slug}` },
    },
    openGraph: hall.coverUrl ? { images: [hall.coverUrl] } : undefined,
  };
}

/** schema.org EventVenue, for search engines. `<` is escaped so it can't close the script tag. */
function jsonLd(hall: HallDetail, locale: string) {
  const data = {
    "@context": "https://schema.org",
    "@type": "EventVenue",
    name: hall.name,
    description: hall.description || undefined,
    url: `${env.NEXT_PUBLIC_SITE_URL}/${locale}/halls/${hall.slug}`,
    maximumAttendeeCapacity: hall.capacityMax,
    image: hall.images.map((i) => i.url),
    address: {
      "@type": "PostalAddress",
      streetAddress: hall.address || undefined,
      addressLocality: hall.cityName,
      addressCountry: "GE",
    },
    geo: hall.lat != null && hall.lng != null ? { "@type": "GeoCoordinates", latitude: hall.lat, longitude: hall.lng } : undefined,
  };
  return JSON.stringify(data).replace(/</g, "\\u003c");
}

function HallHeader({ hall }: { hall: HallDetail }) {
  const t = useTranslations("hallPage");
  const tTypes = useTranslations("hallTypes");
  const tCard = useTranslations("hallCard");
  const tUnits = useTranslations("priceUnits");
  const locale = useLocale();
  const unitKey = { hour: "hour", half_day: "halfDay", day: "day" } as const;

  return (
    <header>
      <h1 className="text-3xl font-semibold md:text-4xl">{hall.name}</h1>
      <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
        <span>
          {t("venue")}: {hall.venueName}
        </span>
        {hall.verified ? (
          <Chip className="gap-1">
            <ShieldCheck aria-hidden className="size-3.5" />
            {t("verifiedVenue")}
          </Chip>
        ) : null}
      </p>
      <div className="mt-4 flex flex-wrap items-end gap-x-8 gap-y-3">
        <div>
          <p className="text-xs text-coral-strong">
            {tCard("startingFrom")} · {tUnits(unitKey[hall.priceUnit])}
          </p>
          <p className="text-3xl font-bold">{formatGel(hall.priceFromTetri, locale)}</p>
        </div>
        <ul className="flex flex-wrap gap-2">
          <Chip>{tTypes(hall.hallType as Parameters<typeof tTypes>[0])}</Chip>
          <Chip>{t("capacityRange", { min: hall.capacityMin, max: hall.capacityMax })}</Chip>
          <Chip>{hall.indoor ? t("indoor") : t("outdoor")}</Chip>
        </ul>
      </div>
    </header>
  );
}

export default async function HallPage({ params }: Props) {
  const locale = await resolveLocale(params);
  const { slug } = await params;
  const db = await getDb();
  const hall = await getHallBySlug(db, slug, locale);
  if (!hall) notFound();

  const [similar, t, tLayouts, tSections] = await Promise.all([
    getSimilarHalls(db, hall, locale),
    getTranslations("hallPage"),
    getTranslations("layouts"),
    getTranslations("sections"),
  ]);

  const areaOptions = hall.areas.map((a) => ({
    value: a.id,
    label: a.name,
    hint: Object.entries(a.capacity)
      .slice(0, 1)
      .map(([k, v]) => `${tLayouts(k as "theatre")} ${v}`)
      .join(""),
  }));

  return (
    <div className="px-5 py-8 md:px-12">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(hall, locale) }} />

      <nav aria-label={t("breadcrumb")} className="mb-5 text-sm">
        <ol className="flex flex-wrap gap-x-2">
          <li>
            <Link href="/cities" className="underline-offset-4 hover:underline">
              {tSections("browseByCity")}
            </Link>
          </li>
          <li aria-hidden>/</li>
          <li>
            <Link href={`/cities/${hall.citySlug}`} className="underline-offset-4 hover:underline">
              {hall.cityName}
            </Link>
          </li>
        </ol>
      </nav>

      <div className="grid gap-10 lg:grid-cols-[1fr_380px]">
        <div className="flex min-w-0 flex-col gap-10">
          <div className="relative aspect-[16/9] overflow-hidden rounded-card">
            {hall.images[0] ? (
              <Image src={hall.images[0].url} alt={hall.images[0].alt} fill priority sizes="(min-width: 1024px) 760px, 100vw" className="object-cover" />
            ) : (
              <PlaceholderArt variant="theatre" alt="" />
            )}
          </div>

          <HallHeader hall={hall} />

          {hall.description ? (
            <section aria-labelledby="about-title">
              <h2 id="about-title" className="mb-3 text-xl font-semibold">
                {t("about")}
              </h2>
              <p className="max-w-prose whitespace-pre-line">{hall.description}</p>
            </section>
          ) : null}

          {hall.areas.length > 0 ? <AreasTable areas={hall.areas} /> : null}

          {hall.eventTypes.length > 0 ? (
            <section aria-labelledby="types-title">
              <h2 id="types-title" className="mb-3 text-xl font-semibold">
                {t("suitableFor")}
              </h2>
              <ul className="flex flex-wrap gap-2">
                {hall.eventTypes.map((e) => (
                  <li key={e.slug}>
                    <Link href={`/event-types/${e.slug}`}>
                      <Chip className="hover:bg-peach/70">{e.name}</Chip>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {hall.amenities.length > 0 ? (
            <section aria-labelledby="amenities-title">
              <h2 id="amenities-title" className="mb-3 text-xl font-semibold">
                {t("amenities")}
              </h2>
              <ul className="flex flex-wrap gap-2">
                {hall.amenities.map((a) => (
                  <li key={a}>
                    <Chip>{a}</Chip>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          <GalleryGrid images={hall.images} showViewAll={false} />

          <section aria-labelledby="loc-title">
            <h2 id="loc-title" className="mb-3 text-xl font-semibold">
              {t("location")}
            </h2>
            <p>{[hall.venueName, hall.address, hall.cityName].filter(Boolean).join(", ")}</p>
            {hall.lat != null && hall.lng != null ? (
              <a
                className="mt-2 inline-block underline underline-offset-4"
                href={`https://www.google.com/maps?q=${hall.lat},${hall.lng}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                Google Maps
              </a>
            ) : null}
          </section>
        </div>

        {/* Taller than a laptop screen, so it scrolls inside itself instead of hiding the submit button. */}
        <aside className="lg:sticky lg:top-6 lg:-m-2 lg:max-h-[calc(100dvh-2rem)] lg:self-start lg:overflow-y-auto lg:p-2">
          <BookingSidebar
            action={submitBookingRequest}
            locale={locale}
            hallId={hall.id}
            eventTypes={hall.eventTypes.map((e) => ({ value: e.slug, label: e.name }))}
            areas={areaOptions}
          />
        </aside>
      </div>

      {similar.length > 0 ? (
        <section className="mt-14">
          <SectionHeader title={t("similar")} href={`/cities/${hall.citySlug}`} viewAllLabel={tSections("viewAll")} />
          <ul className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {similar.map((h) => (
              <li key={h.id}>
                <HallCardItem hall={h} />
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
