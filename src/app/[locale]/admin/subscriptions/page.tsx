import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { SubscriptionBadge } from "@/components/admin/subscription-badge";
import { Chip } from "@/components/ui/chip";
import { getDb } from "@/db";
import { listSubscriptions } from "@/db/queries/subscriptions";
import { subscriptionHealth, type SubscriptionHealth } from "@/domain/subscriptions";
import { Link } from "@/i18n/navigation";
import { resolveLocale } from "@/i18n/locale";
import { todayInTbilisi } from "@/lib/dates";
import { formatDate } from "@/lib/format-date";
import { formatGel } from "@/lib/money";
import { requireUser } from "@/lib/session";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Subscriptions", robots: { index: false } };

const FILTERS = ["expiring", "overdue", "none"] as const;

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ show?: string }>;
};

export default async function AdminSubscriptionsPage({ params, searchParams }: Props) {
  const locale = await resolveLocale(params);
  await requireUser(locale, ["admin"]);
  const [t, tVenues, db, sp] = await Promise.all([
    getTranslations("admin.subscriptions"),
    getTranslations("admin.venueForm"),
    getDb(),
    searchParams,
  ]);
  const show = (FILTERS as readonly string[]).includes(sp.show ?? "") ? (sp.show as (typeof FILTERS)[number]) : undefined;

  const today = todayInTbilisi();
  const all = (await listSubscriptions(db, locale)).map((r) => ({ ...r, health: subscriptionHealth(r, today) }));
  const count = (h: SubscriptionHealth) => all.filter((r) => r.health === h).length;
  const rows = show ? all.filter((r) => r.health === show) : all;

  const venueStatus = { draft: tVenues("statusDraft"), active: tVenues("statusActive"), suspended: tVenues("statusSuspended") };
  const pill = (active: boolean) => cn("rounded-full px-4 py-1.5 text-sm", active ? "bg-coral-strong text-white" : "bg-peach");

  return (
    <section className="px-5 py-10 md:px-12">
      <Link href="/admin" className="text-sm underline underline-offset-4">
        ← {t("back")}
      </Link>
      <h1 className="mt-4 mb-2 text-3xl font-semibold md:text-4xl">{t("title")}</h1>
      <p className="mb-6 max-w-2xl text-sm opacity-80">{t("intro")}</p>

      <div className="mb-6 flex flex-wrap gap-2">
        <Link href="/admin/subscriptions" className={pill(!show)}>
          {t("all")} · {all.length}
        </Link>
        {FILTERS.map((f) => (
          <Link key={f} href={`/admin/subscriptions?show=${f}`} className={pill(show === f)}>
            {t(`health_${f}`)} · {count(f)}
          </Link>
        ))}
      </div>

      {rows.length === 0 ? <p>{t("empty")}</p> : null}
      {rows.length > 0 ? (
        <div className="overflow-x-auto rounded-card bg-blush shadow-card">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead>
              <tr className="border-b border-peach">
                <th className="p-3 font-semibold">{t("venue")}</th>
                <th className="p-3 font-semibold">{t("plan")}</th>
                <th className="p-3 font-semibold">{t("paidUntil")}</th>
                <th className="p-3 font-semibold">{t("status")}</th>
                <th className="p-3 font-semibold">{t("lastPayment")}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.venueId} className="border-b border-peach last:border-0">
                  <td className="p-3">
                    <Link href={`/admin/venues/${r.venueId}#subscription`} className="font-semibold underline-offset-4 hover:underline">
                      {r.venueName}
                    </Link>
                    {r.venueStatus !== "active" ? <Chip className="ml-2">{venueStatus[r.venueStatus]}</Chip> : null}
                  </td>
                  <td className="p-3">
                    {r.plan ? t(`plan_${r.plan}`) : "—"}
                    {r.planPriceTetri != null ? ` · ${formatGel(r.planPriceTetri, locale)}` : ""}
                  </td>
                  <td className="p-3">{r.subscriptionUntil ? formatDate(r.subscriptionUntil, locale) : "—"}</td>
                  <td className="p-3">
                    <SubscriptionBadge health={r.health} label={t(`health_${r.health}`)} />
                  </td>
                  <td className="p-3">
                    {r.lastPaidOn ? `${formatDate(r.lastPaidOn, locale)}${r.lastAmountTetri != null ? ` · ${formatGel(r.lastAmountTetri, locale)}` : ""}` : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </section>
  );
}
