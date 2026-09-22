import Image from "next/image";
import type { ReactNode } from "react";
import { getStockPhoto } from "@/lib/stock-photos";
import { cn } from "@/lib/utils";

/**
 * Atmosphere photo for a slot (hero, banner, city or event-type tile), filling
 * its positioned parent. Renders `fallback` (the generated illustration) when
 * the slot has no prepared photo, so a missing file never breaks a page.
 *
 * Mood only: never use this for a hall. See lib/stock-photos.ts.
 */
export function StockImage({
  photoKey,
  sizes,
  priority,
  className,
  fallback,
}: {
  photoKey?: string;
  sizes: string;
  priority?: boolean;
  className?: string;
  fallback: ReactNode;
}) {
  const photo = getStockPhoto(photoKey);
  if (!photo) return <>{fallback}</>;

  return (
    <Image
      src={photo.src}
      alt="" // decorative: the words next to every photo carry the meaning
      fill
      sizes={sizes}
      priority={priority}
      placeholder="blur"
      blurDataURL={photo.blur}
      style={photo.position ? { objectPosition: photo.position } : undefined}
      className={cn("object-cover", className)}
    />
  );
}
