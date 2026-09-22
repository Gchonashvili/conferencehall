"use server";

import { after } from "next/server";
import { getDb } from "@/db";
import { createInquiry, InquiryError, inquirySchema } from "@/domain/inquiry-service";
import { fieldErrors } from "@/domain/booking-input";
import { todayInTbilisi } from "@/lib/dates";
import { drainOutboxSoon } from "@/lib/drain";
import { echoValues, type FormState } from "@/lib/form-state";
import { verifyTurnstile } from "@/lib/turnstile";

const KINDS = ["contact", "brief", "venue"] as const;

/** Contact form, "tell us your brief" and "list your hall": one pipeline. */
export async function submitInquiry(_prev: FormState, formData: FormData): Promise<FormState> {
  const values = echoValues(formData);
  const locale = values.locale === "en" ? "en" : "ka";
  const kind = (KINDS as readonly string[]).includes(values.kind) ? (values.kind as (typeof KINDS)[number]) : "contact";

  if (String(formData.get("website") ?? "") !== "") return { status: "success" };
  if (!(await verifyTurnstile(String(formData.get("cf-turnstile-response") ?? "")))) {
    return { status: "error", formError: "spam", values };
  }

  const parsed = inquirySchema(kind, todayInTbilisi()).safeParse(values);
  if (!parsed.success) return { status: "error", fieldErrors: fieldErrors(parsed.error), values };

  try {
    await createInquiry(await getDb(), { kind, ...parsed.data } as Parameters<typeof createInquiry>[1], { locale });
    after(drainOutboxSoon);
    return { status: "success" };
  } catch (err) {
    if (err instanceof InquiryError) return { status: "error", formError: err.code, values };
    console.error("[inquiry] unexpected failure", err);
    return { status: "error", formError: "generic", values };
  }
}
