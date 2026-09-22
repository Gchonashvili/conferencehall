import { useTranslations } from "next-intl";

export type AreaRow = {
  id: string;
  name: string;
  capacity: { theatre?: number; classroom?: number; banquet?: number; reception?: number };
};

const LAYOUT_KEYS = ["theatre", "classroom", "banquet", "reception"] as const;

/**
 * "Areas available" list from the reference hall page. Instead of a single
 * seating figure per area, each row lists capacity per layout, which is what
 * conference organizers compare.
 */
export function AreasTable({ areas }: { areas: AreaRow[] }) {
  const t = useTranslations("hall");
  const tLayouts = useTranslations("layouts");

  return (
    <section aria-labelledby="areas-title">
      <h2 id="areas-title" className="mb-4 text-xl font-semibold">
        {t("areasAvailable")}
      </h2>
      <ul className="divide-y divide-peach rounded-card bg-blush px-5 py-2 shadow-card">
        {areas.map((a) => (
          <li key={a.id} className="grid gap-2 py-4 md:grid-cols-[1fr_auto] md:items-center">
            <span className="font-semibold">{a.name}</span>
            <dl className="flex flex-wrap gap-x-5 gap-y-1 text-sm">
              {LAYOUT_KEYS.filter((k) => a.capacity[k] != null).map((k) => (
                <div key={k} className="flex gap-1.5">
                  <dt>{tLayouts(k)}</dt>
                  <dd className="font-bold">{a.capacity[k]}</dd>
                </div>
              ))}
            </dl>
          </li>
        ))}
      </ul>
    </section>
  );
}
