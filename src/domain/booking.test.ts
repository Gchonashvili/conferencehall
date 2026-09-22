import { describe, expect, it } from "vitest";
import {
  assertTransition,
  canTransition,
  generateReference,
  InvalidTransitionError,
  isTerminal,
  requestExpiry,
  type BookingStatus,
} from "./booking";

describe("booking state machine", () => {
  it("allows the happy path", () => {
    expect(canTransition("pending", "accepted")).toBe(true);
    expect(canTransition("accepted", "paid")).toBe(true);
    expect(canTransition("paid", "completed")).toBe(true);
  });

  it("allows a venue to decline or a request to lapse", () => {
    expect(canTransition("pending", "declined")).toBe(true);
    expect(canTransition("pending", "expired")).toBe(true);
  });

  it("refuses to skip steps or resurrect closed requests", () => {
    expect(canTransition("pending", "paid")).toBe(false);
    expect(canTransition("declined", "accepted")).toBe(false);
    expect(canTransition("expired", "paid")).toBe(false);
    expect(canTransition("completed", "cancelled")).toBe(false);
    expect(() => assertTransition("declined", "paid")).toThrow(InvalidTransitionError);
  });

  it("treats declined, expired, completed and cancelled as terminal", () => {
    const terminal: BookingStatus[] = ["declined", "expired", "completed", "cancelled"];
    for (const s of terminal) expect(isTerminal(s)).toBe(true);
    expect(isTerminal("pending")).toBe(false);
  });
});

describe("references and expiry", () => {
  it("generates readable codes without ambiguous characters", () => {
    for (let i = 0; i < 200; i++) {
      expect(generateReference()).toMatch(/^CH-[2-9A-HJ-NP-Z]{5}$/);
    }
  });

  it("is deterministic given a picker", () => {
    expect(generateReference(() => 0)).toBe("CH-22222");
  });

  it("expires after the configured number of hours", () => {
    const from = new Date("2026-09-21T10:00:00Z");
    expect(requestExpiry(from, 48).toISOString()).toBe("2026-09-23T10:00:00.000Z");
  });
});
