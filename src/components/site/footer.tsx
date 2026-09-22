import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { siteConfig } from "@/lib/site";
import { Logo } from "./logo";

function Column({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="mb-3 text-sm font-bold">{title}</h2>
      <ul className="flex flex-col gap-2 text-sm">{children}</ul>
    </div>
  );
}

/** Peach footer: logo left, four columns, as in the reference. */
export function Footer() {
  const t = useTranslations("footer");
  const link = "underline-offset-4 hover:underline";

  return (
    <footer className="bg-peach px-6 py-10 md:px-12 md:py-12">
      <div className="grid gap-10 md:grid-cols-[1.2fr_repeat(4,1fr)]">
        <Logo tone="dark" size="lg" className="justify-self-start self-start" />

        <Column title={t("contact")}>
          <li><a className={link} href={`tel:${siteConfig.contact.phone.replaceAll(" ", "")}`}>{siteConfig.contact.phone}</a></li>
          <li><a className={link} href={`mailto:${siteConfig.contact.email}`}>{siteConfig.contact.email}</a></li>
        </Column>

        <Column title={t("social")}>
          <li><a className={link} href="#">Facebook</a></li>
          <li><a className={link} href="#">Instagram</a></li>
          <li><a className={link} href="#">LinkedIn</a></li>
        </Column>

        <Column title={t("service")}>
          <li><Link className={link} href="/contact">{t("contactForm")}</Link></li>
          <li><Link className={link} href="/faq">{t("faq")}</Link></li>
          <li><Link className={link} href="/payments">{t("howPaymentsWork")}</Link></li>
        </Column>

        <Column title={t("about")}>
          <li><Link className={link} href="/about">{t("aboutUs")}</Link></li>
          <li><Link className={link} href="/for-venues">{t("listYourHall")}</Link></li>
          <li><Link className={link} href="/terms">{t("terms")}</Link></li>
          <li><Link className={link} href="/privacy">{t("privacy")}</Link></li>
          <li><Link className={link} href="/credits">{t("credits")}</Link></li>
        </Column>
      </div>
    </footer>
  );
}
