/**
 * Turns a name into a URL-safe slug: lowercase, ASCII, hyphen-separated.
 * Georgian (or any non-Latin) input has nothing to transliterate here, so
 * callers should slugify the English name — the admin form does this.
 */
export function slugify(input: string): string {
  return input
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "") // strip accents
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}
