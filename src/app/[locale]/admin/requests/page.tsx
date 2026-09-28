import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { EmptyRow, FilterTabs, PageHeader, RowLink, StatusPill, Table, Td, Th, Tr, requestTone } from "@/components/admin/ui";
import { getDb } from "@/db";
import { listAllRequestsForAdmin, type RequestRow } from "@/db/queries/requests";
import { resolveLocale } from "@/i18n/locale";
import { formatDate } from "@/lib/format-date";
import { requireUser } from "@/lib/session";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Requests", robots: { index: false } };

const STATUSES = ["pending", "accepted", "paid", "completed", "declined", "expired", "cancelled"] as const;

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ status?: string }>;
};

export default async function AdminRequestsPage({ params, searchParams }: Props) {
  const locale = await resolveLocale(params);
  await requireUser(locale, ["admin"]);
  const [t, tRes, db, sp] = await Promise.all([
    getTranslations("admin.requests"),
    getTranslations("reservations"),
    getDb(),
    searchParams,
  ]);
  const status = (STATUSES as readonly string[]).includes(sp.status ?? "") ? (sp.status as RequestRow["status"]) : undefined;
  const rows = await listAllRequestsForAdmin(db, locale, { status });

  return (
    <section className="px-5 py-6 md:px-8 md:py-8">
      <PageHeader title={t("title")} />

      <div className="mb-4">
        <FilterTabs
          label={t("title")}
          tabs={[
            { label: t("all"), href: "/admin/requests", active: !status },
            ...STATUSES.map((s) => ({ label: tRes(`status.${s}`), href: `/admin/requests?status=${s}`, active: status === s })),
          ]}
        />
      </div>

      {rows.length === 0 ? (
        <EmptyRow>{t("empty")}</EmptyRow>
      ) : (
        <Table minWidth={820}>
          <thead>
            <tr>
              <Th>{t("reference")}</Th>
              <Th>{t("hall")}</Th>
              <Th>{t("eventDate")}</Th>
              <Th>{t("contact")}</Th>
              <Th>{t("statusLabel")}</Th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <Tr key={r.id}>
                <Td>
                  <RowLink href={`/admin/requests/${r.id}`}>{r.reference}</RowLink>
                </Td>
                <Td>
                  <p className="font-medium">{r.hallName}</p>
                  <p className="text-muted">{r.venueName}</p>
                </Td>
                <Td className="whitespace-nowrap">
                  {formatDate(r.eventDate, locale)}
                  <p className="text-muted">{t("guests", { count: r.guests })}</p>
                </Td>
                <Td>{r.contactName}</Td>
                <Td>
                  <StatusPill tone={requestTone(r.status)}>{tRes(`status.${r.status}`)}</StatusPill>
                </Td>
              </Tr>
            ))}
          </tbody>
        </Table>
      )}
    </section>
  );
}
