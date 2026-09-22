import { getTranslations } from "next-intl/server";
import type { FilterDef } from "./filter-bar";

const CITIES = ["tbilisi", "batumi", "kutaisi"] as const;
const EVENT_TYPES = ["conference", "training", "gala", "exhibition", "meeting"] as const;
const LAYOUTS = ["theatre", "classroom", "banquet", "reception"] as const;
// URL-friendly range values: "min-max", open-ended as "300-".
const GUESTS = [
  ["0-50", "upTo50"],
  ["50-150", "from50to150"],
  ["150-300", "from150to300"],
  ["300-", "over300"],
] as const;
const PRICES = [
  ["0-500", "upTo500"],
  ["500-1500", "from500to1500"],
  ["1500-", "over1500"],
] as const;

/** Hero search: where, what, how many. */
export async function getSearchFilters(): Promise<FilterDef[]> {
  const [s, c, e, g] = await Promise.all([
    getTranslations("search"),
    getTranslations("cities"),
    getTranslations("eventTypes"),
    getTranslations("guestRanges"),
  ]);
  return [
    { id: "city", label: s("city"), options: CITIES.map((v) => ({ value: v, label: c(v) })) },
    { id: "eventType", label: s("eventType"), options: EVENT_TYPES.map((v) => ({ value: v, label: e(v) })) },
    { id: "guests", label: s("guests"), options: GUESTS.map(([v, k]) => ({ value: v, label: g(k) })) },
  ];
}

/**
 * Results-page filter bar (the peach bar under the hero in the reference).
 * `omit` drops filters that a landing page already fixes (e.g. city).
 */
export async function getListingFilters(omit: string[] = []): Promise<FilterDef[]> {
  const [s, c, e, g, p, l] = await Promise.all([
    getTranslations("search"),
    getTranslations("cities"),
    getTranslations("eventTypes"),
    getTranslations("guestRanges"),
    getTranslations("priceRanges"),
    getTranslations("layouts"),
  ]);
  const all: FilterDef[] = [
    { id: "city", label: s("city"), options: CITIES.map((v) => ({ value: v, label: c(v) })) },
    { id: "guests", label: s("guests"), options: GUESTS.map(([v, k]) => ({ value: v, label: g(k) })) },
    { id: "price", label: s("price"), options: PRICES.map(([v, k]) => ({ value: v, label: p(k) })) },
    { id: "eventType", label: s("eventType"), options: EVENT_TYPES.map((v) => ({ value: v, label: e(v) })) },
    { id: "layout", label: s("layout"), options: LAYOUTS.map((v) => ({ value: v, label: l(v) })) },
  ];
  return all.filter((f) => !omit.includes(f.id));
}
