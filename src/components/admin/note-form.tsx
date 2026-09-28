"use client";

import { useTranslations } from "next-intl";
import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { Notice } from "@/components/ui/notice";
import { Textarea } from "@/components/ui/field";
import { IDLE, type FormState } from "@/lib/form-state";
import { useErrorText } from "@/lib/use-error-text";

/** Free-text note on a lead. Clears itself after a successful save. */
export function NoteForm({
  locale,
  leadId,
  action,
}: {
  locale: string;
  leadId: string;
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
}) {
  const t = useTranslations("admin.leads");
  const errorText = useErrorText();
  const [state, formAction, pending] = useActionState(action, IDLE);
  // Remount after each result: empties the box after a save, and restores
  // the typed text (from `values`) after an error.
  const [prevState, setPrevState] = useState(state);
  const [gen, setGen] = useState(0);
  if (state !== prevState) {
    setPrevState(state);
    setGen((g) => g + 1);
  }

  const error = state.status === "error" ? (state.fieldErrors?.body ?? state.formError) : undefined;

  return (
    <form key={gen} action={formAction} className="flex flex-col gap-2">
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="leadId" value={leadId} />
      <label htmlFor="note-body" className="sr-only">
        {t("addNote")}
      </label>
      <Textarea
        id="note-body"
        name="body"
        required
        maxLength={1000}
        placeholder={t("notePlaceholder")}
        defaultValue={state.status === "error" ? (state.values?.body ?? "") : ""}
        aria-invalid={error ? true : undefined}
        className="bg-panel"
      />
      {error ? <Notice tone="error">{errorText(error)}</Notice> : null}
      <Button type="submit" size="sm" disabled={pending} className="self-start">
        {t("addNote")}
      </Button>
    </form>
  );
}
