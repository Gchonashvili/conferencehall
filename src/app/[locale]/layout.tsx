import type { Metadata } from "next";
import { Fraunces, Noto_Serif_Georgian } from "next/font/google";
import { notFound } from "next/navigation";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Footer } from "@/components/site/footer";
import { Nav } from "@/components/site/nav";
import { routing } from "@/i18n/routing";
import { env } from "@/env";
import { siteConfig } from "@/lib/site";
import "../globals.css";

// The reference uses a soft, slightly wonky serif for everything. Fraunces is
// the closest free match; Noto Serif Georgian covers Georgian glyphs, which
// Fraunces does not include (the CSS font stack falls back per character).
const fraunces = Fraunces({
  subsets: ["latin", "latin-ext"],
  variable: "--font-fraunces",
  display: "swap",
});
const notoGeorgian = Noto_Serif_Georgian({
  subsets: ["georgian"],
  variable: "--font-noto-georgian",
  display: "swap",
});

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export const metadata: Metadata = {
  metadataBase: new URL(env.NEXT_PUBLIC_SITE_URL),
  title: { default: siteConfig.name, template: `%s | ${siteConfig.name}` },
};

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  const t = await getTranslations("nav");

  return (
    <html lang={locale} className={`${fraunces.variable} ${notoGeorgian.variable}`}>
      <body>
        <NextIntlClientProvider>
          <a
            href="#main"
            className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:rounded-md focus:bg-brown focus:px-4 focus:py-2 focus:text-white"
          >
            {t("skipToContent")}
          </a>
          <div className="mx-auto flex min-h-dvh max-w-[1280px] flex-col bg-panel shadow-panel">
            <Nav />
            <main id="main" className="flex-1">
              {children}
            </main>
            <Footer />
          </div>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
