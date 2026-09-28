import { ChevronRight } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";

/**
 * Section title with a "View all >" link on the right: a small text link on
 * phones (where space is tight), the peach pill button from `md` up.
 */
export function SectionHeader({
  title,
  href,
  viewAllLabel,
}: {
  title: string;
  href?: string;
  viewAllLabel?: string;
}) {
  return (
    <div className="mb-4 flex items-center justify-between gap-4 md:mb-6">
      <h2 className="text-xl font-semibold md:text-3xl md:font-normal">{title}</h2>
      {href && viewAllLabel ? (
        <>
          <Link
            href={href}
            className="flex shrink-0 items-center gap-0.5 py-2 text-sm font-semibold text-coral underline-offset-4 hover:underline md:hidden"
          >
            {viewAllLabel}
            <ChevronRight aria-hidden className="size-4" />
          </Link>
          <Button asChild variant="pill" size="md" className="hidden md:inline-flex">
            <Link href={href}>
              {viewAllLabel}
              <ChevronRight aria-hidden className="size-4" />
            </Link>
          </Button>
        </>
      ) : null}
    </div>
  );
}
