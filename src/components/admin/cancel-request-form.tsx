"use client";

import { useTranslations } from "next-intl";
import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { TextareaField } from "@/components/ui/field";
import { Notice } from "@/components/ui/notice";
import { IDLE, type FormState } from "@/lib/form-state";
import { useErrorText } from "@/lib/use-error-text";

export function CancelRequestForm({
  requestId,
  locale,
  action,
}: {
  requestId: string;
  locale: string;
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
}) {
  const t = useTranslations("admin.requests");
  const errorText = useErrorText();
  const [state, formAction, pending] = useActionState(action, IDLE);

  if (state.status === "success") {
    return (
      <div role="status" className="rounded-card bg-blush p-5 shadow-card">
        {t("cancelled")}
      </div>
    );
  }

  return (
    <form action={formAction} className="rounded-card bg-blush p-5 shadow-card">
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="requestId" value={requestId} />
      {state.status === "error" && state.formError ? <Notice tone="error" className="mb-4">{errorText(state.formError)}</Notice> : null}
      <TextareaField id="cancel-reason" name="reason" label={t("cancelReason")} defaultValue={state.status === "error" ? state.values?.reason : undefined} />
      <Button type="submit" variant="outline" disabled={pending} className="mt-4">
        {t("cancel")}
      </Button>
    </form>
  );
}
