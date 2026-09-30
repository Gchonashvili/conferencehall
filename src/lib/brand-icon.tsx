import { ImageResponse } from "next/og";
import { readColorTokens } from "./design-tokens";

/**
 * The tab / home-screen icon: one bold white "C" (the header logo's monogram)
 * on the navy primary color. A single shape, so it stays crisp at 16px.
 * Colors are read from the design tokens in globals.css.
 */
export function brandIcon(size: number) {
  const c = readColorTokens();
  return new ImageResponse(
    (
      <svg width={size} height={size} viewBox="0 0 64 64">
        <rect width="64" height="64" rx="14" fill={c.brown} />
        <path d="M45.3 19.7 A16 16 0 1 0 45.3 44.3" fill="none" stroke={c.panel} strokeWidth="9" strokeLinecap="round" />
      </svg>
    ),
    { width: size, height: size },
  );
}
