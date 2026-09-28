import { Search } from "lucide-react";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { EmptyRow, FilterTabs, PageHeader, RowLink, StatusPill, Table, Td, Th, Tr, leadTone } from "@/components/admin/ui";
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

  return (
    <section className="px-5 py-6 md:px-8 md:py-8">
      <PageHeader title={t("title")} />

      <div className="mb-4 flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
        {/* Stage tabs, with how many leads each holds under the current owner/search filters. */}
        <FilterTabs
          label={t("stage")}
          tabs={[
            { label: t("all"), href: href({ status: undefined }), active: !status, count: allCount },
            ...LEAD_STAGES.map((s) => ({ label: t(`stage_${s}`), href: href({ status: s }), active: status === s, count: counts[s] })),
          ]}
        />
        {/* Plain GET form: keeps the stage and owner filters, resets to page 1. */}
        <form action={`/${locale}/admin/leads`} method="get" role="search" className="relative w-full sm:w-72">
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
            className="w-full rounded-full border border-line bg-panel py-2 pr-10 pl-4 text-sm focus:border-brown focus:outline-none"
          />
          <button type="submit" aria-label={t("searchButton")} className="absolute inset-y-0 right-3 cursor-pointer text-muted hover:text-brown">
            <Search aria-hidden className="size-4" />
          </button>
        </form>
      </div>

      <div className="mb-4 flex flex-wrap gap-4 text-sm">
        {([undefined, "mine", "unassigned"] as const).map((o) => (
          <Link
            key={o ?? "everyone"}
            href={href({ owner: o })}
            aria-current={owner === o ? "true" : undefined}
            className={cn("underline-offset-4 hover:underline", owner === o ? "font-semibold text-coral underline" : "text-muted")}
          >
            {t(o ?? "everyone")}
          </Link>
        ))}
      </div>

      {result.items.length === 0 ? (
        <EmptyRow>{t("empty")}</EmptyRow>
      ) : (
        <Table minWidth={860}>
          <thead>
            <tr>
              <Th>{t("contact")}</Th>
              <Th>{t("stage")}</Th>
              <Th>{t("owner")}</Th>
              <Th>{t("followUp")}</Th>
              <Th>{t("received")}</Th>
            </tr>
          </thead>
          <tbody>
            {result.items.map((r) => {
              const overdue = !!r.followUpOn && r.followUpOn <= today && !CLOSED_STAGES.includes(r.status);
              const brief = [
                r.citySlug ? (cityName.get(r.citySlug) ?? r.citySlug) : null,
                r.eventType ? (eventTypeName.get(r.eventType) ?? r.eventType) : null,
                r.guests ? t("guests", { count: r.guests }) : null,
                r.eventDate ? formatDate(r.eventDate, locale) : null,
              ].filter(Boolean);
              return (
                <Tr key={r.id}>
                  <Td>
                    <div className="flex flex-wrap items-center gap-2">
                      <RowLink href={`/admin/leads/${r.id}`}>{r.name}</RowLink>
                      <StatusPill tone="neutral">{t(`kind_${r.kind}`)}</StatusPill>
                    </div>
                    <p className="mt-0.5 text-muted">
                      {r.email}
                      {r.phone ? ` · ${r.phone}` : ""}
                    </p>
                    {brief.length > 0 ? <p className="mt-0.5">{brief.join(" · ")}</p> : null}
                    {r.message ? <p className="mt-1 line-clamp-2 max-w-md text-muted">{r.message}</p> : null}
                  </Td>
                  <Td>
                    <StatusPill tone={leadTone(r.status)}>{t(`stage_${r.status}`)}</StatusPill>
                  </Td>
                  <Td className={cn(!r.ownerName && "text-muted")}>{r.ownerName ?? t("noOwner")}</Td>
                  <Td>
                    {r.followUpOn ? (
                      <span className={cn(overdue && "font-semibold text-danger")}>
                        {formatDate(r.followUpOn, locale)}
                        {overdue ? <StatusPill tone="danger" className="ml-2">{t("overdue")}</StatusPill> : null}
                      </span>
                    ) : (
                      <span className="text-muted">—</span>
                    )}
                  </Td>
                  <Td className="whitespace-nowrap text-muted">{formatDateTime(r.createdAt, locale)}</Td>
                </Tr>
              );
            })}
          </tbody>
        </Table>
      )}

      {result.pages > 1 ? (
        <nav aria-label={t("pageOf", { page: result.page, pages: result.pages })} className="mt-6 flex items-center gap-4 text-sm">
          {result.page > 1 ? (
            <Link href={href({ page: String(result.page - 1) })} className="text-coral underline underline-offset-4">
              ← {t("prev")}
            </Link>
          ) : null}
          <span className="text-muted">{t("pageOf", { page: result.page, pages: result.pages })}</span>
          {result.page < result.pages ? (
            <Link href={href({ page: String(result.page + 1) })} className="text-coral underline underline-offset-4">
              {t("next")} →
            </Link>
          ) : null}
        </nav>
      ) : null}
    </section>
  );
}
