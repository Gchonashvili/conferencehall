import type { SubscriptionHealth } from "@/domain/subscriptions";
import { StatusPill, type Tone } from "./ui";

const TONE: Record<SubscriptionHealth, Tone> = { overdue: "danger", expiring: "warn", active: "ok", none: "neutral" };

/** Subscription health as a status pill; overdue and expiring stand out. */
export function SubscriptionBadge({ health, label }: { health: SubscriptionHealth; label: string }) {
  return <StatusPill tone={TONE[health]}>{label}</StatusPill>;
}
