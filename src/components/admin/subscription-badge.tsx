import { Chip } from "@/components/ui/chip";
import type { SubscriptionHealth } from "@/domain/subscriptions";
import { cn } from "@/lib/utils";

const STYLE: Record<SubscriptionHealth, string> = {
  overdue: "bg-coral-strong text-white",
  expiring: "border border-coral-strong bg-panel text-coral-strong",
  active: "",
  none: "opacity-70",
};

/** Subscription health as a chip; overdue and expiring stand out. */
export function SubscriptionBadge({ health, label }: { health: SubscriptionHealth; label: string }) {
  return <Chip className={cn(STYLE[health])}>{label}</Chip>;
}
