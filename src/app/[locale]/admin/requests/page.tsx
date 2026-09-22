import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Chip } from "@/components/ui/chip";
import { getDb } from "@/db";
import { listAllRequestsForAdmin, type RequestRow } from "@/db/queries/requests";
import { Link } from "@/i18n/navigation";
import { resolveLocale } from "@/i18n/locale";
import { formatDate } from "@/lib/format-date";
import { requireUser } from "@/lib/session";
import { cn } from "@/lib/utils";

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

  const tabs: { value?: RequestRow["status"]; label: string }[] = [
    { value: undefined, label: t("all") },
    ...STATUSES.map((s) => ({ value: s, label: tRes(`status.${s}`) })),
  ];

  return (
    <section className="px-5 py-10 md:px-12">
      <h1 className="mb-6 text-3xl font-semibold md:text-4xl">{t("title")}</h1>

      <div className="mb-6 flex flex-wrap gap-2">
        {tabs.map((tab) => (
          <Link
            key={tab.label}
            href={tab.value ? `/admin/requests?status=${tab.value}` : "/admin/requests"}
            className={cn("rounded-full px-4 py-1.5 text-sm", status === tab.value ? "bg-coral-strong text-white" : "bg-peach")}
          >
            {tab.label}
          </Link>
        ))}
      </div>

      {rows.length === 0 ? <p>{t("empty")}</p> : null}
      <ul className="flex flex-col gap-3">
        {rows.map((r) => (
          <li key={r.id}>
            <Link href={`/admin/requests/${r.id}`} className="flex flex-wrap items-center justify-between gap-2 rounded-card bg-blush p-4 shadow-card transition-shadow hover:shadow-lg">
              <div>
                <p className="font-semibold">
                  {r.hallName} · {r.reference}
                </p>
                <p className="text-sm opacity-80">
                  {r.venueName} · {formatDate(r.eventDate, locale)} · {t("guests", { count: r.guests })} · {r.contactName}
                </p>
              </div>
              <Chip>{tRes(`status.${r.status}`)}</Chip>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
