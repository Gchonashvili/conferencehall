import { z } from "zod";

/**
 * Server-side validation for the admin panel's venue/hall forms. Same style
 * as `booking-input.ts`: stable error *codes* (not prose), translated by the
 * UI via `use-error-text.ts`.
 */
const SLUG = /^[a-z0-9_-]{1,40}$/;

const blankToUndefined = (v: unknown) => (typeof v === "string" && v.trim() === "" ? undefined : v);

/**
 * An HTML checkbox is only present in the submission when checked (value
 * "on"), and absent (undefined) when unchecked — never "false". `z.coerce
 * .boolean()` rejects that missing case as invalid rather than treating it
 * as false, so checkboxes need this instead.
 */
const checkbox = z.preprocess((v) => v === "on" || v === true, z.boolean());

/** A bilingual field posted as `name.ka` / `name.en` (see `BilingualTextField`). Both required. */
const i18nRequired = z.object({
  ka: z.string().trim().min(1, { error: "required" }).max(200),
  en: z.string().trim().min(1, { error: "required" }).max(200),
});

/** Same, but the whole pair is optional — provide both or neither. */
const i18nOptional = z
  .object({
    ka: z.preprocess(blankToUndefined, z.string().trim().max(2000).optional()),
    en: z.preprocess(blankToUndefined, z.string().trim().max(2000).optional()),
  })
  .refine((v) => (v.ka ? !!v.en : !v.en), { error: "required" })
  .transform((v) => (v.ka && v.en ? { ka: v.ka, en: v.en } : undefined));

const VENUE_STATUS = ["draft", "active", "suspended"] as const;
const SUBSCRIPTION_STATUS = ["none", "trial", "active", "expired"] as const;
const HALL_TYPE = ["conference_hall", "ballroom", "meeting_room", "auditorium", "exhibition_hall"] as const;
const PRICE_UNIT = ["hour", "half_day", "day"] as const;
const HALL_STATUS = ["draft", "published"] as const;

export const venueSchema = z.object({
  name: i18nRequired,
  description: i18nOptional,
  citySlug: z.string().regex(SLUG, { error: "invalid_city" }),
  address: i18nOptional,
  lat: z.preprocess(blankToUndefined, z.coerce.number().min(-90).max(90).optional()),
  lng: z.preprocess(blankToUndefined, z.coerce.number().min(-180).max(180).optional()),
  phone: z.preprocess(blankToUndefined, z.string().trim().max(40).optional()),
  email: z.preprocess(blankToUndefined, z.string().trim().max(254).pipe(z.email({ error: "invalid_email" })).optional()),
  whatsapp: z.preprocess(blankToUndefined, z.string().trim().max(40).optional()),
  website: z.preprocess(blankToUndefined, z.string().trim().max(300).optional()),
  status: z.enum(VENUE_STATUS, { error: "invalid_state" }),
  verified: checkbox,
  subscriptionStatus: z.enum(SUBSCRIPTION_STATUS, { error: "invalid_state" }),
  subscriptionUntil: z.preprocess(blankToUndefined, z.string().optional()),
  depositPercent: z.preprocess(blankToUndefined, z.coerce.number().int().min(1).max(100).optional()),
});
export type VenueInput = z.infer<typeof venueSchema>;

export const hallSchema = z
  .object({
    name: i18nRequired,
    description: i18nOptional,
    hallType: z.enum(HALL_TYPE, { error: "invalid_state" }),
    price: z.string().min(1, { error: "invalid_price" }),
    priceUnit: z.enum(PRICE_UNIT, { error: "invalid_state" }),
    capacityMin: z.coerce.number({ error: "invalid_guests" }).int().min(1, { error: "invalid_guests" }),
    capacityMax: z.coerce.number({ error: "invalid_guests" }).int().min(1, { error: "invalid_guests" }),
    indoor: checkbox,
    featured: checkbox,
    status: z.enum(HALL_STATUS, { error: "invalid_state" }),
    sortOrder: z.preprocess(blankToUndefined, z.coerce.number().int().optional().default(0)),
    eventTypes: z.array(z.string().regex(SLUG)).default([]),
    amenities: z.array(z.string().regex(SLUG)).default([]),
  })
  .refine((v) => v.capacityMax >= v.capacityMin, { error: "invalid_guests", path: ["capacityMax"] });
export type HallInput = z.infer<typeof hallSchema>;

export const hallAreaSchema = z.object({
  name: i18nRequired,
  capacityTheatre: z.preprocess(blankToUndefined, z.coerce.number().int().min(1).optional()),
  capacityClassroom: z.preprocess(blankToUndefined, z.coerce.number().int().min(1).optional()),
  capacityBanquet: z.preprocess(blankToUndefined, z.coerce.number().int().min(1).optional()),
  capacityReception: z.preprocess(blankToUndefined, z.coerce.number().int().min(1).optional()),
});
export type HallAreaInput = z.infer<typeof hallAreaSchema>;

export const hallImageSchema = z.object({
  url: z.string().trim().max(1000).pipe(z.url({ error: "invalid_url" })),
  alt: i18nOptional,
  isCover: checkbox,
});
export type HallImageInput = z.infer<typeof hallImageSchema>;

export { fieldErrors } from "./booking-input";

/**
 * `echoValues()` (see `lib/form-state.ts`) returns a flat map, so a bilingual
 * pair posted as `name.ka` / `name.en` (see `BilingualTextField`) arrives as
 * two separate flat keys. This regroups the given field names into `{ka, en}`
 * objects, ready for the schemas above.
 */
export function nestBilingual(values: Record<string, string>, fields: string[]): Record<string, unknown> {
  const out: Record<string, unknown> = { ...values };
  for (const f of fields) {
    out[f] = { ka: values[`${f}.ka`] ?? "", en: values[`${f}.en`] ?? "" };
    delete out[`${f}.ka`];
    delete out[`${f}.en`];
  }
  return out;
}
