import { PlaceholderArt } from "@/components/ui/placeholder-art";
import { Link } from "@/i18n/navigation";
import { StockImage } from "./stock-image";

/**
 * Browse tile for event types and cities: same card language as a hall card,
 * with the hall count under the title (sets expectations, per the research).
 */
export function Tile({
  title,
  count,
  href,
  art = "theatre",
  photoKey,
}: {
  title: string;
  /** Pre-translated count label, e.g. "12 halls". */
  count: string;
  href: string;
  art?: "theatre" | "banquet" | "stage";
  /** Atmosphere photo for this slot (see lib/stock-photos.ts). Falls back to `art`. */
  photoKey?: string;
}) {
  return (
    <Link
      href={href}
      className="group block rounded-card bg-blush p-2.5 shadow-card transition-shadow hover:shadow-lg"
    >
      <div className="relative aspect-[16/10] overflow-hidden rounded-image">
        <StockImage
          photoKey={photoKey}
          sizes="(min-width: 1024px) 380px, (min-width: 640px) 45vw, 92vw"
          className="transition-transform group-hover:scale-105"
          fallback={<PlaceholderArt variant={art} alt="" className="transition-transform group-hover:scale-105" />}
        />
      </div>
      <p className="px-2 pt-3 text-lg leading-snug">{title}</p>
      <p className="px-2 pb-2 text-sm">{count}</p>
    </Link>
  );
}
