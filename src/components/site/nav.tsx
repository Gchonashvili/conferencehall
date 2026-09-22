"use client";

import { Menu, X } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { signOutAction } from "@/app/actions/auth";
import { Link } from "@/i18n/navigation";
import { authClient } from "@/lib/auth-client";
import { homeFor } from "@/lib/roles";
import { LangSwitcher } from "./lang-switcher";
import { Logo } from "./logo";

const LINKS = [
  { href: "/halls", key: "halls" },
  { href: "/cities", key: "cities" },
  { href: "/for-venues", key: "forVenues" },
] as const;

/** Floating dark-brown bar with rounded top corners, as in the reference. */
export function Nav() {
  const t = useTranslations("nav");
  const tp = useTranslations("authPages");
  const locale = useLocale();
  const [open, setOpen] = useState(false);
  const { data: session } = authClient.useSession();
  const account = session?.user ? { href: homeFor((session.user as { role?: string }).role ?? "organizer"), name: session.user.name } : null;

  const accountLinks = account ? (
    <>
      <Link href={account.href} className="text-sm tracking-wide uppercase underline-offset-4 hover:underline">
        {tp("account")}
      </Link>
      <form action={signOutAction}>
        <input type="hidden" name="locale" value={locale} />
        <button type="submit" className="cursor-pointer text-sm tracking-wide uppercase underline-offset-4 hover:underline">
          {tp("logout")}
        </button>
      </form>
    </>
  ) : (
    <Link href="/login" className="text-sm tracking-wide uppercase underline-offset-4 hover:underline">
      {t("login")}
    </Link>
  );

  return (
    <header className="rounded-t-nav bg-brown text-white">
      <div className="grid h-[68px] grid-cols-[1fr_auto] items-center px-5 md:grid-cols-[1fr_auto_1fr] md:px-9">
        <Link href="/" aria-label="Home" className="justify-self-start">
          <Logo />
        </Link>

        <nav aria-label="Main" className="hidden gap-10 text-sm tracking-wide uppercase md:flex">
          {LINKS.map((l) => (
            <Link key={l.key} href={l.href} className="hover:underline underline-offset-4">
              {t(l.key)}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-5 justify-self-end md:flex">
          <LangSwitcher />
          {accountLinks}
        </div>

        <button
          type="button"
          aria-expanded={open}
          aria-controls="mobile-menu"
          aria-label={open ? t("closeMenu") : t("menu")}
          onClick={() => setOpen((v) => !v)}
          className="grid size-10 cursor-pointer place-items-center justify-self-end rounded-full hover:bg-white/15 md:hidden"
        >
          {open ? <X aria-hidden className="size-5" /> : <Menu aria-hidden className="size-5" />}
        </button>
      </div>

      {open ? (
        <div id="mobile-menu" className="flex flex-col gap-1 border-t border-white/15 px-5 pt-3 pb-5 md:hidden">
          {LINKS.map((l) => (
            <Link
              key={l.key}
              href={l.href}
              onClick={() => setOpen(false)}
              className="rounded-lg px-3 py-3 text-sm tracking-wide uppercase hover:bg-white/10"
            >
              {t(l.key)}
            </Link>
          ))}
          <div className="flex flex-col items-start gap-3 rounded-lg px-3 py-3" onClick={() => setOpen(false)}>
            {accountLinks}
          </div>
          <LangSwitcher className="mt-2 px-3" />
        </div>
      ) : null}
    </header>
  );
}
