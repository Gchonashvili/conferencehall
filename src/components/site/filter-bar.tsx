"use client";

import type { ReactNode } from "react";
import { FilterSelect, type FilterOption } from "@/components/ui/filter-select";
import { cn } from "@/lib/utils";

export type FilterDef = { id: string; label: string; options: FilterOption[] };

export const ANY_VALUE = "__any";

/**
 * The peach pill filter bar under the hero ("No Of Guests, Price Per Hour,
 * Venue Type ..." in the reference). Also the base of the hero search.
 *
 * Two modes:
 * - Form mode (default): each dropdown has a `name`, so the bar works inside
 *   a plain GET <form>, even without JavaScript.
 * - Controlled mode (`values` + `onValueChange`): used by the results page to
 *   keep the URL in sync. Passing `anyLabel` adds an "Any" option to clear a filter.
 */
export function FilterBar({
  filters,
  action,
  boxed = false,
  values,
  onValueChange,
  anyLabel,
  className,
}: {
  filters: FilterDef[];
  action?: ReactNode;
  /** Give each dropdown a visible box (used in the hero search). */
  boxed?: boolean;
  values?: Record<string, string | undefined>;
  onValueChange?: (id: string, value: string | undefined) => void;
  anyLabel?: string;
  className?: string;
}) {
  const controlled = values !== undefined;
  return (
    <div
      className={cn(
        "flex flex-col gap-1.5 rounded-2xl bg-peach p-2 md:flex-row md:items-center md:gap-2",
        className,
      )}
    >
      {filters.map((f) => (
        <FilterSelect
          key={f.id}
          name={f.id}
          label={f.label}
          options={anyLabel ? [{ value: ANY_VALUE, label: anyLabel }, ...f.options] : f.options}
          {...(controlled
            ? {
                value: values[f.id] ?? "",
                onValueChange: (v: string) => onValueChange?.(f.id, v === ANY_VALUE ? undefined : v),
              }
            : {})}
          className={cn("md:flex-1", boxed && "bg-blush hover:bg-panel")}
        />
      ))}
      {action}
    </div>
  );
}
