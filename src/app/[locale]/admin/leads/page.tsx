import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { getDb } from "@/db";
import { listCities, listEventTypes } from "@/db/queries/halls";
import { countInquiriesByStage, listInquiries, type LeadFilters } from "@/db/queries/inquiries";
import { CLOSED_STAGES, LEAD_STAGES, type LeadStage } from "@/domain/crm-input";
import { Link } from "@/i18n/navigation";
import { resolveLocale } from "@/i18n/locale";
import { todayInTbilisi } from "@/lib/dates";
import { formatDate, formatDateTime } from "@/lib/format-date";
import { requireUser } from "@/lib/session";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Leads", robots: { index: false } };

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ status?: string; owner?: string; q?: string; page?: string }>;
};

export default async function AdminLeadsPage({ params, searchParams }: Props) {
  const locale = await resolveLocale(params);
  const me = await requireUser(locale, ["admin"]);
  const [t, db, sp] = await Promise.all([getTranslations("admin.leads"), getDb(), searchParams]);

  // Whitelist the URL filters; anything unexpected is ignored.
  const status = (LEAD_STAGES as readonly string[]).includes(sp.status ?? "") ? (sp.status as LeadStage) : undefined;
  const owner = sp.owner === "mine" || sp.owner === "unassigned" ? sp.owner : undefined;
  const q = sp.q?.trim().slice(0, 100) || undefined;
  const page = Number(sp.page) > 0 ? Math.floor(Number(sp.page)) : 1;
  const filters: LeadFilters = { status, owner, q, page, userId: me.id };

  const [result, counts, cities, eventTypes] = await Promise.all([
    listInquiries(db, filters),
    countInquiriesByStage(db, filters),
    listCities(db, locale),
    listEventTypes(db, locale),
  ]);
  const cityName = new Map(cities.map((c) => [c.slug, c.name]));
  const eventTypeName = new Map(eventTypes.map((e) => [e.slug, e.name]));
  const today = todayInTbilisi();

  /** This page's URL with some filters changed; changing a filter goes back to page 1. */
  const href = (change: Partial<Record<"status" | "owner" | "q" | "page", string | undefined>>) => {
    const next = new URLSearchParams();
    const merged = { status, owner, q, page: undefined as string | undefined, ...change };
    for (const [k, v] of Object.entries(merged)) if (v) next.set(k, v);
    const qs = next.toString();
    return qs ? `/admin/leads?${qs}` : "/admin/leads";
  };
  const allCount = Object.values(counts).reduce((a, b) => a + b, 0);
  const pill = (active: boolean) => cn("rounded-full px-4 py-1.5 text-sm", active ? "bg-coral-strong text-white" : "bg-peach");

  return (
    <section className="px-5 py-10 md:px-12">
      <h1 className="mb-6 text-3xl font-semibold md:text-4xl">{t("title")}</h1>

      {/* Stage tabs, with how many leads each holds under the current owner/search filters. */}
      <div className="mb-3 flex flex-wrap gap-2">
        <Link href={href({ status: undefined })} className={pill(!status)}>
          {t("all")} · {allCount}
        </Link>
        {LEAD_STAGES.map((s) => (
          <Link key={s} href={href({ status: s })} className={pill(status === s)}>
            {t(`stage_${s}`)} · {counts[s]}
          </Link>
        ))}
      </div>

      <div className="mb-6 flex flex-wrap items-center gap-x-6 gap-y-3">
        <div className="flex flex-wrap gap-2 text-sm">
          {([undefined, "mine", "unassigned"] as const).map((o) => (
            <Link
              key={o ?? "everyone"}
              href={href({ owner: o })}
              className={cn("underline-offset-4 hover:underline", owner === o ? "font-semibold underline" : "opacity-80")}
            >
              {t(o ?? "everyone")}
            </Link>
          ))}
        </div>
        {/* Plain GET form: keeps the stage and owner filters, resets to page 1. */}
        <form action={`/${locale}/admin/leads`} method="get" className="flex gap-2">
          {status ? <input type="hidden" name="status" value={status} /> : null}
          {owner ? <input type="hidden" name="owner" value={owner} /> : null}
          <label htmlFor="lead-search" className="sr-only">
            {t("search")}
          </label>
          <input
            id="lead-search"
            type="search"
            name="q"
            defaultValue={q}
            maxLength={100}
            placeholder={t("search")}
            className="w-64 max-w-full rounded-lg bg-field px-3 py-2 text-sm focus:outline-none"
          />
          <Button type="submit" variant="outline" size="sm">
            {t("searchButton")}
          </Button>
        </form>
      </div>

      {result.items.length === 0 ? <p>{t("empty")}</p> : null}
      <ul className="flex flex-col gap-3">
        {result.items.map((r) => {
          const overdue = !!r.followUpOn && r.followUpOn <= today && !CLOSED_STAGES.includes(r.status);
          const brief = [
            r.citySlug ? (cityName.get(r.citySlug) ?? r.citySlug) : null,
            r.eventType ? (eventTypeName.get(r.eventType) ?? r.eventType) : null,
            r.guests ? t("guests", { count: r.guests }) : null,
            r.eventDate ? formatDate(r.eventDate, locale) : null,
          ].filter(Boolean);
          return (
            <li key={r.id} className={cn("relative rounded-card bg-blush p-4 shadow-card", overdue && "ring-2 ring-coral-strong")}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <Link href={`/admin/leads/${r.id}`} className="font-semibold underline-offset-4 after:absolute after:inset-0 hover:underline">
                      {r.name}
                    </Link>
                    <Chip>{t(`kind_${r.kind}`)}</Chip>
                    <Chip>{t(`stage_${r.status}`)}</Chip>
                  </div>
                  <p className="mt-1 text-sm opacity-80">
                    {r.email}
                    {r.phone ? ` · ${r.phone}` : ""}
                  </p>
                  {brief.length > 0 ? <p className="mt-1 text-sm">{brief.join(" · ")}</p> : null}
                  {r.message ? <p className="mt-2 line-clamp-2 text-sm">{r.message}</p> : null}
                </div>
                <div className="shrink-0 text-right text-xs">
                  <p>
                    {t("owner")}: <span className="font-semibold">{r.ownerName ?? t("noOwner")}</span>
                  </p>
                  {r.followUpOn ? (
                    <p className={cn("mt-1", overdue && "font-semibold text-coral-strong")}>
                      {t("followUp")}: {formatDate(r.followUpOn, locale)}
                      {overdue ? ` · ${t("overdue")}` : ""}
                    </p>
                  ) : null}
                  <p className="mt-1 opacity-70">{formatDateTime(r.createdAt, locale)}</p>
                </div>
              </div>
            </li>
          );
        })}
      </ul>

      {result.pages > 1 ? (
        <nav aria-label={t("pageOf", { page: result.page, pages: result.pages })} className="mt-8 flex items-center gap-4 text-sm">
          {result.page > 1 ? (
            <Link href={href({ page: String(result.page - 1) })} className="underline underline-offset-4">
              ← {t("prev")}
            </Link>
          ) : null}
          <span>{t("pageOf", { page: result.page, pages: result.pages })}</span>
          {result.page < result.pages ? (
            <Link href={href({ page: String(result.page + 1) })} className="underline underline-offset-4">
              {t("next")} →
            </Link>
          ) : null}
        </nav>
      ) : null}
    </section>
  );
}
