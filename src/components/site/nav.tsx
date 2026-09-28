"use client";

import { Menu, X } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { signOutAction } from "@/app/actions/auth";
import { Link, usePathname } from "@/i18n/navigation";
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
  const menuRef = useRef<HTMLButtonElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const { data: session } = authClient.useSession();

  const close = () => {
    setOpen(false);
    menuRef.current?.focus();
  };

  // Close after any navigation, including the sign-out redirect. (Closing on
  // the Log out click itself would unmount its form before it submits.)
  const pathname = usePathname();
  const [prevPathname, setPrevPathname] = useState(pathname);
  if (pathname !== prevPathname) {
    setPrevPathname(pathname);
    setOpen(false);
  }

  // While the drawer is open: focus its close button, close on Escape, and
  // stop the page behind it from scrolling.
  useEffect(() => {
    if (!open) return;
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        menuRef.current?.focus();
      }
    };
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = overflow;
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);
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
      <div className="grid h-14 grid-cols-[1fr_auto] items-center px-5 md:h-[68px] md:grid-cols-[1fr_auto_1fr] md:px-9">
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
          ref={menuRef}
          aria-expanded={open}
          aria-controls="mobile-menu"
          aria-label={t("menu")}
          onClick={() => setOpen(true)}
          className="grid size-10 cursor-pointer place-items-center justify-self-end rounded-full hover:bg-white/15 md:hidden"
        >
          <Menu aria-hidden className="size-5" />
        </button>
      </div>

      {open ? (
        // Slide-in drawer over a dimmed page, instead of a dropdown that pushes the page down.
        <div className="fixed inset-0 z-50 md:hidden">
          <div aria-hidden className="absolute inset-0 bg-black/40" onClick={close} />
          <div
            id="mobile-menu"
            role="dialog"
            aria-modal="true"
            aria-label={t("menu")}
            className="absolute inset-y-0 right-0 flex w-[82%] max-w-sm flex-col overflow-y-auto bg-brown shadow-xl"
          >
            <div className="flex h-14 shrink-0 items-center justify-end border-b border-white/15 px-3">
              <button
                ref={closeRef}
                type="button"
                aria-label={t("closeMenu")}
                onClick={close}
                className="grid size-10 cursor-pointer place-items-center rounded-full hover:bg-white/15"
              >
                <X aria-hidden className="size-5" />
              </button>
            </div>
            <nav aria-label="Main" className="flex flex-col gap-1 px-3 pt-3">
              {LINKS.map((l) => (
                <Link
                  key={l.key}
                  href={l.href}
                  onClick={close}
                  className="rounded-lg px-3 py-3 text-sm tracking-wide uppercase hover:bg-white/10"
                >
                  {t(l.key)}
                </Link>
              ))}
            </nav>
            <div className="mx-6 my-3 border-t border-white/15" />
            <div
              className="flex flex-col items-start gap-7 px-6 py-3"
              onClick={(e) => {
                if ((e.target as HTMLElement).closest("a")) close();
              }}
            >
              {accountLinks}
            </div>
            {/* pl-3.5 + each pill's own px-2.5 = the links' px-6, so the labels line up. */}
            <div
              onClick={(e) => {
                if ((e.target as HTMLElement).closest("a")) close();
              }}
            >
              <LangSwitcher className="mt-4 pl-3.5" />
            </div>
          </div>
        </div>
      ) : null}
    </header>
  );
}
