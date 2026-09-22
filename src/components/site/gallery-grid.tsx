import Image from "next/image";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { PlaceholderArt } from "@/components/ui/placeholder-art";

const ART = ["theatre", "banquet", "stage"] as const;

/**
 * 3-column photo grid from the "Portfolio" block on the hall page. Shows the
 * hall's real photos; with none (development), generated placeholders.
 */
export function GalleryGrid({
  images,
  count = 9,
  showViewAll = true,
}: {
  images?: { url: string; alt: string }[];
  count?: number;
  showViewAll?: boolean;
}) {
  const t = useTranslations("hall");
  return (
    <section aria-labelledby="gallery-title">
      <h2 id="gallery-title" className="mb-4 text-xl font-semibold">
        {t("portfolio")}
      </h2>
      <ul className="grid grid-cols-3 gap-2 md:gap-3">
        {images && images.length > 0
          ? images.map((img) => (
              <li key={img.url} className="relative aspect-[3/4] overflow-hidden rounded-image">
                <Image src={img.url} alt={img.alt} fill sizes="(min-width: 1024px) 260px, 30vw" className="object-cover" />
              </li>
            ))
          : Array.from({ length: count }, (_, i) => (
              <li key={i} className="aspect-[3/4] overflow-hidden rounded-image">
                <PlaceholderArt variant={ART[i % ART.length]} alt={`${t("portfolio")} ${i + 1}`} />
              </li>
            ))}
      </ul>
      {showViewAll ? (
        <div className="mt-3 flex justify-end">
          <Button size="sm">{t("viewAllPhotos")}</Button>
        </div>
      ) : null}
    </section>
  );
}
