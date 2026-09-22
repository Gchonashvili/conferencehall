import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  cityPhotoKey,
  eventPhotoKey,
  getStockPhoto,
  matchStockFile,
  STOCK_MANIFEST,
  unsplashPhotoUrl,
} from "./stock-photos";
import generated from "./stock-photos.data.json";

const root = process.cwd();

describe("stock photo manifest", () => {
  it("has unique slots and photo ids", () => {
    expect(new Set(STOCK_MANIFEST.map((e) => e.key)).size).toBe(STOCK_MANIFEST.length);
    expect(new Set(STOCK_MANIFEST.map((e) => e.unsplashId)).size).toBe(STOCK_MANIFEST.length);
  });

  it("records a credit, bilingual alt text and a license-check date for every photo", () => {
    for (const e of STOCK_MANIFEST) {
      expect(e.unsplashId, e.key).toHaveLength(11);
      expect(e.pageSlug.endsWith(e.unsplashId), `${e.key} pageSlug must end with its id`).toBe(true);
      expect(e.photographer.trim(), e.key).not.toBe("");
      expect(e.alt.en.trim(), e.key).not.toBe("");
      expect(e.alt.ka.trim(), e.key).not.toBe("");
      expect(e.licenseCheckedOn, e.key).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });

  it("only offers mood slots, never anything hall-related", () => {
    for (const e of STOCK_MANIFEST) expect(e.key, e.key).toMatch(/^(hero|banner|city-[a-z]+|event-[a-z]+)$/);
  });

  it("deliberately has no photo for the training tile", () => {
    expect(eventPhotoKey("training")).toBeUndefined();
    expect(eventPhotoKey("conference")).toBe("event-conference");
    expect(cityPhotoKey("tbilisi")).toBe("city-tbilisi");
    expect(cityPhotoKey("atlantis")).toBeUndefined();
  });

  it("links to the Unsplash photo page with referral parameters", () => {
    const hero = STOCK_MANIFEST.find((e) => e.key === "hero")!;
    expect(unsplashPhotoUrl(hero)).toBe(
      "https://unsplash.com/photos/a-large-auditorium-with-rows-of-red-seats-GenlGZhrmnM?utm_source=conferencehall&utm_medium=referral",
    );
  });
});

describe("matchStockFile", () => {
  const hero = { key: "hero" as const, unsplashId: "GenlGZhrmnM" };
  const tbilisi = { key: "city-tbilisi" as const, unsplashId: "b-eGDk5_gPo" };

  it("matches Unsplash's own download filenames by photo id", () => {
    const files = ["edwin-petrus-GenlGZhrmnM-unsplash.jpg", "denis-arslanbekov-b-eGDk5_gPo-unsplash.jpg", ".DS_Store"];
    expect(matchStockFile(files, hero)).toBe("edwin-petrus-GenlGZhrmnM-unsplash.jpg");
    expect(matchStockFile(files, tbilisi)).toBe("denis-arslanbekov-b-eGDk5_gPo-unsplash.jpg");
  });

  it("also accepts a file already named after its slot", () => {
    expect(matchStockFile(["hero.JPG"], hero)).toBe("hero.JPG");
  });

  it("ignores non-images and unrelated files", () => {
    expect(matchStockFile(["GenlGZhrmnM.txt", "other-photo-unsplash.jpg"], hero)).toBeUndefined();
    expect(matchStockFile([], hero)).toBeUndefined();
  });
});

describe("prepared photos", () => {
  it("returns null for a slot that has not been prepared, so the illustration shows", () => {
    const prepared = generated as Record<string, unknown>;
    for (const e of STOCK_MANIFEST) {
      if (!prepared[e.key]) expect(getStockPhoto(e.key)).toBeNull();
    }
    expect(getStockPhoto(undefined)).toBeNull();
    expect(getStockPhoto("not-a-slot")).toBeNull();
  });

  it("every recorded photo has its file on disk", () => {
    for (const [key, value] of Object.entries(generated as Record<string, { src: string; width: number; blur: string }>)) {
      expect(existsSync(join(root, "public", value.src)), `${key} file missing`).toBe(true);
      expect(value.width, key).toBeGreaterThan(0);
      expect(value.blur.startsWith("data:image/"), key).toBe(true);
    }
  });
});

/**
 * The product promise is "verified, real photos". Stock is for mood only, so
 * anything that renders a hall must never reach for it.
 */
describe("guardrail: no stock photos on halls", () => {
  const sources = (dir: string): string[] =>
    (readdirSync(join(root, dir), { recursive: true }) as string[])
      .filter((f) => /\.(ts|tsx)$/.test(f) && !f.endsWith(".test.ts"))
      .map((f) => join(dir, f));

  const hallSources = [
    ...sources("src/app/[locale]/halls"),
    "src/components/site/hall-card.tsx",
    "src/components/site/hall-card-item.tsx",
    "src/components/site/gallery-grid.tsx",
    "src/components/site/areas-table.tsx",
    "src/db/queries/halls.ts",
  ];

  it("covers the hall files it is meant to protect", () => {
    expect(hallSources.length).toBeGreaterThan(5);
    for (const f of hallSources) expect(existsSync(join(root, f)), f).toBe(true);
  });

  it.each(hallSources)("%s does not use stock photos", (file) => {
    const code = readFileSync(join(root, file), "utf8");
    expect(code).not.toMatch(/stock-photos|stock-image|StockImage/);
  });
});
