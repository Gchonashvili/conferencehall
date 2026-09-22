import type { ReactNode } from "react";
import { PlaceholderArt } from "@/components/ui/placeholder-art";
import { StockImage } from "./stock-image";

/**
 * Full-width hero: photo behind a big bold serif headline, brown on a pale
 * peach wash (as in the reference). Falls back to the illustration until the
 * hero photo is prepared. Children render below the copy (search).
 */
export function Hero({
  title,
  subtitle,
  imageAlt,
  children,
}: {
  title: string;
  subtitle: string;
  imageAlt: string;
  children?: ReactNode;
}) {
  return (
    <section className="relative isolate overflow-hidden">
      <div aria-hidden className="absolute inset-0 -z-10">
        <StockImage
          photoKey="hero"
          priority
          sizes="100vw"
          fallback={
            <div className="absolute inset-0 scale-110 blur-[6px]">
              <PlaceholderArt variant="theatre" alt={imageAlt} />
            </div>
          }
        />
      </div>
      <div aria-hidden className="absolute inset-0 -z-10 bg-gradient-to-r from-peach/95 via-peach/75 to-peach/30" />
      <div className="px-5 pt-16 pb-10 md:px-12 md:pt-28 md:pb-12">
        {/* Georgian glyphs are wider than Latin, so the headline steps down one size. */}
        <h1 className="max-w-3xl text-4xl leading-[1.1] font-bold md:text-6xl [html[lang=ka]_&]:text-3xl [html[lang=ka]_&]:md:text-5xl">
          {title}
        </h1>
        <p className="mt-4 max-w-2xl text-lg font-semibold md:text-xl">{subtitle}</p>
        {children ? <div className="mt-8 max-w-4xl md:mt-12">{children}</div> : null}
      </div>
    </section>
  );
}
