"use client";

import { useTranslations } from "next-intl";
import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { BilingualTextField, TextField } from "@/components/ui/field";
import { Notice } from "@/components/ui/notice";
import { IDLE, type FormState } from "@/lib/form-state";
import { useErrorText } from "@/lib/use-error-text";

type Area = {
  id: string;
  name: { ka: string; en: string };
  capacityTheatre: number | null;
  capacityClassroom: number | null;
  capacityBanquet: number | null;
  capacityReception: number | null;
};

export function HallAreas({
  locale,
  hallId,
  areas,
  addAction,
  deleteAction,
}: {
  locale: string;
  hallId: string;
  areas: Area[];
  addAction: (prev: FormState, formData: FormData) => Promise<FormState>;
  deleteAction: (formData: FormData) => Promise<void>;
}) {
  const t = useTranslations("admin.areas");
  const errorText = useErrorText();
  const [state, formAction, pending] = useActionState(addAction, IDLE);
  const field = (key: string) => (state.status === "error" ? (state.values?.[key] ?? "") : "");
  const err = (key: string) => errorText(state.status === "error" ? state.fieldErrors?.[key] : undefined);

  return (
    <div className="rounded-card bg-blush p-5 shadow-card md:p-6">
      <h2 className="mb-3 text-lg font-semibold">{t("title")}</h2>

      {areas.length === 0 ? <p className="mb-4 text-sm">{t("empty")}</p> : null}
      <ul className="mb-5 flex flex-col gap-2">
        {areas.map((a) => (
          <li key={a.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-panel px-4 py-2.5">
            <div className="text-sm">
              <p className="font-semibold">
                {a.name.ka} / {a.name.en}
              </p>
              <p className="opacity-80">
                {[
                  a.capacityTheatre != null && `${t("theatre")}: ${a.capacityTheatre}`,
                  a.capacityClassroom != null && `${t("classroom")}: ${a.capacityClassroom}`,
                  a.capacityBanquet != null && `${t("banquet")}: ${a.capacityBanquet}`,
                  a.capacityReception != null && `${t("reception")}: ${a.capacityReception}`,
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
            </div>
            <form action={deleteAction}>
              <input type="hidden" name="locale" value={locale} />
              <input type="hidden" name="hallId" value={hallId} />
              <input type="hidden" name="areaId" value={a.id} />
              <Button type="submit" variant="outline" size="sm">
                {t("delete")}
              </Button>
            </form>
          </li>
        ))}
      </ul>

      <form action={formAction} className="flex flex-col gap-3">
        <input type="hidden" name="locale" value={locale} />
        <input type="hidden" name="hallId" value={hallId} />
        {state.status === "error" && state.formError ? <Notice tone="error">{errorText(state.formError)}</Notice> : null}
        <BilingualTextField legend={t("name")} name="name" ka={field("name.ka")} en={field("name.en")} errorKa={err("name.ka")} errorEn={err("name.en")} />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <TextField id="area-theatre" name="capacityTheatre" type="number" min={1} label={t("theatre")} defaultValue={field("capacityTheatre")} />
          <TextField id="area-classroom" name="capacityClassroom" type="number" min={1} label={t("classroom")} defaultValue={field("capacityClassroom")} />
          <TextField id="area-banquet" name="capacityBanquet" type="number" min={1} label={t("banquet")} defaultValue={field("capacityBanquet")} />
          <TextField id="area-reception" name="capacityReception" type="number" min={1} label={t("reception")} defaultValue={field("capacityReception")} />
        </div>
        <Button type="submit" variant="outline" disabled={pending} className="self-start">
          {t("add")}
        </Button>
      </form>
    </div>
  );
}
