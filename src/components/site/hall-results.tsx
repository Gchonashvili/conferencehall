import { getTranslations } from "next-intl/server";
import { getDb } from "@/db";
import { searchHalls, type HallFilters } from "@/db/queries/halls";
import { HallCardItem } from "./hall-card-item";
import { ListingFilters, ListingPager } from "./listing-filters";
import { getListingFilters } from "./search-filters";
import { EmptyState } from "./states";

/**
 * Filter bar + result grid + pager. Used by /halls and the city and
 * event-type landing pages (which fix one filter and hide its dropdown).
 */
export async function HallResults({
  filters,
  locale,
  omit = [],
}: {
  filters: HallFilters;
  locale: string;
  omit?: string[];
}) {
  const [db, t, filterDefs] = await Promise.all([getDb(), getTranslations("halls"), getListingFilters(omit)]);
  const result = await searchHalls(db, filters, locale);

  return (
    <div>
      <ListingFilters filters={filterDefs} />
      <p className="mt-4 text-sm" aria-live="polite">
        {t("count", { count: result.total })}
      </p>

      {result.items.length === 0 ? (
        <div className="mt-8">
          <EmptyState ctaHref="/contact?kind=brief" />
        </div>
      ) : (
        <>
          <ul className="mt-6 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {result.items.map((hall) => (
              <li key={hall.id}>
                <HallCardItem hall={hall} />
              </li>
            ))}
          </ul>
          <div className="mt-10">
            <ListingPager pages={result.pages} current={result.page} />
          </div>
        </>
      )}
    </div>
  );
}
