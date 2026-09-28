"use client";

import { useLocale, useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { Link, usePathname } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { cn } from "@/lib/utils";

const LABELS: Record<string, string> = { ka: "ქარ", en: "EN" };

/**
 * KA | EN toggle. Keeps the user on the same page in the other language,
 * query string included — search filters and one-time tokens (e.g. the
 * password-reset `?token=`) live there.
 */
export function LangSwitcher({ className }: { className?: string }) {
  // `useSearchParams()` needs a Suspense boundary so it can't opt a statically
  // rendered page out of prerendering; the fallback links just lack the query.
  return (
    <Suspense fallback={<LangLinks className={className} />}>
      <LangLinksWithQuery className={className} />
    </Suspense>
  );
}

function LangLinksWithQuery({ className }: { className?: string }) {
  const search = useSearchParams().toString();
  return <LangLinks className={className} search={search} />;
}

function LangLinks({ className, search = "" }: { className?: string; search?: string }) {
  const current = useLocale();
  const pathname = usePathname();
  const t = useTranslations("nav");
  const href = search ? `${pathname}?${search}` : pathname;

  return (
    <div role="group" aria-label={t("language")} className={cn("flex gap-1 text-sm", className)}>
      {routing.locales.map((locale) => (
        <Link
          key={locale}
          href={href}
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
