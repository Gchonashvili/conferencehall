import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { SubscriptionBadge } from "@/components/admin/subscription-badge";
import { EmptyRow, FilterTabs, PageHeader, RowLink, StatusPill, Table, Td, Th, Tr, publishTone } from "@/components/admin/ui";
import { getDb } from "@/db";
import { listSubscriptions } from "@/db/queries/subscriptions";
import { subscriptionHealth, type SubscriptionHealth } from "@/domain/subscriptions";
import { resolveLocale } from "@/i18n/locale";
import { todayInTbilisi } from "@/lib/dates";
import { formatDate } from "@/lib/format-date";
import { formatGel } from "@/lib/money";
import { requireUser } from "@/lib/session";

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

  return (
    <section className="px-5 py-6 md:px-8 md:py-8">
      <PageHeader title={t("title")} subtitle={t("intro")} />

      <div className="mb-4">
        <FilterTabs
          label={t("title")}
          tabs={[
            { label: t("all"), href: "/admin/subscriptions", active: !show, count: all.length },
            ...FILTERS.map((f) => ({ label: t(`health_${f}`), href: `/admin/subscriptions?show=${f}`, active: show === f, count: count(f) })),
          ]}
        />
      </div>

      {rows.length === 0 ? (
        <EmptyRow>{t("empty")}</EmptyRow>
      ) : (
        <Table minWidth={720}>
          <thead>
            <tr>
              <Th>{t("venue")}</Th>
              <Th>{t("plan")}</Th>
              <Th>{t("paidUntil")}</Th>
              <Th>{t("status")}</Th>
              <Th>{t("lastPayment")}</Th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <Tr key={r.venueId}>
                <Td>
                  <RowLink href={`/admin/venues/${r.venueId}#subscription`}>{r.venueName}</RowLink>
                  {r.venueStatus !== "active" ? <StatusPill tone={publishTone(r.venueStatus)} className="ml-2">{venueStatus[r.venueStatus]}</StatusPill> : null}
                </Td>
                <Td>
                  {r.plan ? t(`plan_${r.plan}`) : "—"}
                  {r.planPriceTetri != null ? <span className="text-muted">{` · ${formatGel(r.planPriceTetri, locale)}`}</span> : null}
                </Td>
                <Td>{r.subscriptionUntil ? formatDate(r.subscriptionUntil, locale) : "—"}</Td>
                <Td>
                  <SubscriptionBadge health={r.health} label={t(`health_${r.health}`)} />
                </Td>
                <Td className="text-muted">
                  {r.lastPaidOn ? `${formatDate(r.lastPaidOn, locale)}${r.lastAmountTetri != null ? ` · ${formatGel(r.lastAmountTetri, locale)}` : ""}` : "—"}
                </Td>
              </Tr>
            ))}
          </tbody>
        </Table>
      )}
    </section>
  );
}
