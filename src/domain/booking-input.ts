import { z } from "zod";
import { isValidIsoDate } from "@/lib/dates";
import { normalizePhone } from "@/lib/phone";

export const TIMES_OF_DAY = ["morning", "afternoon", "evening", "full_day"] as const;

const SLUG = /^[a-z0-9_-]{1,40}$/;

/** Blank form fields arrive as "". Treat them as "not provided". */
const blankToUndefined = (v: unknown) => (typeof v === "string" && v.trim() === "" ? undefined : v);

/**
 * Server-side validation for a booking request. Error messages are stable
 * codes (not prose) that the UI translates.
 */
export function bookingRequestSchema(today: string) {
  return z.object({
    hallId: z.uuid({ error: "invalid_hall" }),
    areaId: z.preprocess(blankToUndefined, z.uuid({ error: "invalid_area" }).optional()),
    name: z.string().trim().min(2, { error: "name_required" }).max(120, { error: "name_required" }),
    phone: z
      .string()
      .transform((v, ctx) => {
        const phone = normalizePhone(v);
        if (!phone) ctx.addIssue({ code: "custom", message: "invalid_phone" });
        return phone ?? "";
      }),
    email: z
      .string()
      .trim()
      .max(254, { error: "invalid_email" })
      .pipe(z.email({ error: "invalid_email" }))
      .transform((v) => v.toLowerCase()),
    guests: z.coerce.number({ error: "invalid_guests" }).int({ error: "invalid_guests" }).min(1, { error: "invalid_guests" }).max(10000, { error: "invalid_guests" }),
    eventType: z.string().regex(SLUG, { error: "invalid_event_type" }),
    eventDate: z
      .string()
      .refine(isValidIsoDate, { error: "invalid_date" })
      .refine((d) => d >= today, { error: "date_in_past" }),
    timeOfDay: z.enum(TIMES_OF_DAY, { error: "invalid_time" }),
    message: z.preprocess(blankToUndefined, z.string().trim().max(1000, { error: "message_too_long" }).optional()),
  });
}

export type BookingRequestInput = z.infer<ReturnType<typeof bookingRequestSchema>>;

/**
 * First error code per field, ready to show next to the inputs. Nested paths
 * (e.g. a bilingual `name.ka` / `name.en` pair, see `admin-input.ts`) join
 * with ".", matching the dotted keys those forms post fields under.
 */
export function fieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "form";
    if (!(key in out)) out[key] = issue.message;
  }
  return out;
}
