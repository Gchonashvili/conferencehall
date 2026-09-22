import { describe, expect, it } from "vitest";
import { isValidIsoDate, todayInTbilisi } from "./dates";

describe("todayInTbilisi", () => {
  it("uses Georgia time (UTC+4), not UTC", () => {
    // 21:00 UTC on the 20th is already 01:00 on the 21st in Tbilisi
    expect(todayInTbilisi(new Date("2026-09-20T21:00:00Z"))).toBe("2026-09-21");
    expect(todayInTbilisi(new Date("2026-09-20T19:59:00Z"))).toBe("2026-09-20");
  });
});

describe("isValidIsoDate", () => {
  it("accepts real dates and rejects impossible ones", () => {
    expect(isValidIsoDate("2026-09-21")).toBe(true);
    expect(isValidIsoDate("2028-02-29")).toBe(true);
    expect(isValidIsoDate("2026-02-30")).toBe(false);
    expect(isValidIsoDate("21/09/2026")).toBe(false);
    expect(isValidIsoDate("")).toBe(false);
  });
});
