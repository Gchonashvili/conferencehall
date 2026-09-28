/**
 * Venue subscription rules for the admin panel. Pure functions on calendar
 * days (YYYY-MM-DD, Georgia); callers pass `today` (see `todayInTbilisi`).
 * Billing is manual in v1, and an expired subscription only warns the team:
 * nothing here hides a venue's halls.
 */

export type SubscriptionHealth = "active" | "expiring" | "overdue" | "none";

/** How many days ahead an ending subscription starts showing as "expiring". */
export const EXPIRING_WITHIN_DAYS = 14;

type VenueSubscription = {
  subscriptionStatus: "none" | "trial" | "active" | "expired";
  subscriptionUntil: string | null;
  plan?: "monthly" | "yearly" | null;
};

/** Adds whole days to a calendar day. */
export function addDays(day: string, days: number): string {
  const d = new Date(`${day}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** Adds calendar months, clamping to the month's last day (Jan 31 + 1 month = Feb 28/29). */
export function addMonths(day: string, months: number): string {
  const [y, m, d] = day.split("-").map(Number);
  const target = new Date(Date.UTC(y, m - 1 + months, 1));
  const lastDay = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)).getUTCDate();
  target.setUTCDate(Math.min(d, lastDay));
  return target.toISOString().slice(0, 10);
}

/**
 * Where a venue's subscription stands today. The paid-until date is the
 * source of truth when set; without one, the status field decides.
 */
export function subscriptionHealth(v: VenueSubscription, today: string): SubscriptionHealth {
  if (!v.subscriptionUntil) return v.subscriptionStatus === "active" || v.subscriptionStatus === "trial" ? "active" : "none";
  if (v.subscriptionUntil < today) return "overdue";
  if (v.subscriptionUntil <= addDays(today, EXPIRING_WITHIN_DAYS)) return "expiring";
  return "active";
}

/**
 * The period the next payment would cover, to pre-fill the "log payment"
 * form: it starts the day after the current paid-until (or today, if that's
 * already past or unset) and runs one plan cycle, both ends inclusive.
 */
export function nextPeriod(v: VenueSubscription, today: string): { start: string; end: string } {
  const start = v.subscriptionUntil && v.subscriptionUntil >= today ? addDays(v.subscriptionUntil, 1) : today;
  const end = addDays(addMonths(start, v.plan === "yearly" ? 12 : 1), -1);
  return { start, end };
}
