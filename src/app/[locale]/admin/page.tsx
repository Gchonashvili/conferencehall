import { AlertTriangle, MessageCircle, Phone } from "lucide-react";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import type { ReactNode } from "react";
import { SubscriptionBadge } from "@/components/admin/subscription-badge";
import { Button } from "@/components/ui/button";
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
    <div className="flex flex-col rounded-card bg-blush p-5 shadow-card">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <h3 className="font-semibold">{title}</h3>
          {hint ? <p className="text-xs opacity-70">{hint}</p> : null}
        </div>
        {href && viewAll ? (
          <Link href={href} className="shrink-0 text-sm text-coral underline-offset-4 hover:underline">
            {viewAll}
          </Link>
        ) : null}
      </div>
      {children}
    </div>
  );
}

function Stat({ value, label, sub }: { value: ReactNode; label: string; sub?: string }) {
  return (
    <div className="rounded-card bg-blush p-4 shadow-card">
      <p className="text-2xl font-bold">{value}</p>
      <p className="mt-1 text-sm">{label}</p>
      {sub ? <p className="mt-0.5 text-xs opacity-70">{sub}</p> : null}
    </div>
  );
}

export default async function AdminHomePage({ params }: { params: Promise<{ locale: string }> }) {
  const locale = await resolveLocale(params);
  const me = await requireUser(locale, ["admin"]);
  const now = new Date();
  const [t, tLeads, tSubs, db] = await Promise.all([
    getTranslations("admin.home"),
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
  const empty = <p className="text-sm opacity-70">{t("allClear")}</p>;

  const issueList = (label: string, items: QualityIssue[], hrefFor: (id: string) => string) =>
    items.length === 0 ? null : (
      <div key={label}>
        <p className="text-sm font-semibold">
          {label} · {items.length}
        </p>
        <ul className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-sm">
          {items.slice(0, 6).map((i) => (
            <li key={i.id}>
              <Link href={hrefFor(i.id)} className="underline underline-offset-4">
                {i.name}
              </Link>
            </li>
          ))}
          {items.length > 6 ? <li className="opacity-70">{t("more", { count: items.length - 6 })}</li> : null}
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
    <section className="px-5 py-10 md:px-12">
      <h1 className="mb-4 text-3xl font-semibold md:text-4xl">{t("title")}</h1>
      <nav aria-label={t("title")} className="mb-8 flex flex-wrap gap-3">
        <Button asChild size="sm">
          <Link href="/admin/leads">{t("viewLeads")}</Link>
        </Button>
        <Button asChild size="sm" variant="outline">
          <Link href="/admin/requests">{t("viewRequests")}</Link>
        </Button>
        <Button asChild size="sm" variant="outline">
          <Link href="/admin/subscriptions">{t("viewSubscriptions")}</Link>
        </Button>
        <Button asChild size="sm" variant="outline">
          <Link href="/admin/venues">{t("viewVenues")}</Link>
        </Button>
        <Button asChild size="sm" variant="outline">
          <Link href="/admin/halls">{t("viewHalls")}</Link>
        </Button>
      </nav>

      {quality.failedNotifications > 0 ? (
        <Notice tone="error" className="mb-8">
          <AlertTriangle aria-hidden className="mr-1 inline size-4" />
          {t("failedNotifications", { count: quality.failedNotifications })}
        </Notice>
      ) : null}

      {/* 1. To do today */}
      <h2 className="mb-3 text-xl font-semibold">{t("todoTitle")}</h2>
      <div className="mb-10 grid gap-4 md:grid-cols-2">
        <Card title={`${t("todoUnassigned")} · ${todo.unassignedLeadsTotal}`} href="/admin/leads?status=new&owner=unassigned" viewAll={t("viewAll")}>
          {todo.unassignedLeads.length === 0 ? empty : null}
          <ul className="flex flex-col gap-1.5 text-sm">
            {todo.unassignedLeads.map((l) => (
              <li key={l.id} className="flex justify-between gap-3">
                <Link href={`/admin/leads/${l.id}`} className="underline underline-offset-4">
                  {l.name}
                </Link>
                <span className="shrink-0 opacity-70">
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
                <Link href={`/admin/leads/${f.id}`} className="underline underline-offset-4">
                  {f.name}
                </Link>
                <span className="shrink-0 opacity-70">
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
                  <span className="flex shrink-0 items-center gap-3 opacity-80">
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
                <Link href={`/admin/venues/${s.venueId}#subscription`} className="underline underline-offset-4">
                  {s.venueName}
                </Link>
                <span className="flex shrink-0 items-center gap-2">
                  {s.subscriptionUntil ? <span className="opacity-70">{formatDate(s.subscriptionUntil, locale)}</span> : null}
                  <SubscriptionBadge health={s.health} label={tSubs(`health_${s.health}`)} />
                </span>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      {/* 2. Pipeline */}
      <h2 className="text-xl font-semibold">{t("pipelineTitle")}</h2>
      <p className="mb-3 text-sm opacity-70">{t("pipelineHint")}</p>
      <div className="mb-10 grid grid-cols-2 gap-4 md:grid-cols-4">
        <Stat value={cur.requestsCreated} label={t("requestsReceived")} sub={t("previous", { value: prev.requestsCreated })} />
        <Stat value={cur.accepted} label={t("accepted")} sub={t("previous", { value: prev.accepted })} />
        <Stat value={cur.declined + cur.expired} label={`${t("declined")} / ${t("expired")}`} sub={t("previous", { value: prev.declined + prev.expired })} />
        <Stat value={rate(acceptanceRate(cur))} label={t("acceptanceRate")} sub={t("previous", { value: rate(acceptanceRate(prev)) })} />
        <Stat value={cur.leadsNew} label={t("leadsNew")} sub={t("previous", { value: prev.leadsNew })} />
        <Stat value={cur.leadsWon} label={t("leadsWon")} sub={t("previous", { value: prev.leadsWon })} />
        <Stat value={cur.leadsLost} label={t("leadsLost")} sub={t("previous", { value: prev.leadsLost })} />
      </div>

      {/* 3. Money */}
      <h2 className="mb-3 text-xl font-semibold">{t("moneyTitle")}</h2>
      <div className="mb-10 grid grid-cols-2 gap-4 md:grid-cols-4">
        <Stat value={money.activeSubscriptions} label={t("activeSubscriptions")} />
        <Stat value={formatGel(money.monthlyRecurringTetri, locale)} label={t("monthlyRecurring")} />
        <Stat value={formatGel(money.collectedThisMonthTetri, locale)} label={t("collectedThisMonth")} />
        <Stat value={money.overdue} label={t("overdueSubscriptions")} />
      </div>

      {/* 4. Listing quality */}
      <h2 className="text-xl font-semibold">{t("qualityTitle")}</h2>
      <p className="mb-3 text-sm opacity-70">{t("qualityHint")}</p>
      <div className="flex flex-col gap-4 rounded-card bg-blush p-5 shadow-card">{qualityIssues.length === 0 ? empty : qualityIssues}</div>
    </section>
  );
}
