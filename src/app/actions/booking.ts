"use server";

import { after } from "next/server";
import { getDb } from "@/db";
import { bookingRequestSchema, fieldErrors } from "@/domain/booking-input";
import { BookingError, createBookingRequest } from "@/domain/booking-service";
import { todayInTbilisi } from "@/lib/dates";
import { drainOutboxSoon } from "@/lib/drain";
import { echoValues, type FormState } from "@/lib/form-state";
import { verifyTurnstile } from "@/lib/turnstile";

/** Booking error codes that belong next to a specific field. */
const FIELD_FOR: Partial<Record<string, string>> = {
  invalid_event_type: "eventType",
  guests_exceed_capacity: "guests",
  invalid_area: "areaId",
};

/**
 * Public action (anyone can call it by POST), so it validates everything
 * itself: honeypot, Turnstile, schema, then the business rules in the service.
 */
export async function submitBookingRequest(_prev: FormState, formData: FormData): Promise<FormState> {
  const values = echoValues(formData);
  const locale = values.locale === "en" ? "en" : "ka";

  // Bots that fill the hidden field get a fake success and nothing is stored.
  if (String(formData.get("website") ?? "") !== "") return { status: "success", reference: "CH-XXXXX" };

  if (!(await verifyTurnstile(String(formData.get("cf-turnstile-response") ?? "")))) {
    return { status: "error", formError: "spam", values };
  }

  const parsed = bookingRequestSchema(todayInTbilisi()).safeParse(values);
  if (!parsed.success) return { status: "error", fieldErrors: fieldErrors(parsed.error), values };

  try {
    const { reference } = await createBookingRequest(await getDb(), parsed.data, { locale });
    after(drainOutboxSoon);
    return { status: "success", reference, email: parsed.data.email };
  } catch (err) {
    if (err instanceof BookingError) {
      const field = FIELD_FOR[err.code];
      return field
        ? { status: "error", fieldErrors: { [field]: err.code }, values }
        : { status: "error", formError: err.code, values };
    }
    console.error("[booking] unexpected failure", err);
    return { status: "error", formError: "generic", values };
  }
}
