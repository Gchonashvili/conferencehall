# PRD: Conferencehall

Conference hall aggregator for Georgia · v1 · 2026-09-21
Stack: Next.js · Neon (Postgres) · Railway · Mailgun · n8n · Timezone Asia/Tbilisi (UTC+4) · Currency GEL (₾)

## What

Conferencehall is a website where organizations find, compare and book conference and event halls in hotels and venues across Georgia. Organizers search by city, event type and guest count. They compare capacity, layouts and starting prices on one page, send one booking request, and pay a deposit online once the venue confirms.

The platform is free for organizers. Venues pay a subscription to be listed (see Assumptions). Halls are added and verified by our team with each venue, so quality is controlled from day one.

**Launch bar** (from the research): at least 80% of listed halls have photos, capacity and an indicative price. Sparse listings kill the compare value.

## Who it is for

| Side | Who | What they need |
|---|---|---|
| **Venues (supply)** | Hotels, conference centers and venues in Georgia that have halls. Sales or events managers. | Qualified requests with date, headcount and event type. Instant WhatsApp alerts. A simple place to accept or decline. A reason to pay for a listing. |
| **Organizers (demand)** | Large organizations booking conferences, trainings, corporate events and forums. Decision-makers and assistants, roughly 20–50 years old, mostly mobile and WhatsApp-first. | Confidence that the hall is real and fits the headcount. Comparable prices. One request instead of ten phone calls. Confirmation and a paid receipt they can forward to finance. |

## Positioning

**Curated and verified, not the broadest marketplace.** Reasons:

- **Georgia is a small market.** Supply is limited, and a broad but thin directory can't deliver the compare value that makes aggregators useful.
- **Corporate buyers pay for trust.** Verified listings are the market standard across all six marketplaces researched.
- **Venues won't pay a subscription** for a directory with no leads. A verified, quality-controlled channel gives them a reason.

"Premium" here means service quality and data quality, not premium prices. Every hall shows layout-specific capacity, real photos and a from-price. We start with Tbilisi and Batumi, then add Kutaisi and other regions.

**Hero promise:** *"The right conference hall in Georgia, verified and ready to book."*
Subline: *"Compare capacity, layouts and prices across Georgia's hotels and venues. Send one request and get confirmed by the venue."*
The hero holds a three-field search: city, event type, number of guests.

## Sections

**Homepage, in order** (the skeleton four of the eight benchmarked sites converge on):

1. Hero with three-field search
2. Trust strip: verified-hall badge, hall count, cities (real numbers only, no invented reviews)
3. Browse by event type: conference, training, gala, exhibition, board meeting, with hall counts
4. Browse by city: Tbilisi, Batumi, Kutaisi
5. Featured halls
6. "Why Conferencehall": verified, upfront prices, one request, human help
7. "Can't decide? Tell us your brief": a short form the team answers personally
8. "List your hall" venue CTA, with the subscription offer
9. Footer: contact, language switcher

**Other pages:** search results (filters and map) · hall detail · request and payment flow · organizer account (my requests and reservations) · venue dashboard · list-your-venue · about/FAQ · contact.

## Functions

**Three features to launch first, in this order:**

1. **Verified hall discovery.** Search by city, event type and guests. Filters for price, layout and amenities. Hall pages carry a gallery, capacity per layout (theatre, classroom, banquet, reception), from-price, amenities and a map. *First because nothing else works without browsable, trustworthy listings.*
2. **Request-to-book.** The hall page has a calendar plus a form for guests, event type and contact details. The request saves to Neon. n8n sends the venue a WhatsApp alert and Mailgun sends an email. The venue accepts or declines in its dashboard, and the organizer is emailed. The general contact form uses the same pipeline. *Second because it generates the leads venues pay for, and it works even before payments are live.*
3. **Deposit payment.** After the venue confirms, the organizer pays a deposit in GEL through Flitt or Payze. A Mailgun receipt goes out and the booking moves to Paid. *Third because it depends on confirmed requests, and gateway onboarding takes time and must not block launch.*

**Also in v1:** organizer and venue accounts · venue dashboard (requests, statuses) · admin panel for the team to create and verify halls · Georgian and English.

**After launch:** shortlist and compare · one request to several halls · reviews · downloadable spec sheets · 360° tours · Russian · self-serve hall editor · AI search.

**Technical notes**
- Money is stored as integer tetri and shown as ₾.
- Timestamps are stored in UTC and displayed in Asia/Tbilisi.
- Payment webhooks are idempotent.
- Notification steps are triggered from the Next.js API to n8n webhooks. A failed WhatsApp send must not lose the request; the email is the fallback.

**Assumptions to confirm**
- Georgian and English at launch, Russian later.
- Venue subscriptions are invoiced manually in v1, with no second payment flow.
- Deposits are collected by the platform and paid out to venues. Confirm with Flitt/Payze that this is supported, or whether venues need their own merchant accounts.
- Hotels may resist showing prices. A from-price is required to be listed, because that is what makes halls comparable.

## Design preferences

Based on the Lumière Events reference, adapted from weddings to corporate use.

**Keep from the reference:**
- Dark-brown rounded top nav with a logo on the left and login on the right.
- Serif display headlines on a full-width photographic hero.
- Rounded venue cards with a soft shadow: photo, name, rating, city, type, price and small chips.
- A filter bar under the hero: guests, price, venue type, space, rating.
- Hall page: gallery, "areas available" table, request-to-book sidebar with a calendar, reviews, similar venues.
- A reservations list and a payment page with a clear price breakdown.

**Change for corporate:**
- Replace blush pink with a warm ivory background, the brown nav, and one restrained accent (brass or terracotta). It should read as trustworthy, not wedding-like.
- Use real Georgian conference halls: rooms set up for delegates, stages, AV. No wedding imagery.
- Show prices in ₾ with the unit the venue uses (hour, half-day, day).
- Meet WCAG AA contrast. The reference's light text on pink is too low.
- Choose a serif that supports the Georgian script (fallback: Noto Serif Georgian), so headlines look right in both languages.
- Design mobile-first. Put a WhatsApp contact button on every hall page.
