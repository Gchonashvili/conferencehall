import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { isDisplayableImageUrl, parseImageHosts } from "./image-hosts";

const ORIGINAL = process.env.NEXT_PUBLIC_IMAGE_HOST;

beforeEach(() => {
  process.env.NEXT_PUBLIC_IMAGE_HOST = "photos.example.com, cdn.example.com";
});
afterEach(() => {
  if (ORIGINAL === undefined) delete process.env.NEXT_PUBLIC_IMAGE_HOST;
  else process.env.NEXT_PUBLIC_IMAGE_HOST = ORIGINAL;
});

describe("parseImageHosts", () => {
  it("splits, trims and drops blanks", () => {
    expect(parseImageHosts("a.example.com, b.example.com")).toEqual(["a.example.com", "b.example.com"]);
    expect(parseImageHosts("")).toEqual([]);
    expect(parseImageHosts(undefined)).toEqual([]);
  });
});

describe("isDisplayableImageUrl", () => {
  it("accepts an https URL on an allowed host", () => {
    expect(isDisplayableImageUrl("https://photos.example.com/hall.jpg")).toBe(true);
    expect(isDisplayableImageUrl("https://cdn.example.com/a/b/hall.jpg?v=2")).toBe(true);
  });

  it("accepts our own relative paths", () => {
    expect(isDisplayableImageUrl("/images/stock/hero.jpg")).toBe(true);
  });

  /**
   * Regression: these are the cases that made next/image throw during render,
   * which with no error boundary 500s the hall page and every listing that
   * shows the same hall card.
   */
  it("rejects hosts next/image is not configured for", () => {
    expect(isDisplayableImageUrl("http://localhost:3000/images/stock/event-gala.jpg")).toBe(false);
    expect(isDisplayableImageUrl("https://evil.example.org/hall.jpg")).toBe(false);
  });

  it("rejects plain http, even on an allowed host", () => {
    expect(isDisplayableImageUrl("http://photos.example.com/hall.jpg")).toBe(false);
  });

  it("rejects empty and malformed input", () => {
    expect(isDisplayableImageUrl(null)).toBe(false);
    expect(isDisplayableImageUrl(undefined)).toBe(false);
    expect(isDisplayableImageUrl("")).toBe(false);
    expect(isDisplayableImageUrl("not a url")).toBe(false);
  });

  it("allows nothing remote when no host is configured", () => {
    delete process.env.NEXT_PUBLIC_IMAGE_HOST;
    expect(isDisplayableImageUrl("https://photos.example.com/hall.jpg")).toBe(false);
    expect(isDisplayableImageUrl("/images/stock/hero.jpg")).toBe(true);
  });
});
