import { ImageResponse } from "next/og";
import { readColorTokens } from "./design-tokens";

/**
 * The tab / home-screen icon: a presenter pointing at a screen in front of an
 * audience, drawn as simple white shapes on the navy primary color so it stays
 * legible at 16px. Colors are read from the design tokens in globals.css.
 */
export function brandIcon(size: number) {
  const c = readColorTokens();
  return new ImageResponse(
    (
      <svg width={size} height={size} viewBox="0 0 64 64">
        <rect width="64" height="64" rx="14" fill={c.brown} />
        <rect x="13" y="9" width="38" height="24" rx="2" fill="none" stroke={c.panel} strokeWidth="3" />
        <circle cx="22" cy="22" r="3.2" fill={c.panel} />
        <rect x="19.3" y="26" width="5.4" height="13" rx="2" fill={c.panel} />
        <path d="M23 28 L32 22" fill="none" stroke={c.panel} strokeWidth="2.6" strokeLinecap="round" />
        <circle cx="14" cy="47" r="4.6" fill={c.panel} />
        <circle cx="26" cy="47" r="4.6" fill={c.panel} />
        <circle cx="38" cy="47" r="4.6" fill={c.panel} />
        <circle cx="50" cy="47" r="4.6" fill={c.panel} />
        <rect x="8" y="55" width="48" height="4" rx="2" fill={c.panel} />
        </svg>
    ),
    { width: size, height: size },
  );
}
