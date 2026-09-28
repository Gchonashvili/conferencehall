import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { EmptyRow, FilterTabs, PageHeader, RowLink, StatusPill, Table, Td, Th, Tr, publishTone } from "@/components/admin/ui";
import { getDb } from "@/db";
import { listAllHalls } from "@/db/queries/admin";
import { resolveLocale } from "@/i18n/locale";
import { pickText } from "@/lib/i18n-text";
import { requireUser } from "@/lib/session";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Halls", robots: { index: false } };

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ status?: string }>;
};

export default async function AdminHallsPage({ params, searchParams }: Props) {
  const locale = await resolveLocale(params);
  await requireUser(locale, ["admin"]);
  const [t, db, sp] = await Promise.all([getTranslations("admin.halls"), getDb(), searchParams]);
  const status = sp.status === "draft" || sp.status === "published" ? sp.status : undefined;
  const halls = await listAllHalls(db, { status });

  return (
    <section className="px-5 py-6 md:px-8 md:py-8">
      <PageHeader title={t("title")} />

      <div className="mb-4">
        <FilterTabs
          label={t("title")}
          tabs={[
            { label: t("all"), href: "/admin/halls", active: !status },
            { label: t("draft"), href: "/admin/halls?status=draft", active: status === "draft" },
            { label: t("published"), href: "/admin/halls?status=published", active: status === "published" },
          ]}
        />
      </div>

      {halls.length === 0 ? (
        <EmptyRow>{t("empty")}</EmptyRow>
      ) : (
        <Table minWidth={560}>
          <thead>
            <tr>
              <Th>{t("name")}</Th>
              <Th>{t("venue")}</Th>
              <Th>{t("statusLabel")}</Th>
            </tr>
          </thead>
          <tbody>
            {halls.map((h) => (
              <Tr key={h.id}>
                <Td>
                  <RowLink href={`/admin/halls/${h.id}`}>{pickText(h.name, locale)}</RowLink>
                </Td>
                <Td className="text-muted">{pickText(h.venueName, locale)}</Td>
                <Td>
                  <span className="flex flex-wrap gap-1.5">
                    <StatusPill tone={publishTone(h.status)}>{t(h.status)}</StatusPill>
                    {h.featured ? <StatusPill tone="info">{t("featured")}</StatusPill> : null}
                  </span>
                </Td>
              </Tr>
            ))}
          </tbody>
        </Table>
      )}
    </section>
  );
}
