"use client";

import { CircleCheck } from "lucide-react";
import { useTranslations } from "next-intl";
import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { RadioField, TextField, type RadioOption } from "@/components/ui/field";
import { Honeypot } from "@/components/ui/honeypot";
import { Notice } from "@/components/ui/notice";
import { Turnstile } from "@/components/ui/turnstile";
import { IDLE, type FormState } from "@/lib/form-state";
import { useErrorText } from "@/lib/use-error-text";

type Action = (prev: FormState, formData: FormData) => Promise<FormState>;

/**
 * "Request to Book" side panel from the reference hall page: contact fields,
 * radio groups for event type / time of day / area, then a month calendar.
 * Posts to a Server Action that validates and queues the notifications.
 */
export function BookingSidebar({
  eventTypes,
  areas,
  hallId,
  locale,
  action,
}: {
  eventTypes: RadioOption[];
  areas: RadioOption[];
  hallId?: string;
  locale: string;
  action: Action;
}) {
  const t = useTranslations("booking");
  const tb = useTranslations("booking2");
  const errorText = useErrorText();
  const [state, formAction, pending] = useActionState(action, IDLE);
  const [date, setDate] = useState<Date | undefined>();

  const values = state.status === "error" ? (state.values ?? {}) : {};
  const errors = state.status === "error" ? (state.fieldErrors ?? {}) : {};
  const err = (field: string) => errorText(errors[field]);

  const times: RadioOption[] = [
    { value: "morning", label: t("times.morning") },
    { value: "afternoon", label: t("times.afternoon") },
    { value: "evening", label: t("times.evening") },
    { value: "full_day", label: t("times.fullDay") },
  ];

  if (state.status === "success") {
    return (
      <div role="status" className="rounded-card bg-blush p-5 text-center shadow-card">
        <CircleCheck aria-hidden className="mx-auto mb-3 size-10 text-coral-strong" />
        <h2 className="text-xl font-semibold">{tb("successTitle")}</h2>
        <p className="mt-2 text-sm">{tb("successBody", { reference: state.reference ?? "", email: state.email ?? "" })}</p>
      </div>
    );
  }

  return (
    <form action={formAction} aria-labelledby="booking-title" className="relative rounded-card bg-blush p-5 shadow-card">
      <h2 id="booking-title" className="mb-4 text-xl font-semibold">
        {t("title")}
      </h2>

      {state.status === "error" && (state.formError || Object.keys(errors).length > 0) ? (
        <Notice tone="error" className="mb-4">
          {state.formError ? errorText(state.formError) : tb("fixErrors")}
        </Notice>
      ) : null}

      {hallId ? <input type="hidden" name="hallId" value={hallId} /> : null}
      <input type="hidden" name="locale" value={locale} />
      <Honeypot />

      <div className="flex flex-col gap-3">
        <TextField id="bk-name" name="name" label={t("name")} autoComplete="name" required defaultValue={values.name} error={err("name")} />
        <TextField id="bk-phone" name="phone" type="tel" label={t("phone")} autoComplete="tel" required defaultValue={values.phone} error={err("phone")} />
        <TextField id="bk-email" name="email" type="email" label={t("email")} autoComplete="email" required defaultValue={values.email} error={err("email")} />
        <TextField id="bk-guests" name="guests" type="number" min={1} inputMode="numeric" label={t("guests")} required defaultValue={values.guests} error={err("guests")} />
      </div>

      <div className="mt-5 grid grid-cols-2 gap-5">
        <RadioField legend={t("eventType")} name="eventType" options={eventTypes} defaultValue={values.eventType ?? eventTypes[0]?.value} error={err("eventType")} />
        <RadioField legend={t("timeOfDay")} name="timeOfDay" options={times} defaultValue={values.timeOfDay ?? "full_day"} error={err("timeOfDay")} />
      </div>

      {areas.length > 0 ? (
        <RadioField className="mt-5" legend={t("area")} name="areaId" options={areas} defaultValue={values.areaId ?? areas[0]?.value} error={err("areaId")} />
      ) : null}

      <div className="mt-5">
        <p className="mb-1 text-sm font-semibold text-coral-strong">{t("selectDate")}</p>
        <div className="rounded-xl bg-panel p-3">
          <Calendar selected={date} onSelect={setDate} name="eventDate" />
        </div>
        {err("eventDate") ? <p className="mt-1 text-sm font-semibold text-coral-strong">{err("eventDate")}</p> : null}
      </div>

      <div className="mt-4">
        <Turnstile />
      </div>

      <Button type="submit" disabled={pending} className="mt-5 w-full">
        {pending ? tb("sending") : t("submit")}
      </Button>
      <p className="mt-3 text-center text-xs">{t("note")}</p>
    </form>
  );
}
