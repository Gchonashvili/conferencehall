import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { resolveLocale } from "@/i18n/locale";
import { preparedPhotos, unsplashPhotoUrl } from "@/lib/stock-photos";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const locale = await resolveLocale(params);
  const t = await getTranslations({ locale, namespace: "credits" });
  return { title: t("title"), alternates: { canonical: `/${locale}/credits` } };
}

/** Credits for the Unsplash atmosphere photos. Not required by the license, but courteous. */
export default async function CreditsPage({ params }: { params: Promise<{ locale: string }> }) {
  await resolveLocale(params);
  const t = await getTranslations("credits");
  const photos = preparedPhotos();

  return (
    <section className="mx-auto max-w-2xl px-5 py-10 md:py-14">
      <h1 className="text-3xl font-semibold md:text-4xl">{t("title")}</h1>
      <p className="mt-3 mb-8">{t("intro")}</p>

      {photos.length === 0 ? (
        <p>{t("none")}</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {photos.map((p) => (
            <li key={p.key}>
              <a
                href={unsplashPhotoUrl(p)}
                target="_blank"
                rel="noopener noreferrer"
                className="underline underline-offset-4"
              >
                {t("photoBy", { slot: t(`slots.${p.key}`), name: p.photographer })}
              </a>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
