import generated from "./stock-photos.data.json";

/**
 * Atmosphere photos from Unsplash (free Unsplash License, checked 2026-09-22).
 *
 * RULE: stock photos are for mood only (hero, banner, city and event-type
 * tiles). They must NEVER appear on a hall card, hall gallery or hall share
 * image: those show the venue's own photos, because organizers book a real
 * room. `stock-photos.test.ts` enforces this.
 *
 * Files are produced by `pnpm photos:prepare` (see scripts/). Until a photo has
 * been prepared its slot falls back to the generated illustration, so the site
 * never breaks. There is deliberately no photo for the "training" tile.
 */
export type StockKey =
  | "hero"
  | "banner"
  | "city-tbilisi"
  | "city-batumi"
  | "city-kutaisi"
  | "event-conference"
  | "event-gala"
  | "event-exhibition"
  | "event-meeting";

export type StockEntry = {
  key: StockKey;
  /** Unsplash photo id; Unsplash download filenames contain it. */
  unsplashId: string;
  /** Path segment of the photo page: https://unsplash.com/photos/<pageSlug> */
  pageSlug: string;
  photographer: string;
  alt: { ka: string; en: string };
  /** CSS object-position, to keep the subject in frame when cropped. */
  position?: string;
  /** Date the photo page was confirmed to say "Free Photo on Unsplash". */
  licenseCheckedOn: string;
};

const CHECKED = "2026-09-22";

export const STOCK_MANIFEST: readonly StockEntry[] = [
  {
    key: "hero",
    unsplashId: "GenlGZhrmnM",
    pageSlug: "a-large-auditorium-with-rows-of-red-seats-GenlGZhrmnM",
    photographer: "Edwin Petrus",
    alt: { en: "Rows of red seats in a large empty auditorium", ka: "წითელი სავარძლების რიგები დიდ ცარიელ აუდიტორიაში" },
    position: "50% 60%",
    licenseCheckedOn: CHECKED,
  },
  {
    key: "banner",
    unsplashId: "N3PtXsAdxt8",
    pageSlug: "a-staircase-with-a-chandelier-and-a-chandelier-hanging-from-the-ceiling-N3PtXsAdxt8",
    photographer: "William V",
    alt: { en: "A grand staircase with a chandelier and red curtains", ka: "დიდებული კიბე ჭაღითა და წითელი ფარდებით" },
    position: "50% 25%",
    licenseCheckedOn: CHECKED,
  },
  {
    key: "city-tbilisi",
    unsplashId: "b-eGDk5_gPo",
    pageSlug: "aerial-photo-of-houses-b-eGDk5_gPo",
    photographer: "Denis Arslanbekov",
    alt: { en: "Old Tbilisi at dusk beneath Narikala Fortress", ka: "ძველი თბილისი მზის ჩასვლისას, ნარიყალას ციხის ძირში" },
    position: "35% 45%",
    licenseCheckedOn: CHECKED,
  },
  {
    key: "city-batumi",
    unsplashId: "R68FdCxFOII",
    pageSlug: "city-skyline-under-cloudy-sky-during-daytime-R68FdCxFOII",
    photographer: "Max",
    alt: { en: "The Batumi seafront skyline at dusk", ka: "ბათუმის სანაპირო მზის ჩასვლისას" },
    position: "50% 55%",
    licenseCheckedOn: CHECKED,
  },
  {
    key: "city-kutaisi",
    unsplashId: "UtVi_VUXJPk",
    pageSlug: "aerial-photography-of-gray-concrete-building-during-daytime-UtVi_VUXJPk",
    photographer: "Tomáš Malík",
    alt: { en: "Bagrati Cathedral in Kutaisi at golden hour", ka: "ბაგრატის ტაძარი ქუთაისში ოქროს საათზე" },
    position: "50% 60%",
    licenseCheckedOn: CHECKED,
  },
  {
    key: "event-conference",
    unsplashId: "ID1yWa1Wpx0",
    pageSlug: "people-sitting-on-chair-inside-room-ID1yWa1Wpx0",
    photographer: "Wan San Yip",
    alt: { en: "Speakers addressing a full conference hall", ka: "მომხსენებლები სავსე საკონფერენციო დარბაზში" },
    licenseCheckedOn: CHECKED,
  },
  {
    key: "event-gala",
    unsplashId: "fb0_wj2MZk4",
    pageSlug: "long-dining-table-with-festive-flowers-fb0_wj2MZk4",
    photographer: "M F",
    alt: { en: "A long banquet table with candles and flowers", ka: "გრძელი სადღესასწაულო მაგიდა სანთლებითა და ყვავილებით" },
    licenseCheckedOn: CHECKED,
  },
  {
    key: "event-exhibition",
    unsplashId: "yGukQe7KY2A",
    pageSlug: "blue-and-black-bench-on-white-floor-tiles-yGukQe7KY2A",
    photographer: "ASIA CULTURECENTER",
    alt: { en: "A spacious exhibition atrium with a timber ceiling", ka: "ფართო საგამოფენო ატრიუმი ხის ჭერით" },
    licenseCheckedOn: CHECKED,
  },
  {
    key: "event-meeting",
    unsplashId: "GWe0dlVD9e0",
    pageSlug: "oval-brown-wooden-conference-table-and-chairs-inside-conference-room-GWe0dlVD9e0",
    photographer: "Benjamin Child",
    alt: { en: "An oval wooden meeting table in a bright room", ka: "ოვალური ხის მაგიდა ნათელ სათათბირო ოთახში" },
    licenseCheckedOn: CHECKED,
  },
];

/** Written by `pnpm photos:prepare`: where the processed file is and how big. */
type Generated = { src: string; width: number; height: number; blur: string };
const data = generated as Record<string, Generated | undefined>;

export type StockPhoto = StockEntry & Generated;

const byKey = new Map(STOCK_MANIFEST.map((e) => [e.key as string, e]));

/** The photo for a slot, or null until it has been prepared (callers then use the illustration). */
export function getStockPhoto(key: string | undefined): StockPhoto | null {
  if (!key) return null;
  const entry = byKey.get(key);
  const file = data[key];
  return entry && file ? { ...entry, ...file } : null;
}

export const cityPhotoKey = (slug: string) => (byKey.has(`city-${slug}`) ? `city-${slug}` : undefined);
export const eventPhotoKey = (slug: string) => (byKey.has(`event-${slug}`) ? `event-${slug}` : undefined);

/** Photos that are actually in use, for the credits page. */
export function preparedPhotos(): StockPhoto[] {
  return STOCK_MANIFEST.map((e) => getStockPhoto(e.key)).filter((p): p is StockPhoto => p !== null);
}

export const unsplashPhotoUrl = (e: Pick<StockEntry, "pageSlug">) =>
  `https://unsplash.com/photos/${e.pageSlug}?utm_source=conferencehall&utm_medium=referral`;

/**
 * Finds the downloaded file for a photo. Unsplash names downloads
 * "<photographer>-<photo-id>-unsplash.jpg"; a file already named after the
 * slot ("hero.jpg") works too.
 */
export function matchStockFile(files: string[], entry: Pick<StockEntry, "key" | "unsplashId">): string | undefined {
  const image = files.filter((f) => /\.(jpe?g|png|webp)$/i.test(f));
  return (
    image.find((f) => f.includes(entry.unsplashId)) ??
    image.find((f) => f.toLowerCase().replace(/\.[^.]+$/, "") === entry.key)
  );
}
