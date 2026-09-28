import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

const ITEM_WIDTH = {
  /** Browse tiles and small cards: the next one peeks in from the right. */
  sm: "[&>li]:w-[70%] sm:[&>li]:w-[45%]",
  /** Hall cards: wider, since they carry price and chips. */
  lg: "[&>li]:w-[84%] sm:[&>li]:w-[55%]",
} as const;

/**
 * A list of cards that is a swipeable horizontal row on phones (so the
 * homepage isn't an endless stack of full-width tiles) and a normal grid
 * from `md` up. Pure CSS, no JavaScript. Pass the desktop grid columns in
 * `className`, e.g. `md:grid-cols-3`; children must be `<li>` elements.
 */
export function ScrollRow({
  children,
  size = "sm",
  className,
}: {
  children: ReactNode;
  size?: keyof typeof ITEM_WIDTH;
  className?: string;
}) {
  return (
    <ul
      className={cn(
        // Bleed to the screen edges so a card can scroll fully out of view,
        // while the first card still lines up with the page gutter.
        "no-scrollbar -mx-5 flex snap-x snap-mandatory scroll-px-5 gap-3 overflow-x-auto px-5 pb-2",
        "[&>li]:shrink-0 [&>li]:snap-start",
        ITEM_WIDTH[size],
        "md:mx-0 md:grid md:snap-none md:gap-6 md:overflow-visible md:px-0 md:pb-0 md:[&>li]:w-auto",
        className,
      )}
    >
      {children}
    </ul>
  );
}
