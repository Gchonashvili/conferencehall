"use client";

import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { usePathname, useRouter } from "@/i18n/navigation";
import { PaginationDots } from "@/components/ui/pagination-dots";
import { FilterBar, type FilterDef } from "./filter-bar";

/** Results-page filter bar that keeps the URL (and so the results) in sync. */
export function ListingFilters({ filters }: { filters: FilterDef[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  const values = Object.fromEntries(filters.map((f) => [f.id, params.get(f.id) ?? undefined]));

  function update(id: string, value: string | undefined) {
    const next = new URLSearchParams(params.toString());
    if (value) next.set(id, value);
    else next.delete(id);
    next.delete("page"); // a new filter always starts from page 1
    // The hero form submits empty fields; keep the URL clean.
    for (const [k, v] of [...next.entries()]) if (v === "") next.delete(k);
    const qs = next.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }

  // On phones the filter pills stick to the top while the results scroll under them.
  return (
    <div className="sticky top-0 z-30 -mx-5 border-b border-peach bg-page px-5 py-2 md:static md:mx-0 md:border-0 md:bg-transparent md:p-0">
      <FilterBar filters={filters} values={values} onValueChange={update} />
    </div>
  );
}

export function ListingPager({ pages, current }: { pages: number; current: number }) {
  const t = useTranslations("search");
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  if (pages <= 1) return null;

  return (
    <PaginationDots
      total={pages}
      current={current}
      label={t("pageLabel")}
      onChange={(page) => {
        const next = new URLSearchParams(params.toString());
        if (page > 1) next.set("page", String(page));
        else next.delete("page");
        const qs = next.toString();
        router.push(qs ? `${pathname}?${qs}` : pathname);
      }}
    />
  );
}
