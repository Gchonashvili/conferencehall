import { describe, expect, it } from "vitest";
import { depositTetri, formatGel, gelToTetri, parseGel } from "./money";

describe("money", () => {
  it("converts lari to integer tetri without float drift", () => {
    expect(gelToTetri(19.99)).toBe(1999);
    expect(gelToTetri(0.1 + 0.2)).toBe(30);
  });

  it("formats whole lari without decimals", () => {
    expect(formatGel(250000, "en")).toBe("2,500 ₾");
  });

  it("formats tetri with two decimals", () => {
    expect(formatGel(250050, "en")).toBe("2,500.50 ₾");
  });

  it("rejects non-integer amounts", () => {
    expect(() => formatGel(10.5)).toThrow();
  });

  it("computes a deposit that never exceeds the percentage", () => {
    expect(depositTetri(250000, 30)).toBe(75000);
    expect(depositTetri(9999, 30)).toBe(2999);
  });
});

describe("parseGel", () => {
  it.each([
    ["1800", 180000],
    ["1 800", 180000],
    ["1,800.50", 180050],
    ["1,800", 180000],
    ["1800,5", 180050],
    ["1800,50", 180050],
    ["  99.99 ₾ ", 9999],
  ])("parses %j", (input, expected) => {
    expect(parseGel(input)).toBe(expected);
  });

  it.each(["", "abc", "0", "-5", "12.345", "1.2.3", "1e5"])("rejects %j", (input) => {
    expect(parseGel(input)).toBeNull();
  });
});
