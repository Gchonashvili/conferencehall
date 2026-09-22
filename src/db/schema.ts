import {
  boolean,
  date,
  doublePrecision,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { user } from "./auth-schema";

export * from "./auth-schema";

/**
 * Conventions
 * - Bilingual text is stored as { ka, en } JSON (Russian can be added later
 *   without a migration). Read it through `pickText` in lib/i18n-text.ts.
 * - Money is integer tetri (1 GEL = 100 tetri). Never floats.
 * - Timestamps are timestamptz (UTC). Event dates are plain `date` values
 *   (a calendar day in Georgia), not instants.
 */
export type I18n = { ka: string; en: string };

const createdAt = () => timestamp("created_at", { withTimezone: true }).defaultNow().notNull();
const updatedAt = () =>
  timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date());

// ---------------------------------------------------------------- enums
export const venueStatus = pgEnum("venue_status", ["draft", "active", "suspended"]);
export const subscriptionStatus = pgEnum("subscription_status", ["none", "trial", "active", "expired"]);
export const hallStatus = pgEnum("hall_status", ["draft", "published"]);
export const hallType = pgEnum("hall_type", [
  "conference_hall",
  "ballroom",
  "meeting_room",
  "auditorium",
  "exhibition_hall",
]);
export const priceUnit = pgEnum("price_unit", ["hour", "half_day", "day"]);
export const timeOfDay = pgEnum("time_of_day", ["morning", "afternoon", "evening", "full_day"]);
export const bookingStatus = pgEnum("booking_status", [
  "pending", // sent, waiting for the venue
  "accepted", // venue confirmed, deposit due
  "declined",
  "expired", // venue never answered in time
  "paid", // deposit received
  "completed",
  "cancelled",
]);
export const paymentStatus = pgEnum("payment_status", ["pending", "succeeded", "failed", "refunded"]);
export const outboxStatus = pgEnum("outbox_status", ["pending", "sent", "failed", "dead"]);
export const notificationChannel = pgEnum("notification_channel", ["whatsapp", "email"]);
export const inquiryKind = pgEnum("inquiry_kind", ["contact", "brief", "venue"]);
export const inquiryStatus = pgEnum("inquiry_status", ["new", "handled"]);

// ------------------------------------------------------------ reference
export const cities = pgTable("cities", {
  slug: text("slug").primaryKey(),
  name: jsonb("name").$type<I18n>().notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
});

export const eventTypes = pgTable("event_types", {
  slug: text("slug").primaryKey(),
  name: jsonb("name").$type<I18n>().notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
});

export const amenities = pgTable("amenities", {
  slug: text("slug").primaryKey(),
  name: jsonb("name").$type<I18n>().notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
});

// --------------------------------------------------------------- supply
export const venues = pgTable(
  "venues",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    slug: text("slug").notNull(),
    name: jsonb("name").$type<I18n>().notNull(),
    description: jsonb("description").$type<I18n>(),
    citySlug: text("city_slug")
      .notNull()
      .references(() => cities.slug),
    address: jsonb("address").$type<I18n>(),
    lat: doublePrecision("lat"),
    lng: doublePrecision("lng"),
    phone: text("phone"),
    email: text("email"),
    whatsapp: text("whatsapp"),
    website: text("website"),
    status: venueStatus("status").notNull().default("draft"),
    /** Set by the team after checking the venue in person / documents. */
    verified: boolean("verified").notNull().default(false),
    subscriptionStatus: subscriptionStatus("subscription_status").notNull().default("none"),
    subscriptionUntil: date("subscription_until", { mode: "string" }),
    /** Overrides the platform default deposit percentage when set. */
    depositPercent: integer("deposit_percent"),
    /** Auth user that manages this venue (venue dashboard login). */
    ownerUserId: text("owner_user_id").references(() => user.id, { onDelete: "set null" }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    uniqueIndex("venues_slug_uq").on(t.slug),
    index("venues_city_idx").on(t.citySlug),
    index("venues_owner_idx").on(t.ownerUserId),
  ],
);

export const halls = pgTable(
  "halls",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    venueId: uuid("venue_id")
      .notNull()
      .references(() => venues.id, { onDelete: "cascade" }),
    slug: text("slug").notNull(),
    name: jsonb("name").$type<I18n>().notNull(),
    description: jsonb("description").$type<I18n>(),
    hallType: hallType("hall_type").notNull().default("conference_hall"),
    /** Starting price, integer tetri, in the venue's chosen unit. */
    priceFromTetri: integer("price_from_tetri").notNull(),
    priceUnit: priceUnit("price_unit").notNull().default("day"),
    capacityMin: integer("capacity_min").notNull(),
    capacityMax: integer("capacity_max").notNull(),
    indoor: boolean("indoor").notNull().default(true),
    featured: boolean("featured").notNull().default(false),
    status: hallStatus("status").notNull().default("draft"),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    uniqueIndex("halls_slug_uq").on(t.slug),
    index("halls_venue_idx").on(t.venueId),
    index("halls_listing_idx").on(t.status, t.featured),
  ],
);

/** A bookable space inside a hall, with capacity per seating layout. */
export const hallAreas = pgTable(
  "hall_areas",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    hallId: uuid("hall_id")
      .notNull()
      .references(() => halls.id, { onDelete: "cascade" }),
    name: jsonb("name").$type<I18n>().notNull(),
    capacityTheatre: integer("capacity_theatre"),
    capacityClassroom: integer("capacity_classroom"),
    capacityBanquet: integer("capacity_banquet"),
    capacityReception: integer("capacity_reception"),
    sortOrder: integer("sort_order").notNull().default(0),
  },
  (t) => [index("hall_areas_hall_idx").on(t.hallId)],
);

export const hallImages = pgTable(
  "hall_images",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    hallId: uuid("hall_id")
      .notNull()
      .references(() => halls.id, { onDelete: "cascade" }),
    url: text("url").notNull(),
    alt: jsonb("alt").$type<I18n>(),
    isCover: boolean("is_cover").notNull().default(false),
    sortOrder: integer("sort_order").notNull().default(0),
  },
  (t) => [index("hall_images_hall_idx").on(t.hallId)],
);

export const hallEventTypes = pgTable(
  "hall_event_types",
  {
    hallId: uuid("hall_id")
      .notNull()
      .references(() => halls.id, { onDelete: "cascade" }),
    eventTypeSlug: text("event_type_slug")
      .notNull()
      .references(() => eventTypes.slug),
  },
  (t) => [primaryKey({ columns: [t.hallId, t.eventTypeSlug] })],
);

export const hallAmenities = pgTable(
  "hall_amenities",
  {
    hallId: uuid("hall_id")
      .notNull()
      .references(() => halls.id, { onDelete: "cascade" }),
    amenitySlug: text("amenity_slug")
      .notNull()
      .references(() => amenities.slug),
  },
  (t) => [primaryKey({ columns: [t.hallId, t.amenitySlug] })],
);

// --------------------------------------------------------------- demand
export const bookingRequests = pgTable(
  "booking_requests",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    /** Short human-friendly code shown to both sides, e.g. CH-7K3Q9. */
    reference: text("reference").notNull(),
    hallId: uuid("hall_id")
      .notNull()
      .references(() => halls.id),
    areaId: uuid("area_id").references(() => hallAreas.id, { onDelete: "set null" }),
    organizerUserId: text("organizer_user_id").references(() => user.id, { onDelete: "set null" }),
    /** Language the organizer used, so later emails match it. */
    locale: text("locale").notNull().default("ka"),
    contactName: text("contact_name").notNull(),
    contactPhone: text("contact_phone").notNull(),
    contactEmail: text("contact_email").notNull(),
    eventType: text("event_type")
      .notNull()
      .references(() => eventTypes.slug),
    eventDate: date("event_date", { mode: "string" }).notNull(),
    timeOfDay: timeOfDay("time_of_day").notNull().default("full_day"),
    guests: integer("guests").notNull(),
    message: text("message"),
    status: bookingStatus("status").notNull().default("pending"),
    /** Agreed hall price and deposit, set when the venue accepts. */
    quotedTotalTetri: integer("quoted_total_tetri"),
    depositTetri: integer("deposit_tetri"),
    declineReason: text("decline_reason"),
    /** If the venue has not answered by then, the request expires. */
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    respondedAt: timestamp("responded_at", { withTimezone: true }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    uniqueIndex("booking_requests_reference_uq").on(t.reference),
    index("booking_requests_status_idx").on(t.status, t.expiresAt),
    index("booking_requests_hall_idx").on(t.hallId),
    index("booking_requests_organizer_idx").on(t.organizerUserId),
  ],
);

export const payments = pgTable(
  "payments",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    bookingRequestId: uuid("booking_request_id")
      .notNull()
      .references(() => bookingRequests.id),
    provider: text("provider").notNull(),
    /** Our order id sent to the gateway; unique per provider. */
    providerOrderId: text("provider_order_id").notNull(),
    amountTetri: integer("amount_tetri").notNull(),
    currency: text("currency").notNull().default("GEL"),
    status: paymentStatus("status").notNull().default("pending"),
    checkoutUrl: text("checkout_url"),
    paidAt: timestamp("paid_at", { withTimezone: true }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    uniqueIndex("payments_provider_order_uq").on(t.provider, t.providerOrderId),
    index("payments_booking_idx").on(t.bookingRequestId),
  ],
);

/** One row per webhook delivery. The unique key makes replays harmless. */
export const paymentEvents = pgTable(
  "payment_events",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    provider: text("provider").notNull(),
    eventId: text("event_id").notNull(),
    payload: jsonb("payload").notNull(),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex("payment_events_uq").on(t.provider, t.eventId)],
);

/**
 * Transactional outbox. Notifications are written in the same transaction as
 * the change that caused them, then delivered by a worker with retries, so a
 * WhatsApp or email outage never loses a request.
 */
export const notificationEvents = pgTable(
  "notification_events",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    kind: text("kind").notNull(),
    channel: notificationChannel("channel").notNull(),
    /** Phone number or email address. */
    recipient: text("recipient").notNull(),
    locale: text("locale").notNull().default("ka"),
    payload: jsonb("payload").$type<Record<string, unknown>>().notNull(),
    /** Prevents duplicate rows for the same event + recipient + channel. */
    dedupeKey: text("dedupe_key").notNull(),
    status: outboxStatus("status").notNull().default("pending"),
    attempts: integer("attempts").notNull().default(0),
    nextAttemptAt: timestamp("next_attempt_at", { withTimezone: true }).defaultNow().notNull(),
    lastError: text("last_error"),
    createdAt: createdAt(),
    sentAt: timestamp("sent_at", { withTimezone: true }),
  },
  (t) => [
    uniqueIndex("notification_events_dedupe_uq").on(t.dedupeKey),
    index("notification_events_due_idx").on(t.status, t.nextAttemptAt),
  ],
);

/** Contact form, the "tell us your brief" concierge form, and "list your hall" leads. */
export const inquiries = pgTable(
  "inquiries",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    kind: inquiryKind("kind").notNull(),
    name: text("name").notNull(),
    phone: text("phone"),
    email: text("email").notNull(),
    message: text("message"),
    citySlug: text("city_slug"),
    eventType: text("event_type"),
    guests: integer("guests"),
    eventDate: date("event_date", { mode: "string" }),
    status: inquiryStatus("status").notNull().default("new"),
    createdAt: createdAt(),
  },
  (t) => [index("inquiries_status_idx").on(t.status, t.createdAt)],
);
