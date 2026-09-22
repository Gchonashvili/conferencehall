"use client";

import { useTranslations } from "next-intl";
import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { BilingualTextField, TextField } from "@/components/ui/field";
import { Notice } from "@/components/ui/notice";
import { IDLE, type FormState } from "@/lib/form-state";
import { useErrorText } from "@/lib/use-error-text";

type Image = { id: string; url: string; alt: { ka: string; en: string } | null; isCover: boolean };

export function HallImages({
  locale,
  hallId,
  images,
  addAction,
  deleteAction,
  setCoverAction,
}: {
  locale: string;
  hallId: string;
  images: Image[];
  addAction: (prev: FormState, formData: FormData) => Promise<FormState>;
  deleteAction: (formData: FormData) => Promise<void>;
  setCoverAction: (formData: FormData) => Promise<void>;
}) {
  const t = useTranslations("admin.images");
  const errorText = useErrorText();
  const [state, formAction, pending] = useActionState(addAction, IDLE);
  const field = (key: string) => (state.status === "error" ? (state.values?.[key] ?? "") : "");
  const err = (key: string) => errorText(state.status === "error" ? state.fieldErrors?.[key] : undefined);

  return (
    <div className="rounded-card bg-blush p-5 shadow-card md:p-6">
      <h2 className="mb-3 text-lg font-semibold">{t("title")}</h2>

      {images.length === 0 ? <p className="mb-4 text-sm">{t("empty")}</p> : null}
      <ul className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {images.map((img) => (
          <li key={img.id} className="overflow-hidden rounded-lg bg-panel">
            {/* eslint-disable-next-line @next/next/no-img-element -- admin-only preview of an arbitrary external URL */}
            <img src={img.url} alt={img.alt?.en ?? ""} className="aspect-video w-full object-cover" />
            <div className="flex items-center justify-between gap-2 p-2.5">
              {img.isCover ? <Chip>{t("cover")}</Chip> : (
                <form action={setCoverAction}>
                  <input type="hidden" name="locale" value={locale} />
                  <input type="hidden" name="hallId" value={hallId} />
                  <input type="hidden" name="imageId" value={img.id} />
                  <Button type="submit" variant="outline" size="sm">
                    {t("setCover")}
                  </Button>
                </form>
              )}
              <form action={deleteAction}>
                <input type="hidden" name="locale" value={locale} />
                <input type="hidden" name="hallId" value={hallId} />
                <input type="hidden" name="imageId" value={img.id} />
                <Button type="submit" variant="outline" size="sm">
                  {t("delete")}
                </Button>
              </form>
            </div>
          </li>
        ))}
      </ul>

      <form action={formAction} className="flex flex-col gap-3">
        <input type="hidden" name="locale" value={locale} />
        <input type="hidden" name="hallId" value={hallId} />
        {state.status === "error" && state.formError ? <Notice tone="error">{errorText(state.formError)}</Notice> : null}
        <TextField id="image-url" name="url" label={t("url")} defaultValue={field("url")} error={err("url")} />
        <BilingualTextField legend={t("alt")} name="alt" ka={field("alt.ka")} en={field("alt.en")} />
        <label className="flex cursor-pointer items-center gap-2 text-sm font-semibold">
          <input type="checkbox" name="isCover" className="size-4 rounded border-brown accent-brown" />
          {t("isCover")}
        </label>
        <Button type="submit" variant="outline" disabled={pending} className="self-start">
          {t("add")}
        </Button>
      </form>
    </div>
  );
}
