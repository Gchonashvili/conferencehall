import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { markInquiryStatusAction } from "@/app/actions/admin";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { getDb } from "@/db";
import { listInquiries, type InquiryRow } from "@/db/queries/inquiries";
import { Link } from "@/i18n/navigation";
import { resolveLocale } from "@/i18n/locale";
import { formatDateTime } from "@/lib/format-date";
import { requireUser } from "@/lib/session";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Leads", robots: { index: false } };

const STATUSES = ["new", "handled"] as const;

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ status?: string }>;
};

export default async function AdminLeadsPage({ params, searchParams }: Props) {
  const locale = await resolveLocale(params);
  await requireUser(locale, ["admin"]);
  const [t, db, sp] = await Promise.all([getTranslations("admin.leads"), getDb(), searchParams]);
  const status = (STATUSES as readonly string[]).includes(sp.status ?? "") ? (sp.status as InquiryRow["status"]) : undefined;
  const rows = await listInquiries(db, { status });

  const tabs: { value?: InquiryRow["status"]; label: string }[] = [
    { value: undefined, label: t("all") },
    { value: "new", label: t("new") },
    { value: "handled", label: t("handled") },
  ];

  return (
    <section className="px-5 py-10 md:px-12">
      <h1 className="mb-6 text-3xl font-semibold md:text-4xl">{t("title")}</h1>

      <div className="mb-6 flex flex-wrap gap-2">
        {tabs.map((tab) => (
          <Link
            key={tab.label}
            href={tab.value ? `/admin/leads?status=${tab.value}` : "/admin/leads"}
            className={cn("rounded-full px-4 py-1.5 text-sm", status === tab.value ? "bg-coral-strong text-white" : "bg-peach")}
          >
            {tab.label}
          </Link>
        ))}
      </div>

      {rows.length === 0 ? <p>{t("empty")}</p> : null}
      <ul className="flex flex-col gap-3">
        {rows.map((r) => (
          <li key={r.id} className="rounded-card bg-blush p-4 shadow-card">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-semibold">{r.name}</p>
                  <Chip>{t(`kind_${r.kind}`)}</Chip>
                  <Chip>{t(r.status)}</Chip>
                </div>
                <p className="mt-1 text-sm opacity-80">
                  <a className="underline underline-offset-4" href={`mailto:${r.email}`}>{r.email}</a>
                  {r.phone ? (
                    <>
                      {" · "}
                      <a className="underline underline-offset-4" href={`tel:${r.phone}`}>{r.phone}</a>
                    </>
                  ) : null}
                </p>
                {r.message ? <p className="mt-2 text-sm">{r.message}</p> : null}
                <p className="mt-2 text-xs opacity-70">{formatDateTime(r.createdAt, locale)}</p>
              </div>
              <form action={markInquiryStatusAction}>
                <input type="hidden" name="locale" value={locale} />
                <input type="hidden" name="inquiryId" value={r.id} />
                <input type="hidden" name="status" value={r.status === "handled" ? "new" : "handled"} />
                <Button type="submit" variant="outline" size="sm">
                  {t(r.status === "handled" ? "markNew" : "markHandled")}
                </Button>
              </form>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
