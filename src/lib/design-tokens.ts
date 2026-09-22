import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * Reads the color tokens straight from globals.css so tests and the /design
 * page always reflect the real source of truth. Server-side only.
 */
export function readColorTokens(): Record<string, string> {
  const css = readFileSync(join(process.cwd(), "src/app/globals.css"), "utf8");
  const tokens: Record<string, string> = {};
  for (const m of css.matchAll(/--color-([a-z-]+):\s*(#[0-9a-fA-F]{3,6})/g)) {
    tokens[m[1]] = m[2].toLowerCase();
  }
  return tokens;
}
