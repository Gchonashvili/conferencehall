"use client";

import { useTranslations } from "next-intl";
import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { SelectField, TextareaField, TextField } from "@/components/ui/field";
import { Notice } from "@/components/ui/notice";
import { LEAD_STAGES, type LeadStage } from "@/domain/crm-input";
import { IDLE, type FormState } from "@/lib/form-state";
import { useErrorText } from "@/lib/use-error-text";

export type LeadFormValues = {
  id: string;
  status: LeadStage;
  ownerUserId: string | null;
  followUpOn: string | null;
  lostReason: string | null;
};

/** Stage, owner, follow-up date and lost reason for one lead. */
export function LeadForm({
  locale,
  lead,
  owners,
  action,
}: {
  locale: string;
  lead: LeadFormValues;
  owners: { id: string; name: string }[];
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
}) {
  const t = useTranslations("admin.leads");
  const errorText = useErrorText();
  const [state, formAction, pending] = useActionState(action, IDLE);
  // Same pattern as venue-form.tsx: remount on every result so the selects
  // show what was submitted after an error, not what was loaded.
  const [prevState, setPrevState] = useState(state);
  const [gen, setGen] = useState(0);
  if (state !== prevState) {
    setPrevState(state);
    setGen((g) => g + 1);
  }

  const field = (key: string, saved: string | null) =>
    state.status === "error" ? (state.values?.[key] ?? "") : (saved ?? "");
  const err = (key: string) => errorText(state.status === "error" ? state.fieldErrors?.[key] : undefined);

  return (
    <form key={`${gen}-${JSON.stringify(lead)}`} action={formAction} className="flex flex-col gap-4 rounded-card bg-blush p-5 shadow-card">
      <h2 className="text-lg font-semibold">{t("manage")}</h2>
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="leadId" value={lead.id} />

      {state.status === "error" && state.formError ? <Notice tone="error">{errorText(state.formError)}</Notice> : null}
      {state.status === "success" ? <Notice tone="success">{t("saved")}</Notice> : null}

      <SelectField
        id="lead-status"
        name="status"
        label={t("stage")}
        placeholder={t("stage")}
        required
        options={LEAD_STAGES.map((s) => ({ value: s, label: t(`stage_${s}`) }))}
        defaultValue={field("status", lead.status)}
        error={err("status")}
      />
      <SelectField
        id="lead-owner"
        name="ownerUserId"
        label={t("owner")}
        placeholder={t("noOwner")}
        options={owners.map((o) => ({ value: o.id, label: o.name }))}
        defaultValue={field("ownerUserId", lead.ownerUserId)}
        error={err("ownerUserId")}
      />
      <TextField
        id="lead-follow-up"
        name="followUpOn"
        type="date"
        label={t("followUp")}
        defaultValue={field("followUpOn", lead.followUpOn)}
        error={err("followUpOn")}
      />
      <div>
        <TextareaField
          id="lead-lost-reason"
          name="lostReason"
          label={t("lostReason")}
          maxLength={1000}
          defaultValue={field("lostReason", lead.lostReason)}
          error={err("lostReason")}
        />
        <p className="mt-1 text-xs opacity-70">{t("lostReasonHint")}</p>
      </div>

      <Button type="submit" disabled={pending} className="self-start">
        {t("save")}
      </Button>
    </form>
  );
}
