import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { getDb } from "@/db";
import { listAllVenues } from "@/db/queries/admin";
import { Link } from "@/i18n/navigation";
import { resolveLocale } from "@/i18n/locale";
import { pickText } from "@/lib/i18n-text";
import { requireUser } from "@/lib/session";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Venues", robots: { index: false } };

export default async function AdminVenuesPage({ params }: { params: Promise<{ locale: string }> }) {
  const locale = await resolveLocale(params);
  await requireUser(locale, ["admin"]);
  const [t, db] = await Promise.all([getTranslations("admin.venues"), getDb()]);
  const venues = await listAllVenues(db);

  return (
    <section className="px-5 py-10 md:px-12">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-semibold md:text-4xl">{t("title")}</h1>
        <Button asChild>
          <Link href="/admin/venues/new">{t("newVenue")}</Link>
        </Button>
      </div>

      {venues.length === 0 ? <p>{t("empty")}</p> : null}
      <ul className="flex flex-col gap-3">
        {venues.map((v) => (
          <li key={v.id}>
            <Link href={`/admin/venues/${v.id}`} className="flex flex-wrap items-center justify-between gap-2 rounded-card bg-blush p-4 shadow-card transition-shadow hover:shadow-lg">
              <div>
                <p className="font-semibold">{pickText(v.name, locale)}</p>
                <p className="text-sm opacity-80">
                  {v.citySlug} · {t("hallCount", { count: v.hallCount })}
                </p>
              </div>
              <div className="flex gap-2">
                <Chip>{v.status}</Chip>
                <Chip>{t(v.verified ? "verified" : "unverified")}</Chip>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
