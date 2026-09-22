"use client";

import { cn } from "@/lib/utils";

/** Round numbered pager: active page dark brown, others coral. */
export function PaginationDots({
  total,
  current,
  onChange,
  label,
}: {
  total: number;
  current: number;
  onChange?: (page: number) => void;
  label: string;
}) {
  return (
    <nav aria-label={label} className="flex justify-center gap-2">
      {Array.from({ length: total }, (_, i) => i + 1).map((page) => (
        <button
          key={page}
          type="button"
          aria-current={page === current ? "page" : undefined}
          onClick={() => onChange?.(page)}
          className={cn(
            "grid size-7 cursor-pointer place-items-center rounded-full text-xs font-semibold text-white",
            page === current ? "bg-brown" : "bg-coral-strong hover:bg-brown",
          )}
        >
          {page}
        </button>
      ))}
    </nav>
  );
}
