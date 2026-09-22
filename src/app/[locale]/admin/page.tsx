import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Button } from "@/components/ui/button";
import { getDb } from "@/db";
import { getAdminCounts } from "@/db/queries/admin";
import { countNewInquiries } from "@/db/queries/inquiries";
import { countPendingRequests } from "@/db/queries/requests";
import { Link } from "@/i18n/navigation";
import { resolveLocale } from "@/i18n/locale";
import { requireUser } from "@/lib/session";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Admin", robots: { index: false } };

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <div className="rounded-card bg-blush p-5 text-center shadow-card">
      <p className="text-3xl font-bold">{value}</p>
      <p className="mt-1 text-sm">{label}</p>
    </div>
  );
}

export default async function AdminHomePage({ params }: { params: Promise<{ locale: string }> }) {
  const locale = await resolveLocale(params);
  await requireUser(locale, ["admin"]);
  const [t, db] = await Promise.all([getTranslations("admin.home"), getDb()]);
  const [counts, pendingRequests, newLeads] = await Promise.all([
    getAdminCounts(db),
    countPendingRequests(db),
    countNewInquiries(db),
  ]);

  return (
    <section className="px-5 py-10 md:px-12">
      <h1 className="mb-6 text-3xl font-semibold md:text-4xl">{t("title")}</h1>

      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat value={pendingRequests} label={t("pendingRequests")} />
        <Stat value={newLeads} label={t("newLeads")} />
        <Stat value={counts.unverifiedVenues} label={t("unverifiedVenues")} />
        <Stat value={counts.venues.active} label={`${t("venues")} · ${t("active")}`} />
        <Stat value={counts.halls.published} label={`${t("halls")} · ${t("published")}`} />
        <Stat value={counts.halls.draft} label={`${t("halls")} · ${t("draft")}`} />
      </div>

      <div className="flex flex-wrap gap-4">
        <Button asChild>
          <Link href="/admin/requests">{t("viewRequests")}</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/admin/leads">{t("viewLeads")}</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/admin/venues">{t("viewVenues")}</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/admin/halls">{t("viewHalls")}</Link>
        </Button>
      </div>
    </section>
  );
}
