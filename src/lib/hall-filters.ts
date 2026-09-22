import type { HallFilters } from "@/db/queries/halls";

type SearchParams = Record<string, string | string[] | undefined>;

const SLUG = /^[a-z0-9_-]{1,40}$/;
const RANGE = /^\d{0,7}-\d{0,7}$/;

const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

/** Whitelists and normalises URL parameters. Anything odd is dropped, never thrown. */
export function parseHallFilters(sp: SearchParams): HallFilters {
  const pick = (key: string, re: RegExp) => {
    const v = first(sp[key])?.trim();
    return v && re.test(v) ? v : undefined;
  };
  const page = Number(first(sp.page));
  return {
    city: pick("city", SLUG),
    eventType: pick("eventType", SLUG),
    guests: pick("guests", RANGE),
    price: pick("price", RANGE),
    layout: pick("layout", SLUG),
    page: Number.isInteger(page) && page > 0 ? page : 1,
  };
}
