import { eq, sql } from "drizzle-orm";
import type { Metadata } from "next";
import { useTranslations } from "next-intl";
import { getTranslations } from "next-intl/server";
import { Chip } from "@/components/ui/chip";
import { Notice } from "@/components/ui/notice";
import { getDb } from "@/db";
import { listVenueRequests, type RequestRow } from "@/db/queries/requests";
import { venues } from "@/db/schema";
import { Link } from "@/i18n/navigation";
import { resolveLocale } from "@/i18n/locale";
import { formatDate, formatDateTime } from "@/lib/format-date";
import { requireUser } from "@/lib/session";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Requests", robots: { index: false } };

function RequestCard({ r, locale }: { r: RequestRow; locale: string }) {
  const t = useTranslations("dashboard");
  const tRes = useTranslations("reservations");
  return (
    <li>
      <Link href={`/dashboard/requests/${r.id}`} className="block rounded-card bg-blush p-5 shadow-card transition-shadow hover:shadow-lg">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-lg font-semibold">
            {r.hallName} · {r.reference}
          </h3>
          <Chip>{tRes(`status.${r.status}`)}</Chip>
        </div>
        <p className="mt-2 text-sm">
          {formatDate(r.eventDate, locale)} · {t("guests", { count: r.guests })} · {r.eventTypeName} · {r.contactName}
        </p>
        {r.status === "pending" ? (
          <p className="mt-1 text-xs text-coral-strong">
            {t("expires")}: {formatDateTime(r.expiresAt, locale)}
          </p>
        ) : null}
      </Link>
    </li>
  );
}

export default async function DashboardPage({ params }: { params: Promise<{ locale: string }> }) {
  const locale = await resolveLocale(params);
  const user = await requireUser(locale, ["venue"]);
  const [t, db] = await Promise.all([getTranslations("dashboard"), getDb()]);

  const [rows, [{ owned }]] = await Promise.all([
    listVenueRequests(db, user.id, locale),
    db.select({ owned: sql<number>`count(*)::int` }).from(venues).where(eq(venues.ownerUserId, user.id)),
  ]);

  const pending = rows.filter((r) => r.status === "pending");
  const answered = rows.filter((r) => r.status !== "pending");

  return (
    <section className="px-5 py-10 md:px-12">
      <h1 className="mb-6 text-3xl font-semibold md:text-4xl">{t("title")}</h1>

      {owned === 0 ? <Notice tone="error">{t("noVenue")}</Notice> : null}
      {owned > 0 && rows.length === 0 ? <p>{t("empty")}</p> : null}

      {pending.length > 0 ? (
        <>
          <h2 className="mb-3 text-xl font-semibold">{t("pending")}</h2>
          <ul className="mb-10 flex flex-col gap-4">
            {pending.map((r) => (
              <RequestCard key={r.id} r={r} locale={locale} />
            ))}
          </ul>
        </>
      ) : null}
      {answered.length > 0 ? (
        <>
          <h2 className="mb-3 text-xl font-semibold">{t("answered")}</h2>
          <ul className="flex flex-col gap-4">
            {answered.map((r) => (
              <RequestCard key={r.id} r={r} locale={locale} />
            ))}
          </ul>
        </>
      ) : null}
    </section>
  );
}
