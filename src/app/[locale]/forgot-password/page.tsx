import type { Metadata } from "next";
import { forgotPassword } from "@/app/actions/auth";
import { ForgotForm } from "@/components/site/auth-card";
import { resolveLocale } from "@/i18n/locale";

export const metadata: Metadata = { title: "Reset password", robots: { index: false } };

export default async function ForgotPage({ params }: { params: Promise<{ locale: string }> }) {
  const locale = await resolveLocale(params);
  return (
    <div className="px-5 py-12 md:py-16">
      <ForgotForm action={forgotPassword} locale={locale} />
    </div>
  );
}
