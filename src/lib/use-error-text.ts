"use client";

import { useTranslations } from "next-intl";

/** Turns a stable error code from a Server Action into translated text. */
export function useErrorText() {
  const t = useTranslations("errors");
  type Key = Parameters<typeof t>[0];
  return (code?: string): string | undefined => {
    if (!code) return undefined;
    return t.has(code as Key) ? t(code as Key) : t("generic");
  };
}
