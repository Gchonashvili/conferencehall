import { describe, expect, it } from "vitest";
import { bookingRequestSchema, fieldErrors } from "./booking-input";

const valid = {
  hallId: "3f2b1c5e-8a4d-4f6e-9b1a-2c7d8e9f0a1b",
  name: "Nino Beridze",
  phone: "555 12 34 56",
  email: "  Nino@Example.GE ",
  guests: "120",
  eventType: "conference",
  eventDate: "2026-10-05",
  timeOfDay: "full_day",
  areaId: "",
  message: "",
};
const schema = bookingRequestSchema("2026-09-21");

describe("bookingRequestSchema", () => {
  it("accepts a valid request and normalises fields", () => {
    const r = schema.parse(valid);
    expect(r.phone).toBe("+995555123456");
    expect(r.email).toBe("nino@example.ge");
    expect(r.guests).toBe(120);
    expect(r.areaId).toBeUndefined();
    expect(r.message).toBeUndefined();
  });

  it("accepts today but not yesterday (Georgia time)", () => {
    expect(schema.safeParse({ ...valid, eventDate: "2026-09-21" }).success).toBe(true);
    const r = schema.safeParse({ ...valid, eventDate: "2026-09-20" });
    expect(r.success).toBe(false);
    if (!r.success) expect(fieldErrors(r.error).eventDate).toBe("date_in_past");
  });

  it("reports one stable error code per bad field", () => {
    const r = schema.safeParse({ ...valid, name: "N", phone: "12", email: "nope", guests: "0", eventDate: "2026-02-30" });
    expect(r.success).toBe(false);
    if (!r.success) {
      expect(fieldErrors(r.error)).toEqual({
        name: "name_required",
        phone: "invalid_phone",
        email: "invalid_email",
        guests: "invalid_guests",
        eventDate: "invalid_date",
      });
    }
  });

  it("rejects fractional and absurd guest counts", () => {
    expect(schema.safeParse({ ...valid, guests: "12.5" }).success).toBe(false);
    expect(schema.safeParse({ ...valid, guests: "999999" }).success).toBe(false);
  });

  it("rejects an unknown time of day and a malformed hall id", () => {
    expect(schema.safeParse({ ...valid, timeOfDay: "midnight" }).success).toBe(false);
    expect(schema.safeParse({ ...valid, hallId: "abc" }).success).toBe(false);
  });
});
