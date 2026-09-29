"use client";

import { Building2, CalendarCheck, CreditCard, ExternalLink, LayoutDashboard, LayoutGrid, LogOut, Menu, Users, X } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { Logo } from "@/components/site/logo";
import { LogoutButton } from "@/components/site/logout-button";
import { Link, usePathname } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

// Icons are chosen by name here (not passed in) because functions can't cross
// from a Server Component layout into this Client Component.
const ICONS = {
  dashboard: LayoutDashboard,
  leads: Users,
  requests: CalendarCheck,
  subscriptions: CreditCard,
  venues: Building2,
  halls: LayoutGrid,
} as const;

export type AdminNavItem = { href: string; label: string; icon: keyof typeof ICONS; badge?: number };

type Labels = { menu: string; closeMenu: string; viewSite: string; logout: string; admin: string };

/**
 * The admin panel's frame: a permanent sidebar on laptops; on phones a top
 * bar whose menu slides in over the page. Replaces the public header and
 * footer inside /admin (see SiteChrome).
 */
export function AdminShell({
  items,
  user,
  labels,
  children,
}: {
  items: AdminNavItem[];
  user: { name: string; email: string };
  labels: Labels;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLButtonElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  // Close the drawer after any navigation (adjusting state during render, not in an effect).
  const [prevPathname, setPrevPathname] = useState(pathname);
  if (pathname !== prevPathname) {
    setPrevPathname(pathname);
    setOpen(false);
  }

  // While the drawer is open: focus its close button, close on Escape, lock page scroll.
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

  const isActive = (href: string) => (href === "/admin" ? pathname === "/admin" : pathname === href || pathname.startsWith(`${href}/`));

  const links = (
    <ul className="flex flex-col gap-1">
      {items.map(({ href, label, icon, badge }) => {
        const Icon = ICONS[icon];
        const active = isActive(href);
        return (
          <li key={href}>
            <Link
              href={href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                active ? "bg-peach text-coral" : "text-muted hover:bg-peach/60 hover:text-brown",
              )}
            >
              <Icon aria-hidden className="size-[18px] shrink-0" />
              <span className="flex-1">{label}</span>
              {badge ? (
                <span className="rounded-full bg-coral-strong px-2 py-0.5 text-xs font-semibold text-white">{badge}</span>
              ) : null}
            </Link>
          </li>
        );
      })}
    </ul>
  );

  const account = (
    <div className="flex flex-col gap-3 border-t border-line pt-4">
      <Link href="/" className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted hover:bg-peach/60 hover:text-brown">
        <ExternalLink aria-hidden className="size-[18px]" />
        {labels.viewSite}
      </Link>
      <div className="flex items-center gap-3 px-3">
        <span aria-hidden className="grid size-9 shrink-0 place-items-center rounded-full bg-peach text-sm font-semibold">
          {user.name.trim().charAt(0).toUpperCase() || "?"}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-semibold">{user.name}</span>
          <span className="block truncate text-xs text-muted">{user.email}</span>
        </span>
        <LogoutButton
          aria-label={labels.logout}
          title={labels.logout}
          className="grid size-9 cursor-pointer place-items-center rounded-lg text-muted hover:bg-peach hover:text-brown disabled:opacity-60"
        >
          <LogOut aria-hidden className="size-[18px]" />
        </LogoutButton>
      </div>
    </div>
  );

  return (
    <div className="admin-theme min-h-dvh bg-page md:flex">
      {/* Laptop: permanent sidebar */}
      <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col gap-6 border-r border-line bg-panel px-4 py-5 md:flex">
        <Link href="/admin" aria-label={labels.admin} className="flex items-center gap-3 px-2">
          <Logo tone="dark" />
        </Link>
        <nav aria-label={labels.admin} className="flex-1 overflow-y-auto">
          {links}
        </nav>
        {account}
      </aside>

      {/* Phone: top bar + slide-in menu */}
      <div className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-line bg-panel px-4 md:hidden">
        <Link href="/admin" aria-label={labels.admin}>
          <Logo tone="dark" />
        </Link>
        <button
          ref={menuRef}
          type="button"
          aria-expanded={open}
          aria-controls="admin-menu"
          aria-label={labels.menu}
          onClick={() => setOpen(true)}
          className="grid size-10 cursor-pointer place-items-center rounded-full hover:bg-peach"
        >
          <Menu aria-hidden className="size-5" />
        </button>
      </div>
      {open ? (
        <div className="fixed inset-0 z-50 md:hidden">
          <div aria-hidden className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
          <div
            id="admin-menu"
            role="dialog"
            aria-modal="true"
            aria-label={labels.menu}
            className="absolute inset-y-0 right-0 flex w-[82%] max-w-xs flex-col gap-4 overflow-y-auto bg-panel px-4 py-3 shadow-xl"
          >
            <div className="flex h-10 items-center justify-end">
              <button
                ref={closeRef}
                type="button"
                aria-label={labels.closeMenu}
                onClick={() => {
                  setOpen(false);
                  menuRef.current?.focus();
                }}
                className="grid size-10 cursor-pointer place-items-center rounded-full hover:bg-peach"
              >
                <X aria-hidden className="size-5" />
              </button>
            </div>
            <nav aria-label={labels.admin} className="flex-1">
              {links}
            </nav>
            {account}
          </div>
        </div>
      ) : null}

      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
