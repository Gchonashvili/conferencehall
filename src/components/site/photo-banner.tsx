import { PlaceholderArt } from "@/components/ui/placeholder-art";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { StockImage } from "./stock-image";

/** Full-width photo banner with overlay copy and a coral button. */
export function PhotoBanner({
  title,
  cta,
  href,
  photoKey = "banner",
}: {
  title: string;
  cta: string;
  href: string;
  photoKey?: string;
}) {
  return (
    <section className="relative isolate overflow-hidden">
      <div aria-hidden className="absolute inset-0 -z-10">
        <StockImage photoKey={photoKey} sizes="100vw" fallback={<PlaceholderArt variant="stage" alt="" />} />
      </div>
      <div aria-hidden className="absolute inset-0 -z-10 bg-brown/70" />
      <div className="px-6 py-16 md:px-12 md:py-24">
        <p className="max-w-2xl text-2xl leading-snug text-white md:text-4xl">{title}</p>
        <Button asChild className="mt-6">
          <Link href={href}>{cta}</Link>
        </Button>
      </div>
    </section>
  );
}
