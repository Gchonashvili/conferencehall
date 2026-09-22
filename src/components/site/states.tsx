"use client";

import { SearchX, TriangleAlert } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";

export function EmptyState({ ctaHref }: { ctaHref?: string }) {
  const t = useTranslations("states");
  return (
    <div className="mx-auto max-w-md rounded-card bg-blush px-6 py-10 text-center shadow-card">
      <SearchX aria-hidden className="mx-auto mb-3 size-9 text-coral" />
      <h2 className="text-xl font-semibold">{t("emptyTitle")}</h2>
      <p className="mt-2 text-sm">{t("emptyBody")}</p>
      {ctaHref ? (
        <Button asChild className="mt-5">
          <Link href={ctaHref}>{t("emptyCta")}</Link>
        </Button>
      ) : null}
    </div>
  );
}

export function ErrorState({ onRetry }: { onRetry?: () => void }) {
  const t = useTranslations("states");
  return (
    <div role="alert" className="mx-auto max-w-md rounded-card bg-blush px-6 py-10 text-center shadow-card">
      <TriangleAlert aria-hidden className="mx-auto mb-3 size-9 text-coral" />
      <h2 className="text-xl font-semibold">{t("errorTitle")}</h2>
      <p className="mt-2 text-sm">{t("errorBody")}</p>
      <Button className="mt-5" onClick={onRetry}>
        {t("retry")}
      </Button>
    </div>
  );
}
