"use client";

import { DayPicker } from "react-day-picker";
import { enGB, ka } from "react-day-picker/locale";
import { useLocale } from "next-intl";
import { ChevronLeft, ChevronRight } from "lucide-react";

const localeMap = { en: enGB, ka } as const;

/**
 * Month calendar for the request-to-book sidebar. Selected day is a dark
 * brown circle, as in the reference. Weeks start on Monday and past days
 * are disabled.
 */
export function Calendar({
  selected,
  onSelect,
  name,
}: {
  selected?: Date;
  onSelect?: (date: Date | undefined) => void;
  /** Adds a hidden ISO date input so the value posts with the form. */
  name?: string;
}) {
  const locale = useLocale() as keyof typeof localeMap;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return (
    <div>
      <DayPicker
        mode="single"
        selected={selected}
        onSelect={onSelect}
        locale={localeMap[locale] ?? enGB}
        weekStartsOn={1}
        startMonth={today}
        disabled={{ before: today }}
        showOutsideDays={false}
        components={{
          Chevron: ({ orientation }) =>
            orientation === "left" ? (
              <ChevronLeft aria-hidden className="size-4" />
            ) : (
              <ChevronRight aria-hidden className="size-4" />
            ),
        }}
        classNames={{
          root: "w-full",
          months: "relative",
          month_caption: "flex h-9 items-center justify-center",
          caption_label: "text-sm font-semibold",
          nav: "absolute inset-x-0 top-0 flex h-9 items-center justify-between",
          button_previous:
            "grid size-8 cursor-pointer place-items-center rounded-full hover:bg-peach/60 disabled:opacity-30",
          button_next:
            "grid size-8 cursor-pointer place-items-center rounded-full hover:bg-peach/60 disabled:opacity-30",
          month_grid: "w-full border-collapse",
          weekday: "pb-1 text-center text-xs font-semibold opacity-80",
          day: "p-0.5 text-center",
          day_button:
            "mx-auto grid size-9 cursor-pointer place-items-center rounded-full text-sm hover:bg-peach/70",
          selected: "[&>button]:bg-brown [&>button]:text-white [&>button]:hover:bg-brown",
          today: "[&>button]:font-bold [&>button]:ring-1 [&>button]:ring-coral-strong",
          disabled: "[&>button]:cursor-not-allowed [&>button]:opacity-35 [&>button]:hover:bg-transparent",
        }}
      />
      {name ? (
        <input
          type="hidden"
          name={name}
          value={selected ? selected.toISOString().slice(0, 10) : ""}
        />
      ) : null}
    </div>
  );
}
