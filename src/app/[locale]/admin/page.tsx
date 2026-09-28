import { MessageCircle, Phone } from "lucide-react";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import type { ReactNode } from "react";
import { PageHeader, Panel, SectionTitle, StatCard, Trend } from "@/components/admin/ui";
import { SubscriptionBadge } from "@/components/admin/subscription-badge";
import { Notice } from "@/components/ui/notice";
import { getDb } from "@/db";
import { acceptanceRate, getMoney, getPipeline, getQuality, getTodo, type QualityIssue } from "@/db/queries/dashboard";
import { Link } from "@/i18n/navigation";
import { resolveLocale } from "@/i18n/locale";
import { formatDate, formatDateTime } from "@/lib/format-date";
import { formatGel } from "@/lib/money";
import { normalizePhone } from "@/lib/phone";
import { requireUser } from "@/lib/session";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Admin", robots: { index: false } };

function Card({ title, hint, href, viewAll, children }: { title: string; hint?: string; href?: string; viewAll?: string; children: ReactNode }) {
  return (
    <Panel className="flex flex-col">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <h3 className="font-semibold">{title}</h3>
          {hint ? <p className="text-xs text-muted">{hint}</p> : null}
        </div>
        {href && viewAll ? (
          <Link href={href} className="shrink-0 text-sm text-coral underline-offset-4 hover:underline">
            {viewAll}
          </Link>
        ) : null}
      </div>
      {children}
    </Panel>
  );
}

export default async function AdminHomePage({ params }: { params: Promise<{ locale: string }> }) {
  const locale = await resolveLocale(params);
  const me = await requireUser(locale, ["admin"]);
  const now = new Date();
  const [t, tNav, tLeads, tSubs, db] = await Promise.all([
    getTranslations("admin.home"),
    getTranslations("admin.nav"),
    getTranslations("admin.leads"),
    getTranslations("admin.subscriptions"),
    getDb(),
  ]);
  const [todo, pipeline, money, quality] = await Promise.all([
    getTodo(db, { userId: me.id, locale, now }),
    getPipeline(db, now),
    getMoney(db, { locale, now }),
    getQuality(db, locale),
  ]);

  const { current: cur, previous: prev } = pipeline;
  const rate = (r: number | null) => (r === null ? "—" : `${r}%`);
  const empty = <p className="text-sm text-muted">{t("allClear")}</p>;

  const issueList = (label: string, items: QualityIssue[], hrefFor: (id: string) => string) =>
    items.length === 0 ? null : (
      <div key={label}>
        <p className="text-sm font-semibold">
          {label} · {items.length}
        </p>
        <ul className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-sm">
          {items.slice(0, 6).map((i) => (
            <li key={i.id}>
              <Link href={hrefFor(i.id)} className="text-coral underline underline-offset-4">
                {i.name}
              </Link>
            </li>
          ))}
          {items.length > 6 ? <li className="text-muted">{t("more", { count: items.length - 6 })}</li> : null}
        </ul>
      </div>
    );
  const qualityIssues = [
    issueList(t("noEventTypes"), quality.noEventTypes, (id) => `/admin/halls/${id}`),
    issueList(t("noPhoto"), quality.noPhoto, (id) => `/admin/halls/${id}`),
    issueList(t("noAreas"), quality.noAreas, (id) => `/admin/halls/${id}`),
    issueList(t("unverifiedVenues"), quality.unverifiedVenues, (id) => `/admin/venues/${id}`),
  ].filter(Boolean);

  return (
    <section className="px-5 py-6 md:px-8 md:py-8">
      <PageHeader title={tNav("dashboard")} />

      {quality.failedNotifications > 0 ? (
        <Notice tone="error" className="mb-8">
          {t("failedNotifications", { count: quality.failedNotifications })}
        </Notice>
      ) : null}

      {/* 1. Numbers first, as in the reference: the last 7 days, each against the 7 before. */}
      <SectionTitle hint={t("pipelineHint")}>{t("pipelineTitle")}</SectionTitle>
      <div className="mb-8 grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">
        <StatCard label={t("requestsReceived")} value={cur.requestsCreated} trend={<Trend current={cur.requestsCreated} previous={prev.requestsCreated} />} />
        <StatCard label={t("accepted")} value={cur.accepted} trend={<Trend current={cur.accepted} previous={prev.accepted} />} />
        <StatCard
          label={`${t("declined")} / ${t("expired")}`}
          value={cur.declined + cur.expired}
          trend={<Trend current={cur.declined + cur.expired} previous={prev.declined + prev.expired} goodWhen="down" />}
        />
        <StatCard label={t("acceptanceRate")} value={rate(acceptanceRate(cur))} hint={t("previous", { value: rate(acceptanceRate(prev)) })} />
        <StatCard label={t("leadsNew")} value={cur.leadsNew} trend={<Trend current={cur.leadsNew} previous={prev.leadsNew} />} />
        <StatCard label={t("leadsWon")} value={cur.leadsWon} trend={<Trend current={cur.leadsWon} previous={prev.leadsWon} />} />
        <StatCard label={t("leadsLost")} value={cur.leadsLost} trend={<Trend current={cur.leadsLost} previous={prev.leadsLost} goodWhen="down" />} />
      </div>

      {/* 2. Money */}
      <SectionTitle>{t("moneyTitle")}</SectionTitle>
      <div className="mb-8 grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard label={t("activeSubscriptions")} value={money.activeSubscriptions} />
        <StatCard label={t("monthlyRecurring")} value={formatGel(money.monthlyRecurringTetri, locale)} />
        <StatCard label={t("collectedThisMonth")} value={formatGel(money.collectedThisMonthTetri, locale)} />
        <StatCard label={t("overdueSubscriptions")} value={money.overdue} />
      </div>

      {/* 3. To do today */}
      <SectionTitle>{t("todoTitle")}</SectionTitle>
      <div className="mb-8 grid gap-4 lg:grid-cols-2">
        <Card title={`${t("todoUnassigned")} · ${todo.unassignedLeadsTotal}`} href="/admin/leads?status=new&owner=unassigned" viewAll={t("viewAll")}>
          {todo.unassignedLeads.length === 0 ? empty : null}
          <ul className="flex flex-col gap-1.5 text-sm">
            {todo.unassignedLeads.map((l) => (
              <li key={l.id} className="flex justify-between gap-3">
                <Link href={`/admin/leads/${l.id}`} className="font-medium underline-offset-4 hover:underline">
                  {l.name}
                </Link>
                <span className="shrink-0 text-muted">
                  {tLeads(`kind_${l.kind}`)} · {formatDateTime(l.createdAt, locale)}
                </span>
              </li>
            ))}
          </ul>
        </Card>

        <Card title={t("todoFollowUps")} href="/admin/leads?owner=mine" viewAll={t("viewAll")}>
          {todo.followUps.length === 0 ? empty : null}
          <ul className="flex flex-col gap-1.5 text-sm">
            {todo.followUps.map((f) => (
              <li key={f.id} className="flex justify-between gap-3">
                <Link href={`/admin/leads/${f.id}`} className="font-medium underline-offset-4 hover:underline">
                  {f.name}
                </Link>
                <span className="shrink-0 text-muted">
                  {f.mine ? t("you") : (f.ownerName ?? tLeads("noOwner"))} · {t("due", { date: formatDate(f.followUpOn, locale) })}
                </span>
              </li>
            ))}
          </ul>
        </Card>

        <Card title={t("todoNudge")} hint={t("todoNudgeHint")} href="/admin/requests?status=pending" viewAll={t("viewAll")}>
          {todo.staleRequests.length === 0 ? empty : null}
          <ul className="flex flex-col gap-2 text-sm">
            {todo.staleRequests.map((r) => {
              const phone = r.venueWhatsapp ?? r.venuePhone;
              const wa = phone ? normalizePhone(phone) : null;
              return (
                <li key={r.id} className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
                  <span>
                    <Link href={`/admin/requests/${r.id}`} className="font-semibold underline underline-offset-4">
                      {r.reference}
                    </Link>{" "}
                    · {r.venueName} · {r.hallName}
                  </span>
                  <span className="flex shrink-0 items-center gap-3 text-muted">
                    {t("expires", { date: formatDateTime(r.expiresAt, locale) })}
                    {r.venuePhone ? (
                      <a href={`tel:${r.venuePhone}`} aria-label={tLeads("call")} className="text-coral">
                        <Phone aria-hidden className="size-4" />
                      </a>
                    ) : null}
                    {wa ? (
                      <a href={`https://wa.me/${wa.slice(1)}`} target="_blank" rel="noopener noreferrer" aria-label={tLeads("whatsapp")} className="text-coral">
                        <MessageCircle aria-hidden className="size-4" />
                      </a>
                    ) : null}
                  </span>
                </li>
              );
            })}
          </ul>
        </Card>

        <Card title={t("todoSubscriptions")} href="/admin/subscriptions" viewAll={t("viewAll")}>
          {todo.subscriptions.length === 0 ? empty : null}
          <ul className="flex flex-col gap-1.5 text-sm">
            {todo.subscriptions.slice(0, 8).map((s) => (
              <li key={s.venueId} className="flex items-center justify-between gap-3">
                <Link href={`/admin/venues/${s.venueId}#subscription`} className="font-medium underline-offset-4 hover:underline">
                  {s.venueName}
                </Link>
                <span className="flex shrink-0 items-center gap-2">
                  {s.subscriptionUntil ? <span className="text-muted">{formatDate(s.subscriptionUntil, locale)}</span> : null}
                  <SubscriptionBadge health={s.health} label={tSubs(`health_${s.health}`)} />
                </span>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      {/* 4. Listing quality */}
      <SectionTitle hint={t("qualityHint")}>{t("qualityTitle")}</SectionTitle>
      <Panel className="flex flex-col gap-4">{qualityIssues.length === 0 ? empty : qualityIssues}</Panel>
    </section>
  );
}
