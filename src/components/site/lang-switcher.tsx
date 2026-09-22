"use client";

import { useLocale, useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { cn } from "@/lib/utils";

const LABELS: Record<string, string> = { ka: "ქარ", en: "EN" };

/** KA | EN toggle. Keeps the user on the same page in the other language. */
export function LangSwitcher({ className }: { className?: string }) {
  const current = useLocale();
  const pathname = usePathname();
  const t = useTranslations("nav");

  return (
    <div role="group" aria-label={t("language")} className={cn("flex gap-1 text-sm", className)}>
      {routing.locales.map((locale) => (
        <Link
          key={locale}
          href={pathname}
          locale={locale}
          aria-current={locale === current ? "true" : undefined}
          className={cn(
            "rounded-full px-2.5 py-1 font-semibold",
            locale === current ? "bg-blush text-brown" : "hover:bg-white/15",
          )}
        >
          {LABELS[locale]}
        </Link>
      ))}
    </div>
  );
}
