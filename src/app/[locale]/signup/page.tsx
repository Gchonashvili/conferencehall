import type { Metadata } from "next";
import { signUp } from "@/app/actions/auth";
import { AuthCard } from "@/components/site/auth-card";
import { resolveLocale } from "@/i18n/locale";

export const metadata: Metadata = { title: "Sign up", robots: { index: false } };

export default async function SignupPage({ params }: { params: Promise<{ locale: string }> }) {
  const locale = await resolveLocale(params);
  return (
    <div className="px-5 py-12 md:py-16">
      <AuthCard action={signUp} locale={locale} />
    </div>
  );
}
