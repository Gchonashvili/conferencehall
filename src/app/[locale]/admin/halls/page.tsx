import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Chip } from "@/components/ui/chip";
import { getDb } from "@/db";
import { listAllHalls } from "@/db/queries/admin";
import { Link } from "@/i18n/navigation";
import { resolveLocale } from "@/i18n/locale";
import { pickText } from "@/lib/i18n-text";
import { requireUser } from "@/lib/session";
import { cn } from "@/lib/utils";

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

  const tabs: { value?: string; label: string }[] = [
    { value: undefined, label: t("all") },
    { value: "draft", label: t("draft") },
    { value: "published", label: t("published") },
  ];

  return (
    <section className="px-5 py-10 md:px-12">
      <h1 className="mb-6 text-3xl font-semibold md:text-4xl">{t("title")}</h1>

      <div className="mb-6 flex gap-2">
        {tabs.map((tab) => (
          <Link
            key={tab.label}
            href={tab.value ? `/admin/halls?status=${tab.value}` : "/admin/halls"}
            className={cn("rounded-full px-4 py-1.5 text-sm", status === tab.value ? "bg-coral-strong text-white" : "bg-peach")}
          >
            {tab.label}
          </Link>
        ))}
      </div>

      {halls.length === 0 ? <p>{t("empty")}</p> : null}
      <ul className="flex flex-col gap-3">
        {halls.map((h) => (
          <li key={h.id}>
            <Link href={`/admin/halls/${h.id}`} className="flex flex-wrap items-center justify-between gap-2 rounded-card bg-blush p-4 shadow-card transition-shadow hover:shadow-lg">
              <div>
                <p className="font-semibold">{pickText(h.name, locale)}</p>
                <p className="text-sm opacity-80">{pickText(h.venueName, locale)}</p>
              </div>
              <div className="flex gap-2">
                <Chip>{t(h.status)}</Chip>
                {h.featured ? <Chip>{t("featured")}</Chip> : null}
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
