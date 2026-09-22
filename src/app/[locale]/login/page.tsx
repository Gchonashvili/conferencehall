import type { Metadata } from "next";
import { signIn } from "@/app/actions/auth";
import { LoginForm } from "@/components/site/auth-card";
import { resolveLocale } from "@/i18n/locale";
import { redirect } from "@/i18n/navigation";
import { getSession, homeFor } from "@/lib/session";

export const metadata: Metadata = { title: "Login", robots: { index: false } };

export default async function LoginPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const locale = await resolveLocale(params);
  const [sp, session] = await Promise.all([searchParams, getSession()]);
  if (session) return redirect({ href: homeFor(session.user.role ?? "organizer"), locale });

  return (
    <div className="px-5 py-12 md:py-16">
      <LoginForm action={signIn} locale={locale} verified={sp.verified === "1"} />
    </div>
  );
}
