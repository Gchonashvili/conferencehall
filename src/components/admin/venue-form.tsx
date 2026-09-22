"use client";

import { useTranslations } from "next-intl";
import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { BilingualTextField, SelectField, TextField } from "@/components/ui/field";
import { Notice } from "@/components/ui/notice";
import { IDLE, type FormState } from "@/lib/form-state";
import { useErrorText } from "@/lib/use-error-text";

export type VenueFormValues = {
  name: { ka: string; en: string };
  description: { ka: string; en: string } | null;
  citySlug: string;
  address: { ka: string; en: string } | null;
  lat: number | null;
  lng: number | null;
  phone: string | null;
  email: string | null;
  whatsapp: string | null;
  website: string | null;
  status: "draft" | "active" | "suspended";
  verified: boolean;
  subscriptionStatus: "none" | "trial" | "active" | "expired";
  subscriptionUntil: string | null;
  depositPercent: number | null;
};

export function VenueForm({
  locale,
  action,
  cities,
  venue,
  venueId,
}: {
  locale: string;
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
  cities: { slug: string; name: string }[];
  /** Omitted when creating; present when editing an existing venue. */
  venue?: VenueFormValues;
  venueId?: string;
}) {
  const t = useTranslations("admin.venueForm");
  const errorText = useErrorText();
  const [state, formAction, pending] = useActionState(action, IDLE);
  // `<select>`/checkbox `defaultValue`/`defaultChecked` only apply on mount, so a
  // failed submission wouldn't otherwise restore them (unlike text inputs, whose
  // own DOM value survives a re-render untouched). Remounting the form each time
  // `state` changes makes every field's default value fresh again. (React's
  // documented pattern for this: adjust state during render, not in an effect.)
  const [prevState, setPrevState] = useState(state);
  const [gen, setGen] = useState(0);
  if (state !== prevState) {
    setPrevState(state);
    setGen((g) => g + 1);
  }

  const field = (key: string, fallback?: string) =>
    state.status === "error" ? (state.values?.[key] ?? fallback ?? "") : (fallback ?? "");
  const err = (key: string) => errorText(state.status === "error" ? state.fieldErrors?.[key] : undefined);

  // Also remount once fresh server data for `venue` arrives after a
  // successful save (which can land in a separate render pass from the one
  // above), so the fields don't keep showing what was on screen right before
  // the save.
  return (
    <form key={`${gen}-${JSON.stringify(venue)}`} action={formAction} className="flex flex-col gap-5 rounded-card bg-blush p-5 shadow-card md:p-6">
      <input type="hidden" name="locale" value={locale} />
      {venueId ? <input type="hidden" name="venueId" value={venueId} /> : null}

      {state.status === "error" && state.formError ? <Notice tone="error">{errorText(state.formError)}</Notice> : null}
      {state.status === "success" ? <Notice tone="success">{t("saved")}</Notice> : null}

      <BilingualTextField
        legend={t("name")}
        name="name"
        ka={field("name.ka", venue?.name.ka)}
        en={field("name.en", venue?.name.en)}
        errorKa={err("name.ka")}
        errorEn={err("name.en")}
      />
      <BilingualTextField
        legend={t("description")}
        name="description"
        textarea
        ka={field("description.ka", venue?.description?.ka)}
        en={field("description.en", venue?.description?.en)}
      />
      <SelectField
        id="venue-city"
        name="citySlug"
        label={t("city")}
        placeholder={t("chooseCity")}
        defaultValue={field("citySlug", venue?.citySlug)}
        options={cities.map((c) => ({ value: c.slug, label: c.name }))}
        error={err("citySlug")}
      />
      <BilingualTextField
        legend={t("address")}
        name="address"
        ka={field("address.ka", venue?.address?.ka)}
        en={field("address.en", venue?.address?.en)}
      />
      <div className="grid gap-3 sm:grid-cols-2">
        <TextField id="venue-lat" name="lat" label={t("lat")} inputMode="decimal" defaultValue={field("lat", venue?.lat?.toString())} />
        <TextField id="venue-lng" name="lng" label={t("lng")} inputMode="decimal" defaultValue={field("lng", venue?.lng?.toString())} />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <TextField id="venue-phone" name="phone" label={t("phone")} defaultValue={field("phone", venue?.phone ?? undefined)} />
        <TextField
          id="venue-email"
          name="email"
          type="email"
          label={t("email")}
          defaultValue={field("email", venue?.email ?? undefined)}
          error={err("email")}
        />
        <TextField id="venue-whatsapp" name="whatsapp" label={t("whatsapp")} defaultValue={field("whatsapp", venue?.whatsapp ?? undefined)} />
        <TextField id="venue-website" name="website" label={t("website")} defaultValue={field("website", venue?.website ?? undefined)} />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <SelectField
          id="venue-status"
          name="status"
          label={t("status")}
          placeholder={t("status")}
          defaultValue={field("status", venue?.status ?? "draft")}
          options={[
            { value: "draft", label: t("statusDraft") },
            { value: "active", label: t("statusActive") },
            { value: "suspended", label: t("statusSuspended") },
          ]}
        />
        <SelectField
          id="venue-subscription"
          name="subscriptionStatus"
          label={t("subscriptionStatus")}
          placeholder={t("subscriptionStatus")}
          defaultValue={field("subscriptionStatus", venue?.subscriptionStatus ?? "none")}
          options={[
            { value: "none", label: t("subscriptionNone") },
            { value: "trial", label: t("subscriptionTrial") },
            { value: "active", label: t("subscriptionActive") },
            { value: "expired", label: t("subscriptionExpired") },
          ]}
        />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <TextField
          id="venue-subscription-until"
          name="subscriptionUntil"
          type="date"
          label={t("subscriptionUntil")}
          defaultValue={field("subscriptionUntil", venue?.subscriptionUntil ?? undefined)}
        />
        <TextField
          id="venue-deposit-percent"
          name="depositPercent"
          type="number"
          min={1}
          max={100}
          label={t("depositPercent")}
          defaultValue={field("depositPercent", venue?.depositPercent?.toString())}
        />
      </div>

      <label className="flex cursor-pointer items-center gap-2 text-sm font-semibold">
        <input
          type="checkbox"
          name="verified"
          defaultChecked={venue?.verified ?? false}
          className="size-4 rounded border-brown accent-brown"
        />
        {t("verified")}
      </label>

      <Button type="submit" disabled={pending} className="self-start">
        {venueId ? t("save") : t("create")}
      </Button>
    </form>
  );
}
