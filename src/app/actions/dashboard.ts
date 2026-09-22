"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { z } from "zod";
import { getDb } from "@/db";
import { getVenueRequest } from "@/db/queries/requests";
import { BookingError, respondToRequest } from "@/domain/booking-service";
import { drainOutboxSoon } from "@/lib/drain";
import { echoValues, type FormState } from "@/lib/form-state";
import { parseGel } from "@/lib/money";
import { requireUser } from "@/lib/session";

/**
 * A venue answers a request. Public by POST, so it re-checks the session and
 * that the request belongs to one of this user's venues before doing anything.
 */
export async function answerRequest(_prev: FormState, formData: FormData): Promise<FormState> {
  const values = echoValues(formData);
  const locale = values.locale === "en" ? "en" : "ka";
  const user = await requireUser(locale, ["venue"]);

  const requestId = z.uuid().safeParse(values.requestId);
  if (!requestId.success) return { status: "error", formError: "forbidden", values };

  const db = await getDb();
  const request = await getVenueRequest(db, user.id, requestId.data, locale);
  if (!request) return { status: "error", formError: "forbidden", values };

  const decision = values.decision;
  let response: Parameters<typeof respondToRequest>[1]["response"];
  if (decision === "accept") {
    const total = parseGel(values.total ?? "");
    if (!total) return { status: "error", fieldErrors: { total: "invalid_price" }, values };
    response = { type: "accept", totalTetri: total };
  } else if (decision === "decline") {
    response = { type: "decline", reason: values.reason };
  } else {
    return { status: "error", formError: "generic", values };
  }

  try {
    await respondToRequest(db, { requestId: request.id, actor: { role: "venue", venueId: request.venueId }, response });
  } catch (err) {
    if (err instanceof BookingError) return { status: "error", formError: err.code, values };
    console.error("[dashboard] answer failed", err);
    return { status: "error", formError: "generic", values };
  }

  after(drainOutboxSoon);
  revalidatePath(`/${locale}/dashboard`, "layout");
  return { status: "success" };
}
