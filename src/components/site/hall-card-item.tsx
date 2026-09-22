import { useTranslations } from "next-intl";
import type { HallListItem } from "@/db/queries/halls";
import { HallCard } from "./hall-card";

const ART = ["theatre", "banquet", "stage"] as const;

/** Stable pseudo-random pick so the same hall always gets the same placeholder art. */
function artFor(slug: string) {
  let h = 0;
  for (const ch of slug) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return ART[h % ART.length];
}

/** Adapts a database row to the presentational HallCard. */
export function HallCardItem({ hall }: { hall: HallListItem }) {
  const t = useTranslations("hallTypes");
  return (
    <HallCard
      name={hall.name}
      href={`/halls/${hall.slug}`}
      city={hall.cityName}
      hallType={t(hall.hallType as Parameters<typeof t>[0])}
      priceTetri={hall.priceFromTetri}
      unit={hall.priceUnit}
      capacityMin={hall.capacityMin}
      capacityMax={hall.capacityMax}
      chips={hall.amenities.slice(0, 2)}
      verified={hall.verified}
      imageUrl={hall.coverUrl}
      art={artFor(hall.slug)}
    />
  );
}
