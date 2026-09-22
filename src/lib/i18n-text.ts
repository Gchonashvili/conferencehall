import type { I18n } from "@/db/schema";

/** Text in the requested locale, falling back to English, then Georgian. */
export function pickText(text: I18n | null | undefined, locale: string): string {
  if (!text) return "";
  const wanted = text[locale as keyof I18n];
  if (wanted?.trim()) return wanted;
  if (text.en?.trim()) return text.en;
  return text.ka ?? "";
}
