import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { signUp } from "@/app/actions/auth";
import { submitBookingRequest } from "@/app/actions/booking";
import { AreasTable } from "@/components/site/areas-table";
import { AuthCard } from "@/components/site/auth-card";
import { BookingSidebar } from "@/components/site/booking-sidebar";
import { BookingSummary } from "@/components/site/booking-summary";
import { FilterBar } from "@/components/site/filter-bar";
import { GalleryGrid } from "@/components/site/gallery-grid";
import { HallCard } from "@/components/site/hall-card";
import { Hero } from "@/components/site/hero";
import { PhotoBanner } from "@/components/site/photo-banner";
import { Reservations, type Reservation } from "@/components/site/reservations";
import { getListingFilters, getSearchFilters } from "@/components/site/search-filters";
import { SectionHeader } from "@/components/site/section-header";
import { EmptyState, ErrorState } from "@/components/site/states";
import { Tile } from "@/components/site/tile";
import { TrustStrip } from "@/components/site/trust-strip";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { Notice } from "@/components/ui/notice";
import { PaginationDots } from "@/components/ui/pagination-dots";
import { Rating } from "@/components/ui/rating";
import { resolveLocale } from "@/i18n/locale";
import { contrastRatio } from "@/lib/contrast";
import { readColorTokens } from "@/lib/design-tokens";
import { gelToTetri } from "@/lib/money";

// Phase 0 review page. Dev only: not reachable in production builds.
export const metadata = { title: "Design system", robots: { index: false } };

const TOKEN_ROLES: Record<string, string> = {
  brown: "Nav bar, headings, all text",
  page: "Page background outside the panel",
  panel: "Centered white content panel",
  blush: "Cards, form panels",
  peach: "Filter bar, pills, chips, footer",
  coral: "Icons, dots (decorative; fails AA for text)",
  "coral-strong": "Buttons, small coral text (AA-safe)",
  field: "Form fields (derived)",
};

function Block({ id, title, note, children }: { id: string; title: string; note?: string; children: React.ReactNode }) {
  return (
    <section id={id} className="border-t border-peach px-5 py-10 md:px-12">
      <h2 className="text-2xl font-semibold">{title}</h2>
      {note ? <p className="mt-1 mb-6 max-w-3xl text-sm">{note}</p> : <div className="mb-6" />}
      {children}
    </section>
  );
}

function RefImage({ file, caption }: { file: string; caption: string }) {
  return (
    <figure>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={`/design-assets/${file}`} alt={caption} className="w-full rounded-image border border-peach" />
      <figcaption className="mt-1 text-xs">{caption}</figcaption>
    </figure>
  );
}

export default async function DesignPage({ params }: { params: Promise<{ locale: string }> }) {
  if (process.env.NODE_ENV === "production") notFound();
  await resolveLocale(params);

  const [tHero, tSearch, tSections, tBanner, tTrust, tHall, tBooking, tEvents, tLayouts, tPay, tCities, tHallCard] =
    await Promise.all([
      getTranslations("hero"),
      getTranslations("search"),
      getTranslations("sections"),
      getTranslations("banner"),
      getTranslations("trust"),
      getTranslations("hall"),
      getTranslations("booking"),
      getTranslations("eventTypes"),
      getTranslations("layouts"),
      getTranslations("payment"),
      getTranslations("cities"),
      getTranslations("hallCard"),
    ]);
  const [searchFilters, listingFilters] = await Promise.all([getSearchFilters(), getListingFilters()]);

  const tokens = readColorTokens();
  const swatches = Object.entries(TOKEN_ROLES).filter(([k]) => tokens[k]);

  const eventTypes = (["conference", "training", "gala", "meeting"] as const).map((v) => ({
    value: v,
    label: tEvents(v),
  }));
  const areas = [
    { value: "main", label: `Main hall · ${tLayouts("theatre")} 300` },
    { value: "boardroom", label: `Boardroom · ${tLayouts("classroom")} 24` },
  ];

  const sample: Reservation[] = [
    {
      id: "1",
      hallName: "Rustaveli Hall (sample)",
      bookingUnder: "Nino Beridze",
      phone: "+995 555 00 00 00",
      eventType: tEvents("conference"),
      date: "30 Nov 2026",
      timeOfDay: tBooking("times.fullDay"),
      guests: 220,
      area: "Main hall",
      amountTetri: gelToTetri(540), // deposit due (30% of 1,800 ₾)
      status: "accepted",
      art: "theatre",
    },
    {
      id: "2",
      hallName: "Black Sea Ballroom (sample)",
      bookingUnder: "Nino Beridze",
      phone: "+995 555 00 00 00",
      eventType: tEvents("gala"),
      date: "12 Dec 2026",
      timeOfDay: tBooking("times.evening"),
      guests: 150,
      area: "Grand ballroom",
      amountTetri: gelToTetri(2400),
      status: "paid",
      art: "banquet",
    },
  ];

  const halls = [
    { name: "Rustaveli Hall (sample)", city: tCities("tbilisi"), type: "Conference hall", price: 1200, unit: "day" as const, min: 50, max: 300, art: "theatre" as const, chips: ["Projector", "Parking"] },
    { name: "Black Sea Ballroom (sample)", city: tCities("batumi"), type: "Ballroom", price: 2400, unit: "day" as const, min: 100, max: 600, art: "banquet" as const, chips: ["Catering", "Stage"] },
    { name: "Old Town Forum (sample)", city: tCities("kutaisi"), type: "Meeting rooms", price: 90, unit: "hour" as const, min: 10, max: 40, art: "stage" as const, chips: ["Video call kit"] },
  ];

  return (
    <div>
      <section className="px-5 py-10 md:px-12">
        <p className="text-sm font-semibold text-coral-strong">Phase 0 · dev only</p>
        <h1 className="mt-1 text-4xl font-bold">Design system review</h1>
        <p className="mt-3 max-w-3xl">
          Everything below is built from the tokens in <code>globals.css</code>, matched to the Lumière Events
          reference in <code>/research</code>. Compare each block with the reference crop beside it. Switch the
          language with the KA / EN toggle in the nav to check Georgian.
        </p>
        <ul className="mt-4 max-w-3xl list-disc pl-5 text-sm">
          <li>Reference photos are stock and are not reused; hall images here are generated placeholders.</li>
          <li>Only the hero, nav and hall cards exist in the reference at readable resolution. The hall page, sign-up, reservations and payment screens are matched from thumbnails, so they follow structure and tokens rather than exact measurements.</li>
        </ul>
      </section>

      <Block id="tokens" title="Colors" note="Sampled from the reference images (modal pixel value of flat regions). Contrast ratios are computed live; AA needs 4.5 for normal text.">
        <ul className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {swatches.map(([name]) => {
            const hex = tokens[name];
            const onBrown = contrastRatio("#ffffff", hex).toFixed(1);
            const brownOn = contrastRatio(tokens.brown, hex).toFixed(1);
            return (
              <li key={name} className="overflow-hidden rounded-card border border-peach">
                <div className="h-20" style={{ background: hex }} />
                <div className="p-3 text-sm">
                  <p className="font-semibold">{name}</p>
                  <p className="font-mono text-xs">{hex}</p>
                  <p className="mt-1 text-xs">{TOKEN_ROLES[name]}</p>
                  <p className="mt-1 text-xs">brown text {brownOn}:1 · white text {onBrown}:1</p>
                </div>
              </li>
            );
          })}
        </ul>
      </Block>

      <Block id="type" title="Typography" note="Fraunces for Latin, Noto Serif Georgian for Georgian. Compare the headline with the reference crop.">
        <div className="grid gap-8 md:grid-cols-2">
          <div>
            <p className="text-5xl leading-tight font-bold">Your Wedding, Your Way</p>
            <p className="mt-3 text-xl font-semibold">Find the best wedding vendors with thousands of trusted reviews</p>
            <p className="mt-6 text-3xl">Trending Venues</p>
            <p className="mt-6 text-lg">The Palace House</p>
            <p className="mt-1 text-base">Body text 16px. Karachi · Banquet Hall</p>
            <p className="mt-1 text-sm">Small text 14px. 100-1000 Space · Indoor</p>
            <p className="mt-1 text-xs">Smallest text 12px (reference uses about 9px; raised for AA).</p>
            <p className="mt-6 text-3xl leading-tight font-bold">{tHero("title")}</p>
          </div>
          <RefImage file="hero-headline.png" caption="Reference: hero headline and subline" />
        </div>
      </Block>

      <Block id="nav" title="Navigation and footer" note="The nav and footer on this page are the real site components. Reference nav crop below.">
        <RefImage file="nav.png" caption="Reference: dark-brown rounded nav (logo left, links center, login right)" />
      </Block>

      <Block id="buttons" title="Buttons, chips, rating">
        <div className="flex flex-wrap items-center gap-4">
          <Button>Request to book</Button>
          <Button variant="pill">
            {tSections("viewAll")}
          </Button>
          <Button variant="outline">Outline</Button>
          <Button disabled>Disabled</Button>
          <Chip>100–1000 space</Chip>
          <Chip>Indoor</Chip>
          <Rating score="4.2" label={tHallCard("reviews", { count: 11 })} />
        </div>
      </Block>

      <Block id="hero" title="Hero with search (new element)" note="Hero is styled like the reference (soft image, big bold serif). The search bar is new: it reuses the peach filter bar, with boxed fields so each dropdown is visible.">
        <div className="overflow-hidden rounded-card border border-peach">
          <Hero title={tHero("title")} subtitle={tHero("subtitle")} imageAlt="">
            <FilterBar boxed filters={searchFilters} action={<Button size="lg" type="button">{tSearch("cta")}</Button>} />
          </Hero>
        </div>
      </Block>

      <Block id="filters" title="Filter bar and hall cards" note="Cards follow the reference: blush card, rounded photo, name, city, type, price with a small label, chips. The third card shows the rating variant from the reference (hidden in v1; reviews come after launch).">
        <FilterBar filters={listingFilters} />
        <div className="mt-6 grid gap-6 md:grid-cols-3">
          {halls.map((h, i) => (
            <HallCard
              key={h.name}
              name={h.name}
              href="/halls/sample"
              city={h.city}
              hallType={h.type}
              priceTetri={gelToTetri(h.price)}
              unit={h.unit}
              capacityMin={h.min}
              capacityMax={h.max}
              chips={h.chips}
              art={h.art}
              rating={i === 2 ? { score: "4.0", count: 29 } : undefined}
            />
          ))}
        </div>
        <div className="mt-8">
          <PaginationDots total={7} current={2} label="Pages" />
        </div>
        <div className="mt-10">
          <RefImage file="hall-cards.png" caption="Reference: Trending Venues section (section title, View All pill, cards)" />
        </div>
      </Block>

      <Block id="sections" title="Section header, tiles, trust strip">
        <SectionHeader title={tSections("browseByCity")} href="/cities" viewAllLabel={tSections("viewAll")} />
        <div className="grid gap-6 md:grid-cols-3">
          <Tile title={tCities("tbilisi")} count={tHallCard("hallsCount", { count: 12 })} href="/halls?city=tbilisi" photoKey="city-tbilisi" art="theatre" />
          <Tile title={tCities("batumi")} count={tHallCard("hallsCount", { count: 7 })} href="/halls?city=batumi" photoKey="city-batumi" art="banquet" />
          <Tile title={tCities("kutaisi")} count={tHallCard("hallsCount", { count: 3 })} href="/halls?city=kutaisi" photoKey="city-kutaisi" art="stage" />
        </div>
        <div className="mt-8">
          <TrustStrip
            stats={[
              { value: "22", label: tTrust("verifiedHalls") },
              { value: "3", label: tTrust("citiesCovered") },
              { value: "1", label: tTrust("oneRequest") },
              { value: "₾", label: tTrust("upfrontPrices") },
            ]}
          />
        </div>
      </Block>

      <Block id="banner" title="Photo banner">
        <div className="overflow-hidden rounded-card">
          <PhotoBanner title={tBanner("title")} cta={tBanner("cta")} href="/halls" />
        </div>
      </Block>

      <Block id="hall-page" title="Hall page pieces" note="Gallery, areas table (capacity per layout), and the request-to-book sidebar with calendar.">
        <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
          <div className="flex flex-col gap-8">
            <AreasTable
              areas={[
                { id: "a", name: "Main hall", capacity: { theatre: 300, classroom: 160, banquet: 220, reception: 400 } },
                { id: "b", name: "Boardroom", capacity: { theatre: 30, classroom: 24, banquet: 20 } },
              ]}
            />
            <GalleryGrid />
            <p className="text-sm">{tHall("guests", { count: 300 })}</p>
          </div>
          <div className="lg:sticky lg:top-6 lg:-m-2 lg:max-h-[calc(100dvh-2rem)] lg:self-start lg:overflow-y-auto lg:p-2">
            <BookingSidebar action={submitBookingRequest} locale="en" eventTypes={eventTypes} areas={areas} />
          </div>
        </div>
      </Block>

      <Block id="account" title="Sign-up, reservations, payment summary" note="Sign-up has two buttons that choose the account role, as in the reference (customer/vendor there, organizer/venue here).">
        <div className="grid items-start gap-10 lg:grid-cols-2">
          <AuthCard action={signUp} locale="en" />
          <BookingSummary
            lines={[
              { label: tPay("hallPrice"), tetri: gelToTetri(1800) },
              { label: tPay("deposit"), tetri: gelToTetri(540), strong: true },
              { label: tPay("balance"), tetri: gelToTetri(1260) },
            ]}
            totalTetri={gelToTetri(1800)}
          />
        </div>
        <div className="mt-10">
          <Reservations upcoming={sample.filter((r) => r.status !== "paid")} history={sample.filter((r) => r.status === "paid")} />
        </div>
      </Block>

      <Block id="states" title="Feedback and states">
        <div className="flex flex-col gap-3">
          <Notice tone="success">Request sent. The venue will reply soon.</Notice>
          <Notice tone="error">We could not send your request. Please check the highlighted fields.</Notice>
        </div>
        <div className="mt-8 grid gap-8 md:grid-cols-2">
          <EmptyState ctaHref="/contact" />
          <ErrorState />
        </div>
      </Block>

      <Block id="reference" title="Full reference images">
        <div className="grid gap-6">
          <RefImage file="original-729364be7b0289443b3963e9fed8aaf1.webp" caption="Reference: all screens" />
          <RefImage file="original-5e5da3075b89dd1d82bb8593e18dc0fb.webp" caption="Reference: screens, tilted mockup" />
        </div>
      </Block>
    </div>
  );
}
