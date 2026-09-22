"use client";

import { Check, ChevronDown } from "lucide-react";
import { Select } from "radix-ui";
import { cn } from "@/lib/utils";

export type FilterOption = { value: string; label: string };

/**
 * One dropdown inside the peach filter bar ("No Of Guests v", "Venue Type v"
 * in the reference). Radix Select gives keyboard and screen-reader support.
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
  return (
    <Select.Root value={value} onValueChange={onValueChange} name={name}>
      <Select.Trigger
        aria-label={label}
        className={cn(
          "flex min-w-0 cursor-pointer items-center justify-between gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-brown hover:bg-peach/60 data-[state=open]:bg-peach/60",
          className,
        )}
      >
        <span className="truncate">
          <Select.Value placeholder={label} />
        </span>
        <Select.Icon>
          <ChevronDown aria-hidden className="size-4 shrink-0" />
        </Select.Icon>
      </Select.Trigger>
      <Select.Portal>
        <Select.Content
          position="popper"
          sideOffset={6}
          className="z-50 min-w-(--radix-select-trigger-width) overflow-hidden rounded-xl border border-peach bg-panel p-1 shadow-card"
        >
          <Select.Viewport>
            {options.map((o) => (
              <Select.Item
                key={o.value}
                value={o.value}
                className="relative flex cursor-pointer items-center rounded-lg py-2 pr-3 pl-8 text-sm text-brown outline-none data-[highlighted]:bg-blush data-[state=checked]:font-semibold"
              >
                <Select.ItemIndicator className="absolute left-2.5">
                  <Check aria-hidden className="size-4 text-coral-strong" />
                </Select.ItemIndicator>
                <Select.ItemText>{o.label}</Select.ItemText>
              </Select.Item>
            ))}
          </Select.Viewport>
        </Select.Content>
      </Select.Portal>
    </Select.Root>
  );
}
