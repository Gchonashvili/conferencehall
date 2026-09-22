import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

/** Small peach pill: capacity, indoor/outdoor, amenity tags. */
export function Chip({ className, ...props }: ComponentProps<"span">) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full bg-peach px-3 py-1 text-xs font-medium text-brown",
        className,
      )}
      {...props}
    />
  );
}
