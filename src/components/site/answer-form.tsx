"use client";

import { CircleCheck } from "lucide-react";
import { useTranslations } from "next-intl";
import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { TextareaField, TextField } from "@/components/ui/field";
import { Notice } from "@/components/ui/notice";
import { IDLE, type FormState } from "@/lib/form-state";
import { useErrorText } from "@/lib/use-error-text";

/** Accept (with a price) or decline (with an optional reason) a pending request. */
export function AnswerForm({
  requestId,
  locale,
  depositPercent,
  action,
}: {
  requestId: string;
  locale: string;
  depositPercent: number;
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
}) {
  const t = useTranslations("dashboard");
  const errorText = useErrorText();
  const [state, formAction, pending] = useActionState(action, IDLE);

  if (state.status === "success") {
    return (
      <div role="status" className="flex items-center gap-3 rounded-card bg-blush p-5 shadow-card">
        <CircleCheck aria-hidden className="size-6 shrink-0 text-coral-strong" />
        <p>{t("sent")}</p>
      </div>
    );
  }

  const values = state.status === "error" ? (state.values ?? {}) : {};
  const errors = state.status === "error" ? (state.fieldErrors ?? {}) : {};
  const hidden = (
    <>
      <input type="hidden" name="requestId" value={requestId} />
      <input type="hidden" name="locale" value={locale} />
    </>
  );

  return (
    <div className="grid gap-6 md:grid-cols-2">
      {state.status === "error" && state.formError ? (
        <Notice tone="error" className="md:col-span-2">
          {errorText(state.formError)}
        </Notice>
      ) : null}

      <form action={formAction} className="rounded-card bg-blush p-5 shadow-card">
        {hidden}
        <TextField
          id="ans-total"
          name="total"
          inputMode="decimal"
          label={t("totalPrice")}
          required
          defaultValue={values.total}
          error={errorText(errors.total)}
        />
        <p className="mt-2 text-xs">{t("totalHint", { percent: depositPercent })}</p>
        <Button type="submit" name="decision" value="accept" disabled={pending} className="mt-4 w-full">
          {t("accept")}
        </Button>
      </form>

      <form action={formAction} className="rounded-card bg-blush p-5 shadow-card">
        {hidden}
        <TextareaField id="ans-reason" name="reason" label={t("reason")} defaultValue={values.reason} />
        <Button type="submit" name="decision" value="decline" variant="outline" disabled={pending} className="mt-4 w-full">
          {t("decline")}
        </Button>
      </form>
    </div>
  );
}
