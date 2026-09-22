import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { resetPassword } from "@/app/actions/auth";
import { ResetForm } from "@/components/site/auth-card";
import { Notice } from "@/components/ui/notice";
import { resolveLocale } from "@/i18n/locale";

export const metadata: Metadata = { title: "Choose a new password", robots: { index: false } };

export default async function ResetPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await resolveLocale(params);
  const sp = await searchParams;
  const token = typeof sp.token === "string" ? sp.token : "";
  const t = await getTranslations("errors");

  return (
    <div className="px-5 py-12 md:py-16">
      {token ? (
        <ResetForm action={resetPassword} token={token} />
      ) : (
        <div className="mx-auto max-w-xl">
          <Notice tone="error">{t("invalid_token")}</Notice>
        </div>
      )}
    </div>
  );
}
