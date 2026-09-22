import { ChevronRight } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";

/** Serif section title with a peach "View all >" pill on the right. */
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
    <div className="mb-6 flex items-center justify-between gap-4">
      <h2 className="text-2xl md:text-3xl">{title}</h2>
      {href && viewAllLabel ? (
        <Button asChild variant="pill" size="md">
          <Link href={href}>
            {viewAllLabel}
            <ChevronRight aria-hidden className="size-4" />
          </Link>
        </Button>
      ) : null}
    </div>
  );
}
