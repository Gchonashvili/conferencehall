const intlLocale = (l: string) => (l === "ka" ? "ka-GE" : "en-GB");

/** "5 Oct 2026" for a calendar date (YYYY-MM-DD). Read as UTC so the day never shifts. */
export function formatDate(iso: string, locale: string): string {
  return new Intl.DateTimeFormat(intlLocale(locale), { dateStyle: "medium", timeZone: "UTC" }).format(new Date(`${iso}T00:00:00Z`));
}

/** A moment in time, always shown in Georgia time. */
export function formatDateTime(d: Date, locale: string): string {
  return new Intl.DateTimeFormat(intlLocale(locale), { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Tbilisi" }).format(d);
}
