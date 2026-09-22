import { describe, expect, it } from "vitest";
import { isoDay, isValidIsoDate, todayInTbilisi } from "./dates";

describe("todayInTbilisi", () => {
  it("uses Georgia time (UTC+4), not UTC", () => {
    // 21:00 UTC on the 20th is already 01:00 on the 21st in Tbilisi
    expect(todayInTbilisi(new Date("2026-09-20T21:00:00Z"))).toBe("2026-09-21");
    expect(todayInTbilisi(new Date("2026-09-20T19:59:00Z"))).toBe("2026-09-20");
  });
});

describe("isoDay", () => {
  /**
   * Regression: the booking calendar used `toISOString().slice(0, 10)`, which
   * converts to UTC first. A day picked at local midnight anywhere east of
   * Greenwich — all of Georgia — then serialised as the day before, so
   * organizers booked the wrong date.
   */
  it("keeps the day the user picked, not its UTC equivalent", () => {
    // Local midnight on the 29th: in UTC+4 this instant is the 28th, 20:00 UTC.
    const picked = new Date(2026, 8, 29, 0, 0, 0);
    expect(isoDay(picked)).toBe("2026-09-29");
  });

  it("pads months and days", () => {
    expect(isoDay(new Date(2026, 0, 5, 12, 0, 0))).toBe("2026-01-05");
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
