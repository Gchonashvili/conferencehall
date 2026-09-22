/**
 * Which image URLs `next/image` can actually render.
 *
 * Next only serves remote images from hosts listed in `images.remotePatterns`
 * (next.config.ts), and an unlisted host doesn't degrade — it *throws during
 * render*. With no error boundary that is a 500, and because hall cards are
 * shared it takes the listing, homepage and city pages down with it. So the
 * allowlist is checked in two places, both fed from here: the admin form
 * rejects a bad host on input, and the render sites fall back to the
 * placeholder illustration for anything that slipped in earlier.
 *
 * Deliberately dependency-free: this is imported from next.config.ts as well
 * as from app code, and reads NEXT_PUBLIC_IMAGE_HOST straight from the
 * environment so it works in a client bundle too (Next inlines NEXT_PUBLIC_*).
 */

/** `"a.example.com, b.example.com"` -> `["a.example.com", "b.example.com"]`. */
export function parseImageHosts(value: string | undefined): string[] {
  return (value ?? "")
    .split(",")
    .map((host) => host.trim())
    .filter(Boolean);
}

export function allowedImageHosts(): string[] {
  return parseImageHosts(process.env.NEXT_PUBLIC_IMAGE_HOST);
}

/**
 * True when `next/image` will render this URL. Relative paths are our own
 * files under public/ and are always fine; remote URLs must be https and on
 * an allowed host.
 */
export function isDisplayableImageUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  if (url.startsWith("/")) return true;

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return false;
  }
  return parsed.protocol === "https:" && allowedImageHosts().includes(parsed.hostname);
}
