import { Building2, MapPin, ShieldCheck } from "lucide-react";
import Image from "next/image";
import { isDisplayableImageUrl } from "@/lib/image-hosts";
import { useLocale, useTranslations } from "next-intl";
import { Chip } from "@/components/ui/chip";
import { PlaceholderArt } from "@/components/ui/placeholder-art";
import { Rating } from "@/components/ui/rating";
import { Link } from "@/i18n/navigation";
import { formatGel } from "@/lib/money";

export type PriceUnit = "hour" | "half_day" | "day";

export type HallCardProps = {
  name: string;
  href: string;
  city: string;
  hallType: string;
  /** Starting price in integer tetri. */
  priceTetri: number;
  unit: PriceUnit;
  capacityMin: number;
  capacityMax: number;
  chips?: string[];
  verified?: boolean;
  /** Reviews arrive after launch, so this is normally omitted in v1. */
  rating?: { score: string; count: number };
  /** Real cover photo. Falls back to generated art in development. */
  imageUrl?: string | null;
  art?: "theatre" | "banquet" | "stage";
};

const UNIT_KEY = { hour: "hour", half_day: "halfDay", day: "day" } as const;

/** Blush card: photo, name, city, type, starting price, chips. */
export function HallCard({
  name,
  href,
  city,
  hallType,
  priceTetri,
  unit,
  capacityMin,
  capacityMax,
  chips = [],
  verified = true,
  rating,
  imageUrl,
  art = "theatre",
}: HallCardProps) {
  const t = useTranslations("hallCard");
  const tUnits = useTranslations("priceUnits");
  const locale = useLocale();
  // A URL next/image can't serve would throw and 500 the page, so treat it as
  // no photo at all and show the illustration instead.
  const photo = isDisplayableImageUrl(imageUrl) ? imageUrl : null;

  return (
    <article className="relative rounded-card bg-blush p-2.5 shadow-card transition-shadow focus-within:shadow-lg hover:shadow-lg">
      <div className="relative aspect-[4/3] overflow-hidden rounded-image">
        {photo ? (
          <Image
            src={photo}
            alt=""
            fill
            sizes="(min-width: 1024px) 380px, (min-width: 768px) 45vw, 92vw"
            className="object-cover"
          />
        ) : (
          <PlaceholderArt variant={art} alt="" />
        )}
      </div>
      <div className="px-2 pt-3 pb-2">
        <div className="flex items-start justify-between gap-3">
          <h3 className="min-w-0 text-lg leading-snug">
            <Link href={href} className="after:absolute after:inset-0 after:rounded-card">
              {name}
            </Link>
          </h3>
          {rating ? (
            <Rating score={rating.score} label={t("reviews", { count: rating.count })} />
          ) : null}
        </div>

        <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm">
          <li className="flex items-center gap-1.5">
            <MapPin aria-hidden className="size-4 text-coral" />
            {city}
          </li>
          <li className="flex items-center gap-1.5">
            <Building2 aria-hidden className="size-4 text-coral" />
            {hallType}
          </li>
        </ul>

        <p className="mt-3 text-xs text-coral-strong">
          {t("startingFrom")} · {tUnits(UNIT_KEY[unit])}
        </p>
        <p className="text-2xl font-bold">{formatGel(priceTetri, locale)}</p>

        <div className="mt-3 flex flex-wrap gap-2">
          {verified ? (
            <Chip className="gap-1">
              <ShieldCheck aria-hidden className="size-3.5" />
              {t("verified")}
            </Chip>
          ) : null}
          <Chip>{t("capacity", { min: capacityMin, max: capacityMax })}</Chip>
          {chips.map((c) => (
            <Chip key={c}>{c}</Chip>
          ))}
        </div>
      </div>
    </article>
  );
}
