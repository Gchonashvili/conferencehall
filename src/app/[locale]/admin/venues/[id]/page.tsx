import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { logPaymentAction, updateVenueAction } from "@/app/actions/admin";
import { PaymentForm } from "@/components/admin/payment-form";
import { SubscriptionBadge } from "@/components/admin/subscription-badge";
import { VenueForm } from "@/components/admin/venue-form";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { getDb } from "@/db";
import { getVenueForAdmin } from "@/db/queries/admin";
import { listCities } from "@/db/queries/halls";
import { listPayments } from "@/db/queries/subscriptions";
import { nextPeriod, subscriptionHealth } from "@/domain/subscriptions";
import { Link } from "@/i18n/navigation";
import { resolveLocale } from "@/i18n/locale";
import { todayInTbilisi } from "@/lib/dates";
import { formatDate } from "@/lib/format-date";
import { formatGel } from "@/lib/money";
import { requireUser } from "@/lib/session";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Edit venue", robots: { index: false } };

export default async function EditVenuePage({ params }: { params: Promise<{ locale: string; id: string }> }) {
  const locale = await resolveLocale(params);
  const { id } = await params;
  await requireUser(locale, ["admin"]);
  const [t, tHalls, tSubs, db] = await Promise.all([
    getTranslations("admin.venueForm"),
    getTranslations("admin.halls"),
    getTranslations("admin.subscriptions"),
    getDb(),
  ]);

  // A malformed id would make Postgres reject the uuid comparison (a 500), so it's simply not found.
  const validId = /^[0-9a-f-]{36}$/i.test(id);
  const [result, cities, payments] = await Promise.all([
    validId ? getVenueForAdmin(db, id, locale) : null,
    listCities(db, locale),
    validId ? listPayments(db, id) : [],
  ]);
  if (!result) notFound();
  const { venue, halls } = result;

  const today = todayInTbilisi();
  const health = subscriptionHealth(venue, today);
  const period = nextPeriod(venue, today);

  return (
    <section className="px-5 py-6 md:px-8 md:py-8">
      <Link href="/admin/venues" className="mb-4 inline-block text-sm text-coral underline underline-offset-4">
        {t("editTitle")}
      </Link>
      <h1 className="mb-6 text-2xl font-semibold md:text-3xl">{venue.name.en}</h1>

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
              plan: venue.plan,
              planPriceTetri: venue.planPriceTetri,
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

      <section id="subscription" aria-labelledby="subscription-title" className="mt-10 scroll-mt-6">
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <h2 id="subscription-title" className="text-2xl font-semibold">
            {tSubs("sectionTitle")}
          </h2>
          <SubscriptionBadge health={health} label={tSubs(`health_${health}`)} />
          {venue.subscriptionUntil ? (
            <span className="text-sm">
              {tSubs("paidUntil")}: {formatDate(venue.subscriptionUntil, locale)}
            </span>
          ) : null}
        </div>

        <div className="grid gap-8 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
          <div className="max-w-2xl rounded-card bg-blush p-5 shadow-card md:p-6">
            <h3 className="mb-4 text-lg font-semibold">{tSubs("logPayment")}</h3>
            <PaymentForm
              locale={locale}
              venueId={venue.id}
              action={logPaymentAction}
              defaults={{
                amount: venue.planPriceTetri != null ? (venue.planPriceTetri / 100).toString() : "",
                paidOn: today,
                periodStart: period.start,
                periodEnd: period.end,
              }}
            />
          </div>

          <div>
            <h3 className="mb-3 text-lg font-semibold">{tSubs("history")}</h3>
            {payments.length === 0 ? <p className="text-sm text-muted">{tSubs("noPayments")}</p> : null}
            <ul className="flex flex-col gap-2">
              {payments.map((p) => (
                <li key={p.id} className="rounded-lg bg-blush px-4 py-3 text-sm shadow-card">
                  <p className="font-semibold">
                    {formatGel(p.amountTetri, locale)} · {formatDate(p.paidOn, locale)}
                  </p>
                  <p className="text-muted">
                    {formatDate(p.periodStart, locale)} – {formatDate(p.periodEnd, locale)}
                    {p.invoiceNo ? ` · ${tSubs("invoiceNo")} ${p.invoiceNo}` : ""}
                  </p>
                  {p.note ? <p className="mt-1">{p.note}</p> : null}
                  {p.recordedBy ? <p className="mt-1 text-xs text-muted">{tSubs("recordedBy", { name: p.recordedBy })}</p> : null}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>
    </section>
  );
}
