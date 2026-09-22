"use client";

import { useTranslations } from "next-intl";
import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { BilingualTextField, CheckboxGroup, SelectField, TextField } from "@/components/ui/field";
import { Notice } from "@/components/ui/notice";
import { IDLE, type FormState } from "@/lib/form-state";
import { useErrorText } from "@/lib/use-error-text";

export type HallFormValues = {
  name: { ka: string; en: string };
  description: { ka: string; en: string } | null;
  hallType: string;
  priceFromTetri: number;
  priceUnit: "hour" | "half_day" | "day";
  capacityMin: number;
  capacityMax: number;
  indoor: boolean;
  featured: boolean;
  status: "draft" | "published";
  sortOrder: number;
};

const HALL_TYPES = ["conference_hall", "ballroom", "meeting_room", "auditorium", "exhibition_hall"] as const;
const PRICE_UNITS = ["hour", "half_day", "day"] as const;

export function HallForm({
  locale,
  action,
  venueId,
  hallId,
  hall,
  eventTypes,
  amenities,
  selectedEventTypes = [],
  selectedAmenities = [],
}: {
  locale: string;
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
  /** Only when creating a hall under a venue. */
  venueId?: string;
  hallId?: string;
  hall?: HallFormValues;
  eventTypes: { slug: string; name: string }[];
  amenities: { slug: string; name: string }[];
  selectedEventTypes?: string[];
  selectedAmenities?: string[];
}) {
  const t = useTranslations("admin.hallForm");
  const errorText = useErrorText();
  const [state, formAction, pending] = useActionState(action, IDLE);
  // See the identical comment in venue-form.tsx: remounts the form on every
  // action result so select/checkbox defaults (not just text inputs) restore
  // correctly after a validation error.
  const [prevState, setPrevState] = useState(state);
  const [gen, setGen] = useState(0);
  if (state !== prevState) {
    setPrevState(state);
    setGen((g) => g + 1);
  }

  const field = (key: string, fallback?: string) =>
    state.status === "error" ? (state.values?.[key] ?? fallback ?? "") : (fallback ?? "");
  const err = (key: string) => errorText(state.status === "error" ? state.fieldErrors?.[key] : undefined);

  // Also remount once fresh server data for `hall` arrives after a successful
  // save (which can land in a separate render pass from the one above), so
  // the fields don't keep showing what was on screen right before the save.
  return (
    <form key={`${gen}-${JSON.stringify(hall)}`} action={formAction} className="flex flex-col gap-5 rounded-card bg-blush p-5 shadow-card md:p-6">
      <input type="hidden" name="locale" value={locale} />
      {venueId ? <input type="hidden" name="venueId" value={venueId} /> : null}
      {hallId ? <input type="hidden" name="hallId" value={hallId} /> : null}

      {state.status === "error" && state.formError ? <Notice tone="error">{errorText(state.formError)}</Notice> : null}
      {state.status === "success" ? <Notice tone="success">{t("saved")}</Notice> : null}

      <BilingualTextField
        legend={t("name")}
        name="name"
        ka={field("name.ka", hall?.name.ka)}
        en={field("name.en", hall?.name.en)}
        errorKa={err("name.ka")}
        errorEn={err("name.en")}
      />
      <BilingualTextField
        legend={t("description")}
        name="description"
        textarea
        ka={field("description.ka", hall?.description?.ka)}
        en={field("description.en", hall?.description?.en)}
      />

      <div className="grid gap-3 sm:grid-cols-2">
        <SelectField
          id="hall-type"
          name="hallType"
          label={t("hallType")}
          placeholder={t("hallType")}
          defaultValue={field("hallType", hall?.hallType ?? "conference_hall")}
          options={HALL_TYPES.map((v) => ({ value: v, label: t(`type_${v}`) }))}
        />
        <SelectField
          id="hall-status"
          name="status"
          label={t("status")}
          placeholder={t("status")}
          defaultValue={field("status", hall?.status ?? "draft")}
          options={[
            { value: "draft", label: t("statusDraft") },
            { value: "published", label: t("statusPublished") },
          ]}
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <TextField
          id="hall-price"
          name="price"
          inputMode="decimal"
          label={t("price")}
          defaultValue={field("price", hall ? (hall.priceFromTetri / 100).toString() : undefined)}
          error={err("price")}
        />
        <SelectField
          id="hall-price-unit"
          name="priceUnit"
          label={t("priceUnit")}
          placeholder={t("priceUnit")}
          defaultValue={field("priceUnit", hall?.priceUnit ?? "day")}
          options={PRICE_UNITS.map((v) => ({ value: v, label: t(`unit_${v}`) }))}
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <TextField
          id="hall-capacity-min"
          name="capacityMin"
          type="number"
          min={1}
          label={t("capacityMin")}
          defaultValue={field("capacityMin", hall?.capacityMin?.toString())}
          error={err("capacityMin")}
        />
        <TextField
          id="hall-capacity-max"
          name="capacityMax"
          type="number"
          min={1}
          label={t("capacityMax")}
          defaultValue={field("capacityMax", hall?.capacityMax?.toString())}
          error={err("capacityMax")}
        />
      </div>

      <CheckboxGroup
        legend={t("eventTypes")}
        name="eventTypes"
        options={eventTypes.map((e) => ({ value: e.slug, label: e.name }))}
        defaultValue={state.status === "error" ? (state.values?.eventTypes ?? "").split(",").filter(Boolean) : selectedEventTypes}
      />
      <CheckboxGroup
        legend={t("amenities")}
        name="amenities"
        options={amenities.map((a) => ({ value: a.slug, label: a.name }))}
        defaultValue={state.status === "error" ? (state.values?.amenities ?? "").split(",").filter(Boolean) : selectedAmenities}
      />

      <div className="flex flex-wrap gap-5">
        <label className="flex cursor-pointer items-center gap-2 text-sm font-semibold">
          <input type="checkbox" name="indoor" defaultChecked={hall?.indoor ?? true} className="size-4 rounded border-brown accent-brown" />
          {t("indoor")}
        </label>
        <label className="flex cursor-pointer items-center gap-2 text-sm font-semibold">
          <input type="checkbox" name="featured" defaultChecked={hall?.featured ?? false} className="size-4 rounded border-brown accent-brown" />
          {t("featured")}
        </label>
      </div>
      <input type="hidden" name="sortOrder" value={field("sortOrder", hall?.sortOrder?.toString() ?? "0")} />

      <Button type="submit" disabled={pending} className="self-start">
        {hallId ? t("save") : t("create")}
      </Button>
    </form>
  );
}
