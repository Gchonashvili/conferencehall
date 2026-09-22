const TZ = "Asia/Tbilisi";

/** Today's calendar date in Georgia as YYYY-MM-DD, whatever the server's timezone. */
export function todayInTbilisi(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

/**
 * A Date's own calendar day as YYYY-MM-DD, read from its local parts.
 *
 * Never use `toISOString().slice(0, 10)` for this: that converts to UTC
 * first, so a day picked at local midnight in Georgia (UTC+4) serialises as
 * the *previous* day. Event dates are calendar days, not instants.
 */
export function isoDay(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** True for real calendar dates in YYYY-MM-DD form (rejects 2026-02-31). */
export function isValidIsoDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const d = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === value;
}
