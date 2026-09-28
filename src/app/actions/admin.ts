"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { z } from "zod";
import {
  fieldErrors,
  hallAreaSchema,
  hallImageSchema,
  hallSchema,
  nestBilingual,
  venueSchema,
} from "@/domain/admin-input";
import {
  addHallArea,
  addHallImage,
  AdminError,
  createHall,
  createVenue,
  deleteHallArea,
  deleteHallImage,
  setCoverImage,
  updateHall,
  updateVenue,
} from "@/domain/admin-service";
import { BookingError, cancelRequest } from "@/domain/booking-service";
import { leadUpdateSchema, noteSchema, paymentSchema } from "@/domain/crm-input";
import { addNote, CrmError, logSubscriptionPayment, updateLead } from "@/domain/crm-service";
import { getDb } from "@/db";
import { redirect } from "@/i18n/navigation";
import { drainOutboxSoon } from "@/lib/drain";
import { echoValues, type FormState } from "@/lib/form-state";
import { parseGel } from "@/lib/money";
import { requireUser } from "@/lib/session";

const localeOf = (v: string | undefined) => (v === "en" ? "en" : "ka");
const uuid = (v: unknown) => z.uuid().safeParse(v);

// --------------------------------------------------------------- venues
export async function createVenueAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const values = echoValues(formData);
  const locale = localeOf(values.locale);
  await requireUser(locale, ["admin"]);

  const parsed = venueSchema.safeParse(nestBilingual(values, ["name", "description", "address"]));
  if (!parsed.success) return { status: "error", fieldErrors: fieldErrors(parsed.error), values };

  let created: { id: string };
  try {
    created = await createVenue(await getDb(), parsed.data);
  } catch (err) {
    if (err instanceof AdminError) return { status: "error", formError: err.code, values };
    console.error("[admin] create venue failed", err);
    return { status: "error", formError: "generic", values };
  }

  revalidatePath(`/${locale}/admin/venues`, "layout");
  return redirect({ href: `/admin/venues/${created.id}`, locale });
}

export async function updateVenueAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const values = echoValues(formData);
  const locale = localeOf(values.locale);
  await requireUser(locale, ["admin"]);

  const venueId = uuid(values.venueId);
  if (!venueId.success) return { status: "error", formError: "not_found", values };

  const parsed = venueSchema.safeParse(nestBilingual(values, ["name", "description", "address"]));
  if (!parsed.success) return { status: "error", fieldErrors: fieldErrors(parsed.error), values };

  try {
    await updateVenue(await getDb(), venueId.data, parsed.data);
  } catch (err) {
    if (err instanceof AdminError) return { status: "error", formError: err.code, values };
    console.error("[admin] update venue failed", err);
    return { status: "error", formError: "generic", values };
  }

  revalidatePath(`/${locale}/admin/venues`, "layout");
  return { status: "success" };
}

export async function logPaymentAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const values = echoValues(formData);
  const locale = localeOf(values.locale);
  const me = await requireUser(locale, ["admin"]);

  const venueId = uuid(values.venueId);
  if (!venueId.success) return { status: "error", formError: "not_found", values };

  const parsed = paymentSchema.safeParse(values);
  if (!parsed.success) return { status: "error", fieldErrors: fieldErrors(parsed.error), values };

  try {
    await logSubscriptionPayment(await getDb(), venueId.data, parsed.data, { actorUserId: me.id });
  } catch (err) {
    if (err instanceof CrmError) return { status: "error", formError: err.code, values };
    console.error("[admin] log payment failed", err);
    return { status: "error", formError: "generic", values };
  }

  revalidatePath(`/${locale}/admin`, "layout");
  return { status: "success" };
}

// ---------------------------------------------------------------- halls
function readHallInput(values: Record<string, string>, formData: FormData) {
  return {
    ...nestBilingual(values, ["name", "description"]),
    eventTypes: formData.getAll("eventTypes").map(String),
    amenities: formData.getAll("amenities").map(String),
  };
}

export async function createHallAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const values = echoValues(formData);
  values.eventTypes = formData.getAll("eventTypes").map(String).join(",");
  values.amenities = formData.getAll("amenities").map(String).join(",");
  const locale = localeOf(values.locale);
  await requireUser(locale, ["admin"]);

  const venueId = uuid(values.venueId);
  if (!venueId.success) return { status: "error", formError: "not_found", values };

  const parsed = hallSchema.safeParse(readHallInput(values, formData));
  if (!parsed.success) return { status: "error", fieldErrors: fieldErrors(parsed.error), values };

  const price = parseGel(parsed.data.price);
  if (!price) return { status: "error", fieldErrors: { price: "invalid_price" }, values };

  let created: { id: string };
  try {
    created = await createHall(await getDb(), venueId.data, parsed.data, price);
  } catch (err) {
    if (err instanceof AdminError) return { status: "error", formError: err.code, values };
    console.error("[admin] create hall failed", err);
    return { status: "error", formError: "generic", values };
  }

  revalidatePath(`/${locale}/admin/venues/${venueId.data}`, "layout");
  return redirect({ href: `/admin/halls/${created.id}`, locale });
}

export async function updateHallAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const values = echoValues(formData);
  values.eventTypes = formData.getAll("eventTypes").map(String).join(",");
  values.amenities = formData.getAll("amenities").map(String).join(",");
  const locale = localeOf(values.locale);
  await requireUser(locale, ["admin"]);

  const hallId = uuid(values.hallId);
  if (!hallId.success) return { status: "error", formError: "not_found", values };

  const parsed = hallSchema.safeParse(readHallInput(values, formData));
  if (!parsed.success) return { status: "error", fieldErrors: fieldErrors(parsed.error), values };

  const price = parseGel(parsed.data.price);
  if (!price) return { status: "error", fieldErrors: { price: "invalid_price" }, values };

  try {
    await updateHall(await getDb(), hallId.data, parsed.data, price);
  } catch (err) {
    if (err instanceof AdminError) return { status: "error", formError: err.code, values };
    console.error("[admin] update hall failed", err);
    return { status: "error", formError: "generic", values };
  }

  revalidatePath(`/${locale}/admin/halls`, "layout");
  return { status: "success" };
}

// ---------------------------------------------------------- hall areas
export async function addHallAreaAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const values = echoValues(formData);
  const locale = localeOf(values.locale);
  await requireUser(locale, ["admin"]);

  const hallId = uuid(values.hallId);
  if (!hallId.success) return { status: "error", formError: "not_found", values };

  const parsed = hallAreaSchema.safeParse(nestBilingual(values, ["name"]));
  if (!parsed.success) return { status: "error", fieldErrors: fieldErrors(parsed.error), values };

  try {
    await addHallArea(await getDb(), hallId.data, parsed.data);
  } catch (err) {
    if (err instanceof AdminError) return { status: "error", formError: err.code, values };
    console.error("[admin] add area failed", err);
    return { status: "error", formError: "generic", values };
  }

  revalidatePath(`/${locale}/admin/halls`, "layout");
  return { status: "success" };
}

export async function deleteHallAreaAction(formData: FormData): Promise<void> {
  const locale = localeOf(String(formData.get("locale") ?? ""));
  await requireUser(locale, ["admin"]);
  const hallId = uuid(formData.get("hallId"));
  const areaId = uuid(formData.get("areaId"));
  if (hallId.success && areaId.success) {
    await deleteHallArea(await getDb(), hallId.data, areaId.data);
    revalidatePath(`/${locale}/admin/halls`, "layout");
  }
  return redirect({ href: hallId.success ? `/admin/halls/${hallId.data}` : "/admin/halls", locale });
}

// --------------------------------------------------------- hall images
export async function addHallImageAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const values = echoValues(formData);
  const locale = localeOf(values.locale);
  await requireUser(locale, ["admin"]);

  const hallId = uuid(values.hallId);
  if (!hallId.success) return { status: "error", formError: "not_found", values };

  const parsed = hallImageSchema.safeParse(nestBilingual(values, ["alt"]));
  if (!parsed.success) return { status: "error", fieldErrors: fieldErrors(parsed.error), values };

  try {
    await addHallImage(await getDb(), hallId.data, parsed.data);
  } catch (err) {
    if (err instanceof AdminError) return { status: "error", formError: err.code, values };
    console.error("[admin] add image failed", err);
    return { status: "error", formError: "generic", values };
  }

  revalidatePath(`/${locale}/admin/halls`, "layout");
  return { status: "success" };
}

export async function deleteHallImageAction(formData: FormData): Promise<void> {
  const locale = localeOf(String(formData.get("locale") ?? ""));
  await requireUser(locale, ["admin"]);
  const hallId = uuid(formData.get("hallId"));
  const imageId = uuid(formData.get("imageId"));
  if (hallId.success && imageId.success) {
    await deleteHallImage(await getDb(), hallId.data, imageId.data);
    revalidatePath(`/${locale}/admin/halls`, "layout");
  }
  return redirect({ href: hallId.success ? `/admin/halls/${hallId.data}` : "/admin/halls", locale });
}

export async function setCoverImageAction(formData: FormData): Promise<void> {
  const locale = localeOf(String(formData.get("locale") ?? ""));
  await requireUser(locale, ["admin"]);
  const hallId = uuid(formData.get("hallId"));
  const imageId = uuid(formData.get("imageId"));
  if (hallId.success && imageId.success) {
    await setCoverImage(await getDb(), hallId.data, imageId.data);
    revalidatePath(`/${locale}/admin/halls`, "layout");
  }
  return redirect({ href: hallId.success ? `/admin/halls/${hallId.data}` : "/admin/halls", locale });
}

// ------------------------------------------------------------ requests
export async function cancelRequestAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const values = echoValues(formData);
  const locale = localeOf(values.locale);
  await requireUser(locale, ["admin"]);

  const requestId = uuid(values.requestId);
  if (!requestId.success) return { status: "error", formError: "not_found", values };

  try {
    await cancelRequest(await getDb(), requestId.data, { reason: values.reason });
  } catch (err) {
    if (err instanceof BookingError) return { status: "error", formError: err.code, values };
    console.error("[admin] cancel request failed", err);
    return { status: "error", formError: "generic", values };
  }

  after(drainOutboxSoon);
  revalidatePath(`/${locale}/admin/requests`, "layout");
  return { status: "success" };
}

// ---------------------------------------------------------------- leads
export async function updateLeadAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const values = echoValues(formData);
  const locale = localeOf(values.locale);
  const me = await requireUser(locale, ["admin"]);

  const leadId = uuid(values.leadId);
  if (!leadId.success) return { status: "error", formError: "not_found", values };

  const parsed = leadUpdateSchema.safeParse(values);
  if (!parsed.success) return { status: "error", fieldErrors: fieldErrors(parsed.error), values };

  try {
    await updateLead(await getDb(), leadId.data, parsed.data, { actorUserId: me.id });
  } catch (err) {
    if (err instanceof CrmError) {
      return err.code === "invalid_owner"
        ? { status: "error", fieldErrors: { ownerUserId: err.code }, values }
        : { status: "error", formError: err.code, values };
    }
    console.error("[admin] update lead failed", err);
    return { status: "error", formError: "generic", values };
  }

  revalidatePath(`/${locale}/admin`, "layout");
  return { status: "success" };
}

export async function addLeadNoteAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const values = echoValues(formData);
  const locale = localeOf(values.locale);
  const me = await requireUser(locale, ["admin"]);

  const leadId = uuid(values.leadId);
  if (!leadId.success) return { status: "error", formError: "not_found", values };

  const parsed = noteSchema.safeParse(values);
  if (!parsed.success) return { status: "error", fieldErrors: fieldErrors(parsed.error), values };

  try {
    await addNote(await getDb(), { entityType: "inquiry", entityId: leadId.data, body: parsed.data.body, authorUserId: me.id });
  } catch (err) {
    if (err instanceof CrmError) return { status: "error", formError: err.code, values };
    console.error("[admin] add note failed", err);
    return { status: "error", formError: "generic", values };
  }

  revalidatePath(`/${locale}/admin/leads/${leadId.data}`);
  return { status: "success" };
}
