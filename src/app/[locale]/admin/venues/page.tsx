import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { EmptyRow, PageHeader, RowLink, StatusPill, Table, Td, Th, Tr, publishTone } from "@/components/admin/ui";
import { Button } from "@/components/ui/button";
import { getDb } from "@/db";
import { listAllVenues } from "@/db/queries/admin";
import { Link } from "@/i18n/navigation";
import { resolveLocale } from "@/i18n/locale";
import { pickText } from "@/lib/i18n-text";
import { requireUser } from "@/lib/session";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Venues", robots: { index: false } };

export default async function AdminVenuesPage({ params }: { params: Promise<{ locale: string }> }) {
  const locale = await resolveLocale(params);
  await requireUser(locale, ["admin"]);
  const [t, tForm, db] = await Promise.all([getTranslations("admin.venues"), getTranslations("admin.venueForm"), getDb()]);
  const venues = await listAllVenues(db);
  const statusLabel = { draft: tForm("statusDraft"), active: tForm("statusActive"), suspended: tForm("statusSuspended") };

  return (
    <section className="px-5 py-6 md:px-8 md:py-8">
      <PageHeader
        title={t("title")}
        actions={
          <Button asChild>
            <Link href="/admin/venues/new">{t("newVenue")}</Link>
          </Button>
        }
      />

      {venues.length === 0 ? (
        <EmptyRow>{t("empty")}</EmptyRow>
      ) : (
        <Table minWidth={640}>
          <thead>
            <tr>
              <Th>{t("name")}</Th>
              <Th>{t("city")}</Th>
              <Th>{t("halls")}</Th>
              <Th>{t("statusLabel")}</Th>
            </tr>
          </thead>
          <tbody>
            {venues.map((v) => (
              <Tr key={v.id}>
                <Td>
                  <RowLink href={`/admin/venues/${v.id}`}>{pickText(v.name, locale)}</RowLink>
                </Td>
                <Td className="text-muted">{v.citySlug}</Td>
                <Td>{v.hallCount}</Td>
                <Td>
                  <span className="flex flex-wrap gap-1.5">
                    <StatusPill tone={publishTone(v.status)}>{statusLabel[v.status]}</StatusPill>
                    <StatusPill tone={v.verified ? "ok" : "warn"}>{t(v.verified ? "verified" : "unverified")}</StatusPill>
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
