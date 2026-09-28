"use client";

import { useTranslations } from "next-intl";
import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/field";
import { Notice } from "@/components/ui/notice";
import { IDLE, type FormState } from "@/lib/form-state";
import { useErrorText } from "@/lib/use-error-text";

/**
 * Logs one subscription payment for a venue. The server pre-fills the plan
 * price and the next period, so a routine renewal is just "Save".
 */
export function PaymentForm({
  locale,
  venueId,
  defaults,
  action,
}: {
  locale: string;
  venueId: string;
  /** Amount in lari (as typed), and calendar days. */
  defaults: { amount: string; paidOn: string; periodStart: string; periodEnd: string };
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
}) {
  const t = useTranslations("admin.subscriptions");
  const errorText = useErrorText();
  const [state, formAction, pending] = useActionState(action, IDLE);
  // Remount on each result (see venue-form.tsx): restores typed values after
  // an error, and picks up the next period's defaults after a save.
  const [prevState, setPrevState] = useState(state);
  const [gen, setGen] = useState(0);
  if (state !== prevState) {
    setPrevState(state);
    setGen((g) => g + 1);
  }

  const field = (key: keyof typeof defaults | "invoiceNo" | "note") =>
    state.status === "error" ? (state.values?.[key] ?? "") : key in defaults ? defaults[key as keyof typeof defaults] : "";
  const err = (key: string) => errorText(state.status === "error" ? state.fieldErrors?.[key] : undefined);

  return (
    <form key={`${gen}-${JSON.stringify(defaults)}`} action={formAction} className="flex flex-col gap-3">
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="venueId" value={venueId} />

      {state.status === "error" && state.formError ? <Notice tone="error">{errorText(state.formError)}</Notice> : null}
      {state.status === "success" ? <Notice tone="success">{t("paymentLogged")}</Notice> : null}

      <div className="grid gap-3 sm:grid-cols-2">
        <TextField id="pay-amount" name="amount" inputMode="decimal" required label={t("amount")} defaultValue={field("amount")} error={err("amount")} />
        <TextField id="pay-paid-on" name="paidOn" type="date" required label={t("paidOn")} defaultValue={field("paidOn")} error={err("paidOn")} />
        <TextField id="pay-start" name="periodStart" type="date" required label={t("periodStart")} defaultValue={field("periodStart")} error={err("periodStart")} />
        <TextField id="pay-end" name="periodEnd" type="date" required label={t("periodEnd")} defaultValue={field("periodEnd")} error={err("periodEnd")} />
        <TextField id="pay-invoice" name="invoiceNo" maxLength={50} label={t("invoiceNo")} defaultValue={field("invoiceNo")} error={err("invoiceNo")} />
        <TextField id="pay-note" name="note" maxLength={1000} label={t("note")} defaultValue={field("note")} error={err("note")} />
      </div>

      <Button type="submit" disabled={pending} className="self-start">
        {t("logPayment")}
      </Button>
    </form>
  );
}
