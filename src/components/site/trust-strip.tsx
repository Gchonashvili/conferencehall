import { useTranslations } from "next-intl";
import type { ReactNode } from "react";

export type TrustStat = { value: ReactNode; label: string };

/**
 * Row of real numbers and promises under the hero. At launch only true
 * figures go here (hall count, cities); never invented review scores.
 */
export function TrustStrip({ stats }: { stats: TrustStat[] }) {
  const t = useTranslations("trust");
  return (
    <section aria-label={t("oneRequest")} className="rounded-card bg-blush px-6 py-6 shadow-card">
      <ul className="grid grid-cols-2 gap-6 md:grid-cols-4">
        {stats.map((s, i) => (
          <li key={i} className="text-center">
            <p className="text-3xl font-bold">{s.value}</p>
            <p className="mt-1 text-sm">{s.label}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
