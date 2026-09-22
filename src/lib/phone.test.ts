import { describe, expect, it } from "vitest";
import { normalizePhone } from "./phone";

describe("normalizePhone", () => {
  it.each([
    ["+995 555 12 34 56", "+995555123456"],
    ["555 12 34 56", "+995555123456"],
    ["0555123456", "+995555123456"],
    ["00995555123456", "+995555123456"],
    ["(+44) 20 7946-0958", "+442079460958"],
  ])("normalises %s", (input, expected) => {
    expect(normalizePhone(input)).toBe(expected);
  });

  it.each(["", "12345", "abc", "+abc123456", "+99555512345678901234", "555-12"])("rejects %j", (input) => {
    expect(normalizePhone(input)).toBeNull();
  });
});
