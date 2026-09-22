import { siteConfig } from "@/lib/site";
import { cn } from "@/lib/utils";

/**
 * Placeholder wordmark in the style of the reference lockup (monogram plus a
 * two-line name, second line in coral). Swap for the real logo later.
 */
export function Logo({
  tone = "light",
  size = "md",
  className,
}: {
  tone?: "light" | "dark";
  size?: "md" | "lg";
  className?: string;
}) {
  const large = size === "lg";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2",
        tone === "light" ? "text-blush" : "text-brown",
        className,
      )}
    >
      <span aria-hidden className={cn("leading-none font-semibold", large ? "text-6xl" : "text-4xl")}>
        C
      </span>
      <span className="flex flex-col leading-[1.05]">
        <span className={cn("font-medium", large ? "text-xl" : "text-[15px]")}>{siteConfig.wordmark.top}</span>
        <span className={cn("font-medium tracking-wide text-coral", large ? "text-base" : "text-[13px]")}>
          {siteConfig.wordmark.bottom}
        </span>
      </span>
    </span>
  );
}
