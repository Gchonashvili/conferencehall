import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

export function Rating({
  score,
  label,
  className,
}: {
  score: string;
  /** Pre-translated "(11 reviews)" text. */
  label?: string;
  className?: string;
}) {
  return (
    <span className={cn("inline-flex shrink-0 items-center gap-1 text-sm whitespace-nowrap", className)}>
      <Star aria-hidden className="size-3.5 text-coral" />
      <span className="font-bold">{score}</span>
      {label ? <span>{label}</span> : null}
    </span>
  );
}
