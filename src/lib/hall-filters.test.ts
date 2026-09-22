import { describe, expect, it } from "vitest";
import { parseHallFilters } from "./hall-filters";
import { parseRange } from "./ranges";

describe("parseHallFilters", () => {
  it("keeps valid values", () => {
    expect(parseHallFilters({ city: "tbilisi", guests: "50-150", page: "2" })).toMatchObject({
      city: "tbilisi",
      guests: "50-150",
      page: 2,
    });
  });

  it("drops malformed and hostile values", () => {
    const f = parseHallFilters({ city: "Tbilisi; DROP TABLE", guests: "abc", price: "1-2-3", page: "-4", layout: ["a", "b"] });
    expect(f.city).toBeUndefined();
    expect(f.guests).toBeUndefined();
    expect(f.price).toBeUndefined();
    expect(f.page).toBe(1);
    expect(f.layout).toBe("a");
  });

  it("treats empty form fields as unset", () => {
    expect(parseHallFilters({ city: "", eventType: "" }).city).toBeUndefined();
  });
});

describe("parseRange", () => {
  it("parses closed, open-ended and open-start ranges", () => {
    expect(parseRange("50-150")).toEqual({ min: 50, max: 150 });
    expect(parseRange("300-")).toEqual({ min: 300, max: undefined });
    expect(parseRange("-500")).toEqual({ min: undefined, max: 500 });
  });
  it("rejects nonsense", () => {
    expect(parseRange("-")).toBeNull();
    expect(parseRange("9-1")).toBeNull();
    expect(parseRange("x")).toBeNull();
    expect(parseRange(undefined)).toBeNull();
  });
});
