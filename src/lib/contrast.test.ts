import { describe, expect, it } from "vitest";
import { contrastRatio } from "./contrast";
import { readColorTokens } from "./design-tokens";

const tokens = readColorTokens();

function token(name: string): string {
  const value = tokens[name];
  if (!value) throw new Error(`Token --color-${name} not found in globals.css`);
  return value;
}

const AA_TEXT = 4.5;
const WHITE = "#ffffff";

describe("design tokens meet WCAG AA for normal text (4.5:1)", () => {
  const pairs: Array<[label: string, fg: string, bg: string]> = [
    ["brown on page", token("brown"), token("page")],
    ["brown on panel", token("brown"), token("panel")],
    ["brown on blush", token("brown"), token("blush")],
    ["brown on peach", token("brown"), token("peach")],
    ["coral on panel", token("coral"), token("panel")],
    ["coral-strong on panel", token("coral-strong"), token("panel")],
    ["coral-strong on blush", token("coral-strong"), token("blush")],
    ["white on coral-strong (button label)", WHITE, token("coral-strong")],
    ["white on brown (nav)", WHITE, token("brown")],
  ];

  it.each(pairs)("%s", (_label, fg, bg) => {
    expect(contrastRatio(fg, bg)).toBeGreaterThanOrEqual(AA_TEXT);
  });
});
