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
 *   keep the URL in sync. Choosing the label option again clears a filter.
 *
 * On phones the two uses look different: the hero search (`boxed`) is a
 * compact two-column card, and the results bar is one swipeable row of pills,
 * so neither pushes the content below it off the first screen.
 */
export function FilterBar({
  filters,
  action,
  boxed = false,
  values,
  onValueChange,
  className,
}: {
  filters: FilterDef[];
  action?: ReactNode;
  /** Give each dropdown a visible box (used in the hero search). */
  boxed?: boolean;
  values?: Record<string, string | undefined>;
  onValueChange?: (id: string, value: string | undefined) => void;
  className?: string;
}) {
  const controlled = values !== undefined;
  return (
    <div
      className={cn(
        "md:flex md:flex-row md:items-center md:gap-2 md:rounded-2xl md:bg-peach md:p-2",
        boxed
          ? "grid grid-cols-2 gap-2 rounded-2xl bg-peach p-3 shadow-card"
          : "no-scrollbar flex gap-2 overflow-x-auto",
        className,
      )}
    >
      {filters.map((f, i) => (
        <FilterSelect
          key={f.id}
          name={f.id}
          label={f.label}
          // The select's own first option (the label, empty value) clears a
          // filter, so no separate "Any" entry is needed.
          options={f.options}
          {...(controlled
            ? {
                value: values[f.id] ?? "",
                onValueChange: (v: string) => onValueChange?.(f.id, v === "" || v === ANY_VALUE ? undefined : v),
              }
            : {})}
          className={cn(
            "md:flex-1",
            boxed
              ? cn("bg-blush hover:bg-panel [&_select]:py-3 md:[&_select]:py-2", i === 0 && "col-span-2")
              : "shrink-0 rounded-full border border-peach bg-panel md:shrink md:rounded-lg md:border-0 md:bg-transparent",
          )}
        />
      ))}
      {action ? <div className={cn("md:contents", boxed && "col-span-2 [&>*]:w-full md:[&>*]:w-auto")}>{action}</div> : null}
    </div>
  );
}
