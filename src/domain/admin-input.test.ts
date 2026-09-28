import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { hallImageSchema, hallSchema, venueSchema } from "./admin-input";

/**
 * Regression: an HTML checkbox is absent from the submission (undefined)
 * when unchecked, never "false". `z.coerce.boolean()` treats that as an
 * error rather than false — caught via manual browser testing, not the
 * domain-service tests (which construct typed inputs directly, bypassing
 * the schema). See admin-input.ts's `checkbox` helper.
 */
describe("checkbox fields accept an absent (unchecked) value", () => {
  it("venueSchema: verified defaults to false when the checkbox is unchecked", () => {
    const result = venueSchema.safeParse({
      name: { ka: "ტესტი", en: "Test" },
      description: { ka: "", en: "" },
      address: { ka: "", en: "" },
      citySlug: "tbilisi",
      status: "active",
      subscriptionStatus: "none",
      // verified intentionally omitted, as an unchecked checkbox would be
    });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.verified).toBe(false);
  });

  it("hallSchema: indoor / featured default to false when unchecked", () => {
    const result = hallSchema.safeParse({
      name: { ka: "ტესტი", en: "Test" },
      description: { ka: "", en: "" },
      hallType: "conference_hall",
      price: "100",
      priceUnit: "day",
      capacityMin: "1",
      capacityMax: "10",
      status: "draft",
      // indoor / featured intentionally omitted
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.indoor).toBe(false);
      expect(result.data.featured).toBe(false);
    }
  });

  it("checkbox fields become true when the browser sends \"on\"", () => {
    const result = venueSchema.safeParse({
      name: { ka: "ტესტი", en: "Test" },
      description: { ka: "", en: "" },
      address: { ka: "", en: "" },
      citySlug: "tbilisi",
      status: "active",
      subscriptionStatus: "none",
      verified: "on",
    });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.verified).toBe(true);
  });
});

describe("venueSchema billing plan", () => {
  const venue = (extra: Record<string, unknown>) =>
    venueSchema.safeParse({
      name: { ka: "ტესტი", en: "Test" },
      description: { ka: "", en: "" },
      address: { ka: "", en: "" },
      citySlug: "tbilisi",
      status: "active",
      subscriptionStatus: "none",
      ...extra,
    });

  it("is optional, and the price is typed in lari and stored in tetri", () => {
    const none = venue({ plan: "", planPrice: "" });
    expect(none.success && [none.data.plan, none.data.planPrice]).toEqual([undefined, undefined]);
    const yearly = venue({ plan: "yearly", planPrice: "1 200" });
    expect(yearly.success && [yearly.data.plan, yearly.data.planPrice]).toEqual(["yearly", 120000]);
  });

  it("rejects an unreadable price", () => {
    expect(venue({ planPrice: "lots" }).error?.issues[0]).toMatchObject({ path: ["planPrice"], message: "invalid_price" });
  });
});

/**
 * Regression: a published hall with no event types rendered a booking form
 * with no event-type choices, so every request failed `invalid_event_type`.
 */
describe("hallSchema event types", () => {
  const hall = (status: string, eventTypes: string[]) =>
    hallSchema.safeParse({
      name: { ka: "ტესტი", en: "Test" },
      description: { ka: "", en: "" },
      hallType: "conference_hall",
      price: "100",
      priceUnit: "day",
      capacityMin: "1",
      capacityMax: "10",
      status,
      eventTypes,
    });

  it("rejects publishing a hall with no event types", () => {
    const result = hall("published", []);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues).toContainEqual(
        expect.objectContaining({ path: ["eventTypes"], message: "event_type_required" }),
      );
    }
  });

  it("allows a draft with no event types, and a published hall with one", () => {
    expect(hall("draft", []).success).toBe(true);
    expect(hall("published", ["conference"]).success).toBe(true);
  });
});

/**
 * Rejecting the host on input is half of the guard; the render sites skip
 * unusable URLs too (see lib/image-hosts.ts), because a row entered before
 * this check would otherwise 500 the hall page.
 */
describe("hallImageSchema host check", () => {
  const ORIGINAL = process.env.NEXT_PUBLIC_IMAGE_HOST;
  beforeEach(() => {
    process.env.NEXT_PUBLIC_IMAGE_HOST = "photos.example.com";
  });
  afterEach(() => {
    if (ORIGINAL === undefined) delete process.env.NEXT_PUBLIC_IMAGE_HOST;
    else process.env.NEXT_PUBLIC_IMAGE_HOST = ORIGINAL;
  });

  const image = (url: string) => hallImageSchema.safeParse({ url, alt: { ka: "", en: "" }, isCover: undefined });

  it("accepts an allowed host", () => {
    expect(image("https://photos.example.com/hall.jpg").success).toBe(true);
  });

  it("rejects a host next/image cannot serve", () => {
    const result = image("https://somewhere-else.example.org/hall.jpg");
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.issues[0].message).toBe("invalid_image_host");
  });
});
