"use client";

import { CircleCheck } from "lucide-react";
import { useTranslations } from "next-intl";
import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { SelectField, TextareaField, TextField } from "@/components/ui/field";
import { Honeypot } from "@/components/ui/honeypot";
import { Notice } from "@/components/ui/notice";
import { Turnstile } from "@/components/ui/turnstile";
import { IDLE, type FormState } from "@/lib/form-state";
import { useErrorText } from "@/lib/use-error-text";

type Option = { value: string; label: string };
export type InquiryKind = "contact" | "brief" | "venue";

/**
 * One form, three purposes: general contact, "tell us your brief" (event
 * details so the team can suggest halls) and "list your hall" (venue leads).
 */
export function ContactForm({
  kind,
  locale,
  cities,
  eventTypes,
  action,
}: {
  kind: InquiryKind;
  locale: string;
  cities: Option[];
  eventTypes: Option[];
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
}) {
  const t = useTranslations("contact");
  const tb = useTranslations("booking2");
  const errorText = useErrorText();
  const [state, formAction, pending] = useActionState(action, IDLE);

  const values = state.status === "error" ? (state.values ?? {}) : {};
  const errors = state.status === "error" ? (state.fieldErrors ?? {}) : {};
  const err = (f: string) => errorText(errors[f]);

  if (state.status === "success") {
    return (
      <div role="status" className="rounded-card bg-blush p-8 text-center shadow-card">
        <CircleCheck aria-hidden className="mx-auto mb-3 size-10 text-coral-strong" />
        <h2 className="text-xl font-semibold">{t("successTitle")}</h2>
        <p className="mt-2">{t("successBody")}</p>
      </div>
    );
  }

  return (
    <form action={formAction} className="relative flex flex-col gap-4 rounded-card bg-blush p-6 shadow-card md:p-8">
      {state.status === "error" && (state.formError || Object.keys(errors).length > 0) ? (
        <Notice tone="error">{state.formError ? errorText(state.formError) : tb("fixErrors")}</Notice>
      ) : null}

      <input type="hidden" name="kind" value={kind} />
      <input type="hidden" name="locale" value={locale} />
      <Honeypot />

      <TextField id="c-name" name="name" label={t("name")} autoComplete="name" required defaultValue={values.name} error={err("name")} />
      <TextField id="c-email" name="email" type="email" label={t("email")} autoComplete="email" required defaultValue={values.email} error={err("email")} />
      <TextField
        id="c-phone"
        name="phone"
        type="tel"
        label={t("phone")}
        autoComplete="tel"
        required={kind !== "contact"}
        defaultValue={values.phone}
        error={err("phone")}
      />

      {kind === "brief" ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            <SelectField id="c-city" name="citySlug" label={t("city")} placeholder={t("choose")} options={cities} required defaultValue={values.citySlug ?? ""} error={err("citySlug")} />
            <SelectField id="c-type" name="eventType" label={t("eventType")} placeholder={t("choose")} options={eventTypes} defaultValue={values.eventType ?? ""} error={err("eventType")} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField id="c-guests" name="guests" type="number" min={1} inputMode="numeric" label={t("guests")} defaultValue={values.guests} error={err("guests")} />
            <TextField id="c-date" name="eventDate" type="date" label={t("date")} defaultValue={values.eventDate} error={err("eventDate")} />
          </div>
        </>
      ) : null}

      <TextareaField
        id="c-message"
        name="message"
        label={kind === "venue" ? t("venueMessage") : t("message")}
        required={kind !== "brief"}
        defaultValue={values.message}
        error={err("message")}
      />

      <Turnstile />
      <Button type="submit" size="lg" disabled={pending}>
        {pending ? t("sending") : t("submit")}
      </Button>
    </form>
  );
}
