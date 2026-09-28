import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { contrastRatio } from "./contrast";
import { readColorTokens } from "./design-tokens";

/**
 * The admin panel re-points the public color tokens in admin-theme.css. This
 * checks the pairs the admin actually renders, using the admin values where
 * they override the public ones.
 */
const pub = readColorTokens();
const css = readFileSync(join(process.cwd(), "src/app/[locale]/admin/admin-theme.css"), "utf8");
const overrides: Record<string, string> = {};
for (const m of css.matchAll(/--color-([a-z-]+):\s*(#[0-9a-fA-F]{3,6})/g)) overrides[m[1]] = m[2].toLowerCase();

function admin(name: string): string {
  const value = overrides[name] ?? pub[name];
  if (!value) throw new Error(`Token --color-${name} not found`);
  return value;
}

const AA_TEXT = 4.5;
const WHITE = "#ffffff";

describe("admin theme meets WCAG AA for normal text (4.5:1)", () => {
  const pairs: Array<[label: string, fg: string, bg: string]> = [
    ["text on card", admin("brown"), admin("blush")],
    ["text on gray pill / table header", admin("brown"), admin("peach")],
    ["text on input", admin("brown"), admin("field")],
    ["muted text on card", admin("muted"), admin("blush")],
    ["muted text on gray header", admin("muted"), admin("peach")],
    ["link navy on card", admin("coral"), admin("blush")],
    ["link navy on gray", admin("coral"), admin("peach")],
    ["white on dark button", WHITE, admin("coral-strong")],
    ["ok status", admin("ok"), admin("ok-soft")],
    ["warn status", admin("warn"), admin("warn-soft")],
    ["danger status", admin("danger"), admin("danger-soft")],
    ["info status", admin("info"), admin("info-soft")],
    ["danger text on card", admin("danger"), admin("blush")],
  ];

  it.each(pairs)("%s", (_label, fg, bg) => {
    expect(contrastRatio(fg, bg)).toBeGreaterThanOrEqual(AA_TEXT);
  });

  it("only overrides tokens that exist in the public palette", () => {
    for (const name of Object.keys(overrides)) expect(pub[name], `--color-${name}`).toBeDefined();
  });
});
