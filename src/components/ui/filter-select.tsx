"use client";

import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export type FilterOption = { value: string; label: string };

/**
 * One dropdown in the filter bar ("City v", "Guests v").
 *
 * A native <select>, deliberately: it always closes on an outside tap or
 * Escape (a custom listbox trapped users until they picked something), opens
 * the phone's own picker on mobile, and works inside a plain GET form without
 * JavaScript. The first option is the label itself with an empty value, so a
 * filter can always be cleared again.
 */
export function FilterSelect({
  label,
  options,
  value,
  onValueChange,
  name,
  className,
}: {
  label: string;
  options: FilterOption[];
  value?: string;
  onValueChange?: (value: string) => void;
  name?: string;
  className?: string;
}) {
  const controlled = value !== undefined;
  return (
    <div
      className={cn(
        "relative flex min-w-0 items-center rounded-lg text-sm font-semibold text-brown hover:bg-peach/60 focus-within:bg-peach/60",
        className,
      )}
    >
      <select
        aria-label={label}
        name={name}
        {...(controlled
          ? { value, onChange: (e) => onValueChange?.(e.target.value) }
          : { defaultValue: "" })}
        className="w-full min-w-0 cursor-pointer appearance-none truncate bg-transparent py-2 pr-8 pl-3 font-semibold text-brown focus:outline-none"
      >
        <option value="">{label}</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <ChevronDown aria-hidden className="pointer-events-none absolute right-3 size-4 shrink-0" />
    </div>
  );
}
