import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { cancelRequestAction } from "@/app/actions/admin";
import { CancelRequestForm } from "@/components/admin/cancel-request-form";
import { Chip } from "@/components/ui/chip";
import { getDb } from "@/db";
import { getRequestForAdmin } from "@/db/queries/requests";
import { canTransition } from "@/domain/booking";
import { Link } from "@/i18n/navigation";
import { resolveLocale } from "@/i18n/locale";
import { formatDate, formatDateTime } from "@/lib/format-date";
import { formatGel } from "@/lib/money";
import { requireUser } from "@/lib/session";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Request", robots: { index: false } };

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs font-semibold text-coral-strong">{label}</dt>
      <dd className="text-base break-words">{children}</dd>
    </div>
  );
}

export default async function AdminRequestDetailPage({ params }: { params: Promise<{ locale: string; id: string }> }) {
  const locale = await resolveLocale(params);
  const { id } = await params;
  await requireUser(locale, ["admin"]);
  const [t, tRes, tBooking, db] = await Promise.all([
    getTranslations("admin.requests"),
    getTranslations("reservations"),
    getTranslations("booking"),
    getDb(),
  ]);

  const r = /^[0-9a-f-]{36}$/i.test(id) ? await getRequestForAdmin(db, id, locale) : null;
  if (!r) notFound();

  const canCancel = canTransition(r.status, "cancelled");
  const timeLabels = { morning: tBooking("times.morning"), afternoon: tBooking("times.afternoon"), evening: tBooking("times.evening"), full_day: tBooking("times.fullDay") };

  return (
    <section className="px-5 py-10 md:px-12">
      <Link href="/admin/requests" className="text-sm underline underline-offset-4">
        ← {t("back")}
      </Link>

      <div className="mt-4 mb-8 flex flex-wrap items-center gap-3">
        <h1 className="text-3xl font-semibold md:text-4xl">{r.reference}</h1>
        <Chip>{tRes(`status.${r.status}`)}</Chip>
      </div>

      <dl className="grid gap-x-8 gap-y-4 rounded-card bg-blush p-6 shadow-card sm:grid-cols-2 lg:grid-cols-3">
        <Row label={t("venue")}>{r.venueName}</Row>
        <Row label={t("hall")}>{r.hallName}</Row>
        <Row label={tRes("date")}>{formatDate(r.eventDate, locale)}</Row>
        <Row label={tRes("time")}>{timeLabels[r.timeOfDay]}</Row>
        <Row label={tRes("guests")}>{r.guests}</Row>
        <Row label={tRes("eventType")}>{r.eventTypeName}</Row>
        {r.areaName ? <Row label={tRes("area")}>{r.areaName}</Row> : null}
        <Row label={t("contact")}>
          {r.contactName}
          <br />
          <a className="underline underline-offset-4" href={`tel:${r.contactPhone}`}>{r.contactPhone}</a>
          <br />
          <a className="underline underline-offset-4" href={`mailto:${r.contactEmail}`}>{r.contactEmail}</a>
        </Row>
        {r.message ? <Row label={t("message")}>{r.message}</Row> : null}
        <Row label={t("received")}>{formatDateTime(r.createdAt, locale)}</Row>
        {r.status === "pending" ? <Row label={t("expires")}>{formatDateTime(r.expiresAt, locale)}</Row> : null}
        {r.respondedAt ? <Row label={t("responded")}>{formatDateTime(r.respondedAt, locale)}</Row> : null}
        {r.quotedTotalTetri != null ? <Row label={t("totalPrice")}>{formatGel(r.quotedTotalTetri, locale)}</Row> : null}
        {r.depositTetri != null ? <Row label={t("deposit")}>{formatGel(r.depositTetri, locale)}</Row> : null}
        {r.declineReason ? <Row label={t("declineReason")}>{r.declineReason}</Row> : null}
      </dl>

      <div className="mt-8">
        {canCancel ? (
          <CancelRequestForm requestId={r.id} locale={locale} action={cancelRequestAction} />
        ) : (
          <p className="text-sm opacity-80">{t("noAction")}</p>
        )}
      </div>
    </section>
  );
}
